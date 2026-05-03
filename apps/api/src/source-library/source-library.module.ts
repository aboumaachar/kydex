import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SourceLibraryService } from './source-library.service';
import { SourceLibraryController } from './source-library.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SourceLibraryController],
  providers: [SourceLibraryService],
  exports: [SourceLibraryService],
})
export class SourceLibraryModule {}
