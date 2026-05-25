import { query } from '@/lib/db'
import Link from 'next/link'

async function getAppointments() {
  const result = await query(`
    SELECT 
      a.*,
      t.nickname as technician_nickname,
      s.name as service_name,
      s.price
    FROM appointments a
    JOIN technicians t ON t.id = a.technician_id
    JOIN services s ON s.id = a.service_id
    WHERE a.date >= CURRENT_DATE
    ORDER BY a.date, a.start_time
  `)
  return result.rows
}

async function getStats() {
  const today = await query(`
    SELECT COUNT(*) as count, COALESCE(SUM(s.price), 0) as revenue
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.date = CURRENT_DATE AND a.status = 'confirmed'
  `)
  
  const month = await query(`
    SELECT COUNT(*) as count, COALESCE(SUM(s.price), 0) as revenue
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.date >= DATE_TRUNC('month', CURRENT_DATE) AND a.status = 'confirmed'
  `)

  const techStats = await query(`
    SELECT t.nickname, COUNT(a.id) as bookings, COALESCE(SUM(s.price), 0) as revenue
    FROM technicians t
    LEFT JOIN appointments a ON a.technician_id = t.id AND a.status = 'confirmed' AND a.date >= DATE_TRUNC('month', CURRENT_DATE)
    LEFT JOIN services s ON s.id = a.service_id
    GROUP BY t.nickname
    ORDER BY revenue DESC
  `)

  return {
    today: today.rows[0],
    month: month.rows[0],
    techStats: techStats.rows
  }
}

export default async function AdminPage() {
  const [appointments, stats] = await Promise.all([
    getAppointments(),
    getStats()
  ])

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-white py-6 px-4">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="text-accent hover:underline mb-2 block">← 返回首頁</Link>
          <h1 className="text-2xl font-bold">⚙️ 管理員後台</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow">
            <p className="text-sm text-gray-500">今日預約</p>
            <p className="text-3xl font-bold text-primary">{stats.today.count}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow">
            <p className="text-sm text-gray-500">今日營收</p>
            <p className="text-3xl font-bold text-primary">${Number(stats.today.revenue).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow">
            <p className="text-sm text-gray-500">本月預約</p>
            <p className="text-3xl font-bold text-secondary">{stats.month.count}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow">
            <p className="text-sm text-gray-500">本月營收</p>
            <p className="text-3xl font-bold text-secondary">${Number(stats.month.revenue).toLocaleString()}</p>
          </div>
        </div>

        {/* Technician Stats */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-primary mb-4">技師本月業績</h2>
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-accent">
                <tr>
                  <th className="text-left px-4 py-3 font-bold">技師</th>
                  <th className="text-center px-4 py-3 font-bold">預約數</th>
                  <th className="text-right px-4 py-3 font-bold">業績</th>
                </tr>
              </thead>
              <tbody>
                {stats.techStats.map((tech: any) => (
                  <tr key={tech.nickname} className="border-t">
                    <td className="px-4 py-3 font-bold">{tech.nickname}</td>
                    <td className="px-4 py-3 text-center">{tech.bookings}</td>
                    <td className="px-4 py-3 text-right font-bold text-primary">${Number(tech.revenue).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Appointments List */}
        <section>
          <h2 className="text-lg font-bold text-primary mb-4">近期預約</h2>
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {appointments.length === 0 ? (
              <p className="text-center py-8 text-gray-500">目前沒有預約</p>
            ) : (
              <table className="w-full">
                <thead className="bg-accent">
                  <tr>
                    <th className="text-left px-4 py-3 font-bold">日期</th>
                    <th className="text-left px-4 py-3 font-bold">技師</th>
                    <th className="text-left px-4 py-3 font-bold">服務</th>
                    <th className="text-left px-4 py-3 font-bold">客戶</th>
                    <th className="text-center px-4 py-3 font-bold">狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((apt: any) => (
                    <tr key={apt.id} className="border-t">
                      <td className="px-4 py-3">
                        <p className="font-bold">{new Date(apt.date).toLocaleDateString('zh-TW')}</p>
                        <p className="text-sm text-gray-500">{apt.start_time.slice(0,5)}</p>
                      </td>
                      <td className="px-4 py-3">{apt.technician_nickname}</td>
                      <td className="px-4 py-3">
                        <p>{apt.service_name}</p>
                        <p className="text-sm text-primary font-bold">${apt.price}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{apt.client_nickname}</p>
                        <p className="text-sm text-gray-500">{apt.client_phone}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-sm ${
                          apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {apt.status === 'confirmed' ? '已確認' : apt.status === 'cancelled' ? '已取消' : '已完成'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}