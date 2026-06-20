import { useState, useEffect, useRef } from 'react'
import { Search, Plus, Phone, Mail, MapPin, FileText, X, Loader2, ChevronRight, User, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import clsx from 'clsx'

interface Zakaznik {
  id: string
  nazov: string
  adresa?: string | null
  kontakt?: string | null
  email?: string | null
  poznamka?: string | null
  created_at: string
}

interface ZakaznikZakazky {
  count: number
  objem: number
}

const emptyForm = { nazov: '', adresa: '', kontakt: '', email: '', poznamka: '' }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-[12px] shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f4f6f9]">
          <h2 className="font-semibold text-[#1a2332]">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-[6px] text-[#8b9bb4] hover:bg-[#f4f6f9] transition-colors">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#8b9bb4] mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 rounded-[8px] border border-[#e0e0e0] text-sm text-[#1a2332] placeholder:text-[#c1cad6] focus:outline-none focus:border-[#0779e4] focus:ring-2 focus:ring-[#0779e4]/10 transition-colors'

export default function Zakaznici() {
  const [zakaznici, setZakaznici] = useState<Zakaznik[]>([])
  const [stats, setStats] = useState<Record<string, ZakaznikZakazky>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Zakaznik | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Zakaznik | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    let q = supabase.from('zakaznici').select('*').order('nazov')
    if (search) q = q.ilike('nazov', `%${search}%`)
    const { data } = await q
    setZakaznici(data ?? [])

    // Load stats per zákazník
    const { data: zakazky } = await supabase
      .from('zakazky')
      .select('zakaznik_id, objem_spolu')
      .not('zakaznik_id', 'is', null)

    const s: Record<string, ZakaznikZakazky> = {}
    ;(zakazky ?? []).forEach(z => {
      if (!z.zakaznik_id) return
      if (!s[z.zakaznik_id]) s[z.zakaznik_id] = { count: 0, objem: 0 }
      s[z.zakaznik_id].count++
      s[z.zakaznik_id].objem += z.objem_spolu || 0
    })
    setStats(s)
    setLoading(false)
  }

  useEffect(() => { load() }, [search])

  function openAdd() {
    setEditTarget(null)
    setForm(emptyForm)
    setError(null)
    setShowModal(true)
  }

  function openEdit(z: Zakaznik, e: React.MouseEvent) {
    e.stopPropagation()
    setEditTarget(z)
    setForm({ nazov: z.nazov, adresa: z.adresa ?? '', kontakt: z.kontakt ?? '', email: z.email ?? '', poznamka: z.poznamka ?? '' })
    setError(null)
    setShowModal(true)
  }

  async function save() {
    if (!form.nazov.trim()) { setError('Meno / Firma je povinné'); return }
    setSaving(true)
    setError(null)
    const payload = {
      nazov: form.nazov.trim(),
      adresa: form.adresa || null,
      kontakt: form.kontakt || null,
      email: form.email || null,
      poznamka: form.poznamka || null,
    }
    if (editTarget) {
      const { error: e } = await supabase.from('zakaznici').update(payload).eq('id', editTarget.id)
      if (e) { setError(e.message); setSaving(false); return }
      // Synchronizuj kontaktné údaje na všetky zákazky tohto zákazníka
      await supabase.from('zakazky').update({
        zakaznik_nazov: payload.nazov,
        kontakt: payload.kontakt,
        email: payload.email,
      }).eq('zakaznik_id', editTarget.id)
      if (selected?.id === editTarget.id) setSelected({ ...editTarget, ...payload })
    } else {
      const { error: e } = await supabase.from('zakaznici').insert(payload)
      if (e) { setError(e.message); setSaving(false); return }
    }
    setSaving(false)
    setShowModal(false)
    load()
  }

  async function deleteZakaznik() {
    if (!editTarget) return
    if (!confirm(`Naozaj zmazať zákazníka "${editTarget.nazov}"?`)) return
    await supabase.from('zakaznici').delete().eq('id', editTarget.id)
    setShowModal(false)
    if (selected?.id === editTarget.id) setSelected(null)
    load()
  }

  const formatEur = (n: number) => n.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2332]">Zákazníci</h1>
          <p className="text-sm text-[#8b9bb4]">{zakaznici.length} zákazníkov</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#66bb6a] text-white text-sm font-medium rounded-[8px] hover:bg-[#57a85b] transition-colors"
        >
          <Plus size={15} /> Nový zákazník
        </button>
      </div>

      <div className="flex gap-4">
        {/* Left: list */}
        <div className={clsx('flex flex-col gap-3 transition-all', selected ? 'w-[55%]' : 'w-full')}>
          {/* Search */}
          <div className="flex items-center gap-2 bg-white rounded-[8px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] px-3 py-2">
            <Search size={15} className="text-[#8b9bb4]" />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Hľadať zákazníka..."
              className="bg-transparent text-sm text-[#4a5568] placeholder:text-[#8b9bb4] outline-none w-full"
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-[#8b9bb4]">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">Načítavam zákazníkov...</span>
              </div>
            ) : (
              <div className="divide-y divide-[#f4f6f9]">
                {zakaznici.map(z => {
                  const st = stats[z.id]
                  const isActive = selected?.id === z.id
                  return (
                    <div
                      key={z.id}
                      onClick={() => setSelected(isActive ? null : z)}
                      className={clsx(
                        'flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors group',
                        isActive ? 'bg-[#f0f7ff]' : 'hover:bg-[#f8f9fb]'
                      )}
                    >
                      <div className="w-9 h-9 rounded-full bg-[#e3f0fd] flex items-center justify-center flex-shrink-0">
                        <Building2 size={16} className="text-[#0779e4]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#1a2332] text-sm truncate">{z.nazov}</p>
                        <p className="text-xs text-[#8b9bb4] truncate">{z.adresa || z.kontakt || z.email || '–'}</p>
                      </div>
                      {st && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-medium text-[#1a2332]">{st.count} zákaziek</p>
                          <p className="text-xs text-[#8b9bb4]">{formatEur(st.objem)}</p>
                        </div>
                      )}
                      <ChevronRight size={15} className={clsx('flex-shrink-0 transition-colors', isActive ? 'text-[#0779e4]' : 'text-[#e0e0e0] group-hover:text-[#8b9bb4]')} />
                    </div>
                  )
                })}
                {zakaznici.length === 0 && !loading && (
                  <div className="px-4 py-12 text-center text-[#8b9bb4]">
                    <User size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="font-medium">Žiadni zákazníci</p>
                    <p className="text-xs mt-1">Pridaj prvého kliknutím na "Nový zákazník"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: detail panel */}
        {selected && (
          <div className="flex-1 space-y-3">
            <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#e3f0fd] flex items-center justify-center">
                    <Building2 size={18} className="text-[#0779e4]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-[#1a2332]">{selected.nazov}</h2>
                    <p className="text-xs text-[#8b9bb4]">od {new Date(selected.created_at).toLocaleDateString('sk-SK')}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={e => openEdit(selected, e)}
                    className="px-3 py-1.5 text-xs font-medium border border-[#e0e0e0] text-[#4a5568] rounded-[6px] hover:bg-[#f4f6f9] transition-colors"
                  >
                    Upraviť
                  </button>
                  <button
                    onClick={() => setSelected(null)}
                    className="p-1.5 text-[#8b9bb4] hover:bg-[#f4f6f9] rounded-[6px] transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {selected.adresa && (
                  <div className="flex items-start gap-2.5 text-sm">
                    <MapPin size={14} className="text-[#8b9bb4] mt-0.5 flex-shrink-0" />
                    <span className="text-[#4a5568]">{selected.adresa}</span>
                  </div>
                )}
                {selected.kontakt && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Phone size={14} className="text-[#8b9bb4] flex-shrink-0" />
                    <a href={`tel:${selected.kontakt}`} className="text-[#0779e4] hover:underline">{selected.kontakt}</a>
                  </div>
                )}
                {selected.email && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Mail size={14} className="text-[#8b9bb4] flex-shrink-0" />
                    <a href={`mailto:${selected.email}`} className="text-[#0779e4] hover:underline">{selected.email}</a>
                  </div>
                )}
                {selected.poznamka && (
                  <div className="flex items-start gap-2.5 text-sm">
                    <FileText size={14} className="text-[#8b9bb4] mt-0.5 flex-shrink-0" />
                    <span className="text-[#4a5568]">{selected.poznamka}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            {stats[selected.id] && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4">
                  <p className="text-xs text-[#8b9bb4]">Počet zákaziek</p>
                  <p className="text-2xl font-bold text-[#1a2332]">{stats[selected.id].count}</p>
                </div>
                <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4">
                  <p className="text-xs text-[#8b9bb4]">Celkový objem</p>
                  <p className="text-xl font-bold text-[#1a2332]">{formatEur(stats[selected.id].objem)}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: add / edit */}
      {showModal && (
        <Modal title={editTarget ? 'Upraviť zákazníka' : 'Nový zákazník'} onClose={() => setShowModal(false)}>
          <div className="p-6 space-y-4">
            <Field label="Meno / Firma *">
              <input
                autoFocus
                value={form.nazov}
                onChange={e => setForm(f => ({ ...f, nazov: e.target.value }))}
                placeholder="napr. Spojená škola Poprad"
                className={inputCls}
              />
            </Field>
            <Field label="Adresa">
              <input
                value={form.adresa}
                onChange={e => setForm(f => ({ ...f, adresa: e.target.value }))}
                placeholder="napr. Karpatská 12, 058 01 Poprad"
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefón / Kontakt">
                <input
                  value={form.kontakt}
                  onChange={e => setForm(f => ({ ...f, kontakt: e.target.value }))}
                  placeholder="+421 9XX XXX XXX"
                  className={inputCls}
                />
              </Field>
              <Field label="E-mail">
                <input
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="zakaznik@email.sk"
                  className={inputCls}
                  type="email"
                />
              </Field>
            </div>
            <Field label="Poznámka">
              <textarea
                value={form.poznamka}
                onChange={e => setForm(f => ({ ...f, poznamka: e.target.value }))}
                rows={2}
                className={clsx(inputCls, 'resize-none')}
                placeholder="Interná poznámka..."
              />
            </Field>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <div className="px-6 pb-5 flex items-center justify-between">
            {editTarget ? (
              <button
                onClick={deleteZakaznik}
                className="text-xs text-red-500 hover:underline"
              >
                Zmazať zákazníka
              </button>
            ) : <span />}
            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-[#4a5568] border border-[#e0e0e0] rounded-[8px] hover:bg-[#f4f6f9] transition-colors"
              >
                Zrušiť
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[#66bb6a] text-white text-sm font-medium rounded-[8px] hover:bg-[#57a85b] disabled:opacity-60 transition-colors"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                {editTarget ? 'Uložiť' : 'Pridať'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
