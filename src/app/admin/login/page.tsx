'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(false)

    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()

      if (data.ok) {
        router.push('/admin')
      } else {
        setError(true)
        setTimeout(() => setError(false), 2000)
      }
    } catch {
      setError(true)
      setTimeout(() => setError(false), 2000)
    } finally {
      setLoading(false)
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
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-secondary transition-colors disabled:opacity-50"
            >
              {loading ? '登入中...' : '登入'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}