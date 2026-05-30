import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ ok: false, error: '密碼錯誤' }, { status: 401 })
    }

    // 設定 HTTP-only cookie，30 天有效
    const cookieStore = await cookies()
    cookieStore.set('admin_logged_in', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
