import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pukale_furnishing_centre_secret_key_2026_super_secure';

export interface AuthUser {
  id: number;
  username: string;
}

export function signToken(user: { id: number; username: string }) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export function getAuthUser(req: NextRequest): AuthUser | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  return verifyToken(token);
}

export function requireAuth(req: NextRequest): { user: AuthUser } | { error: NextResponse } {
  const user = getAuthUser(req);
  if (!user) {
    return {
      error: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { user };
}
