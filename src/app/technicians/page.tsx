import { query } from '@/lib/db'
import { Technician } from '@/lib/types'
import Link from 'next/link'

async function getTechnicians() {
  const result = await query('SELECT * FROM technicians ORDER BY nickname')
  return result.rows as Technician[]
}

async function getShiftsCount() {
  const result = await query(`
    SELECT t.nickname, COUNT(s.id) as shift_count
    FROM technicians t
    LEFT JOIN shifts s ON s.technician_id = t.id AND s.date >= CURRENT_DATE
    GROUP BY t.nickname
    ORDER BY t.nickname
  `)
  return result.rows
}

export default async function TechniciansPage() {
  const technicians = await getTechnicians()
  const shiftsCount = await getShiftsCount()
  const shiftsMap = Object.fromEntries(shiftsCount.map((s: any) => [s.nickname, s.shift_count]))

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-white py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-accent hover:underline mb-2 block">← 返回首頁</Link>
          <h1 className="text-2xl font-bold">👥 我們的技師團隊</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {technicians.map((tech: any) => (
            <div key={tech.id} className="bg-white rounded-xl p-6 shadow hover:shadow-lg transition-all">
              <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center text-3xl mx-auto mb-4">
                {tech.nickname[0]}
              </div>
              <h3 className="text-xl font-bold text-primary text-center">{tech.nickname}</h3>
              <p className="text-center text-sm text-gray-500 mb-2">{tech.name}</p>
              <p className="text-center text-sm text-secondary mb-4">{tech.specialty}</p>
              <div className="text-center text-xs text-gray-400">
                未來一週班表：{shiftsMap[tech.nickname] || 0} 個時段
              </div>
              <Link
                href={`/book?technician=${tech.id}`}
                className="block mt-4 bg-primary text-white text-center py-2 rounded-lg hover:bg-secondary transition-colors"
              >
                立即預約
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}