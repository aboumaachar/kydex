import { Module } from '@nestjs/common';
import { OfacScreeningController } from './ofac-screening.controller';
import { OfacScreeningService } from './ofac-screening.service';
import { SourcesModule } from '../sources/sources.module';

@Module({
  imports: [SourcesModule],
  controllers: [OfacScreeningController],
  providers: [OfacScreeningService],
  exports: [OfacScreeningService],
})
export class OfacScreeningModule {}