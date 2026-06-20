import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft, CheckCircle2, Circle, Clock, MapPin, Phone, User, Package,
  Euro, Calendar, FileText, Wrench, ChevronRight, Edit2, Loader2, X, Save,
  ClipboardList, Upload, Plus, Trash2, Download, CheckSquare, Square,
  AlertTriangle, MessageSquare, Ruler,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { stavLabels, Zakazka } from '@/types/zakazka'
import clsx from 'clsx'

// ─── helpers ────────────────────────────────────────────────────────────────

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

// ─── tabs ───────────────────────────────────────────────────────────────────

type TabKey = 'prehlad' | 'zameranie' | 'protokol' | 'servis'

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'prehlad',   label: 'Prehľad',            icon: FileText },
  { key: 'zameranie', label: 'Zameranie',           icon: Ruler },
  { key: 'protokol',  label: 'Protokol & Nedorobky', icon: ClipboardList },
  { key: 'servis',    label: 'Servis',              icon: AlertTriangle },
]

// ─── types ──────────────────────────────────────────────────────────────────

interface ZameranieData {
  id?: string
  datum?: string
  kto?: string
  poznamky?: string
}

interface NedorobekItem {
  id: string
  popis: string
  stav: 'otvorena' | 'vyriesena'
  termin?: string | null
}

interface ProtokolData {
  id?: string
  datum?: string | null
  montaznik?: string | null
  poznamka?: string | null
  klaes_rtf_url?: string | null
  stav?: string | null
}

interface ServisItem {
  id: string
  popis: string
  stav: string
  termin?: string | null
  technik?: string | null
  riesenie?: string | null
  created_at: string
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

const stavServiceCls: Record<string, string> = {
  nova: 'bg-blue-50 text-blue-700',
  v_rieseni: 'bg-amber-50 text-amber-700',
  vyriesena: 'bg-[#e8f5e9] text-[#2e7d32]',
  zamietnuta: 'bg-red-50 text-red-600',
}
const stavServiceLabel: Record<string, string> = {
  nova: 'Nová',
  v_rieseni: 'V riešení',
  vyriesena: 'Vyriesenáa',
  zamietnuta: 'Zamietnutá',
}

// ─── main component ──────────────────────────────────────────────────────────

export default function ZakazkaDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  // zákazka
  const [zakazka, setZakazka] = useState<Zakazka | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // tabs
  const [tab, setTab] = useState<TabKey>('prehlad')

  // zameranie
  const [zameranie, setZameranie] = useState<ZameranieData>({})
  const [zameranieLoading, setZameranieLoading] = useState(false)
  const [zameranieSaving, setZameranieSaving] = useState(false)
  const [zameranieSaved, setZameranieSaved] = useState(false)

  // protokol
  const [protokol, setProtokal] = useState<ProtokolData>({})
  const [protokolSaving, setProtokolSaving] = useState(false)
  const [protokolSaved, setProtokolSaved] = useState(false)

  // nedorobky
  const [nedorobky, setNedorobky] = useState<NedorobekItem[]>([])
  const [novaNedorobka, setNovaNedorobka] = useState('')
  const [addingNedorobka, setAddingNedorobka] = useState(false)

  // KLAES RTF upload
  const rtfInputRef = useRef<HTMLInputElement>(null)
  const [uploadingRtf, setUploadingRtf] = useState(false)
  const [rtfError, setRtfError] = useState<string | null>(null)

  // servis
  const [servisItems, setServisItems] = useState<ServisItem[]>([])
  const [servisLoading, setServisLoading] = useState(false)
  const [showServisForm, setShowServisForm] = useState(false)
  const [servisForm, setServisForm] = useState({ popis: '', termin: '', technik: '' })
  const [servisSaving, setServisSaving] = useState(false)

  // ── load zákazka ──
  async function loadZakazka() {
    const { data } = await supabase.from('zakazky').select('*').eq('id', id).single()
    setZakazka(data)
    setLoading(false)
  }

  // ── load zameranie ──
  async function loadZameranie() {
    if (!id) return
    setZameranieLoading(true)
    const { data } = await supabase.from('zamerania').select('*').eq('zakazka_id', id).maybeSingle()
    setZameranie(data ?? {})
    setZameranieLoading(false)
  }

  // ── load protokol + nedorobky ──
  async function loadProtokolTab() {
    if (!id) return
    const [{ data: pData }, { data: nData }] = await Promise.all([
      supabase.from('protokoly').select('*').eq('zakazka_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('nedorobky').select('*').eq('zakazka_id', id).order('created_at'),
    ])
    setProtokal(pData ?? {})
    setNedorobky((nData ?? []) as NedorobekItem[])
  }

  // ── load servis ──
  async function loadServis() {
    if (!id) return
    setServisLoading(true)
    const { data } = await supabase.from('servis').select('*').eq('zakazka_id', id).order('created_at', { ascending: false })
    setServisItems((data ?? []) as ServisItem[])
    setServisLoading(false)
  }

  useEffect(() => { loadZakazka() }, [id])

  useEffect(() => {
    if (tab === 'zameranie') loadZameranie()
    if (tab === 'protokol') loadProtokolTab()
    if (tab === 'servis') loadServis()
  }, [tab, id])

  // ── edit zákazka ──
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
    loadZakazka()
  }

  const ef = (key: keyof EditForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setEditForm(prev => prev ? { ...prev, [key]: e.target.value } : prev)

  // ── save zameranie ──
  async function saveZameranie() {
    if (!id) return
    setZameranieSaving(true)
    if (zameranie.id) {
      await supabase.from('zamerania').update({ ...zameranie, updated_at: new Date().toISOString() }).eq('id', zameranie.id)
    } else {
      const { data } = await supabase.from('zamerania').insert({ ...zameranie, zakazka_id: id }).select().single()
      if (data) setZameranie(data as ZameranieData)
    }
    setZameranieSaving(false)
    setZameranieSaved(true)
    setTimeout(() => setZameranieSaved(false), 2000)
  }

  // ── save protokol ──
  async function saveProtokal() {
    if (!id) return
    setProtokolSaving(true)
    if (protokol.id) {
      await supabase.from('protokoly').update({ ...protokol }).eq('id', protokol.id)
    } else {
      const { data } = await supabase.from('protokoly').insert({ ...protokol, zakazka_id: id }).select().single()
      if (data) setProtokal(data as ProtokolData)
    }
    setProtokolSaving(false)
    setProtokolSaved(true)
    setTimeout(() => setProtokolSaved(false), 2000)
  }

  // ── add nedorobka ──
  async function addNedorobka() {
    if (!novaNedorobka.trim() || !id) return
    setAddingNedorobka(true)
    const { data } = await supabase.from('nedorobky').insert({ zakazka_id: id, popis: novaNedorobka.trim() }).select().single()
    if (data) setNedorobky(prev => [...prev, data as NedorobekItem])
    setNovaNedorobka('')
    setAddingNedorobka(false)
  }

  async function toggleNedorobka(item: NedorobekItem) {
    const newStav = item.stav === 'otvorena' ? 'vyriesena' : 'otvorena'
    await supabase.from('nedorobky').update({ stav: newStav }).eq('id', item.id)
    setNedorobky(prev => prev.map(n => n.id === item.id ? { ...n, stav: newStav } : n))
  }

  async function deleteNedorobka(itemId: string) {
    await supabase.from('nedorobky').delete().eq('id', itemId)
    setNedorobky(prev => prev.filter(n => n.id !== itemId))
  }

  // ── upload KLAES RTF ──
  async function uploadRtf(file: File) {
    if (!id) return
    setUploadingRtf(true)
    setRtfError(null)
    const path = `${id}/klaes.rtf`
    const { error: uploadErr } = await supabase.storage.from('zakazky-docs').upload(path, file, { upsert: true })
    if (uploadErr) {
      setRtfError('Upload zlyhal: ' + uploadErr.message)
      setUploadingRtf(false)
      return
    }
    const { data: urlData } = supabase.storage.from('zakazky-docs').getPublicUrl(path)
    const url = urlData.publicUrl
    // save to protokoly record
    if (protokol.id) {
      await supabase.from('protokoly').update({ klaes_rtf_url: url }).eq('id', protokol.id)
    } else {
      const { data } = await supabase.from('protokoly').insert({ zakazka_id: id, klaes_rtf_url: url }).select().single()
      if (data) {
        setProtokal({ ...data as ProtokolData })
        setUploadingRtf(false)
        return
      }
    }
    setProtokal(prev => ({ ...prev, klaes_rtf_url: url }))
    setUploadingRtf(false)
  }

  // ── add servis ──
  async function addServis() {
    if (!servisForm.popis.trim() || !id || !zakazka) return
    setServisSaving(true)
    await supabase.from('servis').insert({
      zakazka_id: id,
      zakaznik_nazov: zakazka.zakaznik_nazov,
      popis: servisForm.popis.trim(),
      termin: servisForm.termin || null,
      technik: servisForm.technik || null,
    })
    setServisSaving(false)
    setShowServisForm(false)
    setServisForm({ popis: '', termin: '', technik: '' })
    loadServis()
  }

  // ── render loading / not found ──
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

      {/* ── Header ── */}
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

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-1.5">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-[8px] text-sm font-medium transition-colors flex-1 justify-center',
                active
                  ? 'bg-[#1c2636] text-white'
                  : 'text-[#8b9bb4] hover:text-[#1a2332] hover:bg-[#f4f6f9]'
              )}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* ══════════════════════════════════════════════
          TAB 1 – Prehľad
      ══════════════════════════════════════════════ */}
      {tab === 'prehlad' && (
        <>
          {/* Progress míľnikov */}
          <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-[#1a2332]">Priebeh zákazky</h2>
              <span className="text-sm text-[#8b9bb4]">{prvyNesplneny === -1 ? milnikyDef.length : prvyNesplneny}/{milnikyDef.length} krokov</span>
            </div>
            <div className="w-full bg-[#f4f6f9] rounded-full h-1.5 mb-5">
              <div className="bg-[#66bb6a] h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
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
                      : isNext ? <Clock size={20} className="text-amber-400" />
                      : <Circle size={20} className="text-[#c1cad6]" />}
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

          {/* 3-col grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
              <h2 className="font-semibold text-[#1a2332] mb-3 flex items-center gap-2">
                <User size={16} className="text-[#0779e4]" /> Zákazník
              </h2>
              <InfoRow label="Meno / Firma" value={zakazka.zakaznik_nazov} />
              <InfoRow label="Adresa montáže" value={zakazka.adresa_montaze} icon={MapPin} />
              <InfoRow label="Kontakt" value={zakazka.kontakt} icon={Phone} />
              <InfoRow label="Obchodník" value={zakazka.obchodnik} icon={User} />
            </div>
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
                { label: 'Naplánovať montáž', action: () => navigate('/montaze') },
                { label: 'Zameranie', action: () => setTab('zameranie') },
                { label: 'Protokol / Nedorobky', action: () => setTab('protokol') },
                { label: 'Reklamácia / Servis', action: () => setTab('servis') },
              ].map(a => (
                <button key={a.label} onClick={a.action} className="flex items-center justify-between px-3 py-2.5 border border-[#e0e0e0] rounded-[8px] text-sm text-[#4a5568] hover:bg-[#f4f6f9] transition-colors group">
                  {a.label}
                  <ChevronRight size={14} className="text-[#e0e0e0] group-hover:text-[#8b9bb4] transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════
          TAB 2 – Zameranie
      ══════════════════════════════════════════════ */}
      {tab === 'zameranie' && (
        <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
          <div className="flex items-center gap-2 mb-5">
            <Ruler size={16} className="text-[#0779e4]" />
            <h2 className="font-semibold text-[#1a2332]">Zameranie</h2>
          </div>

          {zameranieLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={18} className="animate-spin text-[#8b9bb4]" />
            </div>
          ) : (
            <div className="space-y-4 max-w-lg">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Dátum zamerania">
                  <input
                    type="date"
                    value={zameranie.datum ?? ''}
                    onChange={e => setZameranie(z => ({ ...z, datum: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Zameral">
                  <input
                    value={zameranie.kto ?? ''}
                    onChange={e => setZameranie(z => ({ ...z, kto: e.target.value }))}
                    placeholder="Meno pracovníka"
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Poznámky / rozmery">
                <textarea
                  value={zameranie.poznamky ?? ''}
                  onChange={e => setZameranie(z => ({ ...z, poznamky: e.target.value }))}
                  rows={8}
                  placeholder="Rozmery okien, poznámky k montáži, špeciálne požiadavky..."
                  className={clsx(inputCls, 'resize-y font-mono text-xs')}
                />
              </Field>
              <div className="flex items-center gap-3">
                <button
                  onClick={saveZameranie}
                  disabled={zameranieSaving}
                  className="flex items-center gap-2 px-5 py-2 bg-[#0779e4] text-white text-sm font-medium rounded-[8px] hover:bg-[#0669cc] disabled:opacity-60 transition-colors"
                >
                  {zameranieSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Uložiť
                </button>
                {zameranieSaved && (
                  <span className="flex items-center gap-1.5 text-sm text-[#66bb6a]">
                    <CheckCircle2 size={14} /> Uložené
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB 3 – Protokol & Nedorobky
      ══════════════════════════════════════════════ */}
      {tab === 'protokol' && (
        <div className="space-y-5">
          {/* Preberací protokol */}
          <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
            <div className="flex items-center gap-2 mb-5">
              <ClipboardList size={16} className="text-[#0779e4]" />
              <h2 className="font-semibold text-[#1a2332]">Preberací protokol</h2>
            </div>
            <div className="space-y-4 max-w-lg">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Dátum odovzdania">
                  <input
                    type="date"
                    value={protokol.datum ?? ''}
                    onChange={e => setProtokal(p => ({ ...p, datum: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Montážnik">
                  <input
                    value={protokol.montaznik ?? ''}
                    onChange={e => setProtokal(p => ({ ...p, montaznik: e.target.value }))}
                    placeholder="Meno montážnika"
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Stav protokolu">
                <select
                  value={protokol.stav ?? 'rozpracovany'}
                  onChange={e => setProtokal(p => ({ ...p, stav: e.target.value }))}
                  className={inputCls}
                >
                  <option value="rozpracovany">Rozpracovaný</option>
                  <option value="podpisany">Podpísaný zákazníkom</option>
                  <option value="archivovany">Archivovaný</option>
                </select>
              </Field>
              <Field label="Poznámka">
                <textarea
                  value={protokol.poznamka ?? ''}
                  onChange={e => setProtokal(p => ({ ...p, poznamka: e.target.value }))}
                  rows={3}
                  placeholder="Poznámky k odovzdaniu..."
                  className={clsx(inputCls, 'resize-none')}
                />
              </Field>
              <div className="flex items-center gap-3">
                <button
                  onClick={saveProtokal}
                  disabled={protokolSaving}
                  className="flex items-center gap-2 px-5 py-2 bg-[#0779e4] text-white text-sm font-medium rounded-[8px] hover:bg-[#0669cc] disabled:opacity-60 transition-colors"
                >
                  {protokolSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Uložiť protokol
                </button>
                {protokolSaved && (
                  <span className="flex items-center gap-1.5 text-sm text-[#66bb6a]">
                    <CheckCircle2 size={14} /> Uložené
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* KLAES RTF upload */}
          <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Upload size={16} className="text-[#0779e4]" />
              <h2 className="font-semibold text-[#1a2332]">KLAES súbor</h2>
            </div>

            {protokol.klaes_rtf_url ? (
              <div className="flex items-center gap-3 p-3 bg-[#e8f5e9] rounded-[8px] mb-3">
                <FileText size={18} className="text-[#66bb6a] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a2332]">KLAES RTF nahraté</p>
                  <p className="text-xs text-[#8b9bb4] truncate">{protokol.klaes_rtf_url}</p>
                </div>
                <a
                  href={protokol.klaes_rtf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0779e4] border border-[#0779e4]/30 rounded-[6px] hover:bg-[#0779e4]/5 transition-colors flex-shrink-0"
                >
                  <Download size={12} /> Stiahnuť
                </a>
              </div>
            ) : (
              <p className="text-sm text-[#8b9bb4] mb-3">Žiadny KLAES súbor — nahrajte .rtf exportovaný z KLAES.</p>
            )}

            <input
              ref={rtfInputRef}
              type="file"
              accept=".rtf,.RTF"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) uploadRtf(file)
                e.target.value = ''
              }}
            />
            <button
              onClick={() => rtfInputRef.current?.click()}
              disabled={uploadingRtf}
              className="flex items-center gap-2 px-4 py-2 border border-dashed border-[#c1cad6] text-[#4a5568] text-sm rounded-[8px] hover:border-[#0779e4] hover:text-[#0779e4] disabled:opacity-60 transition-colors"
            >
              {uploadingRtf ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {protokol.klaes_rtf_url ? 'Nahradiť súbor' : 'Nahrať KLAES .rtf'}
            </button>
            {rtfError && (
              <p className="mt-2 text-sm text-red-500 bg-red-50 px-3 py-2 rounded-[8px]">{rtfError}</p>
            )}
          </div>

          {/* Nedorobky */}
          <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ClipboardList size={16} className="text-amber-500" />
                <h2 className="font-semibold text-[#1a2332]">Nedorobky</h2>
                {nedorobky.length > 0 && (
                  <span className="text-xs text-[#8b9bb4]">
                    {nedorobky.filter(n => n.stav === 'otvorena').length} otvorených
                    {' / '}
                    {nedorobky.length} celkom
                  </span>
                )}
              </div>
            </div>

            {/* Add input */}
            <div className="flex gap-2 mb-4">
              <input
                value={novaNedorobka}
                onChange={e => setNovaNedorobka(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNedorobka()}
                placeholder="Popis nedorobky..."
                className={clsx(inputCls, 'flex-1')}
              />
              <button
                onClick={addNedorobka}
                disabled={addingNedorobka || !novaNedorobka.trim()}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#66bb6a] text-white text-sm font-medium rounded-[8px] hover:bg-[#57a85b] disabled:opacity-60 transition-colors flex-shrink-0"
              >
                {addingNedorobka ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Pridať
              </button>
            </div>

            {nedorobky.length === 0 ? (
              <p className="text-sm text-[#8b9bb4] py-4 text-center">Žiadne nedorobky</p>
            ) : (
              <div className="space-y-2">
                {nedorobky.map(item => (
                  <div key={item.id} className={clsx(
                    'flex items-center gap-3 p-3 rounded-[8px] transition-colors',
                    item.stav === 'vyriesena' ? 'bg-[#f4f6f9] opacity-60' : 'bg-amber-50'
                  )}>
                    <button onClick={() => toggleNedorobka(item)} className="flex-shrink-0">
                      {item.stav === 'vyriesena'
                        ? <CheckSquare size={18} className="text-[#66bb6a]" />
                        : <Square size={18} className="text-amber-400" />}
                    </button>
                    <p className={clsx('flex-1 text-sm', item.stav === 'vyriesena' ? 'line-through text-[#8b9bb4]' : 'text-[#1a2332]')}>
                      {item.popis}
                    </p>
                    <button
                      onClick={() => deleteNedorobka(item.id)}
                      className="p-1 text-[#c1cad6] hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB 4 – Servis / Reklamácie
      ══════════════════════════════════════════════ */}
      {tab === 'servis' && (
        <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#f4f6f9]">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <h2 className="font-semibold text-[#1a2332]">Servis & Reklamácie</h2>
            </div>
            <button
              onClick={() => setShowServisForm(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#66bb6a] text-white text-sm font-medium rounded-[8px] hover:bg-[#57a85b] transition-colors"
            >
              <Plus size={14} /> Nová reklamácia
            </button>
          </div>

          {/* add form */}
          {showServisForm && (
            <div className="px-6 py-4 border-b border-[#f4f6f9] bg-[#fafbfc] space-y-3">
              <Field label="Popis závady *">
                <textarea
                  value={servisForm.popis}
                  onChange={e => setServisForm(f => ({ ...f, popis: e.target.value }))}
                  rows={2}
                  placeholder="Popíš závadu alebo reklamáciu..."
                  className={clsx(inputCls, 'resize-none')}
                  autoFocus
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Termín vyriešenia">
                  <input
                    type="date"
                    value={servisForm.termin}
                    onChange={e => setServisForm(f => ({ ...f, termin: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Technik">
                  <input
                    value={servisForm.technik}
                    onChange={e => setServisForm(f => ({ ...f, technik: e.target.value }))}
                    placeholder="Meno technika"
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addServis}
                  disabled={servisSaving || !servisForm.popis.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0779e4] text-white text-sm font-medium rounded-[8px] hover:bg-[#0669cc] disabled:opacity-60 transition-colors"
                >
                  {servisSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Uložiť
                </button>
                <button
                  onClick={() => setShowServisForm(false)}
                  className="px-4 py-2 text-sm text-[#4a5568] border border-[#e0e0e0] rounded-[8px] hover:bg-[#f4f6f9] transition-colors"
                >
                  Zrušiť
                </button>
              </div>
            </div>
          )}

          {servisLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={18} className="animate-spin text-[#8b9bb4]" />
            </div>
          ) : servisItems.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-[#8b9bb4]">
              <MessageSquare size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Žiadne reklamácie ani servisné zásahy</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f4f6f9]">
              {servisItems.map(item => (
                <div key={item.id} className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', stavServiceCls[item.stav] ?? 'bg-gray-100 text-gray-600')}>
                          {stavServiceLabel[item.stav] ?? item.stav}
                        </span>
                        <span className="text-xs text-[#8b9bb4]">{formatDatum(item.created_at, true)}</span>
                        {item.termin && (
                          <span className="flex items-center gap-1 text-xs text-[#0779e4]">
                            <Calendar size={10} /> {formatDatum(item.termin)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#1a2332]">{item.popis}</p>
                      {item.technik && <p className="text-xs text-[#8b9bb4] mt-1">Technik: {item.technik}</p>}
                      {item.riesenie && (
                        <p className="text-sm text-[#4a5568] mt-2 bg-[#f4f6f9] px-3 py-2 rounded-[6px]">
                          Riešenie: {item.riesenie}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          EDIT MODAL
      ══════════════════════════════════════════════ */}
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
