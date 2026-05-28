import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-white py-6 px-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">🌿 身心靈預約</h1>
          <p className="text-accent text-sm mt-1">專業按摩・美容服務</p>
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
          <div className="bg-white rounded-xl p-4 shadow border-l-4 border-primary">
            <h4 className="font-bold text-primary">輕紆壓按摩</h4>
            <p className="text-sm text-gray-500">60 分鐘</p>
            <p className="text-lg font-bold text-primary mt-2">$800</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow border-l-4 border-secondary">
            <h4 className="font-bold text-secondary">深層組織按摩</h4>
            <p className="text-sm text-gray-500">90 分鐘</p>
            <p className="text-lg font-bold text-secondary mt-2">$1,200</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow border-l-4 border-accent">
            <h4 className="font-bold text-primary">全身舒壓按摩</h4>
            <p className="text-sm text-gray-500">120 分鐘</p>
            <p className="text-lg font-bold text-primary mt-2">$1,600</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-primary text-white text-center py-4 mt-8">
        <p className="text-sm">24小時服務 ・ 全年不休</p>
      </footer>
    </div>
  )
}