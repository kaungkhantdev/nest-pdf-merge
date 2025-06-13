import { Module } from '@nestjs/common';
import { MixedContentMergerController } from './mix-content-merge.controller';
import { MixedContentMergerService } from './mix-content-merge.service';

@Module({
  controllers: [MixedContentMergerController],
  providers: [MixedContentMergerService],
})
export class MixMergeModule {}
