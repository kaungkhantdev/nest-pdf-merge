// url-pdf-merger.controller.ts
import { Controller, Post, Body, Res, Get } from '@nestjs/common';
import { Response } from 'express';
import { PdfMergerService } from './pdf-merge.service';

interface MergeUrlsRequest {
  urls: string[];
  filename?: string;
}

interface MergeTwoUrlsRequest {
  url1: string;
  url2: string;
  filename?: string;
}

@Controller('merge-urls')
export class PdfMergerController {
  constructor(private readonly pdfMergerService: PdfMergerService) {}

  @Post('multiple')
  async mergeMultipleUrls(
    @Body() body: MergeUrlsRequest,
    @Res() res: Response,
  ) {
    try {
      const mergedBuffer =
        await this.pdfMergerService.mergePdfsFromUrlsWithValidation(body.urls);

      const filename = body.filename || 'merged.pdf';

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': mergedBuffer.length.toString(),
      });

      res.send(mergedBuffer);
    } catch (error) {
      res.status(500).json({
        success: false,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        message: error.message,
      });
    }
  }

  @Post('two')
  async mergeTwoUrls(@Body() body: MergeTwoUrlsRequest, @Res() res: Response) {
    try {
      const mergedBuffer = await this.pdfMergerService.mergeTwoPdfsFromUrls(
        body.url1,
        body.url2,
      );

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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        message: error?.message,
      });
    }
  }

  @Get('help')
  getHelp() {
    return {
      endpoints: {
        'POST /merge-urls/two': {
          description: 'Merge two PDFs from URLs',
          body: {
            url1: 'https://example.com/file1.pdf',
            url2: 'https://example.com/file2.pdf',
            filename: 'merged.pdf (optional)',
          },
        },
        'POST /merge-urls/multiple': {
          description: 'Merge multiple PDFs from URLs',
          body: {
            urls: [
              'https://example.com/file1.pdf',
              'https://example.com/file2.pdf',
              'https://example.com/file3.pdf',
            ],
            filename: 'merged.pdf (optional)',
          },
        },
      },
      examples: {
        twoUrls: {
          url1: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          url2: 'https://www.africau.edu/images/default/sample.pdf',
        },
      },
    };
  }
}
