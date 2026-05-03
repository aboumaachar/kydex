import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NameNormalizationModule } from '../name-normalization/name-normalization.module';
import { OfacScreeningModule } from '../ofac-screening/ofac-screening.module';
import { NotariesModule } from '../notaries/notaries.module';
import { InquiriesService } from './inquiries.service';
import { InquiriesController } from './inquiries.controller';

@Module({
  imports: [PrismaModule, NameNormalizationModule, OfacScreeningModule, NotariesModule],
  controllers: [InquiriesController],
  providers: [InquiriesService],
  exports: [InquiriesService],
})
export class InquiriesModule {}
