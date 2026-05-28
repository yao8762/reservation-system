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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const { name, price, duration_minutes } = body
    const update: Record<string, any> = {}
    if (name != null) update.name = name
    if (price != null) update.price = Number(price)
    if (duration_minutes != null) update.duration_minutes = Number(duration_minutes)

    const res = await fetch(`${SUPABASE_URL}/rest/v1/services?id=eq.${id}`, {
      method: 'PATCH',
      headers: { ...headers(), Prefer: 'return=minimal' },
      body: JSON.stringify(update),
    })
    if (!res.ok) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    revalidatePath('/')
    revalidatePath('/book')
    revalidateTag('services')
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/services?id=eq.${id}`, {
      method: 'DELETE',
      headers: headers(),
    })
    if (!res.ok) return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
    revalidatePath('/')
    revalidatePath('/book')
    revalidateTag('services')
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
