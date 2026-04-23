# Province Media Upload Handoff (FE -> BE)

This note describes how FE Admin now uploads and updates province media.

## Scope

- Province thumbnail
- Province gallery
- Province highlights thumbnail

## FE upload flow

1. FE sends `PATCH /api/v1/provinces/:id` directly with `multipart/form-data`.
2. FE can send raw image files for:
   - `thumbnail`
   - `gallery` (multiple files)
   - `highlightsThumbnail` or `highlightsThumbnail_{index}`
3. Backend uploads these files to Cloudinary inside `ProvincesService` and persists returned `url/publicId`.

## PATCH payload fields related to media

- `thumbnail` (JSON string)
- `gallery` (JSON string)
- `highlights` (JSON string; each item can include `thumbnail`)
- `thumbnail` (file, optional; if provided, backend uploads and overrides metadata thumbnail)
- `gallery` (files, optional; append mode)
- `highlightsThumbnail` (files, optional; sequential mapping from index 0)
- `highlightsThumbnail_{index}` (file, optional; explicit mapping by highlight index)

## JSON shapes sent by FE

### thumbnail

```json
{
  "url": "https://res.cloudinary.com/.../image.jpg",
  "publicId": "travel-vn/province/abc123",
  "alt": "optional alt text"
}
```

### gallery

```json
[
  {
    "url": "https://res.cloudinary.com/.../g1.jpg",
    "publicId": "travel-vn/province/gallery/1",
    "alt": "optional alt",
    "order": 0
  },
  {
    "url": "https://res.cloudinary.com/.../g2.jpg",
    "publicId": "travel-vn/province/gallery/2",
    "order": 1
  }
]
```

### highlights (thumbnail excerpt)

```json
[
  {
    "name": { "vi": "Pho co", "en": "Old Quarter" },
    "description": { "vi": "....", "en": "...." },
    "thumbnail": {
      "url": "https://res.cloudinary.com/.../highlight.jpg",
      "publicId": "travel-vn/province/highlights/1",
      "alt": "optional alt",
      "order": 0
    }
  }
]
```

## Compatibility behavior

- If FE does not upload new file, FE can keep existing `url/publicId` in payload.
- Empty or invalid highlight items are removed by FE normalization before submit.
- FE expects backend to accept and persist `publicId` for future media lifecycle operations.

## BE expectations

- Continue accepting `multipart/form-data` for `PATCH /api/v1/provinces/:id`.
- Parse object/array fields from JSON strings:
  - `thumbnail`
  - `gallery`
  - `highlights`
- Accept raw files and upload to Cloudinary in provinces flow:
  - `thumbnail`
  - `gallery`
  - `highlightsThumbnail` / `highlightsThumbnail_{index}`
