# Province API - Additional Backend Fields

This document lists additional fields needed from backend to support the redesigned Province detail page with richer travel information.

## Endpoint

- `GET /api/v1/provinces/:slug`

## Required Additions

### 1) Population and area

- `population?: number`
- `area?: number`

Purpose:
- Show factual quick-info cards in header and sidebar.
- Improve trust and context when users compare provinces.

Example:

```json
{
  "population": 8512600,
  "area": 3358.9
}
```

### 2) Best time to visit (localized)

- `bestTimeToVisit?: { vi: string; en: string }`

Purpose:
- Remove current hardcoded seasonal text.
- Enable localized and province-specific recommendations.

Example:

```json
{
  "bestTimeToVisit": {
    "vi": "Thang 10 den thang 4",
    "en": "October to April"
  }
}
```

### 3) Highlights / attractions

- `highlights?: Array<{`
  - `name: { vi: string; en: string };`
  - `thumbnail?: { url: string; publicId?: string; alt?: string; order?: number };`
  - `description?: { vi: string; en: string };`
- `}>`

Purpose:
- Power the Highlights section in Province detail.
- Allow editorial storytelling with visual cards.

Example:

```json
{
  "highlights": [
    {
      "name": { "vi": "Pho co", "en": "Old Quarter" },
      "thumbnail": { "url": "https://cdn.example.com/old-quarter.jpg" },
      "description": {
        "vi": "Khu pho lich su voi van hoa dia phuong dam net.",
        "en": "Historic district with strong local cultural identity."
      }
    }
  ]
}
```

### 4) Related travel counts

- `totalHotels?: number`
- `totalTours?: number`
- `totalTourGuides?: number`

Purpose:
- Show travel ecosystem stats in sidebar.
- Improve conversion by showing supply/availability signals.

Example:

```json
{
  "totalHotels": 245,
  "totalTours": 128,
  "totalTourGuides": 53
}
```

## Type Contract (Frontend)

Frontend expects these fields in `ProvinceDetail`:

```ts
interface ProvinceDetail extends ProvinceListItem {
  wards?: Ward[];
  population?: number;
  area?: number;
  bestTimeToVisit?: { vi: string; en: string };
  highlights?: Array<{
    name: { vi: string; en: string };
    thumbnail?: ImageItem;
    description?: { vi: string; en: string };
  }>;
  totalHotels?: number;
  totalTours?: number;
  totalTourGuides?: number;
}
```

## Notes

- All new fields are optional to keep backward compatibility.
- If a field is missing, frontend shows graceful fallback (`--` or section hidden).
