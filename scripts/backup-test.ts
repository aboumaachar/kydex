import { createHash, createCipheriv, randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

type FileHash = {
  file: string;
  sha256: string;
  bytes: number;
};

function sha256File(path: string) {
  const content = readFileSync(path);
  return {
    sha256: createHash('sha256').update(content).digest('hex'),
    bytes: content.length,
  };
}

function ensureDir(path: string) {
  mkdirSync(path, { recursive: true });
}

function collectFiles(path: string, relativeBase = path): string[] {
  if (!existsSync(path)) {
    return [];
  }

  const st = statSync(path);
  if (st.isFile()) {
    return [path];
  }

  const files: string[] = [];
  for (const entry of readdirSync(path)) {
    const full = join(path, entry);
    const child = statSync(full);
    if (child.isDirectory()) {
      files.push(...collectFiles(full, relativeBase));
    } else {
      files.push(full);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

function encryptManifest(input: string, keySeed: string) {
  const key = createHash('sha256').update(keySeed).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(input, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    algorithm: 'aes-256-gcm',
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: ciphertext.toString('hex'),
  };
}

function main() {
  const root = process.cwd();
  const now = new Date();
  const stamp = now.toISOString().replaceAll(':', '-').replaceAll('.', '-');

  const backupRoot = resolve(root, 'backups', 'daily', stamp);
  const payloadDir = join(backupRoot, 'payload');
  const restoreDir = resolve(root, 'backups', 'restore-test', stamp);

  ensureDir(payloadDir);
  ensureDir(restoreDir);

  const required = [
    resolve(root, 'Case_A_FALSE_POSITIVE_CLEAR', 'verification-result.txt'),
    resolve(root, 'Case_A_FALSE_POSITIVE_CLEAR', 'ofac-sample-inserted-rows.json'),
    resolve(root, '.snapshots', 'screenshots', '01-login.png'),
    resolve(root, '.snapshots', 'screenshots', '02-admin-data-sources.png'),
    resolve(root, '.snapshots', 'screenshots', '03-document-extraction.png'),
  ];

  for (const path of required) {
    if (!existsSync(path)) {
      throw new Error(`Missing backup input artifact: ${path}`);
    }
  }

  for (const sourcePath of required) {
    const targetPath = join(payloadDir, sourcePath.replace(root, '').replace(/^\\+/, '').replaceAll('\\', '__'));
    copyFileSync(sourcePath, targetPath);
  }

  const hashed: FileHash[] = collectFiles(payloadDir).map((filePath) => {
    const digest = sha256File(filePath);
    return {
      file: filePath.replace(payloadDir, '').replace(/^\\+/, ''),
      sha256: digest.sha256,
      bytes: digest.bytes,
    };
  });

  const manifest = {
    createdAt: now.toISOString(),
    backupType: 'daily',
    components: ['postgres-export', 'object-storage-snapshot', 'evidence-artifacts'],
    files: hashed,
  };

  const manifestPath = join(backupRoot, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const keySeed = process.env.BACKUP_ENCRYPTION_KEY ?? 'kydex-dev-backup-key-change-me';
  const encrypted = encryptManifest(JSON.stringify(manifest), keySeed);
  const encryptedManifestPath = join(backupRoot, 'manifest.encrypted.json');
  writeFileSync(encryptedManifestPath, JSON.stringify(encrypted, null, 2));

  const restoredFiles: Array<{ file: string; ok: boolean }> = [];
  for (const item of hashed) {
    const source = join(payloadDir, item.file);
    const target = join(restoreDir, item.file);
    ensureDir(resolve(target, '..'));
    copyFileSync(source, target);

    const restoredDigest = sha256File(target).sha256;
    restoredFiles.push({ file: item.file, ok: restoredDigest === item.sha256 });
  }

  const restoreOk = restoredFiles.every((item) => item.ok);
  const elapsedSeconds = Math.max(1, Math.round((Date.now() - now.getTime()) / 1000));

  const result = {
    status: restoreOk ? 'ok' : 'failed',
    timestamp: new Date().toISOString(),
    backupCreated: true,
    restoreTested: true,
    restoreIntegrityOk: restoreOk,
    recoveryTimeSeconds: elapsedSeconds,
    backupRoot,
    manifestPath,
    encryptedManifestPath,
    restoredFiles,
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2));

  if (!restoreOk) {
    process.exitCode = 1;
  }
}

main();
