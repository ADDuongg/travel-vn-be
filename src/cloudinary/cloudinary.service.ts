import { Inject, Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

import { CloudinaryResponse } from './cloudinary.response';

type CloudinaryClient = typeof cloudinary;
@Injectable()
export class CloudinaryService {
  constructor(
    @Inject('CLOUDINARY')
    private readonly cloudinary: CloudinaryClient,
  ) {}

  uploadFile(
    file: Express.Multer.File,
    options?: { folder?: string; public_id?: string },
  ): Promise<CloudinaryResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        {
          folder: options?.folder, // 👈 có thì dùng
          public_id: options?.public_id, // 👈 optional
        },
        (error, result) => {
          if (error) {
            return reject(
              error instanceof Error
                ? error
                : new Error('Cloudinary upload failed'),
            );
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
    await this.cloudinary.uploader.destroy(publicId);
  }

  async deleteFiles(publicIds: string[]) {
    await Promise.all(
      publicIds.map((id) => this.cloudinary.uploader.destroy(id)),
    );
  }
}
