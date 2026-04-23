# Province Backend Fields for FE ADMIN

This document describes the additional province fields returned by backend for FE ADMIN usage.

## Endpoints

- `GET /api/v1/provinces`
- `GET /api/v1/provinces/:slug`
- `PATCH /api/v1/provinces/:id`

## New fields

### Static content fields (stored in province document)

- `population?: number`
- `area?: number`
- `bestTimeToVisit?: { vi: string; en: string }`
- `highlights?: Array<{`
  - `name: { vi: string; en: string }`
  - `thumbnail?: { url: string; publicId?: string; alt?: string; order?: number }`
  - `description?: { vi: string; en: string }`
- `}>`

### Dynamic count fields (computed on read)

- `totalHotels?: number`
- `totalTours?: number`
- `totalTourGuides?: number`

## Count rules

- `totalHotels`:
  - Count active hotels where `hotel.provinceId` equals province id.
- `totalTourGuides`:
  - Count active tour guides where province id appears in `tourGuide.specializedProvinces`.
- `totalTours`:
  - Count active tours related to province through either:
    - `tour.destinations[].provinceId`
    - `tour.departureProvinceId`
  - If a tour matches both conditions for the same province, it is counted once only.

## API response examples

### List item (`GET /api/v1/provinces`)

```json
{
  "_id": "665f7e0a2f0d1e9b4c1a1234",
  "slug": "ha-noi",
  "name": { "vi": "Ha Noi", "en": "Hanoi" },
  "population": 8512600,
  "area": 3358.9,
  "bestTimeToVisit": {
    "vi": "Thang 10 den thang 4",
    "en": "October to April"
  },
  "highlights": [
    {
      "name": { "vi": "Pho co", "en": "Old Quarter" },
      "thumbnail": { "url": "https://cdn.example.com/old-quarter.jpg" },
      "description": {
        "vi": "Khu pho lich su voi ban sac dam net.",
        "en": "Historic district with strong local identity."
      }
    }
  ],
  "totalHotels": 245,
  "totalTours": 128,
  "totalTourGuides": 53
}
```

### Detail (`GET /api/v1/provinces/:slug`)

```json
{
  "_id": "665f7e0a2f0d1e9b4c1a1234",
  "slug": "ha-noi",
  "name": { "vi": "Ha Noi", "en": "Hanoi" },
  "wards": [],
  "population": 8512600,
  "area": 3358.9,
  "bestTimeToVisit": {
    "vi": "Thang 10 den thang 4",
    "en": "October to April"
  },
  "highlights": [],
  "totalHotels": 245,
  "totalTours": 128,
  "totalTourGuides": 53
}
```

## Backward compatibility

- All added fields are optional.
- If data is missing, FE ADMIN should fallback gracefully.

## Update API (ADMIN)

### Endpoint

- `PATCH /api/v1/provinces/:id`
- Auth: `admin` role
- Content-Type: `multipart/form-data`

### Supported update fields

- `translations`
- `isPopular`
- `displayOrder`
- `isActive`
- `region`
- `population`
- `area`
- `bestTimeToVisit`
- `highlights`
- `thumbnail` (JSON string metadata)
- `gallery`
- `thumbnail` (file upload)
- `gallery` (files upload)
- `highlightsThumbnail` (files upload, map sequentially to highlights index)
- `highlightsThumbnail_{index}` (file upload, explicit highlight index)

### Notes for FE ADMIN payload

- With `multipart/form-data`, send object/array fields as JSON string:
  - `thumbnail` (when reusing existing media metadata)
  - `bestTimeToVisit`
  - `highlights`
  - `gallery` (if updating metadata list directly)
  - `translations`
- Example value for `bestTimeToVisit`:
  - `{"vi":"Thang 10 den thang 4","en":"October to April"}`
- Example value for `highlights`:
  - `[{"name":{"vi":"Pho co","en":"Old Quarter"},"description":{"vi":"...","en":"..."}}]`
- If a highlight item misses `name.vi` or `name.en`, backend drops that item to avoid DB validation crash.
- If both metadata thumbnail and `thumbnail` file are provided, uploaded file takes priority.

### Minimal request example (form-data fields)

- `population`: `8512600`
- `area`: `3358.9`
- `bestTimeToVisit`: `{"vi":"Thang 10 den thang 4","en":"October to April"}`
- `highlights`: `[{"name":{"vi":"Pho co","en":"Old Quarter"},"description":{"vi":"Khu pho lich su","en":"Historic district"}}]`

### cURL example with thumbnail upload

```bash
curl 'http://localhost:9001/api/v1/provinces/{provinceId}' \
  -X 'PATCH' \
  -H 'Authorization: Bearer {accessToken}' \
  -H 'Content-Type: multipart/form-data' \
  -F 'isPopular=true' \
  -F 'isActive=true' \
  -F 'displayOrder=1' \
  -F 'region=NORTH' \
  -F 'population=8512600' \
  -F 'area=3358.9' \
  -F 'bestTimeToVisit={"vi":"Thang 10 den thang 4","en":"October to April"}' \
  -F 'highlights=[{"name":{"vi":"Pho co","en":"Old Quarter"},"description":{"vi":"Khu pho lich su","en":"Historic district"}}]' \
  -F 'thumbnail=@/absolute/path/to/thumbnail.jpg'
```

### cURL example with highlight thumbnail files

```bash
curl 'http://localhost:9001/api/v1/provinces/{provinceId}' \
  -X 'PATCH' \
  -H 'Authorization: Bearer {accessToken}' \
  -H 'Content-Type: multipart/form-data' \
  -F 'highlights=[{"name":{"vi":"Pho co","en":"Old Quarter"}},{"name":{"vi":"Ho Tay","en":"West Lake"}}]' \
  -F 'highlightsThumbnail_0=@/absolute/path/to/highlight-0.jpg' \
  -F 'highlightsThumbnail_1=@/absolute/path/to/highlight-1.jpg'
```

### Thumbnail behavior

- If `thumbnail` file is provided, backend uploads the new file to Cloudinary.
- If old thumbnail has `publicId`, backend attempts to delete old Cloudinary asset before setting new one.
- Province stores returned Cloudinary fields:
  - `thumbnail.url`
  - `thumbnail.publicId`
  - `thumbnail.alt`
- Highlight thumbnail upload behavior:
  - `highlightsThumbnail_{index}` updates exactly that highlight item.
  - `highlightsThumbnail` without suffix maps sequentially from index 0.
