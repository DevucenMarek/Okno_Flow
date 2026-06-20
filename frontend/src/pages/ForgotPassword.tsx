import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email) { setError('Zadajte e-mail'); return }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) setError('Chyba pri odosielaní e-mailu. Skúste znova.')
    else setSent(true)
    setLoading(false)
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
          <h1 className="text-2xl font-bold text-[#1a2332]">Zabudnuté heslo</h1>
          <p className="text-sm text-[#8b9bb4] mt-1">Pošleme ti odkaz na obnovenie</p>
        </div>

        <div className="bg-white rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-6">
          {sent ? (
            <div className="text-center py-2">
              <CheckCircle2 size={40} className="text-[#66bb6a] mx-auto mb-3" />
              <p className="font-medium text-[#1a2332]">E-mail odoslaný!</p>
              <p className="text-sm text-[#8b9bb4] mt-1">Skontroluj svoju schránku a klikni na odkaz.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8b9bb4] mb-1.5">E-mail</label>
                <input
                  type="email"
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="vas@email.sk"
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
                Odoslať odkaz
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-4">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-[#8b9bb4] hover:text-[#1a2332] transition-colors">
            <ArrowLeft size={14} /> Späť na prihlásenie
          </Link>
        </div>
      </div>
    </div>
  )
}
