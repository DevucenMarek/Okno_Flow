import { useState, useEffect, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validSession, setValidSession] = useState(false)

  useEffect(() => {
    // Supabase spracuje token z URL automaticky cez onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setValidSession(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError('Heslo musí mať aspoň 6 znakov'); return }
    if (password !== password2) { setError('Heslá sa nezhodujú'); return }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError('Chyba pri zmene hesla. Skúste znova.'); setLoading(false); return }
    setDone(true)
    setTimeout(() => navigate('/login'), 2000)
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[14px] bg-[#1c2636] mb-4">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="3" width="10" height="10" rx="2" fill="#66bb6a"/>
              <rect x="15" y="3" width="10" height="10" rx="2" fill="#0779e4" opacity="0.7"/>
              <rect x="3" y="15" width="10" height="10" rx="2" fill="#0779e4" opacity="0.7"/>
              <rect x="15" y="15" width="10" height="10" rx="2" fill="#66bb6a" opacity="0.5"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1a2332]">Nové heslo</h1>
          <p className="text-sm text-[#8b9bb4] mt-1">Zadaj nové heslo pre tvoj účet</p>
        </div>

        <div className="bg-white rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-6">
          {done ? (
            <div className="text-center py-2">
              <CheckCircle2 size={40} className="text-[#66bb6a] mx-auto mb-3" />
              <p className="font-medium text-[#1a2332]">Heslo zmenené!</p>
              <p className="text-sm text-[#8b9bb4] mt-1">Presmerúvam na prihlásenie...</p>
            </div>
          ) : !validSession ? (
            <div className="text-center py-4 text-[#8b9bb4]">
              <p className="text-sm">Čakám na overenie odkazu...</p>
              <p className="text-xs mt-2">Ak to trvá dlho, skús odkaz z e-mailu otvoriť znova.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8b9bb4] mb-1.5">Nové heslo</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    autoFocus
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="min. 6 znakov"
                    className="w-full px-3 py-2.5 pr-10 rounded-[8px] border border-[#e0e0e0] text-sm text-[#1a2332] placeholder:text-[#c1cad6] focus:outline-none focus:border-[#0779e4] focus:ring-2 focus:ring-[#0779e4]/10 transition-colors"
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b9bb4]">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8b9bb4] mb-1.5">Potvrď heslo</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password2}
                  onChange={e => setPassword2(e.target.value)}
                  placeholder="zopakuj heslo"
                  className="w-full px-3 py-2.5 rounded-[8px] border border-[#e0e0e0] text-sm text-[#1a2332] placeholder:text-[#c1cad6] focus:outline-none focus:border-[#0779e4] focus:ring-2 focus:ring-[#0779e4]/10 transition-colors"
                />
              </div>
              {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-[8px]">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1c2636] text-white text-sm font-medium rounded-[8px] hover:bg-[#263347] disabled:opacity-60 transition-colors"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Zmeniť heslo
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
