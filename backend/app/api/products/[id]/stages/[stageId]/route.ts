import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; stageId: string } }
) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  const productId = parseInt(params.id, 10);
  const stageId = parseInt(params.stageId, 10);

  if (isNaN(productId) || isNaN(stageId)) {
    return NextResponse.json({ message: 'Invalid ID parameters' }, { status: 400 });
  }

  try {
    const dto = await req.json();

    const stage = await prisma.workStage.findFirst({
      where: { id: stageId, productId },
    });

    if (!stage) {
      return NextResponse.json({ message: 'Work stage not found' }, { status: 404 });
    }

    const isCompleted = !!dto.isCompleted;
    const dateCompleted = isCompleted ? (dto.dateCompleted ? new Date(dto.dateCompleted) : new Date()) : null;

    await prisma.workStage.update({
      where: { id: stageId },
      data: {
        isCompleted,
        dateCompleted,
        remarks: dto.remarks ?? stage.remarks,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
