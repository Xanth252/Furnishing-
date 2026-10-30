import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { toNum } from '@/lib/mappers';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  const products = await prisma.product.findMany({
    include: {
      customer: true,
      workStages: true,
    },
    orderBy: { id: 'desc' },
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Products');

  const headers = [
    'Customer',
    'Product',
    'Serial No',
    'Company',
    'Type',
    'Qty',
    'Colour',
    'Measurement',
    'Date Ordered',
    'Expected Delivery',
    'Quote Amount',
    'Discount',
    'Final Amount',
    'Quote Status',
    'Advance',
    'Balance',
    'Payment Status',
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true };

  for (const p of products) {
    const qAmount = toNum(p.quotationAmount);
    const dAmount = toNum(p.discountAmount);
    const final = qAmount - dAmount;
    const advance = toNum(p.advancePayment);
    const balance = final - advance;

    worksheet.addRow([
      p.customer?.name || '',
      p.productName,
      p.serialNumber || '',
      p.company || '',
      p.productType,
      p.quantity || 1,
      p.colour || '',
      p.measurement || '',
      p.dateOrdered ? new Date(p.dateOrdered).toISOString().split('T')[0] : '',
      p.expectedDeliveryDate ? new Date(p.expectedDeliveryDate).toISOString().split('T')[0] : '',
      qAmount,
      dAmount,
      final,
      p.quotationStatus,
      advance,
      balance,
      p.paymentStatus,
    ]);
  }

  worksheet.columns.forEach((column) => {
    let maxLen = 12;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const val = cell.value ? cell.value.toString() : '';
      if (val.length > maxLen) maxLen = Math.min(val.length + 2, 40);
    });
    column.width = maxLen;
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="PFC_Products.xlsx"',
    },
  });
}
