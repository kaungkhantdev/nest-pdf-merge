import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PdfMergeModule } from './pdf-merge/pdf-merge.module';
import { MixMergeModule } from './mix-content-merge/mix-content-merge.module';

@Module({
  imports: [PdfMergeModule, MixMergeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
