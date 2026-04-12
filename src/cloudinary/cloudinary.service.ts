import { Inject, Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

import { CloudinaryResponse } from './cloudinary.response';

type CloudinaryClient = typeof cloudinary;
@Injectable()
export class CloudinaryService {
  constructor(
    @Inject('CLOUDINARY')
    private readonly cloudinary: CloudinaryClient | null,
  ) {}

  private assertConfigured(): asserts this is { cloudinary: CloudinaryClient } {
    if (!this.cloudinary) {
      throw new Error(
        'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.',
      );
    }
  }

  uploadFile(
    file: Express.Multer.File,
    options?: { folder?: string; public_id?: string },
  ): Promise<CloudinaryResponse> {
    this.assertConfigured();
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        {
          folder: options?.folder, // 👈 có thì dùng
          public_id: options?.public_id, // 👈 optional
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

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async uploadFiles(
    files: Express.Multer.File[],
    // folder?: string,
  ): Promise<CloudinaryResponse[]> {
    if (!files || files.length === 0) {
      return [];
    }

    return Promise.all(
      files.map((file) => this.uploadFile(file /* , folder */)),
    );
  }

  async deleteFile(publicId: string): Promise<void> {
    this.assertConfigured();
    await this.cloudinary.uploader.destroy(publicId);
  }

  async deleteFiles(publicIds: string[]) {
    this.assertConfigured();
    await Promise.all(
      publicIds.map((id) => this.cloudinary.uploader.destroy(id)),
    );
  }
}
