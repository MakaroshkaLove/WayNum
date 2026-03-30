import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json({ error: 'Введіть логін та пароль' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { username },
    include: { location: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'Невірний логін або пароль' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: 'Невірний логін або пароль' }, { status: 401 });
  }

  await createSession({
    id: user.id,
    username: user.username,
    role: user.role,
    locationId: user.locationId,
    permissions: JSON.parse(user.permissions || '[]'),
  });

  return NextResponse.json({ ok: true, role: user.role });
}
