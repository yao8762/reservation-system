import { NextRequest, NextResponse } from 'next/server'

const BOT_TOKEN = '8875060146:AAERHZKxxXvlhWtAJCqVK-hrFB8WNP5xK_A'
const ADMIN_ID = '1974531415'
const KEY = 'sb_publishable_lOy6FWvc2E0I4IGDkv8f8g_2hUn-eOd'
const SITE_URL = 'https://reservation-system-silk.vercel.app'
const LOGIN_CODES_URL = 'https://msfnakrwhggvbrotvbfq.supabase.co/rest/v1/login_codes'
const TG_USERS_URL = 'https://msfnakrwhggvbrotvbfq.supabase.co/rest/v1/telegram_users'
const HEADERS = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' }

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  const array = new Uint8Array(24)
  require('crypto').randomFillSync(array)
  for (let i = 0; i < 24; i++) token += chars[array[i] % chars.length]
  return token
}

// ============================================================
// POST /api/auth/webhook — Bot 收到用戶訊息時的處理
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message } = body

    if (!message || !message.from || !message.chat) {
      return NextResponse.json({ ok: true })
    }

    const chatId = message.chat.id.toString()
    const text = (message.text || '').trim()
    const fromId = message.from.id.toString()
    const firstName = message.from.first_name || '用戶'

    // ===== /login 或 /start login → 產生 token，直接回連結（不需驗證碼）=====
    if (text === '/login' || text === 'login' || text === '登入' || text === '我要登入' || text.startsWith('/start login')) {
      const token = generateToken()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      // 寫入 login_codes（phone 欄位現在存 first_name，方便前端顯示）
      await fetch(LOGIN_CODES_URL, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          code: token,
          phone: firstName,  // 存放 first_name
          telegram_id: fromId,
          verified: false,
          expires_at: expiresAt
        })
      })

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `✅ 身份確認成功，${firstName}！\n\n👉 點此連結完成登入：\n${SITE_URL}/book?login=${token}\n\n（10 分鐘內有效）`,
          parse_mode: 'Markdown'
        })
      })

      return NextResponse.json({ ok: true })
    }

    // ===== /start（無參數）=====
    if (text.startsWith('/start')) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🛎️ *預約機器人*\n\n輸入「/login」來取得驗證碼。`,
          parse_mode: 'Markdown',
          reply_markup: {
            keyboard: [[{ text: '/login' }]],
            resize_keyboard: true
          }
        })
      })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Webhook error:', e)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}