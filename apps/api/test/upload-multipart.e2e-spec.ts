import { INestApplication, CanActivate, ExecutionContext, Injectable, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { SanitizeInputPipe } from '../src/common/pipes/sanitize-input.pipe';
import { DataSourcesController } from '../src/data-sources/data-sources.controller';
import { DataSourcesService } from '../src/data-sources/data-sources.service';

@Injectable()
class AllowGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.user = {
      id: 'usr_test',
      tenantId: 'ten_test',
      role: 'SUPER_ADMIN',
    };
    return true;
  }
}

describe('Multipart upload route (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [DataSourcesController],
      providers: [
        {
          provide: DataSourcesService,
          useValue: {
            list: async () => [],
            versions: async () => [],
            ingestionRuns: async () => [],
            ingestUpload: async (_dto: unknown, file: { buffer?: Buffer; originalname?: string; mimetype?: string; size?: number }) => ({
              filename: file?.originalname ?? null,
              mimetype: file?.mimetype ?? null,
              size: file?.size ?? 0,
              bufferLength: Buffer.isBuffer(file?.buffer) ? file.buffer.length : 0,
              preview: Buffer.isBuffer(file?.buffer) ? file.buffer.toString('utf-8', 0, 200) : null,
            }),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(AllowGuard)
      .overrideGuard(RolesGuard)
      .useClass(AllowGuard);

    const moduleRef = await moduleBuilder.compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new SanitizeInputPipe(),
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('preserves multipart file buffers through global sanitization', async () => {
    await request(app.getHttpServer())
      .post('/data-sources/upload')
      .field('code', 'OFAC')
      .field('name', 'OFAC SDN')
      .field('type', 'OFAC')
      .attach('file', Buffer.from('name\nMohammed Ali\n', 'utf-8'), 'watchlist.csv')
      .expect(201)
      .expect((res) => {
        expect(res.body.filename).toBe('watchlist.csv');
        expect(res.body.mimetype).toBe('text/csv');
        expect(res.body.size).toBeGreaterThan(0);
        expect(res.body.bufferLength).toBeGreaterThan(0);
        expect(res.body.preview).toContain('Mohammed Ali');
      });
  });
});