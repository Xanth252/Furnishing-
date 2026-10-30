import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req);
  if ('error' in auth) return auth.error;

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

  try {
    await prisma.savedParticular.delete({
      where: { id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Particular not found' }, { status: 404 });
    }
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
