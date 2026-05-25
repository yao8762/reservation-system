import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://msfnakrwhggvbrotvbfq.supabase.co'
const supabaseKey = 'iJML0MIbbKzhyPFw'

export const supabase = createClient(supabaseUrl, supabaseKey)

// 為了方便本地測試，如果没有真实 Supabase，就用模擬資料
export const IS_DEMO = false