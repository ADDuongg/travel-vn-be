// test-api.controller.ts
import { Controller, Get, Query } from '@nestjs/common';

type SortItem = {
  by: keyof (typeof this.bookings)[number];
  dir: 'asc' | 'desc';
};

@Controller('test-api/bookings')
export class TestApiController {
  private bookings = Array.from({ length: 50 }).map((_, i) => ({
    id: i + 1,
    tourName: `Tour #${i + 1}`,
    travelDate: new Date().toISOString(),
    total: Math.floor(Math.random() * 5000) + 100,
    status: i % 2 === 0 ? 'approved' : 'pending',
    paymentStatus: i % 3 === 0 ? 'paid' : 'pending',
  }));

  @Get()
  findAll(
    @Query('pageIndex') pageIndex = 0,
    @Query('pageSize') pageSize = 10,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
  ) {
    let data = [...this.bookings];

    if (q) {
      const ql = q.toLowerCase();
      data = data.filter((b) => b.tourName.toLowerCase().includes(ql));
    }

    let sorts: SortItem[] = [];
    if (sort) {
      try {
        sorts = JSON.parse(sort);
      } catch {}
    }

    if (sorts.length) {
      data.sort((a, b) => {
        for (const s of sorts) {
          const av = a[s.by] as any;
          const bv = b[s.by] as any;
          if (av < bv) return s.dir === 'desc' ? 1 : -1;
          if (av > bv) return s.dir === 'desc' ? -1 : 1;
        }
        return 0;
      });
    }

    const total = data.length;
    const pageCount = Math.ceil(total / +pageSize);
    const start = +pageIndex * +pageSize;
    const pageData = data.slice(start, start + +pageSize);

    return {
      data: pageData,
      meta: { pageIndex: +pageIndex, pageSize: +pageSize, total, pageCount },
    };
  }
}
