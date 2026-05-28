import { NextRequest, NextResponse } from 'next/server'

const KEY = 'sb_publishable_lOy6FWvc2E0I4IGDkv8f8g_2hUn-eOd'
const LOGIN_CODES_URL = 'https://msfnakrwhggvbrotvbfq.supabase.co/rest/v1/login_codes'
const TG_USERS_URL = 'https://msfnakrwhggvbrotvbfq.supabase.co/rest/v1/telegram_users'
const HEADERS = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' }

// ============================================================
// GET /api/auth/login-token?token=***
// Bot 已經確認身份，直接完成登入
// 回傳 telegram_id + first_name（從 login_codes 的 phone 欄位）
// ============================================================
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ ok: false, error: '缺少 token' })
  }

  // 找未使用、未過期的 token
  const res = await fetch(
    `${LOGIN_CODES_URL}?code=eq.${token}&verified=eq.false&expires_at=gt.now`,
    { headers: HEADERS }
  )
  const rows: any[] = await res.json()

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ ok: false, error: '連結已失效，請重新操作' })
  }

  const record = rows[0]
  const telegram_id = record.telegram_id
  const first_name = record.phone || '用戶'  // phone 欄位存的是 first_name

  // 標記為已使用
  await fetch(`${LOGIN_CODES_URL}?code=eq.${token}`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify({ verified: true })
  }).catch(() => {})

  // Upsert 白名單
  await fetch(TG_USERS_URL, {
    method: 'POST', headers: HEADERS,
    body: JSON.stringify({ telegram_id, is_whitelisted: true, is_blacklisted: false })
  }).catch(() => {})
  await fetch(`${TG_USERS_URL}?telegram_id=eq.${telegram_id}`, {
    method: 'PATCH', headers: HEADERS,
    body: JSON.stringify({ is_whitelisted: true, is_blacklisted: false })
  }).catch(() => {})

  return NextResponse.json({ ok: true, telegram_id, first_name })
}