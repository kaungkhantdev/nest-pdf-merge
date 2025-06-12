import { Module } from '@nestjs/common';
import { PdfMergerService } from './pdf-merge.service';
import { PdfMergerController } from './pdf-merge.controller';

@Module({
  controllers: [PdfMergerController],
  providers: [PdfMergerService],
})
export class PdfMergeModule {}
