'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Button from '@/components/Button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError('')
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError('Invalid email or password')
      setLoading(false)
    } else {
      // Let middleware handle the redirect based on role
      await new Promise(resolve => setTimeout(resolve, 500))
      window.location.href = '/'
    }
  }

  // Handle Enter key on form inputs
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleLogin()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-50 via-gray-50 to-emerald-100 p-4">
      <div className="bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 w-full max-w-md">
        
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-emerald-50 flex items-center justify-center p-3">
            <img src="/logo_1.png" alt="SupplyChain Logo" className="w-full h-full object-contain" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 poppins-bold text-center tracking-tight">Welcome Back</h1>
        <p className="text-gray-500 text-sm mb-8 poppins-regular text-center">Sign in to continue to SupplyChain</p>

        {error && (
          <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-600 text-sm p-4 rounded-xl mb-6 poppins-regular flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {loading && (
          <div className="bg-emerald-50/80 backdrop-blur-sm border border-emerald-200 text-emerald-700 text-sm p-4 rounded-xl mb-6 poppins-regular flex items-center justify-center gap-3">
            <svg className="animate-spin h-4 w-4 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Signing in...
          </div>
        )}

        <div className="flex flex-col gap-5">
          <div>
            <label className="text-sm text-gray-700 mb-1.5 block poppins-medium">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="you@example.com"
              className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-200 poppins-regular"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm text-gray-700 block poppins-medium">Password</label>
              <a href="#" className="text-xs text-emerald-600 hover:text-emerald-700 poppins-regular transition-colors">Forgot password?</a>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="••••••••"
              className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-200 poppins-regular"
            />
          </div>

          <div className="pt-2">
            <Button
              onClick={handleLogin}
              disabled={loading}
              variant="default"
              fullWidth
              className="py-3 text-base rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500 poppins-regular">
              Don't have an account?{' '}
              <a href="/register" className="text-emerald-600 font-semibold hover:text-emerald-700 hover:underline transition-colors poppins-medium">
                Create one now
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}