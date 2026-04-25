import { BadRequestException, Injectable } from '@nestjs/common';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { CloudinaryResponse } from 'src/cloudinary/cloudinary.response';
import { UploadApiResponse } from 'cloudinary';

/** Thân thiện FE: map từ response Cloudinary upload. */
export type MediaUploadItem = {
  url: string;
  publicId: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
};

@Injectable()
export class MediaService {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  async uploadFile(file: Express.Multer.File): Promise<MediaUploadItem> {
    const result = await this.cloudinaryService.uploadFile(file);
    return this.toMediaUploadItem(result);
  }

  async uploadFiles(files: Express.Multer.File[]): Promise<MediaUploadItem[]> {
    if (!files?.length) return [];
    return Promise.all(files.map((f) => this.uploadFile(f)));
  }

  toMediaUploadItem(result: CloudinaryResponse): MediaUploadItem {
    if (
      result &&
      typeof result === 'object' &&
      'error' in result &&
      result.error
    ) {
      const err = (result as { error?: { message?: string } }).error;
      throw new BadRequestException(err?.message ?? 'Cloudinary upload error');
    }
    const r = result as UploadApiResponse;
    if (!r?.secure_url || !r?.public_id) {
      throw new BadRequestException('Invalid upload result');
    }
    return {
      url: r.secure_url,
      publicId: r.public_id,
      format: r.format,
      width: r.width,
      height: r.height,
      bytes: r.bytes,
    };
  }
}
