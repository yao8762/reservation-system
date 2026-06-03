import { NextRequest, NextResponse } from 'next/server'

const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const TG_USERS_URL = `${SUPABASE_URL}/rest/v1/telegram_users`
const HEADERS = {
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
}

// ============================================================
// GET /api/check-blacklist?telegram_id=...
// 檢查 TG ID 是否在黑名單中，防止被封鎖的帳號繞過（更換電話）預約
// ============================================================
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const telegramId = searchParams.get('telegram_id')

  if (!telegramId) {
    return NextResponse.json({ ok: false, error: '缺少 telegram_id' }, { status: 400 })
  }

  try {
    // 查詢 telegram_users，確認 is_blacklisted 是否為 true
    const res = await fetch(
      `${TG_USERS_URL}?telegram_id=eq.${encodeURIComponent(telegramId)}&is_blacklisted=eq.true&select=id`,
      { headers: HEADERS }
    )

    if (!res.ok) {
      console.error('[check-blacklist] Supabase error:', res.status)
      return NextResponse.json({ ok: false, error: '查詢失敗' }, { status: 500 })
    }

    const rows: any[] = await res.json()

    // 有找到記錄且 is_blacklisted=true → 已被封鎖
    const blacklisted = Array.isArray(rows) && rows.length > 0

    return NextResponse.json({ ok: true, blacklisted })
  } catch (e) {
    console.error('[check-blacklist]', e)
    return NextResponse.json({ ok: false, error: '伺服器錯誤' }, { status: 500 })
  }
}