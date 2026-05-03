import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { SanitizeInputPipe } from './common/pipes/sanitize-input.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  const bodyLimit = process.env.API_BODY_LIMIT ?? '1mb';
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));

  const allowList = Array.from(
    new Set(
      [process.env.CORS_ORIGIN_WHITELIST ?? '', process.env.NOTARY_WIDGET_ALLOWED_ORIGINS ?? '']
        .flatMap((value) => value.split(','))
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
  );

  app.enableCors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowList.length === 0 && process.env.NODE_ENV !== 'production') {
        callback(null, true);
        return;
      }

      if (allowList.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('CORS origin denied'));
    },
  });

  app.useGlobalPipes(
    new SanitizeInputPipe(),
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
}

bootstrap();
