import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://msfnakrwhggvbrotvbfq.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_lOy6FWvc2E0I4IGDkv8f8g_2hUn-eOd'

export const supabase = createClient(supabaseUrl, supabaseKey)

// 為了方便本地測試，如果没有真实 Supabase，就用模擬資料
export const IS_DEMO = false