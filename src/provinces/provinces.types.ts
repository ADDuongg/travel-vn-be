/**
 * Types for provinces API - copy to FE project
 *
 * API: GET /api/v1/provinces
 * Response: Province[] (dùng cho dropdown Tỉnh/TP → Quận/Huyện → Phường/Xã)
 */

export interface LocalizedName {
  vi: string;
  en: string;
}

export interface Ward {
  type: string;
  code: string;
  slug: string;
  name: LocalizedName;
}

export interface Province {
  _id: string;
  code: string;
  slug: string;
  name: LocalizedName;
  fullName?: LocalizedName;
  /** Danh sách quận/huyện, phường/xã (nested trong collection provinces) */
  wards?: Ward[];
}
