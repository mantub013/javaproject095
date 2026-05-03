import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { login, signup } from '@netlify/identity'
import { useIdentity } from '@/lib/identity-context'
import { Layout } from 'lucide-react'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

type Mode = 'login' | 'signup' | 'confirm'

function LoginPage() {
  const { user, ready } = useIdentity()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (ready && user) {
    navigate({ to: '/boards' })
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
        navigate({ to: '/boards' })
      } else {
        await signup(email, password, { full_name: name })
        setMode('confirm')
      }
    } catch (err: any) {
      setError(err.message || (mode === 'login' ? 'Invalid email or password' : 'Signup failed'))
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'confirm') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✉️</span>
          </div>
          <h2 className="text-xl font-bold mb-2">Check your email</h2>
          <p className="text-gray-500 text-sm mb-6">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
          </p>
          <button onClick={() => setMode('login')} className="text-indigo-600 text-sm hover:underline">
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
            <Layout size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Collaboard</h1>
            <p className="text-xs text-gray-400">Collaborative Whiteboard</p>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-800 mb-6">
          {mode === 'login' ? 'Welcome back' : 'Create an account'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                placeholder="Alice Smith"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-500 text-white rounded-lg py-2.5 font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {mode === 'login' ? (
            <>Don't have an account?{' '}
              <button onClick={() => { setMode('signup'); setError('') }} className="text-indigo-600 font-medium hover:underline">Sign up</button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button onClick={() => { setMode('login'); setError('') }} className="text-indigo-600 font-medium hover:underline">Sign in</button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
