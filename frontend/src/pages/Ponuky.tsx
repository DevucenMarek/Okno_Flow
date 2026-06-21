import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ChevronRight, Loader2, X, FileText, CheckCircle2, Clock, XCircle, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import { useAuth } from '@/context/AuthContext'
import clsx from 'clsx'

export interface Ponuka {
  id: string
  cislo_ponuky: string
  zakaznik_id?: string | null
  zakaznik_nazov: string
  adresa_montaze?: string | null
  kontakt?: string | null
  email?: string | null
  obchodnik?: string | null
  popis_systemu?: string | null
  typ_prac?: string | null
  rozsah_vyrobkov?: string | null
  pocet_napilkov?: number | null
  poznamka?: string | null
  objem_spolu?: number | null
  zalona?: number | null
  termin_platnosti?: string | null
  stav: 'rozpracovana' | 'odoslana' | 'odsouhlasena' | 'zamietnuta' | 'prevzata'
  zakazka_id?: string | null
  created_at: string
}

export const stavPonukyLabels: Record<Ponuka['stav'], { label: string; cls: string; icon: React.ElementType }> = {
  rozpracovana: { label: 'Rozpracovaná', cls: 'bg-gray-100 text-gray-500',     icon: Clock },
  odoslana:     { label: 'Odoslaná',     cls: 'bg-[#e3f0fd] text-[#0779e4]',  icon: FileText },
  odsouhlasena: { label: 'Odsúhlasená', cls: 'bg-[#e8f5e9] text-[#57a85b]',  icon: CheckCircle2 },
  zamietnuta:   { label: 'Zamietnutá',   cls: 'bg-red-50 text-red-500',        icon: XCircle },
  prevzata:     { label: 'Prevzatá →ZoD', cls: 'bg-purple-50 text-purple-600', icon: ArrowRight },
}

const filtre: { key: Ponuka['stav'] | 'vsetky'; label: string }[] = [
  { key: 'vsetky',       label: 'Všetky' },
  { key: 'rozpracovana', label: 'Rozpracované' },
  { key: 'odoslana',     label: 'Odoslané' },
  { key: 'odsouhlasena', label: 'Odsúhlasené' },
  { key: 'zamietnuta',   label: 'Zamietnuté' },
  { key: 'prevzata',     label: 'Prevzaté' },
]

function formatEur(n?: number | null) {
  if (!n) return '—'
  return n.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}
function formatDatum(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric', year: '2-digit' })
}

const inputCls = 'w-full px-3 py-2 rounded-[8px] border border-[#e0e0e0] text-sm text-[#1a2332] placeholder:text-[#c1cad6] focus:outline-none focus:border-[#0779e4] focus:ring-2 focus:ring-[#0779e4]/10 transition-colors bg-white'
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#8b9bb4] mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const emptyForm = {
  zakaznik_nazov: '', adresa_montaze: '', kontakt: '', email: '', obchodnik: '',
  popis_systemu: '', typ_prac: '', rozsah_vyrobkov: '', pocet_napilkov: '',
  objem_spolu: '', zalona: '', termin_platnosti: '', poznamka: '',
}

export async function generateCisloPonuky(): Promise<string> {
  const year = new Date().getFullYear().toString().slice(2)
  const { count } = await supabase
    .from('ponuky').select('*', { count: 'exact', head: true })
    .ilike('cislo_ponuky', `${year}P%`)
  return `${year}P${String((count ?? 0) + 1).padStart(3, '0')}`
}

export default function Ponuky() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const userMeno = profile?.meno || profile?.email || 'Neznámy'
  const [ponuky, setPonuky] = useState<Ponuka[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Ponuka['stav'] | 'vsetky'>('vsetky')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    let q = supabase.from('ponuky').select('*').order('created_at', { ascending: false })
    if (filter !== 'vsetky') q = q.eq('stav', filter)
    if (search) q = q.or(`cislo_ponuky.ilike.%${search}%,zakaznik_nazov.ilike.%${search}%`)
    const { data } = await q
    setPonuky((data ?? []) as Ponuka[])
    setLoading(false)
  }

  useEffect(() => { load() }, [filter, search])

  async function save() {
    if (!form.zakaznik_nazov.trim()) { setError('Zákazník je povinný'); return }
    setSaving(true); setError(null)
    const cislo_ponuky = await generateCisloPonuky()

    let zakaznikId: string | null = null
    const { data: existing } = await supabase
      .from('zakaznici').select('id').ilike('nazov', form.zakaznik_nazov.trim()).limit(1).maybeSingle()
    if (existing) {
      zakaznikId = existing.id
    } else {
      const { data: novy } = await supabase.from('zakaznici').insert({
        nazov: form.zakaznik_nazov.trim(),
        adresa: form.adresa_montaze || null,
        kontakt: form.kontakt || null,
        email: form.email || null,
      }).select('id').single()
      zakaznikId = novy?.id ?? null
    }

    const { data: nova, error: e } = await supabase.from('ponuky').insert({
      cislo_ponuky,
      zakaznik_id: zakaznikId,
      zakaznik_nazov: form.zakaznik_nazov.trim(),
      adresa_montaze: form.adresa_montaze || null,
      kontakt: form.kontakt || null,
      email: form.email || null,
      obchodnik: form.obchodnik || null,
      popis_systemu: form.popis_systemu || null,
      typ_prac: form.typ_prac || null,
      rozsah_vyrobkov: form.rozsah_vyrobkov || null,
      pocet_napilkov: form.pocet_napilkov ? parseInt(form.pocet_napilkov) : null,
      objem_spolu: form.objem_spolu ? parseFloat(form.objem_spolu.replace(',', '.')) : null,
      zalona: form.zalona ? parseFloat(form.zalona.replace(',', '.')) : null,
      termin_platnosti: form.termin_platnosti || null,
      poznamka: form.poznamka || null,
      created_by: userMeno,
      updated_by: userMeno,
    }).select('id').single()

    if (e) { setError(e.message); setSaving(false); return }
    if (nova?.id) {
      await logActivity('ponuka', nova.id, 'vytvoril', `Ponuka ${cislo_ponuky} vytvorená`, userMeno)
    }
    setSaving(false); setShowModal(false); setForm(emptyForm)
    if (nova?.id) navigate(`/ponuky/${nova.id}`)
    else load()
  }

  const f = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  const aktualneCount = ponuky.filter(p => ['rozpracovana','odoslana','odsouhlasena'].includes(p.stav)).length
  const celkovyObjem = ponuky.filter(p => !['zamietnuta','prevzata'].includes(p.stav)).reduce((s, p) => s + (p.objem_spolu || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2332]">Cenové ponuky</h1>
          <p className="text-sm text-[#8b9bb4]">{aktualneCount} aktívnych · {formatEur(celkovyObjem)} potenciál</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setError(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-[#66bb6a] text-white text-sm font-medium rounded-[8px] hover:bg-[#57a85b] transition-colors">
          <Plus size={15} /> Nová ponuka
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1 bg-white rounded-[8px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-1 overflow-x-auto">
          {filtre.map(fi => (
            <button key={fi.key} onClick={() => setFilter(fi.key)} className={clsx(
              'px-3 py-1.5 rounded-[6px] text-sm font-medium transition-colors whitespace-nowrap',
              filter === fi.key ? 'bg-[#1c2636] text-white' : 'text-[#8b9bb4] hover:text-[#1a2332] hover:bg-[#f4f6f9]'
            )}>{fi.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white rounded-[8px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] px-3 py-2 flex-1">
          <Search size={15} className="text-[#8b9bb4]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadať ponuku alebo zákazníka..."
            className="bg-transparent text-sm text-[#4a5568] placeholder:text-[#8b9bb4] outline-none w-full" />
        </div>
      </div>

      <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-[#8b9bb4]">
            <Loader2 size={18} className="animate-spin" /><span className="text-sm">Načítavam ponuky...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f4f6f9] bg-[#f8f9fb]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b9bb4] uppercase tracking-wide">Ponuka</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b9bb4] uppercase tracking-wide">Zákazník</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b9bb4] uppercase tracking-wide">Systém</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#8b9bb4] uppercase tracking-wide">Objem</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b9bb4] uppercase tracking-wide">Platí do</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b9bb4] uppercase tracking-wide">Stav</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f4f6f9]">
                {ponuky.map(p => {
                  const s = stavPonukyLabels[p.stav]
                  return (
                    <tr key={p.id} onClick={() => navigate(`/ponuky/${p.id}`)}
                      className="hover:bg-[#f8f9fb] transition-colors cursor-pointer group">
                      <td className="px-4 py-3">
                        <p className="font-bold text-[#1a2332] font-mono">{p.cislo_ponuky}</p>
                        <p className="text-xs text-[#8b9bb4]">{formatDatum(p.created_at)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#1a2332]">{p.zakaznik_nazov}</p>
                        <p className="text-xs text-[#8b9bb4] truncate max-w-[180px]">{p.adresa_montaze}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[#4a5568] text-xs">{p.popis_systemu}</p>
                        <p className="text-xs text-[#8b9bb4]">{p.typ_prac}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#1a2332]">{formatEur(p.objem_spolu)}</td>
                      <td className="px-4 py-3 text-sm text-[#4a5568]">{formatDatum(p.termin_platnosti)}</td>
                      <td className="px-4 py-3">
                        <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-full', s.cls)}>{s.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight size={16} className="text-[#e0e0e0] group-hover:text-[#8b9bb4] transition-colors" />
                      </td>
                    </tr>
                  )
                })}
                {ponuky.length === 0 && !loading && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-[#8b9bb4]">
                    Žiadne ponuky — klikni na "Nová ponuka"
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm overflow-y-auto py-8">
          <div className="bg-white rounded-[12px] shadow-xl w-full max-w-2xl mx-4 my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f4f6f9]">
              <h2 className="font-semibold text-[#1a2332]">Nová cenová ponuka</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-[6px] text-[#8b9bb4] hover:bg-[#f4f6f9]"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Zákazník" required>
                  <input autoFocus value={form.zakaznik_nazov} onChange={f('zakaznik_nazov')} placeholder="Meno alebo firma" className={inputCls} />
                </Field>
                <Field label="Obchodník">
                  <input value={form.obchodnik} onChange={f('obchodnik')} placeholder="napr. Ing. Longvová" className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Adresa montáže">
                  <input value={form.adresa_montaze} onChange={f('adresa_montaze')} placeholder="Ulica, mesto" className={inputCls} />
                </Field>
                <Field label="Kontakt">
                  <input value={form.kontakt} onChange={f('kontakt')} placeholder="+421 9XX XXX XXX" className={inputCls} />
                </Field>
              </div>
              <Field label="E-mail">
                <input value={form.email} onChange={f('email')} type="email" placeholder="zakaznik@email.sk" className={inputCls} />
              </Field>
              <hr className="border-[#f4f6f9]" />
              <div className="grid grid-cols-3 gap-4">
                <Field label="Systém">
                  <input value={form.popis_systemu} onChange={f('popis_systemu')} placeholder="SYNEGO, Štandard..." className={inputCls} />
                </Field>
                <Field label="Typ prác">
                  <input value={form.typ_prac} onChange={f('typ_prac')} placeholder="D, M, MV, L..." className={inputCls} />
                </Field>
                <Field label="Počet nápilkov">
                  <input value={form.pocet_napilkov} onChange={f('pocet_napilkov')} type="number" min="0" className={inputCls} />
                </Field>
              </div>
              <Field label="Rozsah výrobkov">
                <input value={form.rozsah_vyrobkov} onChange={f('rozsah_vyrobkov')} placeholder="napr. 3×DKR, 5×O, 2×D" className={inputCls} />
              </Field>
              <hr className="border-[#f4f6f9]" />
              <div className="grid grid-cols-3 gap-4">
                <Field label="Objem spolu (€)">
                  <input value={form.objem_spolu} onChange={f('objem_spolu')} placeholder="0.00" className={inputCls} />
                </Field>
                <Field label="Záloha (€)">
                  <input value={form.zalona} onChange={f('zalona')} placeholder="0.00" className={inputCls} />
                </Field>
                <Field label="Platnosť ponuky">
                  <input value={form.termin_platnosti} onChange={f('termin_platnosti')} type="date" className={inputCls} />
                </Field>
              </div>
              <Field label="Poznámka">
                <textarea value={form.poznamka} onChange={f('poznamka')} rows={2} className={`${inputCls} resize-none`} placeholder="Interná poznámka..." />
              </Field>
              {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-[8px]">{error}</p>}
            </div>
            <div className="px-6 pb-5 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-[#e0e0e0] rounded-[8px] hover:bg-[#f4f6f9] transition-colors">Zrušiť</button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-[#66bb6a] text-white text-sm font-medium rounded-[8px] hover:bg-[#57a85b] disabled:opacity-60 transition-colors">
                {saving && <Loader2 size={13} className="animate-spin" />} Vytvoriť ponuku
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
