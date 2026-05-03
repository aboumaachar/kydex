import { Module } from '@nestjs/common';
import { OfacClientService } from './ofac.client';
import { OfacController } from './ofac.controller';
import { OfacParserService } from './ofac.parser';
import { OfacService } from './ofac.service';

@Module({
  controllers: [OfacController],
  providers: [OfacClientService, OfacParserService, OfacService],
  exports: [OfacService, OfacClientService, OfacParserService],
})
export class OfacModule {}