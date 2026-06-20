import { useState, useEffect } from 'react'
import { Users, Edit2, X, Loader2, Plus, Mail, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth, Rola } from '@/context/AuthContext'
import clsx from 'clsx'

interface Profile {
  id: string
  email: string
  meno?: string | null
  rola: Rola
  created_at: string
}

const rolaLabels: Record<Rola, string> = {
  admin: 'Administrátor',
  obchodnik: 'Obchodník',
  montaznik: 'Montážnik',
  skladnik: 'Skladník',
}

const rolaCls: Record<Rola, string> = {
  admin: 'bg-purple-50 text-purple-700',
  obchodnik: 'bg-[#e3f0fd] text-[#0779e4]',
  montaznik: 'bg-amber-50 text-amber-700',
  skladnik: 'bg-[#e8f5e9] text-[#57a85b]',
}

const inputCls = 'w-full px-3 py-2 rounded-[8px] border border-[#e0e0e0] text-sm text-[#1a2332] placeholder:text-[#c1cad6] focus:outline-none focus:border-[#0779e4] focus:ring-2 focus:ring-[#0779e4]/10 transition-colors bg-white'

export default function Nastavenia() {
  const { rola: myRola, profile: myProfile } = useAuth()
  const isAdmin = myRola === 'admin'

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState<Profile | null>(null)
  const [editForm, setEditForm] = useState({ meno: '', rola: 'obchodnik' as Rola })
  const [saving, setSaving] = useState(false)

  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRola, setInviteRola] = useState<Rola>('obchodnik')
  const [inviting, setInviting] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setProfiles(data ?? [])
    setLoading(false)
  }

  useEffect(() => { if (isAdmin) load(); else setLoading(false) }, [isAdmin])

  function openEdit(p: Profile) {
    setEditTarget(p)
    setEditForm({ meno: p.meno ?? '', rola: p.rola })
  }

  async function saveEdit() {
    if (!editTarget) return
    setSaving(true)
    await supabase.from('profiles').update({
      meno: editForm.meno || null,
      rola: editForm.rola,
    }).eq('id', editTarget.id)
    setSaving(false)
    setEditTarget(null)
    load()
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) { setInviteError('Zadaj e-mail'); return }
    setInviting(true)
    setInviteError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: inviteEmail.trim(),
      options: { shouldCreateUser: true },
    })
    if (error) {
      setInviteError('Chyba: ' + error.message)
      setInviting(false)
      return
    }
    // Nastaviť rolu po vytvorení (trigger vytvorí profil)
    setTimeout(async () => {
      await supabase.from('profiles').update({ rola: inviteRola }).eq('email', inviteEmail.trim())
      load()
    }, 2000)
    setInviting(false)
    setInviteSent(true)
    setInviteEmail('')
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1a2332]">Nastavenia</h1>
        <p className="text-sm text-[#8b9bb4]">Správa systému a používateľov</p>
      </div>

      {/* Môj profil */}
      <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
        <h2 className="font-semibold text-[#1a2332] mb-4 flex items-center gap-2">
          <ShieldCheck size={16} className="text-[#0779e4]" /> Môj účet
        </h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#1c2636] flex items-center justify-center">
            <span className="text-white font-bold text-lg">
              {(myProfile?.meno || myProfile?.email || '?')[0].toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-[#1a2332]">{myProfile?.meno || myProfile?.email}</p>
            <p className="text-xs text-[#8b9bb4]">{myProfile?.email}</p>
            {myRola && (
              <span className={clsx('inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1', rolaCls[myRola])}>
                {rolaLabels[myRola]}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Správa používateľov – len admin */}
      {isAdmin && (
        <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f4f6f9]">
            <h2 className="font-semibold text-[#1a2332] flex items-center gap-2">
              <Users size={16} className="text-[#0779e4]" /> Používatelia
            </h2>
            <button
              onClick={() => { setShowInvite(true); setInviteSent(false); setInviteError(null) }}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#66bb6a] text-white text-sm font-medium rounded-[8px] hover:bg-[#57a85b] transition-colors"
            >
              <Plus size={14} /> Pozvať
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-[#8b9bb4]">
              <Loader2 size={16} className="animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-[#f4f6f9]">
              {profiles.map(p => (
                <div key={p.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-full bg-[#f4f6f9] flex items-center justify-center flex-shrink-0">
                    <span className="text-[#4a5568] font-semibold text-sm">
                      {(p.meno || p.email || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#1a2332] text-sm">{p.meno || '–'}</p>
                    <p className="text-xs text-[#8b9bb4] truncate">{p.email}</p>
                  </div>
                  <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0', rolaCls[p.rola])}>
                    {rolaLabels[p.rola]}
                  </span>
                  {p.id !== myProfile?.id && (
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 text-[#8b9bb4] hover:text-[#1a2332] hover:bg-[#f4f6f9] rounded-[6px] transition-colors flex-shrink-0"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-[12px] shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f4f6f9]">
              <h2 className="font-semibold text-[#1a2332]">Upraviť používateľa</h2>
              <button onClick={() => setEditTarget(null)} className="p-1 text-[#8b9bb4] hover:bg-[#f4f6f9] rounded-[6px]">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-[#8b9bb4] mb-0.5">E-mail</p>
                <p className="text-sm font-medium text-[#1a2332]">{editTarget.email}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8b9bb4] mb-1.5">Meno</label>
                <input
                  autoFocus
                  value={editForm.meno}
                  onChange={e => setEditForm(f => ({ ...f, meno: e.target.value }))}
                  placeholder="Meno Priezvisko"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8b9bb4] mb-1.5">Rola</label>
                <select value={editForm.rola} onChange={e => setEditForm(f => ({ ...f, rola: e.target.value as Rola }))} className={inputCls}>
                  <option value="admin">Administrátor</option>
                  <option value="obchodnik">Obchodník</option>
                  <option value="montaznik">Montážnik</option>
                  <option value="skladnik">Skladník</option>
                </select>
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-2">
              <button onClick={() => setEditTarget(null)} className="px-4 py-2 text-sm text-[#4a5568] border border-[#e0e0e0] rounded-[8px] hover:bg-[#f4f6f9] transition-colors">
                Zrušiť
              </button>
              <button onClick={saveEdit} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#66bb6a] text-white text-sm font-medium rounded-[8px] hover:bg-[#57a85b] disabled:opacity-60 transition-colors">
                {saving && <Loader2 size={13} className="animate-spin" />}
                Uložiť
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-[12px] shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f4f6f9]">
              <h2 className="font-semibold text-[#1a2332]">Pozvať používateľa</h2>
              <button onClick={() => setShowInvite(false)} className="p-1 text-[#8b9bb4] hover:bg-[#f4f6f9] rounded-[6px]">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {inviteSent ? (
                <div className="text-center py-4">
                  <Mail size={36} className="text-[#66bb6a] mx-auto mb-3" />
                  <p className="font-medium text-[#1a2332]">Pozvánka odoslaná!</p>
                  <p className="text-sm text-[#8b9bb4] mt-1">Používateľ dostane e-mail s odkazom na prihlásenie.</p>
                  <button onClick={() => setShowInvite(false)} className="mt-4 px-4 py-2 bg-[#f4f6f9] text-[#4a5568] text-sm rounded-[8px] hover:bg-[#e8ecf0] transition-colors">
                    Zatvoriť
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#8b9bb4] mb-1.5">E-mail</label>
                    <input autoFocus type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="zamestnanec@email.sk" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#8b9bb4] mb-1.5">Rola</label>
                    <select value={inviteRola} onChange={e => setInviteRola(e.target.value as Rola)} className={inputCls}>
                      <option value="obchodnik">Obchodník</option>
                      <option value="montaznik">Montážnik</option>
                      <option value="skladnik">Skladník</option>
                      <option value="admin">Administrátor</option>
                    </select>
                  </div>
                  <p className="text-xs text-[#8b9bb4]">
                    Používateľ dostane magic link. Po prvom prihlásení si nastaví heslo cez "Zabudnuté heslo".
                  </p>
                  {inviteError && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-[8px]">{inviteError}</p>}
                </>
              )}
            </div>
            {!inviteSent && (
              <div className="px-6 pb-5 flex justify-end gap-2">
                <button onClick={() => setShowInvite(false)} className="px-4 py-2 text-sm text-[#4a5568] border border-[#e0e0e0] rounded-[8px] hover:bg-[#f4f6f9] transition-colors">
                  Zrušiť
                </button>
                <button onClick={sendInvite} disabled={inviting} className="flex items-center gap-2 px-4 py-2 bg-[#66bb6a] text-white text-sm font-medium rounded-[8px] hover:bg-[#57a85b] disabled:opacity-60 transition-colors">
                  {inviting && <Loader2 size={13} className="animate-spin" />}
                  <Mail size={13} /> Poslať pozvánku
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
