import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, ChevronRight, CheckCircle2, Circle, Clock, Loader2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { StavZakazky, stavLabels, Zakazka, PIPELINE } from '@/types/zakazka'
import clsx from 'clsx'

const filtre: { key: StavZakazky | 'vsetky'; label: string }[] = [
  { key: 'vsetky', label: 'Všetky' },
  { key: 'nova', label: 'Nové' },
  { key: 'aktivna', label: 'Aktívne' },
  { key: 'caka', label: 'Čakajú' },
  { key: 'hotova', label: 'Hotové' },
  { key: 'storno', label: 'Storno' },
]

// Pipeline míľniky — skrátené popisky pre tabuľku
const milniky = PIPELINE.map(p => ({ key: p.key, label: p.label }))

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

interface NovaZakazkaForm {
  cislo_zod: string
  zakaznik_nazov: string
  adresa_montaze: string
  kontakt: string
  obchodnik: string
  stav: StavZakazky
  popis_systemu: string
  typ_prac: string
  rozsah_vyrobkov: string
  pocet_napilkov: string
  objem_spolu: string
  zalona: string
  termin_zod: string
  poznamka: string
}

const emptyForm: NovaZakazkaForm = {
  cislo_zod: '', zakaznik_nazov: '', adresa_montaze: '', kontakt: '',
  obchodnik: '', stav: 'nova', popis_systemu: '', typ_prac: '',
  rozsah_vyrobkov: '', pocet_napilkov: '', objem_spolu: '', zalona: '',
  termin_zod: '', poznamka: '',
}

export default function Zakazky() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<StavZakazky | 'vsetky'>('vsetky')
  const [search, setSearch] = useState('')
  const [zakazky, setZakazky] = useState<Zakazka[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<NovaZakazkaForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    let query = supabase
      .from('zakazky')
      .select('*')
      .order('created_at', { ascending: false })

    if (filter !== 'vsetky') query = query.eq('stav', filter)
    if (search) query = query.or(`cislo_zod.ilike.%${search}%,zakaznik_nazov.ilike.%${search}%,adresa_montaze.ilike.%${search}%`)

    const { data } = await query
    setZakazky(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filter, search])

  async function saveZakazka() {
    if (!form.cislo_zod.trim()) { setError('Číslo ZoD je povinné'); return }
    if (!form.zakaznik_nazov.trim()) { setError('Zákazník je povinný'); return }
    setSaving(true)
    setError(null)

    const today = new Date().toISOString().split('T')[0]
    const nazov = form.zakaznik_nazov.trim()

    // Nájdi existujúceho zákazníka alebo ho vytvor
    let zakaznikId: string | null = null
    const { data: existing } = await supabase
      .from('zakaznici')
      .select('id')
      .ilike('nazov', nazov)
      .limit(1)
      .maybeSingle()

    if (existing) {
      zakaznikId = existing.id
      // Aktualizuj kontakt/adresu ak sú vyplnené a zatiaľ chýbajú
      await supabase.from('zakaznici').update({
        ...(form.adresa_montaze ? { adresa: form.adresa_montaze } : {}),
        ...(form.kontakt ? { kontakt: form.kontakt } : {}),
      }).eq('id', zakaznikId).is('adresa', null)
    } else {
      const { data: novy } = await supabase.from('zakaznici').insert({
        nazov,
        adresa: form.adresa_montaze || null,
        kontakt: form.kontakt || null,
      }).select('id').single()
      zakaznikId = novy?.id ?? null
    }

    const payload = {
      cislo_zod: form.cislo_zod.trim(),
      zakaznik_nazov: nazov,
      zakaznik_id: zakaznikId,
      adresa_montaze: form.adresa_montaze || null,
      kontakt: form.kontakt || null,
      obchodnik: form.obchodnik || null,
      stav: form.stav,
      popis_systemu: form.popis_systemu || null,
      typ_prac: form.typ_prac || null,
      rozsah_vyrobkov: form.rozsah_vyrobkov || null,
      pocet_napilkov: form.pocet_napilkov ? parseInt(form.pocet_napilkov) : null,
      objem_spolu: form.objem_spolu ? parseFloat(form.objem_spolu.replace(',', '.')) : null,
      zalona: form.zalona ? parseFloat(form.zalona.replace(',', '.')) : null,
      termin_zod: form.termin_zod || null,
      poznamka: form.poznamka || null,
      dat_dopyt: today,
    }

    const { error: e } = await supabase.from('zakazky').insert(payload)
    if (e) {
      setError(e.message.includes('unique') ? 'Zákazka s týmto číslom ZoD už existuje' : e.message)
      setSaving(false)
      return
    }
    setSaving(false)
    setShowModal(false)
    setForm(emptyForm)
    load()
  }

  const f = (key: keyof NovaZakazkaForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2332]">Zákazky</h1>
          <p className="text-sm text-[#8b9bb4]">{zakazky.length} zákaziek</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setError(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-[#66bb6a] text-white text-sm font-medium rounded-[8px] hover:bg-[#57a85b] transition-colors"
        >
          <Plus size={15} /> Nová zákazka
        </button>
      </div>

      {/* Filtre + Hľadanie */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1 bg-white rounded-[8px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-1">
          {filtre.map(fi => (
            <button
              key={fi.key}
              onClick={() => setFilter(fi.key)}
              className={clsx(
                'px-3 py-1.5 rounded-[6px] text-sm font-medium transition-colors',
                filter === fi.key
                  ? 'bg-[#1c2636] text-white'
                  : 'text-[#8b9bb4] hover:text-[#1a2332] hover:bg-[#f4f6f9]'
              )}
            >
              {fi.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white rounded-[8px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] px-3 py-2 flex-1">
          <Search size={15} className="text-[#8b9bb4]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Hľadať zákazku, zákazníka, adresu..."
            className="bg-transparent text-sm text-[#4a5568] placeholder:text-[#8b9bb4] outline-none w-full"
          />
        </div>
      </div>

      {/* Tabuľka */}
      <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-[#8b9bb4]">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Načítavam zákazky...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f4f6f9] bg-[#f8f9fb]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b9bb4] uppercase tracking-wide">Zákazka</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b9bb4] uppercase tracking-wide">Zákazník</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b9bb4] uppercase tracking-wide">Systém</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b9bb4] uppercase tracking-wide">Míľniky</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#8b9bb4] uppercase tracking-wide">Objem</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b9bb4] uppercase tracking-wide">Termín</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#8b9bb4] uppercase tracking-wide">Stav</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f4f6f9]">
                {zakazky.map(z => {
                  const s = stavLabels[z.stav]
                  const record = z as unknown as Record<string, unknown>
                  const hotoveMilniky = milniky.filter(m => record[m.key]).length
                  return (
                    <tr key={z.id} onClick={() => navigate(`/zakazky/${z.id}`)} className="hover:bg-[#f8f9fb] transition-colors cursor-pointer group">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#1a2332]">{z.cislo_zod}</p>
                        {z.cislo_vyrobnej_davky && (
                          <p className="text-xs text-[#8b9bb4] font-mono">{z.cislo_vyrobnej_davky}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#1a2332]">{z.zakaznik_nazov}</p>
                        <p className="text-xs text-[#8b9bb4] truncate max-w-[180px]">{z.adresa_montaze}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[#4a5568] text-xs">{z.popis_systemu}</p>
                        <p className="text-xs text-[#8b9bb4]">{z.typ_prac}{z.pocet_napilkov ? ` · ${z.pocet_napilkov} nápilkov` : ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {milniky.map((m, i) => {
                            const done = !!record[m.key]
                            const isNext = !done && milniky.slice(0, i).every(prev => !!record[prev.key])
                            return (
                              <div key={m.key} title={`${m.label}${done ? ': ' + formatDatum(record[m.key] as string) : ''}`}>
                                {done
                                  ? <CheckCircle2 size={14} className="text-[#66bb6a]" />
                                  : isNext
                                    ? <Clock size={14} className="text-amber-400" />
                                    : <Circle size={14} className="text-[#e0e0e0]" />
                                }
                              </div>
                            )
                          })}
                          <span className="text-xs text-[#8b9bb4] ml-1">{hotoveMilniky}/{milniky.length}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold text-[#1a2332]">{formatEur(z.objem_spolu)}</p>
                        {z.zalona && <p className="text-xs text-[#66bb6a]">záloha {formatEur(z.zalona)}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[#4a5568]">{formatDatum(z.termin_zod)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-full', s.cls)}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight size={16} className="text-[#e0e0e0] group-hover:text-[#8b9bb4] transition-colors" />
                      </td>
                    </tr>
                  )
                })}
                {zakazky.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-[#8b9bb4]">
                      Žiadne zákazky — pridaj prvú kliknutím na "Nová zákazka"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-4 py-3 border-t border-[#f4f6f9] flex items-center justify-between">
          <p className="text-xs text-[#8b9bb4]">{zakazky.length} zákaziek</p>
          <p className="text-xs text-[#8b9bb4]">
            Celkový objem: <span className="font-semibold text-[#1a2332]">
              {formatEur(zakazky.reduce((s, z) => s + (z.objem_spolu || 0), 0))}
            </span>
          </p>
        </div>
      </div>

      {/* MODAL: Nová zákazka */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm overflow-y-auto py-8">
          <div className="bg-white rounded-[12px] shadow-xl w-full max-w-2xl mx-4 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f4f6f9]">
              <h2 className="font-semibold text-[#1a2332]">Nová zákazka</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-[6px] text-[#8b9bb4] hover:bg-[#f4f6f9] transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Row 1 */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Číslo ZoD" required>
                  <input autoFocus value={form.cislo_zod} onChange={f('cislo_zod')} placeholder="napr. 26Z045" className={inputCls} />
                </Field>
                <Field label="Stav">
                  <select value={form.stav} onChange={f('stav')} className={inputCls}>
                    <option value="nova">Nová</option>
                    <option value="aktivna">Aktívna</option>
                    <option value="caka">Čaká</option>
                    <option value="hotova">Hotová</option>
                    <option value="storno">Storno</option>
                  </select>
                </Field>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Zákazník" required>
                  <input value={form.zakaznik_nazov} onChange={f('zakaznik_nazov')} placeholder="Meno alebo firma" className={inputCls} />
                </Field>
                <Field label="Obchodník">
                  <input value={form.obchodnik} onChange={f('obchodnik')} placeholder="napr. Ing. Longvová" className={inputCls} />
                </Field>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Adresa montáže">
                  <input value={form.adresa_montaze} onChange={f('adresa_montaze')} placeholder="Ulica, mesto" className={inputCls} />
                </Field>
                <Field label="Kontakt">
                  <input value={form.kontakt} onChange={f('kontakt')} placeholder="+421 9XX XXX XXX" className={inputCls} />
                </Field>
              </div>

              <hr className="border-[#f4f6f9]" />

              {/* Row 4 – produkty */}
              <div className="grid grid-cols-3 gap-4">
                <Field label="Systém">
                  <input value={form.popis_systemu} onChange={f('popis_systemu')} placeholder="SYNEGO, Štandard..." className={inputCls} />
                </Field>
                <Field label="Typ prác">
                  <input value={form.typ_prac} onChange={f('typ_prac')} placeholder="D, M, MV, L..." className={inputCls} />
                </Field>
                <Field label="Počet nápilkov">
                  <input value={form.pocet_napilkov} onChange={f('pocet_napilkov')} placeholder="0" className={inputCls} type="number" min="0" />
                </Field>
              </div>

              <Field label="Rozsah výrobkov">
                <input value={form.rozsah_vyrobkov} onChange={f('rozsah_vyrobkov')} placeholder="napr. 3×DKR, 5×O, 2×D" className={inputCls} />
              </Field>

              <hr className="border-[#f4f6f9]" />

              {/* Row 5 – financie */}
              <div className="grid grid-cols-3 gap-4">
                <Field label="Objem spolu (EUR)">
                  <input value={form.objem_spolu} onChange={f('objem_spolu')} placeholder="0.00" className={inputCls} />
                </Field>
                <Field label="Záloha (EUR)">
                  <input value={form.zalona} onChange={f('zalona')} placeholder="0.00" className={inputCls} />
                </Field>
                <Field label="Termín ZoD">
                  <input value={form.termin_zod} onChange={f('termin_zod')} type="date" className={inputCls} />
                </Field>
              </div>

              <Field label="Poznámka">
                <textarea value={form.poznamka} onChange={f('poznamka')} rows={2} className={clsx(inputCls, 'resize-none')} placeholder="Interná poznámka..." />
              </Field>

              {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-[8px]">{error}</p>}
            </div>

            <div className="px-6 pb-5 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-[#4a5568] border border-[#e0e0e0] rounded-[8px] hover:bg-[#f4f6f9] transition-colors">
                Zrušiť
              </button>
              <button
                onClick={saveZakazka}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-[#66bb6a] text-white text-sm font-medium rounded-[8px] hover:bg-[#57a85b] disabled:opacity-60 transition-colors"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                Vytvoriť zákazku
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
