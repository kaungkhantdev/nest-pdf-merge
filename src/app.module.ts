import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PdfMergeModule } from './pdf-merge/pdf-merge.module';

@Module({
  imports: [PdfMergeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
