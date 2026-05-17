import { readFileSync } from 'node:fs';
import { Inject, Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

import { CloudinaryResponse } from './cloudinary.response';

type CloudinaryClient = typeof cloudinary;
@Injectable()
export class CloudinaryService {
  constructor(
    @Inject('CLOUDINARY')
    private readonly client: CloudinaryClient | null,
  ) {}

  isConfigured(): boolean {
    return this.client !== null;
  }

  private getClient(): CloudinaryClient {
    if (!this.client) {
      throw new Error(
        'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.',
      );
    }
    return this.client;
  }

  private fileSource(file: Express.Multer.File): Buffer {
    if (file.buffer?.length) {
      return file.buffer;
    }
    if (file.path) {
      return readFileSync(file.path);
    }
    return Buffer.alloc(0);
  }

  uploadFile(
    file: Express.Multer.File,
    options?: { folder?: string; public_id?: string },
  ): Promise<CloudinaryResponse> {
    const cli = this.getClient();
    const source = this.fileSource(file);
    if (!source.length) {
      return Promise.reject(new Error('Empty file'));
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cli.uploader.upload_stream(
        {
          folder: options?.folder,
          public_id: options?.public_id,
        },
        (error: unknown, result) => {
          if (error) {
            const err =
              error instanceof Error
                ? error
                : new Error(
                    typeof error === 'string'
                      ? error
                      : 'Cloudinary upload failed',
                  );
            return reject(err);
          }

          if (!result) {
            return reject(new Error('Cloudinary upload returned empty result'));
          }

          resolve(result);
        },
      );

      streamifier.createReadStream(source).pipe(uploadStream);
    });
  }

  async uploadFiles(
    files: Express.Multer.File[],
  ): Promise<CloudinaryResponse[]> {
    if (!files || files.length === 0) {
      return [];
    }

    return Promise.all(files.map((file) => this.uploadFile(file)));
  }

  async deleteFile(publicId: string): Promise<void> {
    await this.getClient().uploader.destroy(publicId);
  }

  async deleteFiles(publicIds: string[]) {
    const cli = this.getClient();
    await Promise.all(publicIds.map((id) => cli.uploader.destroy(id)));
  }
}
