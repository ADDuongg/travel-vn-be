/**
 * Seed script: tạo 10 bản ghi Tour, 10 Hotel, 10 Room với translation đủ tiếng Anh và tiếng Việt.
 * Chạy: npm run seed:tours-hotels-rooms
 * Cần: MongoDB đang chạy; DB_URI trong .env (hoặc mặc định mongodb://localhost:27017/e-commerce)
 */
import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

// Load .env nếu có (không cần cài dotenv)
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach((line) => {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
}

const DB_URI = process.env.DB_URI || 'mongodb://localhost:27017/e-commerce';

const tourNamesEn = [
  'Halong Bay 2D1N Cruise',
  'Sapa Trekking & Homestay',
  'Da Nang – Hoi An Heritage',
  'Mekong Delta 2 Days',
  'Nha Trang Beach & Islands',
  'Phu Quoc 3D2N Discovery',
  'Hue Imperial City Tour',
  'Dalat Countryside',
  'Hanoi Street Food',
  'Central Vietnam Highlights',
];

const tourNamesVi = [
  'Hạ Long 2N1Đ Du thuyền',
  'Sapa Trekking & Homestay',
  'Đà Nẵng – Hội An Di sản',
  'Mekong 2 Ngày',
  'Nha Trang Biển & Đảo',
  'Phú Quốc 3N2Đ Khám phá',
  'Huế Cố đô',
  'Đà Lạt Đồng quê',
  'Hà Nội Ẩm thực đường phố',
  'Miền Trung Điểm nhấn',
];

const hotelNamesEn = [
  'Sofitel Legend Metropole Hanoi',
  'InterContinental Nha Trang',
  'Vinpearl Resort Phu Quoc',
  'Furama Resort Da Nang',
  'La Siesta Hoi An',
  'Sapa Jade Hill Resort',
  'Melia Hue Hotel',
  'Dalat Palace Heritage',
  'Mekong Riverside Lodge',
  'Halong Sapphire Cruise Hotel',
];

const hotelNamesVi = [
  'Sofitel Legend Metropole Hà Nội',
  'InterContinental Nha Trang',
  'Vinpearl Resort Phú Quốc',
  'Furama Resort Đà Nẵng',
  'La Siesta Hội An',
  'Sapa Jade Hill Resort',
  'Melia Huế',
  'Dalat Palace Heritage',
  'Mekong Riverside Lodge',
  'Halong Sapphire Cruise Hotel',
];

const roomNamesEn = [
  'Deluxe Ocean View',
  'Superior Twin',
  'Family Suite',
  'Garden Bungalow',
  'Executive Room',
  'Standard Double',
  'Pool Villa',
  'Sea View Balcony',
  'Classic Single',
  'Premium King',
];

const roomNamesVi = [
  'Deluxe hướng biển',
  'Superior giường đôi',
  'Family Suite',
  'Bungalow vườn',
  'Executive',
  'Standard đôi',
  'Pool Villa',
  'Ban công hướng biển',
  'Classic đơn',
  'Premium giường King',
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Lấy 10 tỉnh thành khác nhau từ DB; nếu không đủ thì lặp lại cho đủ 10. */
async function getProvinceIds(
  conn: mongoose.Connection,
  count: number,
): Promise<mongoose.Types.ObjectId[]> {
  const Province = conn.model(
    'Province',
    new mongoose.Schema({}, { strict: false }),
    'provinces',
  );
  const list = await Province.find().limit(count).lean();
  const ids = (list || [])
    .map((p: { _id?: unknown }) => p._id)
    .filter(Boolean) as mongoose.Types.ObjectId[];
  if (ids.length === 0) {
    return Array(count).fill(new mongoose.Types.ObjectId());
  }
  const result: mongoose.Types.ObjectId[] = [];
  for (let i = 0; i < count; i++) {
    result.push(ids[i % ids.length]);
  }
  return result;
}

async function seed() {
  await mongoose.connect(DB_URI);
  const conn = mongoose.connection;
  const provinceIds = await getProvinceIds(conn, 10);

  const HotelModel = conn.model(
    'Hotel',
    new mongoose.Schema({}, { strict: false }),
    'hotels',
  );
  const TourModel = conn.model(
    'Tour',
    new mongoose.Schema({}, { strict: false }),
    'tours',
  );
  const RoomModel = conn.model(
    'Room',
    new mongoose.Schema({}, { strict: false }),
    'rooms',
  );

  const now = new Date();

  // ---------- 10 Hotels (đủ mọi field theo schema) ----------
  const hotelDocs: { _id: mongoose.Types.ObjectId; slug: string }[] = [];
  for (let i = 0; i < 10; i++) {
    const slug =
      slugify(hotelNamesEn[i]) + '-' + i + '-' + Date.now().toString(36);
    const doc = {
      slug,
      isActive: true,
      starRating: [3, 4, 4, 5, 4, 5, 4, 5, 3, 4][i],
      provinceId: provinceIds[i],
      translations: {
        en: {
          name: hotelNamesEn[i],
          description: `English description for ${hotelNamesEn[i]}. Comfortable stay with modern amenities.`,
          shortDescription: `Short: ${hotelNamesEn[i]}`,
          address: `${100 + i} Main Street, District ${i + 1}`,
          policies: [
            'Check-in from 14:00',
            'Check-out before 12:00',
            'No smoking',
          ],
          seo: {
            title: hotelNamesEn[i],
            description: `SEO desc ${hotelNamesEn[i]}`,
          },
        },
        vi: {
          name: hotelNamesVi[i],
          description: `Mô tả tiếng Việt cho ${hotelNamesVi[i]}. Chỗ ở thoải mái, tiện nghi hiện đại.`,
          shortDescription: `Ngắn: ${hotelNamesVi[i]}`,
          address: `Số ${100 + i} Đường Chính, Quận ${i + 1}`,
          policies: [
            'Nhận phòng từ 14:00',
            'Trả phòng trước 12:00',
            'Không hút thuốc',
          ],
          seo: {
            title: hotelNamesVi[i],
            description: `SEO mô tả ${hotelNamesVi[i]}`,
          },
        },
      },
      contact: {
        phone: '+84 24 3825 0000',
        email: `hotel${i}@example.com`,
        website: `https://hotel${i}.example.com`,
      },
      location: { lat: 21.0 + i * 0.1, lng: 105.8 + i * 0.05 },
      thumbnail: {
        url: `https://picsum.photos/seed/hotel${i}/800/600`,
        publicId: `hotel-thumb-${i}`,
        alt: hotelNamesEn[i],
      },
      gallery: [
        {
          url: `https://picsum.photos/seed/hotel${i}-1/800/600`,
          publicId: `hotel-g-${i}-1`,
          alt: hotelNamesEn[i],
          order: 0,
        },
        {
          url: `https://picsum.photos/seed/hotel${i}-2/800/600`,
          publicId: `hotel-g-${i}-2`,
          alt: hotelNamesEn[i],
          order: 1,
        },
      ],
      amenities: [],
      createdAt: now,
      updatedAt: now,
    };
    const created = await HotelModel.create(doc);
    hotelDocs.push({ _id: created._id as mongoose.Types.ObjectId, slug });
  }
  console.log('Created 10 hotels.');

  // ---------- 10 Tours ----------
  for (let i = 0; i < 10; i++) {
    const code = `TOUR-${String(i + 1).padStart(3, '0')}-${Date.now().toString(36)}`;
    const slug =
      slugify(tourNamesEn[i]) + '-' + i + '-' + Date.now().toString(36);
    const doc = {
      slug,
      code,
      isActive: true,
      tourType: [
        'DOMESTIC',
        'DOMESTIC',
        'DOMESTIC',
        'DOMESTIC',
        'DAILY',
        'DOMESTIC',
        'DOMESTIC',
        'DOMESTIC',
        'DAILY',
        'DOMESTIC',
      ][i],
      duration: { days: 2 + (i % 3), nights: 1 + (i % 3) },
      destinations: [{ provinceId: provinceIds[i], isMainDestination: true }],
      departureProvinceId: provinceIds[i],
      translations: {
        en: {
          name: tourNamesEn[i],
          description: `Full English description for ${tourNamesEn[i]}. Great experience.`,
          shortDescription: `Short: ${tourNamesEn[i]}`,
          highlights: [
            'Scenic views',
            'Local culture',
            'Comfortable transport',
          ],
          inclusions: ['Accommodation', 'Meals', 'Guide', 'Entrance fees'],
          exclusions: ['Personal expenses', 'Insurance'],
          notes: ['Bring sunscreen', 'Comfortable shoes'],
          cancellationPolicy: 'Free cancellation up to 24h before departure.',
          seo: {
            title: tourNamesEn[i],
            description: `SEO ${tourNamesEn[i]}`,
            keywords: ['tour', 'vietnam'],
          },
        },
        vi: {
          name: tourNamesVi[i],
          description: `Mô tả đầy đủ tiếng Việt cho ${tourNamesVi[i]}. Trải nghiệm tuyệt vời.`,
          shortDescription: `Ngắn: ${tourNamesVi[i]}`,
          highlights: [
            'Cảnh đẹp',
            'Văn hóa địa phương',
            'Phương tiện thoải mái',
          ],
          inclusions: ['Chỗ ở', 'Bữa ăn', 'Hướng dẫn viên', 'Vé tham quan'],
          exclusions: ['Chi phí cá nhân', 'Bảo hiểm'],
          notes: ['Mang kem chống nắng', 'Giày thể thao'],
          cancellationPolicy: 'Hủy miễn phí trước 24h so với giờ khởi hành.',
          seo: {
            title: tourNamesVi[i],
            description: `SEO ${tourNamesVi[i]}`,
            keywords: ['tour', 'việt nam'],
          },
        },
      },
      itinerary: [
        {
          dayNumber: 1,
          translations: {
            en: {
              title: 'Day 1 – Arrival',
              description: 'Arrive and check in. City tour.',
              meals: ['Lunch', 'Dinner'],
              accommodation: 'Hotel',
            },
            vi: {
              title: 'Ngày 1 – Đến nơi',
              description: 'Đến và nhận phòng. Tham quan thành phố.',
              meals: ['Trưa', 'Tối'],
              accommodation: 'Khách sạn',
            },
          },
        },
        {
          dayNumber: 2,
          translations: {
            en: {
              title: 'Day 2 – Main activities',
              description: 'Full day tour.',
              meals: ['Breakfast', 'Lunch'],
              accommodation: 'Hotel',
            },
            vi: {
              title: 'Ngày 2 – Hoạt động chính',
              description: 'Tour cả ngày.',
              meals: ['Sáng', 'Trưa'],
              accommodation: 'Khách sạn',
            },
          },
        },
      ],
      capacity: { minGuests: 2, maxGuests: 16, privateAvailable: true },
      pricing: {
        basePrice: 1500000 + i * 200000,
        currency: 'VND',
        childPrice: 800000,
        singleSupplement: 500000,
      },
      contact: {
        phone: '+84 24 3825 0000',
        email: 'tour@example.com',
        hotline: '1900 xxxx',
      },
      gallery: [],
      amenities: [],
      transportTypes: ['Bus', 'Boat'],
      bookingConfig: {
        advanceBookingDays: 1,
        allowInstantBooking: true,
        requireDeposit: true,
        depositPercent: 30,
      },
      ratingSummary: { average: 4.5, total: 10 + i },
      difficulty: 'MODERATE',
      createdAt: now,
      updatedAt: now,
    };
    await TourModel.create(doc);
  }
  console.log('Created 10 tours.');

  // ---------- 10 Rooms (liên kết với Hotel qua hotelId – mỗi room thuộc 1 hotel) ----------
  for (let i = 0; i < 10; i++) {
    const code = `ROOM-${String(i + 1).padStart(2, '0')}-${Date.now().toString(36)}`;
    const slug =
      slugify(roomNamesEn[i]) + '-' + i + '-' + Date.now().toString(36);
    const hotelId = hotelDocs[i]._id; // ref Hotel – Room thuộc hotel thứ i
    const doc = {
      code,
      slug,
      roomType: [
        'Deluxe',
        'Superior',
        'Suite',
        'Bungalow',
        'Executive',
        'Standard',
        'Villa',
        'Sea View',
        'Classic',
        'Premium',
      ][i],
      isActive: true,
      capacity: {
        baseAdults: 2,
        baseChildren: 0,
        maxAdults: 4,
        maxChildren: 2,
        roomSize: 25 + i * 5,
      },
      hotelId,
      pricing: {
        basePrice: 800000 + i * 100000,
        currency: 'VND',
        weekendPrice: 900000 + i * 100000,
        extraAdultPrice: 200000,
        extraChildPrice: 100000,
      },
      translations: {
        en: {
          name: roomNamesEn[i],
          description: `English room description for ${roomNamesEn[i]}. Spacious and well-equipped.`,
          shortDescription: `Short: ${roomNamesEn[i]}`,
          hotelRule: ['No smoking', 'No pets', 'Quiet hours 22:00–07:00'],
          faq: [
            {
              question: 'What time is check-in?',
              answer: 'Check-in from 14:00.',
            },
            {
              question: 'Is breakfast included?',
              answer: 'Breakfast can be added at extra cost.',
            },
          ],
        },
        vi: {
          name: roomNamesVi[i],
          description: `Mô tả phòng tiếng Việt cho ${roomNamesVi[i]}. Rộng rãi, đầy đủ tiện nghi.`,
          shortDescription: `Ngắn: ${roomNamesVi[i]}`,
          hotelRule: [
            'Không hút thuốc',
            'Không thú cưng',
            'Giờ yên tĩnh 22:00–07:00',
          ],
          faq: [
            {
              question: 'Nhận phòng lúc mấy giờ?',
              answer: 'Nhận phòng từ 14:00.',
            },
            {
              question: 'Có bữa sáng không?',
              answer: 'Bữa sáng có thể cộng thêm phí.',
            },
          ],
        },
      },
      inventory: { totalRooms: 5 + (i % 5) },
      bookingConfig: { minNights: 1, allowInstantBooking: true },
      ratingSummary: { average: 4.5, total: 5 },
      thumbnail: {
        url: `https://picsum.photos/seed/room${i}/600/400`,
        alt: roomNamesEn[i],
      },
      gallery: [
        {
          url: `https://picsum.photos/seed/room${i}-1/600/400`,
          alt: roomNamesEn[i],
          order: 0,
        },
      ],
      amenities: [],
      seo: {
        title: roomNamesEn[i],
        description: `Room ${roomNamesEn[i]} – Book now.`,
      },
      createdAt: now,
      updatedAt: now,
    };
    await RoomModel.create(doc);
  }
  console.log('Created 10 rooms.');

  await mongoose.disconnect();
  console.log('Seed done. Disconnected.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
