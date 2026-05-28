import { NextResponse } from 'next/server';

const SUPABASE_URL = 'https://msfnakrwhggvbrotvbfq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_lOy6FWvc2E0I4IGDkv8f8g_2hUn-eOd';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [techRes, svcRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/technicians?order=nickname.asc`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/services?order=price.asc`, { headers }),
    ]);
    const technicians = await techRes.json();
    const services = await svcRes.json();
    return NextResponse.json({
      technicians: Array.isArray(technicians) ? technicians : [],
      services: Array.isArray(services) ? services : [],
    });
  } catch (err) {
    console.error('[cache/initial-data]', err);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}
