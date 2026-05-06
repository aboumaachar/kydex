import { Module } from '@nestjs/common';
import { OfacScreeningModule } from '../ofac-screening/ofac-screening.module';
import { ScreeningModule } from '../screening/screening.module';
import { NotaryAdminController } from './notary-admin.controller';
import { NotaryAdminService } from './notary-admin.service';
import { NotaryApiKeyGuard } from './notary-api-key.guard';
import { NotaryOcrService } from './notary-ocr.service';
import { NotaryScreeningController } from './notary-screening.controller';
import { NotaryUsagePolicyService } from './notary-usage-policy.service';

@Module({
  imports: [OfacScreeningModule, ScreeningModule],
  controllers: [NotaryScreeningController, NotaryAdminController],
  providers: [NotaryApiKeyGuard, NotaryOcrService, NotaryAdminService, NotaryUsagePolicyService],
  exports: [NotaryApiKeyGuard, NotaryUsagePolicyService],
})
export class NotariesModule {}