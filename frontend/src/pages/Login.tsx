import { useState, FormEvent } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('Vyplňte e-mail a heslo'); return }
    setLoading(true)
    setError(null)
    const err = await signIn(email.trim(), password)
    if (err) {
      setError('Nesprávny e-mail alebo heslo')
      setLoading(false)
    } else {
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / hlavička */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[14px] bg-[#1c2636] mb-4">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="3" width="10" height="10" rx="2" fill="#66bb6a"/>
              <rect x="15" y="3" width="10" height="10" rx="2" fill="#0779e4" opacity="0.7"/>
              <rect x="3" y="15" width="10" height="10" rx="2" fill="#0779e4" opacity="0.7"/>
              <rect x="15" y="15" width="10" height="10" rx="2" fill="#66bb6a" opacity="0.5"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1a2332]">Okno Flow</h1>
          <p className="text-sm text-[#8b9bb4] mt-1">ORSAG s.r.o. — interný systém</p>
        </div>

        {/* Formulár */}
        <div className="bg-white rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#8b9bb4] mb-1.5">E-mail</label>
              <input
                type="email"
                autoFocus
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vas@email.sk"
                className="w-full px-3 py-2.5 rounded-[8px] border border-[#e0e0e0] text-sm text-[#1a2332] placeholder:text-[#c1cad6] focus:outline-none focus:border-[#0779e4] focus:ring-2 focus:ring-[#0779e4]/10 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8b9bb4] mb-1.5">Heslo</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 rounded-[8px] border border-[#e0e0e0] text-sm text-[#1a2332] placeholder:text-[#c1cad6] focus:outline-none focus:border-[#0779e4] focus:ring-2 focus:ring-[#0779e4]/10 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b9bb4] hover:text-[#4a5568]"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-[8px]">{error}</p>
            )}

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-[#0779e4] hover:underline">
                Zabudnuté heslo?
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1c2636] text-white text-sm font-medium rounded-[8px] hover:bg-[#263347] disabled:opacity-60 transition-colors"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Prihlásiť sa
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#8b9bb4] mt-6">
          Prístup len pre zamestnancov ORSAG s.r.o.
        </p>
      </div>
    </div>
  )
}
