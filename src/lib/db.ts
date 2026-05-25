import { Client } from 'pg'

export async function query(text: string, params?: any[]) {
  const client = new Client({
    host: 'db.msfnakrwhggvbrotvbfq.supabase.co',
    port: 5432,
    user: 'postgres',
    password: 'iJML0MIbbKzhyPFw',
    database: 'postgres'
  })
  
  try {
    await client.connect()
    const result = await client.query(text, params)
    return result
  } finally {
    await client.end()
  }
}