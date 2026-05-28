import { NextResponse } from 'next/server';
import { getTechniciansAndServicesCached } from '@/lib/cache';

export const revalidate = 300; // 5 minutes

export async function GET() {
  try {
    const { technicians, services } = await getTechniciansAndServicesCached();
    return NextResponse.json({ technicians, services });
  } catch (err) {
    console.error('[cache/initial-data]', err);
    return NextResponse.json({ error: 'Cache fetch failed' }, { status: 500 });
  }
}
