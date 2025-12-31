/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
// cloudinary-response.ts
import { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';

export type CloudinaryResponse = UploadApiResponse | UploadApiErrorResponse;
