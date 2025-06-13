import { Controller, Post, Body, Res, Get } from '@nestjs/common';
import { Response } from 'express';
import { MixedContentMergerService } from './mix-content-merge.service';

interface MergeRequest {
  urls: string[];
  filename?: string;
  type?: 'mixed' | 'pdf-only' | 'images-only';
}

@Controller('merge-mixed')
export class MixedContentMergerController {
  constructor(
    private readonly mixedContentMergerService: MixedContentMergerService,
  ) {}

  @Post('all')
  async mergeAll(@Body() body: MergeRequest, @Res() res: Response) {
    try {
      let mergedBuffer: Buffer;

      switch (body.type) {
        case 'pdf-only':
          mergedBuffer = await this.mixedContentMergerService.mergePdfsOnly(
            body.urls,
          );
          break;
        case 'images-only':
          mergedBuffer = await this.mixedContentMergerService.mergeImagesOnly(
            body.urls,
          );
          break;
        case 'mixed':
        default:
          mergedBuffer = await this.mixedContentMergerService.mergeUrlsToOnePdf(
            body.urls,
          );
          break;
      }

      const filename = body.filename || 'merged.pdf';

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': mergedBuffer.length.toString(),
      });

      res.send(mergedBuffer);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        message: error,
      });
    }
  }

  @Get('help')
  getHelp() {
    return {
      endpoint: 'POST /merge-mixed/all',
      description: 'Merge PDFs and images into one PDF',
      body: {
        urls: [
          'https://example.com/document.pdf',
          'https://example.com/image1.jpg',
          'https://example.com/image2.png',
          'https://example.com/another-doc.pdf',
        ],
        filename: 'merged-content.pdf (optional)',
        type: 'mixed | pdf-only | images-only (optional, default: mixed)',
      },
      supportedFormats: {
        pdfs: ['.pdf'],
        images: [
          '.jpg',
          '.jpeg',
          '.png',
          '.gif',
          '.bmp',
          '.webp',
          '.tiff',
          '.tif',
        ],
      },
      examples: {
        mixed: {
          urls: [
            'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            'https://via.placeholder.com/800x600/FF0000/FFFFFF?text=Image+1',
            'https://via.placeholder.com/600x800/00FF00/000000?text=Image+2',
          ],
          type: 'mixed',
        },
        imagesOnly: {
          urls: [
            'https://via.placeholder.com/800x600.jpg',
            'https://via.placeholder.com/600x800.png',
          ],
          type: 'images-only',
        },
      },
    };
  }
}
