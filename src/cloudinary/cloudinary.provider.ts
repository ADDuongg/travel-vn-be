import { Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { EnvService } from 'src/env/env.service';

export const CloudinaryProvider = {
  provide: 'CLOUDINARY',
  inject: [EnvService],
  useFactory: (env: EnvService) => {
    const cloudName = env.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = env.get('CLOUDINARY_API_KEY');
    const apiSecret = env.get('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      Logger.warn(
        'Cloudinary env vars not set — upload features will be unavailable',
        'CloudinaryProvider',
      );
      return null;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    return cloudinary;
  },
};
