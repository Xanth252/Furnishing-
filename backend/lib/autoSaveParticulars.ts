import prisma from '@/lib/prisma';

export async function autoSaveParticulars(items: any[] | undefined | null) {
  if (!items || !Array.isArray(items)) return;

  for (const item of items) {
    const particularName = (item.particular || '').trim();
    if (!particularName) continue;

    const existing = await prisma.savedParticular.findFirst({
      where: { particular: { equals: particularName, mode: 'insensitive' } },
    });

    if (existing) {
      await prisma.savedParticular.update({
        where: { id: existing.id },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
          defaultUnit: item.unit && item.unit.trim() ? item.unit.trim() : existing.defaultUnit,
          defaultRate: item.rate && item.rate > 0 ? item.rate : existing.defaultRate,
        },
      });
    } else {
      await prisma.savedParticular.create({
        data: {
          particular: particularName,
          defaultUnit: item.unit && item.unit.trim() ? item.unit.trim() : 'mtr',
          defaultRate: item.rate || 0,
          usageCount: 1,
          lastUsedAt: new Date(),
        },
      });
    }
  }
}
