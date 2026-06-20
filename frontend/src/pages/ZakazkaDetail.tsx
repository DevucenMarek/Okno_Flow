import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  ArrowLeft, CheckCircle2, Circle, Clock, MapPin,
  Phone, User, Package, Euro, Calendar, FileText,
  Wrench, ChevronRight, Edit2, Loader2, X, Save,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { stavLabels, Zakazka } from '@/types/zakazka'
import clsx from 'clsx'

function formatEur(n?: number | null) {
  if (!n) return '—'
  return n.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function formatDatum(d?: string | null, long = false) {
  if (!d) return null
  return new Date(d).toLocaleDateString('sk-SK', long
    ? { day: 'numeric', month: 'long', year: 'numeric' }
    : { day: 'numeric', month: 'numeric', year: '2-digit' })
}

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#f4f6f9] last:border-0">
      {Icon && <Icon size={15} className="text-[#8b9bb4] mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#8b9bb4]">{label}</p>
        <p className="text-sm font-medium text-[#1a2332]">{value}</p>
      </div>
    </div>
  )
}

const milnikyDef = [
  { key: 'dat_inventura',    label: 'Inventúra',         desc: 'Fyzická obhliadka' },
  { key: 'dat_dokumentacia', label: 'Dokumentácia',      desc: 'Výkresová dok. hotová' },
  { key: 'dat_objednavka',   label: 'Objednávka',        desc: 'Objednaná u dodávateľa' },
  { key: 'dat_ace',          label: 'Zadané v ACE',      desc: 'Zaregistrované v KLAES' },
  { key: 'dat_potvrdenie',   label: 'Potvrdené',         desc: 'Výroba potvrdená' },
  { key: 'dat_lozny_plan',   label: 'Ložný plán',        desc: 'Zaradené do ložného plánu' },
  { key: 'dat_prijem_sklad', label: 'Prijaté na sklad',  desc: 'Tovar dorazil na sklad' },
  { key: 'dat_montaz',       label: 'Namontované',       desc: 'Montáž dokončená' },
]

const inputCls = 'w-full px-3 py-2 rounded-[8px] border border-[#e0e0e0] text-sm text-[#1a2332] placeholder:text-[#c1cad6] focus:outline-none focus:border-[#0779e4] focus:ring-2 focus:ring-[#0779e4]/10 transition-colors bg-white'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#8b9bb4] mb-1.5">{label}</label>
      {children}
    </div>
  )
}

type EditForm = {
  zakaznik_nazov: string
  adresa_montaze: string
  kontakt: string
  obchodnik: string
  stav: string
  popis_systemu: string
  typ_prac: string
  rozsah_vyrobkov: string
  pocet_napilkov: string
  objem_spolu: string
  zalona: string
  doplatok: string
  termin_zod: string
  poznamka: string
  cislo_vyrobnej_davky: string
  // milestone dates
  dat_inventura: string
  dat_dokumentacia: string
  dat_objednavka: string
  dat_ace: string
  dat_potvrdenie: string
  dat_lozny_plan: string
  dat_prijem_sklad: string
  dat_montaz: string
}

function zakazkaToForm(z: Zakazka): EditForm {
  const r = z as unknown as Record<string, unknown>
  return {
    zakaznik_nazov: z.zakaznik_nazov ?? '',
    adresa_montaze: z.adresa_montaze ?? '',
    kontakt: z.kontakt ?? '',
    obchodnik: z.obchodnik ?? '',
    stav: z.stav,
    popis_systemu: z.popis_systemu ?? '',
    typ_prac: z.typ_prac ?? '',
    rozsah_vyrobkov: z.rozsah_vyrobkov ?? '',
    pocet_napilkov: z.pocet_napilkov?.toString() ?? '',
    objem_spolu: z.objem_spolu?.toString() ?? '',
    zalona: z.zalona?.toString() ?? '',
    doplatok: z.doplatok?.toString() ?? '',
    termin_zod: z.termin_zod ?? '',
    poznamka: (r.poznamka as string) ?? '',
    cislo_vyrobnej_davky: z.cislo_vyrobnej_davky ?? '',
    dat_inventura: (r.dat_inventura as string) ?? '',
    dat_dokumentacia: (r.dat_dokumentacia as string) ?? '',
    dat_objednavka: (r.dat_objednavka as string) ?? '',
    dat_ace: (r.dat_ace as string) ?? '',
    dat_potvrdenie: (r.dat_potvrdenie as string) ?? '',
    dat_lozny_plan: (r.dat_lozny_plan as string) ?? '',
    dat_prijem_sklad: (r.dat_prijem_sklad as string) ?? '',
    dat_montaz: (r.dat_montaz as string) ?? '',
  }
}

export default function ZakazkaDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [zakazka, setZakazka] = useState<Zakazka | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase
      .from('zakazky')
      .select('*')
      .eq('id', id)
      .single()
    setZakazka(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  function openEdit() {
    if (!zakazka) return
    setEditForm(zakazkaToForm(zakazka))
    setSaveError(null)
    setShowEdit(true)
  }

  async function saveEdit() {
    if (!editForm || !zakazka) return
    setSaving(true)
    setSaveError(null)

    const payload: Record<string, unknown> = {
      zakaznik_nazov: editForm.zakaznik_nazov || null,
      adresa_montaze: editForm.adresa_montaze || null,
      kontakt: editForm.kontakt || null,
      obchodnik: editForm.obchodnik || null,
      stav: editForm.stav,
      popis_systemu: editForm.popis_systemu || null,
      typ_prac: editForm.typ_prac || null,
      rozsah_vyrobkov: editForm.rozsah_vyrobkov || null,
      pocet_napilkov: editForm.pocet_napilkov ? parseInt(editForm.pocet_napilkov) : null,
      objem_spolu: editForm.objem_spolu ? parseFloat(editForm.objem_spolu.replace(',', '.')) : null,
      zalona: editForm.zalona ? parseFloat(editForm.zalona.replace(',', '.')) : null,
      doplatok: editForm.doplatok ? parseFloat(editForm.doplatok.replace(',', '.')) : null,
      termin_zod: editForm.termin_zod || null,
      poznamka: editForm.poznamka || null,
      cislo_vyrobnej_davky: editForm.cislo_vyrobnej_davky || null,
      dat_inventura: editForm.dat_inventura || null,
      dat_dokumentacia: editForm.dat_dokumentacia || null,
      dat_objednavka: editForm.dat_objednavka || null,
      dat_ace: editForm.dat_ace || null,
      dat_potvrdenie: editForm.dat_potvrdenie || null,
      dat_lozny_plan: editForm.dat_lozny_plan || null,
      dat_prijem_sklad: editForm.dat_prijem_sklad || null,
      dat_montaz: editForm.dat_montaz || null,
    }

    const { error } = await supabase.from('zakazky').update(payload).eq('id', zakazka.id)
    if (error) { setSaveError(error.message); setSaving(false); return }

    setSaving(false)
    setShowEdit(false)
    load()
  }

  const ef = (key: keyof EditForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setEditForm(prev => prev ? { ...prev, [key]: e.target.value } : prev)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-[#8b9bb4]">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Načítavam zákazku...</span>
      </div>
    )
  }

  if (!zakazka) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[#8b9bb4]">
        <p className="text-lg font-medium">Zákazka nenájdená</p>
        <button onClick={() => navigate('/zakazky')} className="mt-3 text-[#0779e4] text-sm hover:underline">
          Späť na zákazky
        </button>
      </div>
    )
  }

  const s = stavLabels[zakazka.stav]
  const record = zakazka as unknown as Record<string, unknown>

  const prvyNesplneny = milnikyDef.findIndex(m => !record[m.key])
  const progress = prvyNesplneny === -1 ? 100 : Math.round((prvyNesplneny / milnikyDef.length) * 100)

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate('/zakazky')}
          className="p-2 rounded-[8px] text-[#8b9bb4] hover:bg-white hover:text-[#1a2332] transition-colors mt-0.5"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#1a2332]">{zakazka.cislo_zod}</h1>
            <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full', s.cls)}>{s.label}</span>
            {zakazka.cislo_vyrobnej_davky && (
              <span className="text-xs font-mono bg-[#f4f6f9] text-[#8b9bb4] px-2 py-1 rounded-[6px]">
                KLAES: {zakazka.cislo_vyrobnej_davky}
              </span>
            )}
          </div>
          <p className="text-[#8b9bb4] text-sm mt-0.5">{zakazka.zakaznik_nazov} · {zakazka.adresa_montaze}</p>
        </div>
        <button
          onClick={openEdit}
          className="flex items-center gap-2 px-3 py-2 border border-[#e0e0e0] text-[#4a5568] text-sm font-medium rounded-[8px] hover:bg-white transition-colors"
        >
          <Edit2 size={14} /> Upraviť
        </button>
      </div>

      {/* Progress bar míľnikov */}
      <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[#1a2332]">Priebeh zákazky</h2>
          <span className="text-sm text-[#8b9bb4]">{prvyNesplneny === -1 ? milnikyDef.length : prvyNesplneny}/{milnikyDef.length} krokov</span>
        </div>
        <div className="w-full bg-[#f4f6f9] rounded-full h-1.5 mb-5">
          <div
            className="bg-[#66bb6a] h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {milnikyDef.map((m, i) => {
            const done = !!record[m.key]
            const isNext = !done && (i === 0 || !!record[milnikyDef[i - 1].key])
            return (
              <div key={m.key} className={clsx(
                'flex flex-col items-center gap-1.5 p-2 rounded-[8px] text-center transition-colors',
                done ? 'bg-[#e8f5e9]' : isNext ? 'bg-amber-50' : 'bg-[#f4f6f9]'
              )}>
                {done
                  ? <CheckCircle2 size={20} className="text-[#66bb6a]" />
                  : isNext
                    ? <Clock size={20} className="text-amber-400" />
                    : <Circle size={20} className="text-[#c1cad6]" />
                }
                <p className={clsx('text-xs font-medium leading-tight', done ? 'text-[#2e7d32]' : isNext ? 'text-amber-700' : 'text-[#8b9bb4]')}>
                  {m.label}
                </p>
                {!!record[m.key] && (
                  <p className="text-[10px] text-[#66bb6a]">{formatDatum(String(record[m.key]))}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 3-stĺpcový grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Zákazník */}
        <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
          <h2 className="font-semibold text-[#1a2332] mb-3 flex items-center gap-2">
            <User size={16} className="text-[#0779e4]" /> Zákazník
          </h2>
          <InfoRow label="Meno / Firma" value={zakazka.zakaznik_nazov} />
          <InfoRow label="Adresa montáže" value={zakazka.adresa_montaze} icon={MapPin} />
          <InfoRow label="Kontakt" value={zakazka.kontakt} icon={Phone} />
          <InfoRow label="Obchodník" value={zakazka.obchodnik} icon={User} />
        </div>

        {/* Produkty */}
        <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
          <h2 className="font-semibold text-[#1a2332] mb-3 flex items-center gap-2">
            <Package size={16} className="text-[#0779e4]" /> Produkty & práce
          </h2>
          <InfoRow label="Systém" value={zakazka.popis_systemu} />
          <InfoRow label="Rozsah výrobkov" value={zakazka.rozsah_vyrobkov} />
          <InfoRow label="Typ prác" value={zakazka.typ_prac} icon={Wrench} />
          <InfoRow label="Počet nápilkov" value={zakazka.pocet_napilkov?.toString()} />
          {zakazka.poznamka && <InfoRow label="Poznámka" value={String(zakazka.poznamka)} icon={FileText} />}
        </div>

        {/* Financie */}
        <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
          <h2 className="font-semibold text-[#1a2332] mb-3 flex items-center gap-2">
            <Euro size={16} className="text-[#0779e4]" /> Financie
          </h2>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-[#f4f6f9] rounded-[8px] p-3">
              <p className="text-xs text-[#8b9bb4]">Celkový objem</p>
              <p className="text-lg font-bold text-[#1a2332]">{formatEur(zakazka.objem_spolu)}</p>
            </div>
            <div className="bg-[#e8f5e9] rounded-[8px] p-3">
              <p className="text-xs text-[#8b9bb4]">Záloha prijatá</p>
              <p className="text-lg font-bold text-[#57a85b]">{formatEur(zakazka.zalona)}</p>
            </div>
          </div>
          {zakazka.doplatok && (
            <div className="flex justify-between py-2 border-b border-[#f4f6f9] text-sm">
              <span className="text-[#8b9bb4]">Doplatok</span>
              <span className="font-medium text-[#1a2332]">{formatEur(zakazka.doplatok)}</span>
            </div>
          )}
          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-[#8b9bb4]">Termín ZoD</span>
            <div className="flex items-center gap-1.5 text-sm font-medium text-[#1a2332]">
              <Calendar size={13} className="text-[#0779e4]" />
              {formatDatum(zakazka.termin_zod, true) ?? '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Akcie */}
      <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4">
        <h2 className="font-semibold text-[#1a2332] mb-3">Ďalšie kroky</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Naplánovať montáž', href: '/montaze' },
            { label: 'Vydať protokol', href: '/protokoly' },
            { label: 'Vystaviť faktúru', href: '/faktury' },
            { label: 'Reklamácia / servis', href: '/servis' },
          ].map(a => (
            <button key={a.label} className="flex items-center justify-between px-3 py-2.5 border border-[#e0e0e0] rounded-[8px] text-sm text-[#4a5568] hover:bg-[#f4f6f9] transition-colors group">
              {a.label}
              <ChevronRight size={14} className="text-[#e0e0e0] group-hover:text-[#8b9bb4] transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* EDIT MODAL */}
      {showEdit && editForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm overflow-y-auto py-8">
          <div className="bg-white rounded-[12px] shadow-xl w-full max-w-2xl mx-4 my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f4f6f9]">
              <h2 className="font-semibold text-[#1a2332]">Upraviť zákazku {zakazka.cislo_zod}</h2>
              <button onClick={() => setShowEdit(false)} className="p-1 rounded-[6px] text-[#8b9bb4] hover:bg-[#f4f6f9] transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Základné info */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Zákazník">
                  <input value={editForm.zakaznik_nazov} onChange={ef('zakaznik_nazov')} className={inputCls} />
                </Field>
                <Field label="Stav">
                  <select value={editForm.stav} onChange={ef('stav')} className={inputCls}>
                    <option value="nova">Nová</option>
                    <option value="aktivna">Aktívna</option>
                    <option value="caka">Čaká</option>
                    <option value="hotova">Hotová</option>
                    <option value="storno">Storno</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Adresa montáže">
                  <input value={editForm.adresa_montaze} onChange={ef('adresa_montaze')} className={inputCls} />
                </Field>
                <Field label="Kontakt">
                  <input value={editForm.kontakt} onChange={ef('kontakt')} className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Obchodník">
                  <input value={editForm.obchodnik} onChange={ef('obchodnik')} className={inputCls} />
                </Field>
                <Field label="KLAES – č. výrobnej dávky">
                  <input value={editForm.cislo_vyrobnej_davky} onChange={ef('cislo_vyrobnej_davky')} placeholder="napr. PA5112A1" className={inputCls} />
                </Field>
              </div>

              <hr className="border-[#f4f6f9]" />

              {/* Produkty */}
              <div className="grid grid-cols-3 gap-4">
                <Field label="Systém">
                  <input value={editForm.popis_systemu} onChange={ef('popis_systemu')} className={inputCls} />
                </Field>
                <Field label="Typ prác">
                  <input value={editForm.typ_prac} onChange={ef('typ_prac')} className={inputCls} />
                </Field>
                <Field label="Počet nápilkov">
                  <input value={editForm.pocet_napilkov} onChange={ef('pocet_napilkov')} type="number" min="0" className={inputCls} />
                </Field>
              </div>
              <Field label="Rozsah výrobkov">
                <input value={editForm.rozsah_vyrobkov} onChange={ef('rozsah_vyrobkov')} className={inputCls} />
              </Field>

              <hr className="border-[#f4f6f9]" />

              {/* Financie */}
              <div className="grid grid-cols-3 gap-4">
                <Field label="Objem spolu (EUR)">
                  <input value={editForm.objem_spolu} onChange={ef('objem_spolu')} className={inputCls} />
                </Field>
                <Field label="Záloha (EUR)">
                  <input value={editForm.zalona} onChange={ef('zalona')} className={inputCls} />
                </Field>
                <Field label="Doplatok (EUR)">
                  <input value={editForm.doplatok} onChange={ef('doplatok')} className={inputCls} />
                </Field>
              </div>
              <Field label="Termín ZoD">
                <input value={editForm.termin_zod} onChange={ef('termin_zod')} type="date" className={inputCls} />
              </Field>

              <hr className="border-[#f4f6f9]" />

              {/* Míľniky */}
              <div>
                <p className="text-xs font-medium text-[#8b9bb4] mb-3">Dátumy míľnikov</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {milnikyDef.map(m => (
                    <Field key={m.key} label={m.label}>
                      <input
                        value={(editForm as Record<string, string>)[m.key] ?? ''}
                        onChange={ef(m.key as keyof EditForm)}
                        type="date"
                        className={inputCls}
                      />
                    </Field>
                  ))}
                </div>
              </div>

              <Field label="Poznámka">
                <textarea value={editForm.poznamka} onChange={ef('poznamka')} rows={2} className={clsx(inputCls, 'resize-none')} />
              </Field>

              {saveError && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-[8px]">{saveError}</p>}
            </div>

            <div className="px-6 pb-5 flex justify-end gap-2">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm text-[#4a5568] border border-[#e0e0e0] rounded-[8px] hover:bg-[#f4f6f9] transition-colors">
                Zrušiť
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-[#0779e4] text-white text-sm font-medium rounded-[8px] hover:bg-[#0669cc] disabled:opacity-60 transition-colors"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Uložiť zmeny
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
