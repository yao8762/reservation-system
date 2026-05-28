import Link from 'next/link'
import { getServicesCached } from '@/lib/cache'

export default async function HomePage() {
  const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME || '🌿 身心靈預約'
  const businessDesc = process.env.NEXT_PUBLIC_BUSINESS_DESC || '專業按摩・美容服務'
  const services = await getServicesCached()

  const borderColors = ['border-primary', 'border-secondary', 'border-accent', 'border-primary', 'border-secondary', 'border-accent']

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-white py-6 px-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">{businessName}</h1>
          <p className="text-accent text-sm mt-1">{businessDesc}</p>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-3xl font-bold text-primary mb-4">
          預約一個放鬆的時光
        </h2>
        <p className="text-text opacity-80 mb-8">
          選擇專業技師，享受身心靈的呵護
        </p>
        
        <div className="grid md:grid-cols-2 gap-4">
          <Link
            href="/book"
            className="block bg-primary text-white rounded-xl p-6 hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <span className="text-3xl mb-2 block">📅</span>
            <span className="font-bold">立即預約</span>
            <span className="block text-sm text-accent mt-1">選擇技師與時段</span>
          </Link>
          
          <Link
            href="/technicians"
            className="block bg-accent text-primary rounded-xl p-6 hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <span className="text-3xl mb-2 block">👥</span>
            <span className="font-bold">技師列表</span>
            <span className="block text-sm text-primary mt-1">認識我們的團隊</span>
          </Link>
        </div>
      </div>

      {/* Services */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h3 className="text-xl font-bold text-primary mb-4">我們的服務</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {services.map((service, i) => (
            <div key={service.id} className={`bg-white rounded-xl p-4 shadow border-l-4 ${borderColors[i % borderColors.length]}`}>
              <h4 className="font-bold text-primary">{service.name}</h4>
              <p className="text-sm text-gray-500">{service.duration_minutes} 分鐘</p>
              <p className="text-lg font-bold text-primary mt-2">${service.price.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-primary text-white text-center py-4 mt-8">
        <p className="text-sm">24小時服務 ・ 全年不休</p>
      </footer>
    </div>
  )
}