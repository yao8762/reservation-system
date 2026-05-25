import { query } from '@/lib/db'
import { Technician, Service } from '@/lib/types'
import Link from 'next/link'

async function getTechnicians() {
  const result = await query('SELECT * FROM technicians ORDER BY nickname')
  return result.rows as Technician[]
}

async function getServices() {
  const result = await query('SELECT * FROM services ORDER BY price')
  return result.rows as Service[]
}

async function getAvailableDates() {
  const result = await query(`
    SELECT DISTINCT date FROM shifts 
    WHERE date >= CURRENT_DATE 
    ORDER BY date 
    LIMIT 7
  `)
  return result.rows.map((r: any) => r.date)
}

export default async function BookPage() {
  const [technicians, services, dates] = await Promise.all([
    getTechnicians(),
    getServices(),
    getAvailableDates()
  ])
  const techList = technicians as any[]
  const svcList = services as any[]
  const dateList = dates as string[]

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-white py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-accent hover:underline mb-2 block">← 返回首頁</Link>
          <h1 className="text-2xl font-bold">📅 預約服務</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Step 1: 選擇技師 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <span className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
            選擇技師
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {techList.map((tech: any) => (
              <button
                key={tech.id}
                data-technician={tech.id}
                className="tech-btn p-4 bg-white rounded-xl shadow text-center hover:shadow-lg transition-all border-2 border-transparent hover:border-primary"
              >
                <div className="w-12 h-12 rounded-full bg-accent mx-auto mb-2 flex items-center justify-center text-lg">
                  {tech.nickname[0]}
                </div>
                <p className="font-bold text-sm">{tech.nickname}</p>
                <p className="text-xs text-gray-500">{tech.specialty}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Step 2: 選擇服務 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <span className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
            選擇服務
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {svcList.map((service: any) => (
              <button
                key={service.id}
                data-service={service.id}
                className="service-btn p-4 bg-white rounded-xl shadow text-left hover:shadow-lg transition-all border-2 border-transparent hover:border-primary"
              >
                <p className="font-bold text-primary">{service.name}</p>
                <p className="text-sm text-gray-500">{service.duration_minutes} 分鐘</p>
                <p className="text-xl font-bold text-primary mt-2">${service.price}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Step 3: 選擇日期 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <span className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
            選擇日期
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {dateList.map((date: any) => {
              const d = new Date(date)
              return (
                <button
                  key={date}
                  data-date={date}
                  className="date-btn flex-shrink-0 px-4 py-3 bg-white rounded-xl shadow hover:shadow-lg transition-all border-2 border-transparent hover:border-primary text-center min-w-[80px]"
                >
                  <p className="text-xs text-gray-500">{d.toLocaleDateString('zh-TW', { weekday: 'short' })}</p>
                  <p className="font-bold text-lg">{d.getDate()}</p>
                  <p className="text-xs text-gray-500">{d.toLocaleDateString('zh-TW', { month: 'short' })}</p>
                </button>
              )
            })}
          </div>
        </section>

        {/* Step 4: 填寫資料 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <span className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
            填寫資料
          </h2>
          <div className="bg-white rounded-xl p-6 shadow space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">暱稱</label>
              <input
                type="text"
                id="nickname"
                placeholder="請輸入暱稱"
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">電話</label>
              <input
                type="tel"
                id="phone"
                placeholder="0912345678"
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </section>

        {/* Submit */}
        <button
          id="submit-btn"
          className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled
        >
          確認預約
        </button>

        <p className="text-center text-sm text-gray-500 mt-4">
          📍 24小時服務・全年不休<br/>
          💬 如需更改預約，請致電客服
        </p>
      </main>
    </div>
  )
}