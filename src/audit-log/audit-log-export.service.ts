/* eslint-disable @typescript-eslint/require-await */
import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { Response } from 'express';

interface AuditLogRow {
  _id: any;
  category: string;
  action: string;
  resourceType?: string;
  resourceId?: any;
  userId?: any;
  username?: string;
  ip?: string;
  userAgent?: string;
  description?: string;
  createdAt?: Date;
}

const COLUMNS = [
  { header: 'ID', key: '_id', width: 26 },
  { header: 'Category', key: 'category', width: 12 },
  { header: 'Action', key: 'action', width: 28 },
  { header: 'Resource Type', key: 'resourceType', width: 16 },
  { header: 'Resource ID', key: 'resourceId', width: 26 },
  { header: 'User ID', key: 'userId', width: 26 },
  { header: 'Username', key: 'username', width: 20 },
  { header: 'IP', key: 'ip', width: 18 },
  { header: 'User Agent', key: 'userAgent', width: 40 },
  { header: 'Description', key: 'description', width: 40 },
  { header: 'Created At', key: 'createdAt', width: 24 },
];

@Injectable()
export class AuditLogExportService {
  async exportCsv(data: AuditLogRow[], res: Response): Promise<void> {
    const header = COLUMNS.map((c) => c.header).join(',');
    const rows = data.map((row) =>
      COLUMNS.map((col) => {
        const val = row[col.key as keyof AuditLogRow];
        if (val === undefined || val === null) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(','),
    );

    const csv = [header, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-logs-${Date.now()}.csv"`,
    );
    res.send('\uFEFF' + csv);
  }

  async exportXlsx(data: AuditLogRow[], res: Response): Promise<void> {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Audit Logs');

    sheet.columns = COLUMNS;

    for (const row of data) {
      sheet.addRow({
        _id: String(row._id),
        category: row.category,
        action: row.action,
        resourceType: row.resourceType ?? '',
        resourceId: row.resourceId ? String(row.resourceId) : '',
        userId: row.userId ? String(row.userId) : '',
        username: row.username ?? '',
        ip: row.ip ?? '',
        userAgent: row.userAgent ?? '',
        description: row.description ?? '',
        createdAt: row.createdAt ?? '',
      });
    }

    sheet.getRow(1).font = { bold: true };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-logs-${Date.now()}.xlsx"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }
}
