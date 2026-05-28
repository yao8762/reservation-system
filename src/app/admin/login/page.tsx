'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const ADMIN_PASSWORD = 'admin123' // 建議正式上線前改成更複雜的密碼

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const router = useRouter()

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      // Simple session storage check (not secure for production, but MVP level)
      sessionStorage.setItem('admin_logged_in', 'true')
      router.push('/admin')
    } else {
      setError(true)
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="text-primary hover:underline mb-4 block text-center">← 返回首頁</Link>
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-primary text-center mb-2">🔐 管理員登入</h1>
          <p className="text-sm text-gray-500 text-center mb-6">請輸入管理員密碼</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="請輸入密碼"
                className={`w-full border rounded-xl px-4 py-3 text-center text-lg focus:outline-none focus:ring-2 ${
                  error ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-primary'
                }`}
                autoFocus
              />
              {error && <p className="text-red-500 text-sm text-center mt-2">密碼錯誤，請再試一次</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-secondary transition-colors"
            >
              登入
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}