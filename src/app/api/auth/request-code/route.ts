import { NextRequest, NextResponse } from 'next/server'

const KEY = 'sb_publishable_lOy6FWvc2E0I4IGDkv8f8g_2hUn-eOd'
const LOGIN_CODES_URL = 'https://msfnakrwhggvbrotvbfq.supabase.co/rest/v1/login_codes'
const TG_USERS_URL = 'https://msfnakrwhggvbrotvbfq.supabase.co/rest/v1/telegram_users'
const HEADERS = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' }

// ============================================================
// GET /api/auth/request-code?code=...
// 兩種用途：
// 1. 前端手動輸入驗證碼 → polling 等 Bot 確認（舊流程，備用）
// 2. 從 URL ?code=XXX 進來 → 網站直接驗證（直接完成，不 polling）
// ============================================================
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json({ ok: false, error: '缺少驗證碼' })
  }

  const res = await fetch(`${LOGIN_CODES_URL}?code=eq.${code}&expires_at=gt.now`, {
    headers: HEADERS
  })
  const rows: any[] = await res.json()

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ ok: false, error: '驗證碼不存在或已過期，請重新操作' })
  }

  const record = rows[0]

  // 如果 Bot 已確認 → 直接刪除，回成功
  if (record.verified) {
    await fetch(`${LOGIN_CODES_URL}?id=eq.${record.id}`, {
      method: 'DELETE', headers: HEADERS
    }).catch(() => {})

    const verifiedId = record.telegram_id || code

    await fetch(TG_USERS_URL, {
      method: 'POST', headers: HEADERS,
      body: JSON.stringify({ telegram_id: verifiedId, is_whitelisted: true, is_blacklisted: false })
    }).catch(() => {})
    await fetch(`${TG_USERS_URL}?telegram_id=eq.${verifiedId}`, {
      method: 'PATCH', headers: HEADERS,
      body: JSON.stringify({ is_whitelisted: true, is_blacklisted: false })
    }).catch(() => {})

    return NextResponse.json({ ok: true, verified: true, telegram_id: verifiedId })
  }

  // Bot 還沒確認 → 代表用戶還沒回傳給 Bot，告知用戶先去 Bot 回傳
  return NextResponse.json({
    ok: true,
    verified: false,
    error: '請先在 Bot 回傳驗證碼後再回來',
    waitForBot: true
  })
}