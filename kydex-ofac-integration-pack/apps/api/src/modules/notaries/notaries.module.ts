import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScreeningModule } from '../screening/screening.module';
import { NotaryApiKeyGuard } from './notary-api-key.guard';
import { NotaryScreeningController } from './notary-screening.controller';

@Module({
  imports: [ScreeningModule],
  controllers: [NotaryScreeningController],
  providers: [PrismaService, NotaryApiKeyGuard],
})
export class NotariesModule {}
