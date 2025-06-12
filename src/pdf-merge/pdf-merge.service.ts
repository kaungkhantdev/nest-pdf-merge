import { Injectable, BadRequestException } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import axios from 'axios';

@Injectable()
export class PdfMergerService {
  async mergePdfsFromUrls(urls: string[]): Promise<Buffer> {
    if (!urls || urls.length === 0) {
      throw new BadRequestException('No URLs provided');
    }

    try {
      console.log('Downloading PDFs from URLs...');

      // Download all PDFs
      const pdfBuffers = await Promise.all(
        urls.map(async (url, index) => {
          console.log(`Downloading PDF ${index + 1}: ${url}`);
          const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000, // 30 second timeout
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; PDF-Merger/1.0)',
            },
          });
          return Buffer.from(response.data);
        }),
      );

      console.log('All PDFs downloaded, starting merge...');

      // Create new PDF document
      const mergedPdf = await PDFDocument.create();

      // Process each PDF
      for (let i = 0; i < pdfBuffers.length; i++) {
        console.log(`Processing PDF ${i + 1}...`);
        const pdf = await PDFDocument.load(pdfBuffers[i]);
        const pageIndices = pdf.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(pdf, pageIndices);

        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });
      }

      // Set document metadata
      mergedPdf.setTitle('Merged PDF Document');
      mergedPdf.setCreator('NestJS URL PDF Merger');
      mergedPdf.setProducer('pdf-lib');

      console.log('Saving merged PDF...');
      const mergedPdfBytes = await mergedPdf.save();

      console.log('✅ PDF merge completed successfully!');
      return Buffer.from(mergedPdfBytes);
    } catch (error: any) {
      console.error('❌ Error merging PDFs:', error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      throw new BadRequestException(`Failed to merge PDFs: ${error?.message}`);
    }
  }

  // Helper method for just two PDFs
  async mergeTwoPdfsFromUrls(url1: string, url2: string): Promise<Buffer> {
    return this.mergePdfsFromUrls([url1, url2]);
  }

  // Method to validate URLs before processing
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return url.toLowerCase().endsWith('.pdf') || url.includes('pdf');
    } catch {
      return false;
    }
  }

  async mergePdfsFromUrlsWithValidation(urls: string[]): Promise<Buffer> {
    // Validate URLs
    const invalidUrls = urls.filter((url) => !this.isValidUrl(url));
    if (invalidUrls.length > 0) {
      throw new BadRequestException(`Invalid URLs: ${invalidUrls.join(', ')}`);
    }

    return this.mergePdfsFromUrls(urls);
  }
}
