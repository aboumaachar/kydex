import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScreeningController } from './screening.controller';
import { ScreeningService } from './screening.service';

@Module({
  controllers: [ScreeningController],
  providers: [PrismaService, ScreeningService],
  exports: [ScreeningService],
})
export class ScreeningModule {}
