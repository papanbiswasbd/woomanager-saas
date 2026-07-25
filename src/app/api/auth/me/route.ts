import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  // Find user's store configuration if any
  const store = await db.store.findFirst({
    where: { userId: user.id }
  });

  return NextResponse.json({
    authenticated: true,
    user,
    hasStoreConnected: !!store,
    store: store ? {
      id: store.id,
      url: store.url,
      lastSyncedAt: store.lastSyncedAt
    } : null
  });
}
