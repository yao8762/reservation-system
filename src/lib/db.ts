const SUPABASE_URL = 'https://msfnakrwhggvbrotvbfq.supabase.co'
const SUPABASE_KEY = 'sb_publishable_lOy6FWvc2E0I4IGDkv8f8g_2hUn-eOd'

function fetchJson(url: string, options?: any): Promise<any[]> {
  return fetch(url, options).then(async (r) => {
    if (!r.ok) {
      console.error('API Error:', r.status, await r.text())
      return []
    }
    const data = await r.json()
    return Array.isArray(data) ? data : [data].filter(Boolean)
  })
}

export async function query(sql: string): Promise<any[]> {
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  }

  const upperSql = sql.trim().toUpperCase()

  if (!upperSql.startsWith('SELECT')) {
    return []
  }

  // Helper to normalize response
  const normalize = (data: any): any[] => {
    if (!data) return []
    if (Array.isArray(data)) return data
    return [data]
  }

  // Stats: today or month count + revenue
  if (sql.includes('COUNT(*)')) {
    const today = new Date().toISOString().split('T')[0]
    const isMonth = sql.includes("DATE_TRUNC('month'")
    const startDate = isMonth ? today.substring(0, 7) + '-01' : today

    const appointments = await fetchJson(
      `${SUPABASE_URL}/rest/v1/appointments?date=gte.${startDate}&status=eq.confirmed`,
      { headers }
    )

    const services = await fetchJson(`${SUPABASE_URL}/rest/v1/services?`, { headers })

    const totalRevenue = appointments.reduce((sum: number, a: any) => {
      const svc = services.find((s: any) => s.id === a.service_id)
      return sum + (svc?.price || 0)
    }, 0)

    return [{ count: appointments.length, revenue: totalRevenue }]
  }

  // Technician stats with revenue
  if (sql.includes('GROUP BY t.nickname')) {
    const monthStart = new Date()
    monthStart.setDate(1)
    const monthStr = monthStart.toISOString().split('T')[0]

    const technicians = await fetchJson(`${SUPABASE_URL}/rest/v1/technicians?`, { headers })
    const appointments = await fetchJson(
      `${SUPABASE_URL}/rest/v1/appointments?date=gte.${monthStr}&status=eq.confirmed`,
      { headers }
    )
    const services = await fetchJson(`${SUPABASE_URL}/rest/v1/services?`, { headers })

    return technicians.map((t: any) => {
      const techApts = appointments.filter((a: any) => a.technician_id === t.id)
      const revenue = techApts.reduce((sum: number, a: any) => {
        const svc = services.find((s: any) => s.id === a.service_id)
        return sum + (svc?.price || 0)
      }, 0)
      return { nickname: t.nickname, bookings: techApts.length, revenue }
    })
  }

  // Appointments with JOIN
  if (sql.includes('JOIN technicians') && sql.includes('JOIN services')) {
    const today = new Date().toISOString().split('T')[0]
    const appointments = await fetchJson(
      `${SUPABASE_URL}/rest/v1/appointments?date=gte.${today}&order=date.asc,start_time.asc`,
      { headers }
    )
    const technicians = await fetchJson(`${SUPABASE_URL}/rest/v1/technicians?`, { headers })
    const services = await fetchJson(`${SUPABASE_URL}/rest/v1/services?`, { headers })

    return appointments.map((a: any) => ({
      ...a,
      technician_nickname: technicians.find((t: any) => t.id === a.technician_id)?.nickname || '未知',
      service_name: services.find((s: any) => s.id === a.service_id)?.name || '未知',
      price: services.find((s: any) => s.id === a.service_id)?.price || 0
    }))
  }

  // Shift counts per technician
  if (sql.includes('LEFT JOIN shifts')) {
    const technicians = await fetchJson(`${SUPABASE_URL}/rest/v1/technicians?`, { headers })
    const today = new Date().toISOString().split('T')[0]
    const shifts = await fetchJson(
      `${SUPABASE_URL}/rest/v1/shifts?date=gte.${today}`,
      { headers }
    )

    const shiftsMap: Record<string, number> = {}
    shifts.forEach((s: any) => {
      shiftsMap[s.technician_id] = (shiftsMap[s.technician_id] || 0) + 1
    })

    return technicians.map((t: any) => ({
      nickname: t.nickname,
      shift_count: shiftsMap[t.id] || 0
    }))
  }

  // Simple SELECT * queries
  const fromMatch = sql.match(/FROM\s+(\w+)/i)
  if (!fromMatch) return []

  const table = fromMatch[1]
  let url = `${SUPABASE_URL}/rest/v1/${table}?`

  if (table === 'technicians') {
    url += 'order=nickname.asc'
  } else if (table === 'services') {
    url += 'order=price.asc'
  } else if (table === 'shifts') {
    url += 'order=date.asc&limit=7'
  }

  return fetchJson(url, { headers })
}

export async function insertAppointment(data: {
  technician_id: string
  service_id: string
  client_nickname: string
  client_phone: string
  date: string
  start_time: string
  end_time: string
}) {
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }

  return fetch(`${SUPABASE_URL}/rest/v1/appointments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  }).then(r => r.json())
}