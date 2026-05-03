// Example patch for apps/api/src/app.module.ts

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { OfacModule } from './modules/ofac/ofac.module';
import { ScreeningModule } from './modules/screening/screening.module';
import { NotariesModule } from './modules/notaries/notaries.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
    OfacModule,
    ScreeningModule,
    NotariesModule,
  ],
})
export class AppModule {}
