## Tổng quan API Tour cho FE (multipart/form-data)

API Tour hiện tại dùng `multipart/form-data` để:

- **Tạo tour**: `POST /api/v1/tours`
- **Cập nhật tour**: `PATCH /api/v1/tours/:id`

BE dùng `FilesInterceptor('gallery', 10)` nên:

- Field file phải tên **`gallery`** (có thể gửi nhiều file).
- Các field phức tạp (object/array) phải gửi dạng **JSON string** trong form-data (ví dụ: `"{"days":2,"nights":1}"`).

### 1. Các field form-data chính

- **`slug`** (string, required khi create)
  - Slug duy nhất cho tour, ví dụ: `halong-bay-2d1n-cruise-0-mlj3skbz`.

- **`code`** (string, required khi create)
  - Mã tour duy nhất, ví dụ: `TOUR-001-mlj3skbz`.

- **`isActive`** (boolean, optional – default `true`)
  - Gửi `"true"` hoặc `"false"` (string). BE tự convert.

- **`tourType`** (string, required)
  - Một trong các giá trị: `"DOMESTIC"`, `"INTERNATIONAL"`, `"DAILY"`.

- **`duration`** (JSON string, required khi create)
  - Cấu trúc:
    ```json
    {
      "days": 2,   // number, >= 1, required
      "nights": 1  // number, >= 0, required
    }
    ```
  - Ví dụ trong form-data: key `duration`, value:
    ```json
    {"days":2,"nights":1}
    ```

- **`destinations`** (JSON string – array, required khi create)
  - Mỗi phần tử:
    ```json
    {
      "provinceId": "6981675a1b92379aaed4b083", // MongoId, required
      "isMainDestination": true                  // boolean, optional
    }
    ```
  - Ví dụ:
    ```json
    [{"provinceId":"6981675a1b92379aaed4b083","isMainDestination":true}]
    ```

- **`departureProvinceId`** (string, MongoId, required)
  - ID tỉnh xuất phát.

- **`translations`** (JSON string – object, required khi create)
  - Key là mã ngôn ngữ (`"vi"`, `"en"`, ...), value là object:
    ```json
    {
      "name": "Halong Bay 2D1N Cruise",    // required
      "description": "Full description",   // optional
      "shortDescription": "Short desc",    // optional
      "highlights": ["Scenic views"],      // optional, string[]
      "inclusions": ["Accommodation"],     // optional, string[]
      "exclusions": ["Personal expenses"], // optional, string[]
      "notes": ["Bring sunscreen"],        // optional, string[]
      "cancellationPolicy": "Free cancel", // optional
      "seo": {                             // optional
        "title": "SEO title",
        "description": "SEO description",
        "keywords": ["halong","cruise"]
      }
    }
    ```
  - Ví dụ:
    ```json
    {
      "en": {
        "name": "Halong Bay 2D1N Cruise",
        "shortDescription": "Short: Halong Bay 2D1N Cruise",
        "description": "Full English description...",
        "highlights": ["Scenic views","Local culture","Comfortable transport"],
        "inclusions": ["Accommodation","Meals","Guide","Entrance fees"],
        "exclusions": ["Personal expenses","Insurance"],
        "notes": ["Bring sunscreen","Comfortable shoes"],
        "cancellationPolicy": "Free cancellation up to 24h before departure."
      }
    }
    ```

- **`itinerary`** (JSON string – array, optional)
  - Lịch trình từng ngày. Mỗi phần tử:
    ```json
    {
      "dayNumber": 1, // number, >= 1, required khi gửi
      "translations": {
        "en": {
          "title": "Day 1 – Arrival",
          "description": "Arrive...",
          "meals": ["Lunch","Dinner"], // optional
          "accommodation": "Hotel"     // optional
        },
        "vi": {
          "title": "Ngày 1 – Đến nơi",
          "description": "Đến và nhận phòng...",
          "meals": ["Trưa","Tối"],
          "accommodation": "Khách sạn"
        }
      }
    }
    ```
  - **Lưu ý quan trọng**: Nếu FE gửi `itinerary`, mỗi phần tử **phải có `dayNumber`**; nếu không sẽ lỗi:
    - `itinerary.0.dayNumber: Path 'dayNumber' is required.`

- **`capacity`** (JSON string – object, required khi create)
  - Cấu trúc:
    ```json
    {
      "minGuests": 2,        // number, >= 1, optional (default 1)
      "maxGuests": 16,       // number, >= 1, required
      "privateAvailable": true // boolean, optional (default false)
    }
    ```
  - Nếu gửi `capacity` mà không có `maxGuests` sẽ lỗi:
    - `capacity.maxGuests: Path 'maxGuests' is required.`

- **`pricing`** (JSON string – object, required khi create)
  - Cấu trúc:
    ```json
    {
      "basePrice": 1500000,      // number, >= 0, required
      "currency": "VND",         // string, optional (default 'VND')
      "childPrice": 800000,      // number, optional
      "infantPrice": 0,          // number, optional
      "singleSupplement": 500000 // number, optional
    }
    ```
  - Nếu gửi `pricing` mà thiếu `basePrice` sẽ lỗi:
    - `pricing.basePrice: Path 'basePrice' is required.`

- **`contact`** (JSON string – object, optional)
  - Cấu trúc:
    ```json
    {
      "phone": "+84 24 3825 0000",
      "email": "tour@example.com",
      "hotline": "1900 xxxx"
    }
    ```

- **`bookingConfig`** (JSON string – object, optional)
  - Cấu trúc:
    ```json
    {
      "advanceBookingDays": 1,   // number, >= 0, optional (default 1)
      "allowInstantBooking": true, // boolean, optional (default true)
      "requireDeposit": true,      // boolean, optional (default true)
      "depositPercent": 30         // number, 0–100, optional (default 30)
    }
    ```

- **`amenities`** (JSON string – array of MongoId, optional)
  - Ví dụ:
    ```json
    ["6981675a1b92379aaed4b083","6981675a1b92379aaed4b084"]
    ```

- **`transportTypes`** (JSON string – array of string, optional)
  - Ví dụ:
    ```json
    ["Bus","Boat"]
    ```

- **`difficulty`** (string, optional)
  - Enum: `"EASY"`, `"MODERATE"`, `"CHALLENGING"`, `"DIFFICULT"`.

- **`gallery`** (file, optional)
  - Tên field: **`gallery`**.
  - Có thể gửi nhiều file: `gallery[0]`, `gallery[1]`, ...
  - Ảnh đầu tiên dùng làm `thumbnail`, tất cả ảnh lưu vào `gallery` với thứ tự.

> **Lưu ý**: Các field `sale` và `schedule` hiện đang có trong schema Mongo nhưng **BE chưa map từ DTO** trong create/update, nên FE gửi lên cũng sẽ bị bỏ qua (không lỗi, nhưng không lưu). Có thể bổ sung sau nếu cần.

### 2. Quy tắc khi **create** (`POST /api/v1/tours`)

- Bắt buộc phải gửi (và đúng format như trên):
  - `slug`
  - `code`
  - `tourType`
  - `duration`
  - `destinations` (ít nhất 1 phần tử)
  - `departureProvinceId`
  - `translations` (ít nhất 1 ngôn ngữ có `name`)
  - `capacity` (bắt buộc `maxGuests`)
  - `pricing` (bắt buộc `basePrice`)
- Các field khác là optional.
- Toàn bộ field phức tạp phải là **JSON string hợp lệ**.

### 3. Quy tắc khi **update** (`PATCH /api/v1/tours/:id`)

- Tất cả field trên đều **optional**, FE chỉ cần gửi những field muốn thay đổi.
- Vẫn phải dùng `multipart/form-data` nếu có upload ảnh; nếu không upload ảnh vẫn có thể dùng form-data bình thường.
- Khi FE gửi một field phức tạp (ví dụ `duration`, `capacity`, `pricing`, `itinerary`), BE sẽ:
  - Parse JSON từ string.
  - Đảm bảo các field required trong schema luôn có giá trị:
    - `duration.days`, `duration.nights`
    - `capacity.maxGuests`
    - `pricing.basePrice`
    - `itinerary[i].dayNumber` cho từng phần tử (nếu FE quên gửi thì BE cố gắng giữ giá trị cũ hoặc gán `index + 1`).
- Do đó, **khuyến nghị FE**:
  - Khi gửi `duration`: luôn gửi cả `days` và `nights`.
  - Khi gửi `capacity`: luôn gửi `maxGuests` (và `minGuests` nếu thay đổi).
  - Khi gửi `pricing`: luôn gửi `basePrice`.
  - Khi gửi `itinerary`: mỗi phần tử luôn có `dayNumber` và `translations`.

### 4. Ví dụ request form-data (tạo/cập nhật)

Ví dụ (dạng logic, FE nên dùng `FormData` API thay vì copy raw):

```http
POST /api/v1/tours
Content-Type: multipart/form-data

slug = halong-bay-2d1n-cruise-0-mlj3skbz
code = TOUR-001-mlj3skbz
isActive = true
tourType = DOMESTIC
duration = {"days":2,"nights":1}
destinations = [{"provinceId":"6981675a1b92379aaed4b083","isMainDestination":true}]
departureProvinceId = 6981675a1b92379aaed4b083
translations = {"en":{"name":"Halong Bay 2D1N Cruise","shortDescription":"Short..."}}
itinerary = [{"dayNumber":1,"translations":{"en":{"title":"Day 1 – Arrival","description":"...","meals":["Lunch","Dinner"],"accommodation":"Hotel"}}}]
capacity = {"minGuests":2,"maxGuests":16,"privateAvailable":true}
pricing = {"basePrice":1500000,"currency":"VND","childPrice":800000,"singleSupplement":500000}
contact = {"phone":"+84 24 3825 0000","email":"tour@example.com","hotline":"1900 xxxx"}
bookingConfig = {"advanceBookingDays":1,"allowInstantBooking":true,"requireDeposit":true,"depositPercent":30}
amenities = []
transportTypes = ["Bus","Boat"]
difficulty = MODERATE
gallery = <file1>
gallery = <file2>
```

### 5. Ghi chú tránh lỗi thường gặp

- Nếu thấy lỗi kiểu:
  - `duration.days: Path 'days' is required.` → FE đang gửi `duration` thiếu `days` hoặc gửi JSON sai.
  - `capacity.maxGuests: Path 'maxGuests' is required.` → FE gửi `capacity` mà thiếu `maxGuests`.
  - `pricing.basePrice: Path 'basePrice' is required.` → FE gửi `pricing` thiếu `basePrice`.
  - `itinerary.0.dayNumber: Path 'dayNumber' is required.` → Phần tử đầu tiên của `itinerary` thiếu `dayNumber`.
- Luôn kiểm tra lại:
  - Giá trị trong form-data **phải là JSON hợp lệ** (không thừa/dư ngoặc kép).
  - Sử dụng đúng key như tài liệu này (không sai chính tả).

