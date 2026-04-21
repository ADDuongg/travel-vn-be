# Favorites (Tour / Room / Hotel / Guide)

Module: `src/favorite/`

Collection: `favorites`

## Data model

Each favorite record is uniquely identified by `(userId, entityType, entityId)`.

```ts
type Favorite = {
  _id: string;
  userId: string;
  entityType: 'TOUR' | 'ROOM' | 'HOTEL' | 'GUIDE';
  entityId: string;
  createdAt: string;
  updatedAt: string;
};
```

Indexes:
- Unique: `{ userId: 1, entityType: 1, entityId: 1 }`
- List by user: `{ userId: 1, createdAt: -1 }`
- Reverse lookup: `{ entityType: 1, entityId: 1, createdAt: -1 }`

## Entity summary (for FE list)

Endpoint `GET /api/v1/favorites/me/list` returns `entitySummary` (minimal hydrated fields) similar to reviews summary:

```ts
entitySummary: {
  id: string;
  type: 'TOUR' | 'ROOM' | 'HOTEL' | 'GUIDE';
  slug?: string;
  name: string;
  thumbnailUrl: string;
  ratingSummary?: { average: number; total: number };
}
```

## API (Client)

Base: `/api/v1/favorites`

All endpoints require JWT.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/toggle` | Toggle favorite/unfavorite for one entity |
| GET | `/me/list` | List current user favorites (pagination + optional `entityType`) |
| GET | `/me/is-favorited` | Check `isFavorited` for one entity |

### POST `/toggle`

Body:
```ts
{ entityType: 'TOUR'|'ROOM'|'HOTEL'|'GUIDE', entityId: string }
```

Response:
```ts
{ isFavorited: boolean }
```

### GET `/me/list`

Query:
- `entityType` (optional)
- `page` (default 1)
- `limit` (default 20, max 100)
- `lang` (default `vi`) — used to pick translated `name`

Response:
```ts
{
  data: Array<Favorite & { entitySummary: FavoriteEntitySummary }>,
  pagination: { page: number, limit: number, total: number }
}
```

### GET `/me/is-favorited`

Query:
```ts
{ entityType, entityId }
```

Response:
```ts
{ isFavorited: boolean }
```

## API (Admin)

Base: `/api/v1/favorites/admin`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | JWT + admin | List/filter favorites (read-only) |

Query:
- `userId` (optional)
- `entityType` (optional)
- `entityId` (optional)
- `page`, `limit`

Response:
```ts
{
  data: Favorite[],
  pagination: { page: number, limit: number, total: number }
}
```

## Response changes for FE (isFavorited)

When request includes `Authorization: Bearer <token>`, the following public endpoints now include:

```ts
isFavorited: boolean
```

Applied to:
- Tours: `GET /api/v1/tours`, `GET /api/v1/tours/featured`, `GET /api/v1/tours/:id`, `GET /api/v1/tours/slug/:slug`
- Rooms: `GET /api/v1/rooms`, `GET /api/v1/rooms/:id`
- Hotels: `GET /api/v1/hotels`, `GET /api/v1/hotels/options`, `GET /api/v1/hotels/:id`
- Tour guides: `GET /api/v1/tour-guides`, `GET /api/v1/tour-guides/:id`

