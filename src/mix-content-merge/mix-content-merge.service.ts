/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, BadRequestException } from '@nestjs/common';
import { PDFDocument, PageSizes, rgb } from 'pdf-lib';
import axios from 'axios';
import * as sharp from 'sharp';

interface FileInfo {
  url: string;
  type: 'pdf' | 'image';
  mimeType?: string;
}

@Injectable()
export class MixedContentMergerService {
  async mergeUrlsToOnePdf(urls: string[]): Promise<Buffer> {
    if (!urls || urls.length === 0) {
      throw new BadRequestException('No URLs provided');
    }

    try {
      console.log('Analyzing file types...');

      // Detect file types
      const fileInfos = await Promise.all(
        urls.map(async (url, index) => {
          const fileInfo = await this.detectFileType(url);
          console.log(`File ${index + 1}: ${fileInfo.type} - ${url}`);
          return fileInfo;
        }),
      );

      console.log('Downloading all files...');

      // Download all files
      const fileBuffers = await Promise.all(
        fileInfos.map(async (fileInfo, index) => {
          console.log(`Downloading file ${index + 1}...`);
          const response = await axios.get(fileInfo.url, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; PDF-Merger/1.0)',
            },
          });
          return {
            buffer: Buffer.from(response.data),
            type: fileInfo.type,
            mimeType: fileInfo.mimeType,
          };
        }),
      );

      console.log('Creating merged PDF...');

      // Create new PDF document
      const mergedPdf = await PDFDocument.create();

      // Process each file
      for (let i = 0; i < fileBuffers.length; i++) {
        const { buffer, type, mimeType } = fileBuffers[i];
        console.log(`Processing file ${i + 1} (${type})...`);

        if (type === 'pdf') {
          await this.addPdfToDocument(mergedPdf, buffer);
        } else if (type === 'image') {
          await this.addImageToDocument(mergedPdf, buffer, mimeType);
        }
      }

      // Set document metadata
      mergedPdf.setTitle('Merged PDF Document');
      mergedPdf.setCreator('NestJS Mixed Content Merger');
      mergedPdf.setProducer('pdf-lib');

      console.log('Saving merged PDF...');
      const mergedPdfBytes = await mergedPdf.save();

      console.log('Merge completed successfully!');
      return Buffer.from(mergedPdfBytes);
    } catch (error) {
      console.error('Error merging files:', error.message);
      throw new BadRequestException(`Failed to merge files: ${error.message}`);
    }
  }

  private async detectFileType(url: string): Promise<FileInfo> {
    const urlLower = url.toLowerCase();

    // Check by file extension
    if (urlLower.endsWith('.pdf')) {
      return { url, type: 'pdf' };
    }

    const imageExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.bmp',
      '.webp',
      '.tiff',
      '.tif',
    ];
    if (imageExtensions.some((ext) => urlLower.endsWith(ext))) {
      const extension = imageExtensions.find((ext) => urlLower.endsWith(ext));
      const mimeType = this.getMimeTypeFromExtension(extension ?? '.jpg');
      return { url, type: 'image', mimeType };
    }

    // If extension is unclear, try to detect by making a HEAD request
    try {
      const response = await axios.head(url, { timeout: 10000 });
      const contentType = response.headers['content-type']?.toLowerCase() || '';

      if (contentType.includes('pdf')) {
        return { url, type: 'pdf' };
      }

      if (contentType.startsWith('image/')) {
        return { url, type: 'image', mimeType: contentType };
      }
    } catch (error) {
      console.warn(
        `Could not detect content type for ${url}, assuming PDF - ${error}`,
      );
    }

    // Default to PDF if uncertain
    return { url, type: 'pdf' };
  }

  private getMimeTypeFromExtension(extension: string): string {
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff',
    };
    return mimeTypes[extension] || 'image/jpeg';
  }

  private async addPdfToDocument(
    mergedPdf: PDFDocument,
    pdfBuffer: Buffer,
  ): Promise<void> {
    const pdf = await PDFDocument.load(pdfBuffer);
    const pageIndices = pdf.getPageIndices();
    const copiedPages = await mergedPdf.copyPages(pdf, pageIndices);

    copiedPages.forEach((page) => {
      mergedPdf.addPage(page);
    });
  }

  private async addImageToDocument(
    mergedPdf: PDFDocument,
    imageBuffer: Buffer,
    mimeType: string = 'image/jpeg',
  ): Promise<void> {
    try {
      // Convert image to JPEG if it's not already (for better compatibility)
      let processedBuffer = imageBuffer;
      let finalMimeType = mimeType;

      if (!mimeType?.includes('jpeg') && !mimeType?.includes('png')) {
        console.log('Converting image to JPEG for better compatibility...');
        processedBuffer = await sharp(imageBuffer)
          .jpeg({ quality: 90 })
          .toBuffer();
        finalMimeType = 'image/jpeg';
      }

      // Embed image in PDF
      let image;
      if (finalMimeType.includes('png')) {
        image = await mergedPdf.embedPng(processedBuffer);
      } else {
        image = await mergedPdf.embedJpg(processedBuffer);
      }

      // Get image dimensions
      const { width: imgWidth, height: imgHeight } = image.scale(1);

      // Calculate page size to fit image (with some padding)
      const maxWidth = PageSizes.Legal[0] - 40; // Legal width minus padding
      const maxHeight = PageSizes.Legal[1] - 40; // Legal height minus padding

      let finalWidth = imgWidth;
      let finalHeight = imgHeight;

      // Scale down if image is too large
      if (imgWidth > maxWidth || imgHeight > maxHeight) {
        const scaleX = maxWidth / imgWidth;
        const scaleY = maxHeight / imgHeight;
        const scale = Math.min(scaleX, scaleY);
        console.log('scale ' + scale);

        finalWidth = imgWidth * scale;
        finalHeight = imgHeight * scale;
      }

      // Create page and add image
      const page = mergedPdf.addPage([finalWidth + 40, finalHeight + 40]);
      page.drawImage(image, {
        x: 20,
        y: 20,
        width: finalWidth,
        height: finalHeight,
      });
    } catch (error) {
      console.error('Error processing image:', error.message);
      // Create a page with error message if image processing fails
      const page = mergedPdf.addPage(PageSizes.Legal);
      page.drawText('Error loading image', {
        x: 50,
        y: PageSizes.Legal[1] - 100,
        size: 20,
        color: rgb(1, 0, 0),
      });
    }
  }

  // Helper method to merge specific types only
  async mergePdfsOnly(urls: string[]): Promise<Buffer> {
    const pdfUrls = urls.filter((url) => {
      const urlLower = url.toLowerCase();
      return urlLower.endsWith('.pdf') || urlLower.includes('pdf');
    });

    if (pdfUrls.length === 0) {
      throw new BadRequestException('No PDF URLs found');
    }

    return this.mergeUrlsToOnePdf(pdfUrls);
  }

  async mergeImagesOnly(urls: string[]): Promise<Buffer> {
    const imageUrls = urls.filter((url) => {
      const urlLower = url.toLowerCase();
      const imageExtensions = [
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.bmp',
        '.webp',
        '.tiff',
      ];
      return (
        imageExtensions.some((ext) => urlLower.endsWith(ext)) ||
        urlLower.includes('image')
      );
    });

    if (imageUrls.length === 0) {
      throw new BadRequestException('No image URLs found');
    }

    return this.mergeUrlsToOnePdf(imageUrls);
  }
}
