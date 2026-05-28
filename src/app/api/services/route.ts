import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

const SUPABASE_URL = 'https://msfnakrwhggvbrotvbfq.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_lOy6FWvc2E0I4IGDkv8f8g_2hUn-eOd'

function headers() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
}

export async function GET() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/services?order=price.asc`, {
      headers: headers(),
    })
    if (!res.ok) return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
    const data = await res.json()
    return NextResponse.json(Array.isArray(data) ? data : [])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, price, duration_minutes } = body
    if (!name || price == null || !duration_minutes) {
      return NextResponse.json({ error: 'name, price, duration_minutes 必填' }, { status: 400 })
    }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/services`, {
      method: 'POST',
      headers: { ...headers(), Prefer: 'return=representation' },
      body: JSON.stringify({ name, price: Number(price), duration_minutes: Number(duration_minutes) }),
    })
    const data = await res.json()
    revalidatePath('/')
    revalidatePath('/book')
    revalidateTag('services')
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}