/**
 * Types for provinces API - copy to FE project
 *
 * API: GET /api/v1/provinces
 * Response: Province[]
 */

export interface LocalizedName {
  vi: string;
  en: string;
}

export interface Province {
  _id: string;
  code: string;
  slug: string;
  name: LocalizedName;
  fullName?: LocalizedName;
}
