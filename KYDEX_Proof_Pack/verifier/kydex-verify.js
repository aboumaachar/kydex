#!/usr/bin/env node
/**
 * KYDEX Export Verifier
 * Verifies that a KYDEX timeline/evidence export was not altered.
 *
 * Usage:
 *   KYDEX_EXPORT_SECRET='demo-secret-change-me' node verifier/kydex-verify.js Case_A_FALSE_POSITIVE_CLEAR/timeline-export.json
 */
const fs = require('fs');
const crypto = require('crypto');

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}

const filePath = process.argv[2];
const secret = process.env.KYDEX_EXPORT_SECRET || process.env.EXPORT_HMAC_SECRET;

if (!filePath) {
  console.error('Usage: KYDEX_EXPORT_SECRET=<secret> node kydex-verify.js <timeline-export.json>');
  process.exit(2);
}
if (!secret) {
  console.error('Missing KYDEX_EXPORT_SECRET or EXPORT_HMAC_SECRET environment variable.');
  process.exit(2);
}

let exported;
try {
  exported = JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch (err) {
  console.error('❌ Could not read or parse export JSON:', err.message);
  process.exit(1);
}

if (!exported.data || !exported.exportHash || !exported.exportSignature) {
  console.error('❌ Invalid KYDEX export: expected data, exportHash, and exportSignature.');
  process.exit(1);
}

const canonical = stableStringify(exported.data);
const computedHash = crypto.createHash('sha256').update(canonical).digest('hex');
const computedSignature = crypto.createHmac('sha256', secret).update(computedHash).digest('hex');

const hashOk = computedHash === exported.exportHash;
const sigOk = computedSignature === exported.exportSignature;

console.log('KYDEX EXPORT VERIFICATION');
console.log('File:', filePath);
console.log('Case:', exported.data.case?.caseId || 'UNKNOWN');
console.log('Computed Hash:', computedHash);
console.log('Export Hash:  ', exported.exportHash);
console.log('Computed Sig: ', computedSignature);
console.log('Export Sig:   ', exported.exportSignature);
console.log('');

if (!hashOk) console.log('❌ Hash invalid: export data was altered or not canonicalized correctly.');
else console.log('✔ Hash valid');

if (!sigOk) console.log('❌ Signature invalid: wrong secret or export was altered.');
else console.log('✔ Signature valid');

if (hashOk && sigOk) {
  console.log('\nSTATUS: VERIFIED');
  process.exit(0);
}
console.log('\nSTATUS: FAILED');
process.exit(1);
