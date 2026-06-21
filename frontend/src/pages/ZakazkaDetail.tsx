import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { logActivity } from '@/lib/activity'
import {
  ArrowLeft, CheckCircle2, MapPin, Phone, Mail, User, Package,
  Euro, Calendar, FileText, Wrench, Edit2, Loader2, X, Save,
  ClipboardList, Plus, Trash2, Download, CheckSquare, Square,
  AlertTriangle, Ruler, FolderOpen, ChevronDown,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { stavLabels, Zakazka, PIPELINE, GROUP_COLORS, PipelineKey } from '@/types/zakazka'
import clsx from 'clsx'

// ─── RTF parser ──────────────────────────────────────────────────────────────
const CP1250: Record<number, string> = {
  0x80:'€',0x8a:'Š',0x8c:'Ś',0x8d:'Ť',0x8e:'Ž',0x8f:'Ź',
  0x9a:'š',0x9c:'ś',0x9d:'ť',0x9e:'ž',0x9f:'ź',
  0xa1:'ˇ',0xa2:'˘',0xa3:'Ł',0xa5:'Ą',0xaa:'Ş',0xaf:'Ż',
  0xb0:'°',0xb1:'±',0xb3:'ł',0xb9:'ą',0xba:'ş',0xbc:'Ľ',0xbe:'ľ',0xbf:'ż',
  0xc0:'Ŕ',0xc1:'Á',0xc2:'Â',0xc3:'Ă',0xc4:'Ä',0xc5:'Ĺ',0xc6:'Ć',0xc7:'Ç',
  0xc8:'Č',0xc9:'É',0xca:'Ę',0xcb:'Ë',0xcc:'Ě',0xcd:'Í',0xce:'Î',0xcf:'Ď',
  0xd0:'Đ',0xd1:'Ń',0xd2:'Ň',0xd3:'Ó',0xd4:'Ô',0xd5:'Ő',0xd6:'Ö',
  0xd8:'Ř',0xd9:'Ů',0xda:'Ú',0xdb:'Ű',0xdc:'Ü',0xdd:'Ý',0xde:'Ţ',0xdf:'ß',
  0xe0:'ŕ',0xe1:'á',0xe2:'â',0xe3:'ă',0xe4:'ä',0xe5:'ĺ',0xe6:'ć',0xe7:'ç',
  0xe8:'č',0xe9:'é',0xea:'ę',0xeb:'ë',0xec:'ě',0xed:'í',0xee:'î',0xef:'ď',
  0xf0:'đ',0xf1:'ń',0xf2:'ň',0xf3:'ó',0xf4:'ô',0xf5:'ő',0xf6:'ö',
  0xf8:'ř',0xf9:'ů',0xfa:'ú',0xfb:'ű',0xfc:'ü',0xfd:'ý',0xfe:'ţ',
}
function parseRtf(rtf: string): string {
  if (!rtf) return ''
  if (!rtf.trimStart().startsWith('{\\rtf'))
    return '[Nie je RTF formát]\n\n' + rtf.slice(0, 1000)
  let t = rtf
  for (const g of ['fonttbl','colortbl','stylesheet','info','pict','object','header','footer'])
    t = t.replace(new RegExp(`\\{\\\\${g}[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\}`, 'gi'), '')
  t = t.replace(/\{\\\*[^{}]*\}/g, '')
  t = t.replace(/\\par\b\s*/gi, '\n').replace(/\\line\b/gi, '\n').replace(/\\tab\b/gi, '\t').replace(/\\page\b/gi, '\n\n')
  t = t.replace(/\\u(-?\d+)\??/g, (_, n) => { const c = parseInt(n); return String.fromCharCode(c < 0 ? c + 65536 : c) })
  t = t.replace(/\\'([0-9a-fA-F]{2})/g, (_, h) => { const c = parseInt(h, 16); return c < 0x80 ? String.fromCharCode(c) : CP1250[c] ?? '' })
  t = t.replace(/\\[a-z*]+-?[0-9]* ?/gi, '').replace(/\\\n/g, '').replace(/[{}\\]/g, '')
  t = t.replace(/[ \t]{2,}/g, ' ').replace(/^ +| +$/gm, '').replace(/\n{3,}/g, '\n\n')
  return t.trim()
}

// ─── helpers ─────────────────────────────────────────────────────────────────
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
      {Icon && <Icon size={14} className="text-[#8b9bb4] mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#8b9bb4]">{label}</p>
        <p className="text-sm font-medium text-[#1a2332] break-words">{value}</p>
      </div>
    </div>
  )
}
const inputCls = 'w-full px-3 py-2 rounded-[8px] border border-[#e0e0e0] text-sm text-[#1a2332] placeholder:text-[#c1cad6] focus:outline-none focus:border-[#0779e4] focus:ring-2 focus:ring-[#0779e4]/10 transition-colors bg-white'
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#8b9bb4] mb-1.5">{label}</label>
      {children}
    </div>
  )
}

// ─── types ───────────────────────────────────────────────────────────────────
type TabKey = 'prehlad' | 'dokumenty' | 'zameranie' | 'protokol' | 'reklamacie'
const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'prehlad',     label: 'Prehľad',    icon: FileText },
  { key: 'dokumenty',   label: 'Dokumenty',  icon: FolderOpen },
  { key: 'zameranie',   label: 'Zameranie',  icon: Ruler },
  { key: 'protokol',    label: 'Protokol',   icon: ClipboardList },
  { key: 'reklamacie',  label: 'Reklamácie', icon: AlertTriangle },
]

const DOC_TYPY: { value: string; label: string }[] = [
  { value: 'klaes_rtf',     label: 'KLAES RTF' },
  { value: 'cenova_ponuka', label: 'Cenová ponuka' },
  { value: 'zmluva',        label: 'Zmluva / ZoD' },
  { value: 'protokol',      label: 'Protokol' },
  { value: 'faktura',       label: 'Faktúra' },
  { value: 'foto',          label: 'Fotografia' },
  { value: 'ine',           label: 'Iné' },
]

interface ZakazkaDoc {
  id: string; nazov: string; url: string; storage_path: string; typ: string; created_at: string
}
interface ZameranieData { id?: string; datum?: string; kto?: string; poznamky?: string }
interface ProtokolData { id?: string; datum?: string | null; montaznik?: string | null; poznamka?: string | null; stav?: string | null }
interface NedorobekItem { id: string; popis: string; stav: 'otvorena' | 'vyriesena'; termin?: string | null }
interface Reklamacia {
  id: string; typ: 'zakaznik' | 'vyroba'; popis: string; stav: string
  termin_riesenia?: string | null; technik?: string | null; riesenie?: string | null
  dodavatel?: string | null; cislo_objednavky?: string | null; created_at: string
}

type EditForm = {
  zakaznik_nazov: string; adresa_montaze: string; kontakt: string; email: string; obchodnik: string; stav: string
  popis_systemu: string; typ_prac: string; rozsah_vyrobkov: string; pocet_napilkov: string
  objem_spolu: string; zalona: string; doplatok: string; termin_zod: string
  poznamka: string; cislo_vyrobnej_davky: string; cislo_obj_dodavatela: string
  // pipeline
  dat_dopyt: string; dat_ponuka: string; dat_odsouhlasenie: string; dat_zameranie: string
  dat_finalna_ponuka: string; dat_zmluva: string; dat_zalona_prijata: string; dat_objednavka: string
  dat_prijem_sklad: string; dat_montaz: string; dat_odovzdanie: string; dat_dofakturacia: string
}

function zakazkaToForm(z: Zakazka): EditForm {
  const r = z as unknown as Record<string, unknown>
  const d = (k: string) => (r[k] as string) ?? ''
  return {
    zakaznik_nazov: z.zakaznik_nazov ?? '', adresa_montaze: z.adresa_montaze ?? '',
    kontakt: z.kontakt ?? '', email: z.email ?? '', obchodnik: z.obchodnik ?? '', stav: z.stav,
    popis_systemu: z.popis_systemu ?? '', typ_prac: z.typ_prac ?? '',
    rozsah_vyrobkov: z.rozsah_vyrobkov ?? '', pocet_napilkov: z.pocet_napilkov?.toString() ?? '',
    objem_spolu: z.objem_spolu?.toString() ?? '', zalona: z.zalona?.toString() ?? '',
    doplatok: z.doplatok?.toString() ?? '', termin_zod: z.termin_zod ?? '',
    poznamka: d('poznamka'), cislo_vyrobnej_davky: z.cislo_vyrobnej_davky ?? '',
    cislo_obj_dodavatela: z.cislo_obj_dodavatela ?? '',
    dat_dopyt: d('dat_dopyt'), dat_ponuka: d('dat_ponuka'), dat_odsouhlasenie: d('dat_odsouhlasenie'),
    dat_zameranie: d('dat_zameranie'), dat_finalna_ponuka: d('dat_finalna_ponuka'), dat_zmluva: d('dat_zmluva'), dat_zalona_prijata: d('dat_zalona_prijata'),
    dat_objednavka: d('dat_objednavka'), dat_prijem_sklad: d('dat_prijem_sklad'),
    dat_montaz: d('dat_montaz'), dat_odovzdanie: d('dat_odovzdanie'), dat_dofakturacia: d('dat_dofakturacia'),
  }
}

const stavRekCls: Record<string, string> = {
  nova: 'bg-blue-50 text-blue-700', v_rieseni: 'bg-amber-50 text-amber-700',
  vyriesena: 'bg-[#e8f5e9] text-[#2e7d32]', zamietnuta: 'bg-red-50 text-red-600',
}
const stavRekLabel: Record<string, string> = {
  nova: 'Nová', v_rieseni: 'V riešení', vyriesena: 'Vyriesenáa', zamietnuta: 'Zamietnutá',
}

// ─── main component ───────────────────────────────────────────────────────────
export default function ZakazkaDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const userMeno = profile?.meno || profile?.email || 'Neznámy'

  const [zakazka, setZakazka] = useState<Zakazka | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('prehlad')
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [markingSaving, setMarkingSaving] = useState<string | null>(null)

  // dokumenty
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [docs, setDocs] = useState<ZakazkaDoc[]>([])
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [uploadTyp, setUploadTyp] = useState('klaes_rtf')
  const [docError, setDocError] = useState<string | null>(null)
  const [previewDocId, setPreviewDocId] = useState<string | null>(null)
  const [previewContent, setPreviewContent] = useState<Record<string, string>>({})

  // zameranie
  const [zameranie, setZameranie] = useState<ZameranieData>({})
  const [zameranieSaving, setZameranieSaving] = useState(false)
  const [zameranieSaved, setZameranieSaved] = useState(false)

  // protokol + nedorobky
  const [protokol, setProtokal] = useState<ProtokolData>({})
  const [protokolSaving, setProtokolSaving] = useState(false)
  const [protokolSaved, setProtokolSaved] = useState(false)
  const [nedorobky, setNedorobky] = useState<NedorobekItem[]>([])
  const [novaNedorobka, setNovaNedorobka] = useState('')
  const [addingNedorobka, setAddingNedorobka] = useState(false)

  // reklamácie
  const [rekSubTab, setRekSubTab] = useState<'zakaznik' | 'vyroba'>('zakaznik')
  const [reklamacie, setReklamacie] = useState<Reklamacia[]>([])
  const [rekLoading, setRekLoading] = useState(false)
  const [showRekForm, setShowRekForm] = useState(false)
  const [rekForm, setRekForm] = useState({ popis: '', termin_riesenia: '', technik: '', dodavatel: '', cislo_objednavky: '' })
  const [rekSaving, setRekSaving] = useState(false)

  // aktivita log
  interface AktivitaLog { id: string; akcia: string; popis: string; user_meno: string; created_at: string }
  const [aktLogy, setAktLogy] = useState<AktivitaLog[]>([])

  // ── loaders ──
  async function loadZakazka() {
    const { data } = await supabase.from('zakazky').select('*').eq('id', id).single()
    setZakazka(data); setLoading(false)
  }

  async function loadDokumenty() {
    const { data } = await supabase.from('zakazka_dokumenty').select('*').eq('zakazka_id', id).order('created_at')
    setDocs((data ?? []) as ZakazkaDoc[])
  }

  async function loadZameranie() {
    const { data } = await supabase.from('zamerania').select('*').eq('zakazka_id', id).maybeSingle()
    setZameranie(data ?? {})
  }

  async function loadProtokolTab() {
    const [{ data: pData }, { data: nData }] = await Promise.all([
      supabase.from('protokoly').select('*').eq('zakazka_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('nedorobky').select('*').eq('zakazka_id', id).order('created_at'),
    ])
    setProtokal(pData ?? {}); setNedorobky((nData ?? []) as NedorobekItem[])
  }

  async function loadReklamacie() {
    setRekLoading(true)
    const { data } = await supabase.from('reklamacie').select('*').eq('zakazka_id', id).order('created_at', { ascending: false })
    setReklamacie((data ?? []) as Reklamacia[])
    setRekLoading(false)
  }

  async function loadAktivity() {
    const { data } = await supabase.from('aktivita_log')
      .select('id, akcia, popis, user_meno, created_at')
      .eq('entita_typ', 'zakazka').eq('entita_id', id)
      .order('created_at', { ascending: false }).limit(30)
    setAktLogy((data ?? []) as AktivitaLog[])
  }

  useEffect(() => { loadZakazka() }, [id])
  useEffect(() => {
    if (tab === 'dokumenty') loadDokumenty()
    if (tab === 'zameranie') loadZameranie()
    if (tab === 'protokol') loadProtokolTab()
    if (tab === 'reklamacie') loadReklamacie()
    if (tab === 'prehlad') loadAktivity()
  }, [tab, id])

  // ── pipeline: označiť krok ako hotový ──
  async function markStep(key: PipelineKey) {
    if (!zakazka) return
    setMarkingSaving(key)
    const today = new Date().toISOString().split('T')[0]
    const stepLabel = PIPELINE.find(p => p.key === key)?.label ?? key
    const { error } = await supabase.from('zakazky').update({ [key]: today, updated_by: userMeno }).eq('id', zakazka.id)
    if (!error) {
      setZakazka(prev => prev ? { ...prev, [key]: today } : prev)
      await logActivity('zakazka', zakazka.id, 'krok', `Krok označený: ${stepLabel}`, userMeno)
    }
    setMarkingSaving(null)
  }

  // ── edit zákazka ──
  function openEdit() {
    if (!zakazka) return
    setEditForm(zakazkaToForm(zakazka)); setSaveError(null); setShowEdit(true)
  }
  async function saveEdit() {
    if (!editForm || !zakazka) return
    setSaving(true); setSaveError(null)
    const n = (v: string) => v || null
    const num = (v: string) => v ? parseFloat(v.replace(',', '.')) : null
    const payload: Record<string, unknown> = {
      zakaznik_nazov: n(editForm.zakaznik_nazov), adresa_montaze: n(editForm.adresa_montaze),
      kontakt: n(editForm.kontakt), email: n(editForm.email), obchodnik: n(editForm.obchodnik), stav: editForm.stav,
      popis_systemu: n(editForm.popis_systemu), typ_prac: n(editForm.typ_prac),
      rozsah_vyrobkov: n(editForm.rozsah_vyrobkov),
      pocet_napilkov: editForm.pocet_napilkov ? parseInt(editForm.pocet_napilkov) : null,
      objem_spolu: num(editForm.objem_spolu), zalona: num(editForm.zalona), doplatok: num(editForm.doplatok),
      termin_zod: n(editForm.termin_zod), poznamka: n(editForm.poznamka),
      cislo_vyrobnej_davky: n(editForm.cislo_vyrobnej_davky),
      cislo_obj_dodavatela: n(editForm.cislo_obj_dodavatela),
      dat_dopyt: n(editForm.dat_dopyt), dat_ponuka: n(editForm.dat_ponuka),
      dat_odsouhlasenie: n(editForm.dat_odsouhlasenie), dat_zameranie: n(editForm.dat_zameranie),
      dat_finalna_ponuka: n(editForm.dat_finalna_ponuka),
      dat_zmluva: n(editForm.dat_zmluva), dat_zalona_prijata: n(editForm.dat_zalona_prijata),
      dat_objednavka: n(editForm.dat_objednavka), dat_prijem_sklad: n(editForm.dat_prijem_sklad),
      dat_montaz: n(editForm.dat_montaz), dat_odovzdanie: n(editForm.dat_odovzdanie),
      dat_dofakturacia: n(editForm.dat_dofakturacia),
    }
    payload.updated_by = userMeno
    const { error } = await supabase.from('zakazky').update(payload).eq('id', zakazka.id)
    if (error) { setSaveError(error.message); setSaving(false); return }
    await logActivity('zakazka', zakazka.id, 'upravil', `Zákazka upravená`, userMeno)
    setSaving(false); setShowEdit(false); loadZakazka()
  }
  const ef = (key: keyof EditForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setEditForm(prev => prev ? { ...prev, [key]: e.target.value } : prev)

  // ── dokumenty ──
  async function uploadDoc(file: File) {
    if (!id) return
    setUploadingDoc(true); setDocError(null)
    const path = `${id}/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('zakazky-docs').upload(path, file)
    if (upErr) { setDocError('Upload zlyhal: ' + upErr.message); setUploadingDoc(false); return }
    const { data: urlData } = supabase.storage.from('zakazky-docs').getPublicUrl(path)
    const { data: newDoc } = await supabase.from('zakazka_dokumenty').insert({
      zakazka_id: id, nazov: file.name, url: urlData.publicUrl, storage_path: path, typ: uploadTyp,
    }).select().single()
    if (newDoc) {
      setDocs(prev => [...prev, newDoc as ZakazkaDoc])
      if (id) await logActivity('zakazka', id, 'dokument', `Dokument pridaný: ${file.name}`, userMeno)
    }
    setUploadingDoc(false)
  }
  async function deleteDoc(doc: ZakazkaDoc) {
    await supabase.storage.from('zakazky-docs').remove([doc.storage_path])
    await supabase.from('zakazka_dokumenty').delete().eq('id', doc.id)
    setDocs(prev => prev.filter(d => d.id !== doc.id))
    if (previewDocId === doc.id) setPreviewDocId(null)
  }
  async function toggleDocPreview(doc: ZakazkaDoc) {
    if (previewDocId === doc.id) { setPreviewDocId(null); return }
    setPreviewDocId(doc.id)
    if (previewContent[doc.id] !== undefined) return
    try {
      const res = await fetch(doc.url)
      const text = await res.text()
      setPreviewContent(prev => ({ ...prev, [doc.id]: parseRtf(text) }))
    } catch {
      setPreviewContent(prev => ({ ...prev, [doc.id]: 'Chyba pri načítaní.' }))
    }
  }

  // ── zameranie ──
  async function saveZameranie() {
    if (!id) return
    setZameranieSaving(true)
    if (zameranie.id) {
      await supabase.from('zamerania').update({ ...zameranie, updated_at: new Date().toISOString() }).eq('id', zameranie.id)
    } else {
      const { data } = await supabase.from('zamerania').insert({ ...zameranie, zakazka_id: id }).select().single()
      if (data) setZameranie(data as ZameranieData)
    }
    setZameranieSaving(false); setZameranieSaved(true)
    setTimeout(() => setZameranieSaved(false), 2000)
  }

  // ── protokol ──
  async function saveProtokal() {
    if (!id) return
    setProtokolSaving(true)
    if (protokol.id) {
      await supabase.from('protokoly').update({ ...protokol }).eq('id', protokol.id)
    } else {
      const { data } = await supabase.from('protokoly').insert({ ...protokol, zakazka_id: id }).select().single()
      if (data) setProtokal(data as ProtokolData)
    }
    setProtokolSaving(false); setProtokolSaved(true)
    setTimeout(() => setProtokolSaved(false), 2000)
  }

  // ── nedorobky ──
  async function addNedorobka() {
    if (!novaNedorobka.trim() || !id) return
    setAddingNedorobka(true)
    const { data } = await supabase.from('nedorobky').insert({ zakazka_id: id, popis: novaNedorobka.trim() }).select().single()
    if (data) setNedorobky(prev => [...prev, data as NedorobekItem])
    setNovaNedorobka(''); setAddingNedorobka(false)
  }
  async function toggleNedorobka(item: NedorobekItem) {
    const s = item.stav === 'otvorena' ? 'vyriesena' : 'otvorena'
    await supabase.from('nedorobky').update({ stav: s }).eq('id', item.id)
    setNedorobky(prev => prev.map(n => n.id === item.id ? { ...n, stav: s } : n))
  }
  async function deleteNedorobka(itemId: string) {
    await supabase.from('nedorobky').delete().eq('id', itemId)
    setNedorobky(prev => prev.filter(n => n.id !== itemId))
  }

  // ── reklamácie ──
  async function addReklamacia() {
    if (!rekForm.popis.trim() || !id) return
    setRekSaving(true)
    await supabase.from('reklamacie').insert({
      zakazka_id: id, typ: rekSubTab,
      popis: rekForm.popis.trim(),
      termin_riesenia: rekForm.termin_riesenia || null,
      technik: rekForm.technik || null,
      dodavatel: rekSubTab === 'vyroba' ? rekForm.dodavatel || null : null,
      cislo_objednavky: rekSubTab === 'vyroba' ? rekForm.cislo_objednavky || null : null,
    })
    const typLabel = rekSubTab === 'zakaznik' ? 'od zákazníka' : 'voči výrobcovi'
    await logActivity('zakazka', id, 'reklamacia', `Reklamácia ${typLabel} pridaná`, userMeno)
    setRekSaving(false); setShowRekForm(false)
    setRekForm({ popis: '', termin_riesenia: '', technik: '', dodavatel: '', cislo_objednavky: '' })
    loadReklamacie()
  }

  // ── loading / not found ──
  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-[#8b9bb4]">
      <Loader2 size={18} className="animate-spin" /><span className="text-sm">Načítavam zákazku...</span>
    </div>
  )
  if (!zakazka) return (
    <div className="flex flex-col items-center justify-center h-64 text-[#8b9bb4]">
      <p className="text-lg font-medium">Zákazka nenájdená</p>
      <button onClick={() => navigate('/zakazky')} className="mt-3 text-[#0779e4] text-sm hover:underline">Späť</button>
    </div>
  )

  const s = stavLabels[zakazka.stav]
  const record = zakazka as unknown as Record<string, unknown>
  const doneCount = PIPELINE.filter(p => !!record[p.key]).length
  const progress = Math.round((doneCount / PIPELINE.length) * 100)
  const nextIdx = PIPELINE.findIndex(p => !record[p.key])

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 max-w-6xl">

      {/* HEADER */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/zakazky')} className="p-2 rounded-[8px] text-[#8b9bb4] hover:bg-white hover:text-[#1a2332] transition-colors mt-0.5">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#1a2332]">{zakazka.cislo_zod}</h1>
            <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full', s.cls)}>{s.label}</span>
            {zakazka.cislo_obj_dodavatela && (
              <span className="text-xs font-mono bg-[#fff3e0] text-[#e65100] px-2 py-1 rounded-[6px]">Obj: {zakazka.cislo_obj_dodavatela}</span>
            )}
            {zakazka.cislo_vyrobnej_davky && (
              <span className="text-xs font-mono bg-[#f4f6f9] text-[#8b9bb4] px-2 py-1 rounded-[6px]">KLAES: {zakazka.cislo_vyrobnej_davky}</span>
            )}
          </div>
          <p className="text-[#8b9bb4] text-sm mt-0.5">{zakazka.zakaznik_nazov} · {zakazka.adresa_montaze}</p>
        </div>
        <button onClick={openEdit} className="flex items-center gap-2 px-3 py-2 border border-[#e0e0e0] text-[#4a5568] text-sm font-medium rounded-[8px] hover:bg-white transition-colors flex-shrink-0">
          <Edit2 size={14} /> Upraviť
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-1 bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-1.5">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-[8px] text-sm font-medium transition-colors flex-1 justify-center',
              tab === t.key ? 'bg-[#1c2636] text-white' : 'text-[#8b9bb4] hover:text-[#1a2332] hover:bg-[#f4f6f9]'
            )}>
              <Icon size={14} /><span className="hidden sm:inline">{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* ══ TAB: PREHĽAD ══════════════════════════════════════════════════════ */}
      {tab === 'prehlad' && (
        <>
          {/* Pipeline */}
          <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-[#1a2332]">Priebeh zákazky</h2>
              <span className="text-sm text-[#8b9bb4]">{doneCount}/{PIPELINE.length} · {progress}%</span>
            </div>
            <div className="w-full bg-[#f4f6f9] rounded-full h-1.5 mb-4">
              <div className="bg-[#66bb6a] h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="overflow-x-auto pb-2">
              <div className="flex items-start gap-0 min-w-max">
                {PIPELINE.map((step, i) => {
                  const done = !!record[step.key]
                  const isNext = i === nextIdx
                  const gc = GROUP_COLORS[step.group]
                  return (
                    <div key={step.key} className="flex items-start">
                      <div className={clsx(
                        'flex flex-col items-center w-[84px] px-1.5 py-2.5 rounded-[10px] text-center',
                        done ? '' : isNext ? 'ring-2 ring-offset-1 ring-amber-300' : ''
                      )} style={{ background: done ? gc.done : isNext ? '#fffbeb' : '#f4f6f9' }}>
                        {/* Circle */}
                        <div className="w-8 h-8 rounded-full flex items-center justify-center mb-1.5 flex-shrink-0"
                          style={{ background: done ? gc.dot : isNext ? '#fbbf24' : '#d1d5db' }}>
                          {done
                            ? <CheckCircle2 size={16} className="text-white" />
                            : <span className="text-xs font-bold text-white">{i + 1}</span>}
                        </div>
                        {/* Label */}
                        <p className="text-[10px] font-semibold leading-tight mb-1"
                          style={{ color: done ? gc.text : isNext ? '#92400e' : '#9ca3af' }}>
                          {step.label}
                        </p>
                        {/* Date or button */}
                        {done ? (
                          <p className="text-[9px]" style={{ color: gc.dot }}>{formatDatum(String(record[step.key]))}</p>
                        ) : isNext ? (
                          <button
                            onClick={() => markStep(step.key as PipelineKey)}
                            disabled={markingSaving === step.key}
                            className="text-[9px] px-2 py-0.5 rounded-full text-white transition-opacity hover:opacity-80 disabled:opacity-60"
                            style={{ background: '#f59e0b' }}
                          >
                            {markingSaving === step.key ? '...' : '✓ Označiť'}
                          </button>
                        ) : null}
                      </div>
                      {/* Connector */}
                      {i < PIPELINE.length - 1 && (
                        <div className="w-3 h-0.5 mt-4 flex-shrink-0"
                          style={{ background: done && !!record[PIPELINE[i + 1].key] ? '#66bb6a' : '#e0e0e0' }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 3-col */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
              <h2 className="font-semibold text-[#1a2332] mb-3 flex items-center gap-2"><User size={15} className="text-[#0779e4]" /> Zákazník</h2>
              <InfoRow label="Meno / Firma" value={zakazka.zakaznik_nazov} />
              <InfoRow label="Adresa montáže" value={zakazka.adresa_montaze} icon={MapPin} />
              <InfoRow label="Kontakt" value={zakazka.kontakt} icon={Phone} />
              <InfoRow label="E-mail" value={zakazka.email} icon={Mail} />
              <InfoRow label="Obchodník" value={zakazka.obchodnik} icon={User} />
            </div>
            <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
              <h2 className="font-semibold text-[#1a2332] mb-3 flex items-center gap-2"><Package size={15} className="text-[#0779e4]" /> Produkty & práce</h2>
              <InfoRow label="Systém" value={zakazka.popis_systemu} />
              <InfoRow label="Rozsah výrobkov" value={zakazka.rozsah_vyrobkov} />
              <InfoRow label="Typ prác" value={zakazka.typ_prac} icon={Wrench} />
              <InfoRow label="Počet nápilkov" value={zakazka.pocet_napilkov?.toString()} />
              {zakazka.poznamka && <InfoRow label="Poznámka" value={String(zakazka.poznamka)} icon={FileText} />}
            </div>
            <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
              <h2 className="font-semibold text-[#1a2332] mb-3 flex items-center gap-2"><Euro size={15} className="text-[#0779e4]" /> Financie</h2>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-[#f4f6f9] rounded-[8px] p-3">
                  <p className="text-xs text-[#8b9bb4]">Celkom</p>
                  <p className="text-base font-bold text-[#1a2332]">{formatEur(zakazka.objem_spolu)}</p>
                </div>
                <div className="bg-[#e8f5e9] rounded-[8px] p-3">
                  <p className="text-xs text-[#8b9bb4]">Záloha</p>
                  <p className="text-base font-bold text-[#57a85b]">{formatEur(zakazka.zalona)}</p>
                </div>
              </div>
              {zakazka.doplatok && (
                <div className="flex justify-between py-2 border-b border-[#f4f6f9] text-sm">
                  <span className="text-[#8b9bb4]">Doplatok</span>
                  <span className="font-medium">{formatEur(zakazka.doplatok)}</span>
                </div>
              )}
              <div className="flex items-center justify-between mt-2.5">
                <span className="text-sm text-[#8b9bb4]">Termín ZoD</span>
                <div className="flex items-center gap-1 text-sm font-medium text-[#1a2332]">
                  <Calendar size={12} className="text-[#0779e4]" />
                  {formatDatum(zakazka.termin_zod, true) ?? '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Aktivita log */}
          {aktLogy.length > 0 && (
            <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
              <h2 className="font-semibold text-[#1a2332] mb-3 flex items-center gap-2">
                <ClipboardList size={15} className="text-[#0779e4]" /> História zmien
              </h2>
              <div className="space-y-0 divide-y divide-[#f4f6f9]">
                {aktLogy.map(l => (
                  <div key={l.id} className="flex items-start gap-3 py-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#e3f0fd] flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-[#0779e4]">
                        {(l.user_meno ?? 'N').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1a2332]">{l.popis}</p>
                      <p className="text-xs text-[#8b9bb4]">
                        {l.user_meno} · {new Date(l.created_at).toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ══ TAB: DOKUMENTY ════════════════════════════════════════════════════ */}
      {tab === 'dokumenty' && (
        <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <FolderOpen size={16} className="text-[#0779e4]" />
              <h2 className="font-semibold text-[#1a2332]">Dokumenty</h2>
              {docs.length > 0 && <span className="text-xs text-[#8b9bb4]">{docs.length} súborov</span>}
            </div>
            <div className="flex items-center gap-2">
              <select value={uploadTyp} onChange={e => setUploadTyp(e.target.value)}
                className="text-xs border border-[#e0e0e0] rounded-[7px] px-2 py-1.5 text-[#4a5568] bg-white focus:outline-none focus:border-[#0779e4]">
                {DOC_TYPY.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input ref={fileInputRef} type="file" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc(f); e.target.value = '' }} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingDoc}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-[#c1cad6] text-sm text-[#4a5568] rounded-[8px] hover:border-[#0779e4] hover:text-[#0779e4] disabled:opacity-60 transition-colors">
                {uploadingDoc ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Pridať
              </button>
            </div>
          </div>

          {docError && <p className="mb-3 text-sm text-red-500 bg-red-50 px-3 py-2 rounded-[8px]">{docError}</p>}

          {docs.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-[#8b9bb4]">
              <FolderOpen size={36} className="mb-2 opacity-20" />
              <p className="text-sm">Žiadne dokumenty — pridajte ponuku, zmluvu, KLAES RTF, fotky...</p>
            </div>
          ) : (
            <>
              {/* Group by typ */}
              {DOC_TYPY.filter(t => docs.some(d => d.typ === t.value)).map(typ => (
                <div key={typ.value} className="mb-5">
                  <p className="text-xs font-semibold text-[#8b9bb4] uppercase tracking-wide mb-2">{typ.label}</p>
                  <div className="space-y-2">
                    {docs.filter(d => d.typ === typ.value).map(doc => (
                      <div key={doc.id}>
                        <div className="flex items-center gap-3 p-3 bg-[#f4f6f9] rounded-[8px]">
                          <FileText size={15} className="text-[#0779e4] flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1a2332] truncate">{doc.nazov}</p>
                            <p className="text-xs text-[#8b9bb4]">{new Date(doc.created_at).toLocaleDateString('sk-SK')}</p>
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            {(doc.typ === 'klaes_rtf' || doc.nazov.toLowerCase().endsWith('.rtf')) && (
                              <button onClick={() => toggleDocPreview(doc)}
                                className={clsx('flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-[6px] transition-colors',
                                  previewDocId === doc.id ? 'bg-[#1c2636] text-white' : 'border border-[#e0e0e0] text-[#4a5568] hover:bg-white')}>
                                <FileText size={11} />{previewDocId === doc.id ? 'Skryť' : 'Náhľad'}
                              </button>
                            )}
                            <a href={doc.url} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#0779e4] border border-[#0779e4]/30 rounded-[6px] hover:bg-[#0779e4]/5 transition-colors">
                              <Download size={11} />
                            </a>
                            <button onClick={() => deleteDoc(doc)}
                              className="flex items-center px-2.5 py-1.5 text-xs text-red-400 border border-red-200 rounded-[6px] hover:bg-red-50 transition-colors">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                        {previewDocId === doc.id && previewContent[doc.id] !== undefined && (
                          <pre className="mt-1 p-4 bg-[#fafbfc] border border-[#e0e0e0] rounded-[8px] text-xs font-mono whitespace-pre-wrap overflow-auto max-h-80 leading-relaxed">
                            {previewContent[doc.id] || '(prázdny súbor)'}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ══ TAB: ZAMERANIE ════════════════════════════════════════════════════ */}
      {tab === 'zameranie' && (
        <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
          <div className="flex items-center gap-2 mb-5">
            <Ruler size={16} className="text-[#0779e4]" />
            <h2 className="font-semibold text-[#1a2332]">Zameranie</h2>
          </div>
          <div className="space-y-4 max-w-lg">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Dátum zamerania">
                <input type="date" value={zameranie.datum ?? ''} onChange={e => setZameranie(z => ({ ...z, datum: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Zameral">
                <input value={zameranie.kto ?? ''} onChange={e => setZameranie(z => ({ ...z, kto: e.target.value }))} placeholder="Meno pracovníka" className={inputCls} />
              </Field>
            </div>
            <Field label="Poznámky / rozmery">
              <textarea value={zameranie.poznamky ?? ''} onChange={e => setZameranie(z => ({ ...z, poznamky: e.target.value }))}
                rows={10} placeholder="Rozmery okien, parapetov, žalúzií, špeciálne požiadavky, poznámky k montáži..."
                className={clsx(inputCls, 'resize-y font-mono text-xs')} />
            </Field>
            <div className="flex items-center gap-3">
              <button onClick={saveZameranie} disabled={zameranieSaving}
                className="flex items-center gap-2 px-5 py-2 bg-[#0779e4] text-white text-sm font-medium rounded-[8px] hover:bg-[#0669cc] disabled:opacity-60 transition-colors">
                {zameranieSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Uložiť
              </button>
              {zameranieSaved && <span className="flex items-center gap-1.5 text-sm text-[#66bb6a]"><CheckCircle2 size={14} /> Uložené</span>}
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB: PROTOKOL ═════════════════════════════════════════════════════ */}
      {tab === 'protokol' && (
        <div className="space-y-4">
          {/* Preberací protokol */}
          <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
            <div className="flex items-center gap-2 mb-5"><ClipboardList size={16} className="text-[#0779e4]" /><h2 className="font-semibold text-[#1a2332]">Preberací protokol</h2></div>
            <div className="space-y-4 max-w-lg">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Dátum odovzdania">
                  <input type="date" value={protokol.datum ?? ''} onChange={e => setProtokal(p => ({ ...p, datum: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Montážnik">
                  <input value={protokol.montaznik ?? ''} onChange={e => setProtokal(p => ({ ...p, montaznik: e.target.value }))} className={inputCls} />
                </Field>
              </div>
              <Field label="Stav protokolu">
                <select value={protokol.stav ?? 'rozpracovany'} onChange={e => setProtokal(p => ({ ...p, stav: e.target.value }))} className={inputCls}>
                  <option value="rozpracovany">Rozpracovaný</option>
                  <option value="podpisany">Podpísaný zákazníkom</option>
                  <option value="archivovany">Archivovaný</option>
                </select>
              </Field>
              <Field label="Poznámka">
                <textarea value={protokol.poznamka ?? ''} onChange={e => setProtokal(p => ({ ...p, poznamka: e.target.value }))} rows={3} className={clsx(inputCls, 'resize-none')} />
              </Field>
              <div className="flex items-center gap-3">
                <button onClick={saveProtokal} disabled={protokolSaving}
                  className="flex items-center gap-2 px-5 py-2 bg-[#0779e4] text-white text-sm font-medium rounded-[8px] hover:bg-[#0669cc] disabled:opacity-60 transition-colors">
                  {protokolSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Uložiť protokol
                </button>
                {protokolSaved && <span className="flex items-center gap-1.5 text-sm text-[#66bb6a]"><CheckCircle2 size={14} /> Uložené</span>}
              </div>
            </div>
          </div>

          {/* Nedorobky */}
          <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <ClipboardList size={16} className="text-amber-500" />
              <h2 className="font-semibold text-[#1a2332]">Nedorobky</h2>
              {nedorobky.length > 0 && (
                <span className="text-xs text-[#8b9bb4]">{nedorobky.filter(n => n.stav === 'otvorena').length} otvorených / {nedorobky.length}</span>
              )}
            </div>
            <div className="flex gap-2 mb-4">
              <input value={novaNedorobka} onChange={e => setNovaNedorobka(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNedorobka()}
                placeholder="Popis nedorobky..." className={clsx(inputCls, 'flex-1')} />
              <button onClick={addNedorobka} disabled={addingNedorobka || !novaNedorobka.trim()}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#66bb6a] text-white text-sm font-medium rounded-[8px] hover:bg-[#57a85b] disabled:opacity-60 transition-colors flex-shrink-0">
                {addingNedorobka ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Pridať
              </button>
            </div>
            {nedorobky.length === 0
              ? <p className="text-sm text-[#8b9bb4] text-center py-4">Žiadne nedorobky</p>
              : <div className="space-y-2">
                  {nedorobky.map(item => (
                    <div key={item.id} className={clsx('flex items-center gap-3 p-3 rounded-[8px]', item.stav === 'vyriesena' ? 'bg-[#f4f6f9] opacity-60' : 'bg-amber-50')}>
                      <button onClick={() => toggleNedorobka(item)} className="flex-shrink-0">
                        {item.stav === 'vyriesena' ? <CheckSquare size={18} className="text-[#66bb6a]" /> : <Square size={18} className="text-amber-400" />}
                      </button>
                      <p className={clsx('flex-1 text-sm', item.stav === 'vyriesena' && 'line-through text-[#8b9bb4]')}>{item.popis}</p>
                      <button onClick={() => deleteNedorobka(item.id)} className="p-1 text-[#c1cad6] hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
      )}

      {/* ══ TAB: REKLAMÁCIE ═══════════════════════════════════════════════════ */}
      {tab === 'reklamacie' && (
        <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
          {/* Sub-tabs */}
          <div className="flex border-b border-[#f4f6f9]">
            {([
              { key: 'zakaznik', label: '👤 Od zákazníka', desc: 'zákazník reklamuje nám' },
              { key: 'vyroba',   label: '🏭 Voči výrobcovi', desc: 'my reklamujeme výrobcovi' },
            ] as const).map(st => (
              <button key={st.key} onClick={() => { setRekSubTab(st.key); setShowRekForm(false) }}
                className={clsx('flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2', rekSubTab === st.key
                  ? 'border-[#0779e4] text-[#0779e4] bg-[#f0f7ff]'
                  : 'border-transparent text-[#8b9bb4] hover:text-[#1a2332] hover:bg-[#f4f6f9]')}>
                <span>{st.label}</span>
                <span className="block text-[10px] font-normal text-[#8b9bb4]">{st.desc}</span>
              </button>
            ))}
          </div>

          {/* Header with add button */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-[#f4f6f9]">
            <span className="text-sm text-[#8b9bb4]">
              {reklamacie.filter(r => r.typ === rekSubTab).length} záznamov
            </span>
            <button onClick={() => setShowRekForm(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#66bb6a] text-white text-sm font-medium rounded-[8px] hover:bg-[#57a85b] transition-colors">
              <Plus size={14} /> Nová reklamácia
            </button>
          </div>

          {/* Add form */}
          {showRekForm && (
            <div className="px-6 py-4 border-b border-[#f4f6f9] bg-[#fafbfc] space-y-3">
              <Field label="Popis *">
                <textarea value={rekForm.popis} onChange={e => setRekForm(f => ({ ...f, popis: e.target.value }))}
                  rows={2} autoFocus placeholder={rekSubTab === 'zakaznik' ? 'Popis závady / reklamácie od zákazníka...' : 'Popis poškodeného / chybného tovaru...'}
                  className={clsx(inputCls, 'resize-none')} />
              </Field>
              {rekSubTab === 'vyroba' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Dodávateľ / výrobca">
                    <input value={rekForm.dodavatel} onChange={e => setRekForm(f => ({ ...f, dodavatel: e.target.value }))} placeholder="KLAES, Isotra, Rollson..." className={inputCls} />
                  </Field>
                  <Field label="Č. objednávky / dávky">
                    <input value={rekForm.cislo_objednavky} onChange={e => setRekForm(f => ({ ...f, cislo_objednavky: e.target.value }))} placeholder="napr. PA5112A1" className={inputCls} />
                  </Field>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Termín riešenia">
                  <input type="date" value={rekForm.termin_riesenia} onChange={e => setRekForm(f => ({ ...f, termin_riesenia: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Zodpovedný">
                  <input value={rekForm.technik} onChange={e => setRekForm(f => ({ ...f, technik: e.target.value }))} placeholder="Meno pracovníka" className={inputCls} />
                </Field>
              </div>
              <div className="flex gap-2">
                <button onClick={addReklamacia} disabled={rekSaving || !rekForm.popis.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0779e4] text-white text-sm font-medium rounded-[8px] hover:bg-[#0669cc] disabled:opacity-60 transition-colors">
                  {rekSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Uložiť
                </button>
                <button onClick={() => setShowRekForm(false)} className="px-4 py-2 text-sm border border-[#e0e0e0] rounded-[8px] hover:bg-[#f4f6f9] transition-colors">Zrušiť</button>
              </div>
            </div>
          )}

          {/* List */}
          {rekLoading ? (
            <div className="flex justify-center py-10"><Loader2 size={18} className="animate-spin text-[#8b9bb4]" /></div>
          ) : reklamacie.filter(r => r.typ === rekSubTab).length === 0 ? (
            <div className="flex flex-col items-center py-12 text-[#8b9bb4]">
              <AlertTriangle size={32} className="mb-2 opacity-20" />
              <p className="text-sm">Žiadne reklamácie</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f4f6f9]">
              {reklamacie.filter(r => r.typ === rekSubTab).map(rek => (
                <div key={rek.id} className="px-6 py-4">
                  <div className="flex items-start gap-3 flex-wrap mb-2">
                    <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', stavRekCls[rek.stav] ?? 'bg-gray-100 text-gray-600')}>
                      {stavRekLabel[rek.stav] ?? rek.stav}
                    </span>
                    <span className="text-xs text-[#8b9bb4]">{formatDatum(rek.created_at, true)}</span>
                    {rek.termin_riesenia && (
                      <span className="flex items-center gap-1 text-xs text-[#0779e4]">
                        <Calendar size={10} /> {formatDatum(rek.termin_riesenia)}
                      </span>
                    )}
                    {rek.dodavatel && <span className="text-xs bg-[#f4f6f9] text-[#4a5568] px-2 py-0.5 rounded-full">{rek.dodavatel}</span>}
                    {rek.cislo_objednavky && <span className="text-xs font-mono bg-[#f4f6f9] text-[#8b9bb4] px-2 py-0.5 rounded-full">{rek.cislo_objednavky}</span>}
                  </div>
                  <p className="text-sm text-[#1a2332]">{rek.popis}</p>
                  {rek.technik && <p className="text-xs text-[#8b9bb4] mt-1">Zodpovedný: {rek.technik}</p>}
                  {rek.riesenie && (
                    <p className="text-sm text-[#4a5568] mt-2 bg-[#f4f6f9] px-3 py-2 rounded-[6px]">Riešenie: {rek.riesenie}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ EDIT MODAL ════════════════════════════════════════════════════════ */}
      {showEdit && editForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm overflow-y-auto py-8">
          <div className="bg-white rounded-[12px] shadow-xl w-full max-w-2xl mx-4 my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f4f6f9]">
              <h2 className="font-semibold text-[#1a2332]">Upraviť zákazku {zakazka.cislo_zod}</h2>
              <button onClick={() => setShowEdit(false)} className="p-1 rounded-[6px] text-[#8b9bb4] hover:bg-[#f4f6f9]"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-5">
              {/* Základné */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Zákazník"><input value={editForm.zakaznik_nazov} onChange={ef('zakaznik_nazov')} className={inputCls} /></Field>
                <Field label="Stav">
                  <select value={editForm.stav} onChange={ef('stav')} className={inputCls}>
                    <option value="nova">Nová</option><option value="aktivna">Aktívna</option>
                    <option value="caka">Čaká</option><option value="hotova">Hotová</option><option value="storno">Storno</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Adresa montáže"><input value={editForm.adresa_montaze} onChange={ef('adresa_montaze')} className={inputCls} /></Field>
                <Field label="Kontakt"><input value={editForm.kontakt} onChange={ef('kontakt')} className={inputCls} /></Field>
                <Field label="E-mail"><input value={editForm.email} onChange={ef('email')} type="email" placeholder="zakaznik@email.sk" className={inputCls} /></Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Obchodník"><input value={editForm.obchodnik} onChange={ef('obchodnik')} className={inputCls} /></Field>
                <Field label="Č. obj. dodávateľa"><input value={editForm.cislo_obj_dodavatela} onChange={ef('cislo_obj_dodavatela')} placeholder="napr. KL-2026-04512" className={inputCls} /></Field>
                <Field label="KLAES – č. výrobnej dávky"><input value={editForm.cislo_vyrobnej_davky} onChange={ef('cislo_vyrobnej_davky')} className={inputCls} /></Field>
              </div>
              <hr className="border-[#f4f6f9]" />
              <div className="grid grid-cols-3 gap-4">
                <Field label="Systém"><input value={editForm.popis_systemu} onChange={ef('popis_systemu')} className={inputCls} /></Field>
                <Field label="Typ prác"><input value={editForm.typ_prac} onChange={ef('typ_prac')} className={inputCls} /></Field>
                <Field label="Počet nápilkov"><input value={editForm.pocet_napilkov} onChange={ef('pocet_napilkov')} type="number" min="0" className={inputCls} /></Field>
              </div>
              <Field label="Rozsah výrobkov"><input value={editForm.rozsah_vyrobkov} onChange={ef('rozsah_vyrobkov')} className={inputCls} /></Field>
              <hr className="border-[#f4f6f9]" />
              <div className="grid grid-cols-3 gap-4">
                <Field label="Objem spolu (€)"><input value={editForm.objem_spolu} onChange={ef('objem_spolu')} className={inputCls} /></Field>
                <Field label="Záloha (€)"><input value={editForm.zalona} onChange={ef('zalona')} className={inputCls} /></Field>
                <Field label="Doplatok (€)"><input value={editForm.doplatok} onChange={ef('doplatok')} className={inputCls} /></Field>
              </div>
              <Field label="Termín ZoD"><input value={editForm.termin_zod} onChange={ef('termin_zod')} type="date" className={inputCls} /></Field>
              <Field label="Poznámka"><textarea value={editForm.poznamka} onChange={ef('poznamka')} rows={2} className={clsx(inputCls, 'resize-none')} /></Field>
              <hr className="border-[#f4f6f9]" />
              {/* Pipeline dátumy */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs font-semibold text-[#8b9bb4] uppercase tracking-wide">Dátumy krokov</p>
                  <ChevronDown size={12} className="text-[#c1cad6]" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PIPELINE.map(p => (
                    <Field key={p.key} label={`${PIPELINE.indexOf(p) + 1}. ${p.label}`}>
                      <input value={(editForm as Record<string, string>)[p.key] ?? ''} onChange={ef(p.key as keyof EditForm)} type="date" className={inputCls} />
                    </Field>
                  ))}
                </div>
              </div>
              {saveError && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-[8px]">{saveError}</p>}
            </div>
            <div className="px-6 pb-5 flex justify-end gap-2">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm border border-[#e0e0e0] rounded-[8px] hover:bg-[#f4f6f9] transition-colors">Zrušiť</button>
              <button onClick={saveEdit} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-[#0779e4] text-white text-sm font-medium rounded-[8px] hover:bg-[#0669cc] disabled:opacity-60 transition-colors">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Uložiť zmeny
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
