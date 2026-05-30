import { NextResponse } from 'next/server'
import { apiFetchAllSafe } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [technicians, services] = await Promise.all([
      apiFetchAllSafe('technicians', 'order=nickname.asc'),
      apiFetchAllSafe('services', 'order=price.asc'),
    ])
    return NextResponse.json({
      technicians: Array.isArray(technicians) ? technicians : [],
      services: Array.isArray(services) ? services : [],
    })
  } catch (err) {
    console.error('[cache/initial-data]', err)
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
  }
}
