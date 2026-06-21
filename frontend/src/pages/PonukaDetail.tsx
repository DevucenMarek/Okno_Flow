import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ArrowLeft, Edit2, Loader2, Save, X, ArrowRight, CheckCircle2, Phone, Mail, MapPin, User, Package, Euro, Calendar, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { logActivity } from '@/lib/activity'
import { type Ponuka, stavPonukyLabels } from './Ponuky'
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

type EditForm = {
  zakaznik_nazov: string; adresa_montaze: string; kontakt: string; email: string; obchodnik: string
  popis_systemu: string; typ_prac: string; rozsah_vyrobkov: string; pocet_napilkov: string
  objem_spolu: string; zalona: string; termin_platnosti: string; poznamka: string
  stav: Ponuka['stav']
}

export default function PonukaDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const userMeno = profile?.meno || profile?.email || 'Neznámy'
  const [ponuka, setPonuka] = useState<Ponuka | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Previesť na zákazku
  const [showConvert, setShowConvert] = useState(false)
  const [cislozod, setCisloZod] = useState('')
  const [converting, setConverting] = useState(false)
  const [convertError, setConvertError] = useState<string | null>(null)

  // aktivita log
  interface AktivitaLog { id: string; akcia: string; popis: string; user_meno: string; created_at: string }
  const [aktLogy, setAktLogy] = useState<AktivitaLog[]>([])

  async function load() {
    const { data } = await supabase.from('ponuky').select('*').eq('id', id).single()
    setPonuka(data as Ponuka); setLoading(false)
    const { data: logy } = await supabase.from('aktivita_log')
      .select('id, akcia, popis, user_meno, created_at')
      .eq('entita_typ', 'ponuka').eq('entita_id', id)
      .order('created_at', { ascending: false }).limit(30)
    setAktLogy((logy ?? []) as AktivitaLog[])
  }
  useEffect(() => { load() }, [id])

  function openEdit() {
    if (!ponuka) return
    setEditForm({
      zakaznik_nazov: ponuka.zakaznik_nazov, adresa_montaze: ponuka.adresa_montaze ?? '',
      kontakt: ponuka.kontakt ?? '', email: ponuka.email ?? '', obchodnik: ponuka.obchodnik ?? '',
      popis_systemu: ponuka.popis_systemu ?? '', typ_prac: ponuka.typ_prac ?? '',
      rozsah_vyrobkov: ponuka.rozsah_vyrobkov ?? '', pocet_napilkov: ponuka.pocet_napilkov?.toString() ?? '',
      objem_spolu: ponuka.objem_spolu?.toString() ?? '', zalona: ponuka.zalona?.toString() ?? '',
      termin_platnosti: ponuka.termin_platnosti ?? '', poznamka: ponuka.poznamka ?? '',
      stav: ponuka.stav,
    })
    setSaveError(null); setShowEdit(true)
  }

  async function saveEdit() {
    if (!editForm || !ponuka) return
    setSaving(true); setSaveError(null)
    const n = (v: string) => v || null
    const num = (v: string) => v ? parseFloat(v.replace(',', '.')) : null
    const { error } = await supabase.from('ponuky').update({
      zakaznik_nazov: editForm.zakaznik_nazov,
      adresa_montaze: n(editForm.adresa_montaze), kontakt: n(editForm.kontakt),
      email: n(editForm.email), obchodnik: n(editForm.obchodnik),
      popis_systemu: n(editForm.popis_systemu), typ_prac: n(editForm.typ_prac),
      rozsah_vyrobkov: n(editForm.rozsah_vyrobkov),
      pocet_napilkov: editForm.pocet_napilkov ? parseInt(editForm.pocet_napilkov) : null,
      objem_spolu: num(editForm.objem_spolu), zalona: num(editForm.zalona),
      termin_platnosti: n(editForm.termin_platnosti), poznamka: n(editForm.poznamka),
      stav: editForm.stav, updated_at: new Date().toISOString(),
      updated_by: userMeno,
    }).eq('id', ponuka.id)
    if (error) { setSaveError(error.message); setSaving(false); return }
    await logActivity('ponuka', ponuka.id, 'upravil', 'Ponuka upravená', userMeno)
    setSaving(false); setShowEdit(false); load()
  }
  const ef = (key: keyof EditForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setEditForm(prev => prev ? { ...prev, [key]: e.target.value } : prev)

  async function prevestNaZakazku() {
    if (!cislozod.trim() || !ponuka) return
    setConverting(true); setConvertError(null)
    const today = new Date().toISOString().split('T')[0]

    // Vytvor zákazku
    const { data: zakazka, error: ze } = await supabase.from('zakazky').insert({
      cislo_zod: cislozod.trim(),
      zakaznik_id: ponuka.zakaznik_id,
      zakaznik_nazov: ponuka.zakaznik_nazov,
      adresa_montaze: ponuka.adresa_montaze,
      kontakt: ponuka.kontakt,
      email: ponuka.email,
      obchodnik: ponuka.obchodnik,
      popis_systemu: ponuka.popis_systemu,
      typ_prac: ponuka.typ_prac,
      rozsah_vyrobkov: ponuka.rozsah_vyrobkov,
      pocet_napilkov: ponuka.pocet_napilkov,
      objem_spolu: ponuka.objem_spolu,
      zalona: ponuka.zalona,
      poznamka: ponuka.poznamka,
      stav: 'aktivna',
      dat_dopyt: today,
      dat_ponuka: today,
      dat_odsouhlasenie: today,
    }).select('id').single()

    if (ze) {
      setConvertError(ze.message.includes('unique') ? 'Zákazka s týmto číslom ZoD už existuje.' : ze.message)
      setConverting(false); return
    }

    // Označ ponuku ako prevzatú
    await supabase.from('ponuky').update({
      stav: 'prevzata', zakazka_id: zakazka!.id, updated_at: new Date().toISOString(),
      updated_by: userMeno,
    }).eq('id', ponuka.id)

    await logActivity('ponuka', ponuka.id, 'prevod', `Prevedená na zákazku ${cislozod.trim()}`, userMeno)
    await logActivity('zakazka', zakazka!.id, 'vytvoril', `Zákazka ${cislozod.trim()} vytvorená z ponuky ${ponuka.cislo_ponuky}`, userMeno)

    setConverting(false)
    navigate(`/zakazky/${zakazka!.id}`)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-[#8b9bb4]">
      <Loader2 size={18} className="animate-spin" /><span className="text-sm">Načítavam ponuku...</span>
    </div>
  )
  if (!ponuka) return (
    <div className="flex flex-col items-center justify-center h-64 text-[#8b9bb4]">
      <p className="text-lg font-medium">Ponuka nenájdená</p>
      <button onClick={() => navigate('/ponuky')} className="mt-3 text-[#0779e4] text-sm hover:underline">Späť</button>
    </div>
  )

  const s = stavPonukyLabels[ponuka.stav]
  const isPrevatza = ponuka.stav === 'prevzata'
  const mozePrevestNaZakazku = ponuka.stav === 'odsouhlasena'

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/ponuky')} className="p-2 rounded-[8px] text-[#8b9bb4] hover:bg-white hover:text-[#1a2332] transition-colors mt-0.5">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#1a2332] font-mono">{ponuka.cislo_ponuky}</h1>
            <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full', s.cls)}>{s.label}</span>
            {isPrevatza && ponuka.zakazka_id && (
              <button onClick={() => navigate(`/zakazky/${ponuka.zakazka_id}`)}
                className="flex items-center gap-1.5 text-xs text-purple-600 border border-purple-200 px-2.5 py-1 rounded-full hover:bg-purple-50 transition-colors">
                <ArrowRight size={11} /> Otvoriť zákazku
              </button>
            )}
          </div>
          <p className="text-[#8b9bb4] text-sm mt-0.5">{ponuka.zakaznik_nazov} · {ponuka.adresa_montaze}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {mozePrevestNaZakazku && (
            <button onClick={() => setShowConvert(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0779e4] text-white text-sm font-medium rounded-[8px] hover:bg-[#0669cc] transition-colors">
              <ArrowRight size={14} /> Previesť na zákazku
            </button>
          )}
          <button onClick={openEdit} className="flex items-center gap-2 px-3 py-2 border border-[#e0e0e0] text-[#4a5568] text-sm font-medium rounded-[8px] hover:bg-white transition-colors">
            <Edit2 size={14} /> Upraviť
          </button>
        </div>
      </div>

      {/* Info karty */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
          <h2 className="font-semibold text-[#1a2332] mb-3 flex items-center gap-2"><User size={15} className="text-[#0779e4]" /> Zákazník</h2>
          <InfoRow label="Meno / Firma" value={ponuka.zakaznik_nazov} />
          <InfoRow label="Adresa" value={ponuka.adresa_montaze} icon={MapPin} />
          <InfoRow label="Kontakt" value={ponuka.kontakt} icon={Phone} />
          <InfoRow label="E-mail" value={ponuka.email} icon={Mail} />
          <InfoRow label="Obchodník" value={ponuka.obchodnik} icon={User} />
        </div>

        <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
          <h2 className="font-semibold text-[#1a2332] mb-3 flex items-center gap-2"><Package size={15} className="text-[#0779e4]" /> Predmet ponuky</h2>
          <InfoRow label="Systém" value={ponuka.popis_systemu} />
          <InfoRow label="Rozsah výrobkov" value={ponuka.rozsah_vyrobkov} />
          <InfoRow label="Typ prác" value={ponuka.typ_prac} />
          <InfoRow label="Počet nápilkov" value={ponuka.pocet_napilkov?.toString()} />
          <InfoRow label="Poznámka" value={ponuka.poznamka} icon={FileText} />
        </div>

        <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
          <h2 className="font-semibold text-[#1a2332] mb-3 flex items-center gap-2"><Euro size={15} className="text-[#0779e4]" /> Financie</h2>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-[#f4f6f9] rounded-[8px] p-3">
              <p className="text-xs text-[#8b9bb4]">Celkom</p>
              <p className="text-base font-bold text-[#1a2332]">{formatEur(ponuka.objem_spolu)}</p>
            </div>
            <div className="bg-[#e8f5e9] rounded-[8px] p-3">
              <p className="text-xs text-[#8b9bb4]">Záloha</p>
              <p className="text-base font-bold text-[#57a85b]">{formatEur(ponuka.zalona)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-[#8b9bb4] flex items-center gap-1"><Calendar size={12} /> Platí do</span>
            <span className="font-medium text-[#1a2332]">{formatDatum(ponuka.termin_platnosti, true) ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-[#8b9bb4]">Vytvorená</span>
            <span className="font-medium text-[#1a2332]">{formatDatum(ponuka.created_at, true)}</span>
          </div>
        </div>
      </div>

      {/* Info banner ak je prevzatá */}
      {isPrevatza && (
        <div className="bg-purple-50 border border-purple-200 rounded-[10px] p-4 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-purple-600 flex-shrink-0" />
          <p className="text-sm text-purple-700">
            Táto ponuka bola prevedená na zákazku.
            {ponuka.zakazka_id && <button onClick={() => navigate(`/zakazky/${ponuka.zakazka_id}`)} className="ml-2 underline font-medium">Otvoriť zákazku →</button>}
          </p>
        </div>
      )}

      {/* Aktivita log */}
      {aktLogy.length > 0 && (
        <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
          <h2 className="font-semibold text-[#1a2332] mb-3 flex items-center gap-2">
            <FileText size={15} className="text-[#0779e4]" /> História zmien
          </h2>
          <div className="divide-y divide-[#f4f6f9]">
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

      {/* Modal: Previesť na zákazku */}
      {showConvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-[12px] shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f4f6f9]">
              <h2 className="font-semibold text-[#1a2332]">Previesť na zákazku</h2>
              <button onClick={() => setShowConvert(false)} className="p-1 rounded-[6px] text-[#8b9bb4] hover:bg-[#f4f6f9]"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#4a5568]">
                Vytvorí sa nová zákazka s údajmi z ponuky <span className="font-semibold">{ponuka.cislo_ponuky}</span>.
                Ponuka sa označí ako prevzatá.
              </p>
              <Field label="Číslo ZoD *">
                <input autoFocus value={cislozod} onChange={e => setCisloZod(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && prevestNaZakazku()}
                  placeholder="napr. 26Z045" className={inputCls} />
              </Field>
              {convertError && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-[8px]">{convertError}</p>}
            </div>
            <div className="px-6 pb-5 flex justify-end gap-2">
              <button onClick={() => setShowConvert(false)} className="px-4 py-2 text-sm border border-[#e0e0e0] rounded-[8px] hover:bg-[#f4f6f9] transition-colors">Zrušiť</button>
              <button onClick={prevestNaZakazku} disabled={converting || !cislozod.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-[#0779e4] text-white text-sm font-medium rounded-[8px] hover:bg-[#0669cc] disabled:opacity-60 transition-colors">
                {converting ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                Vytvoriť zákazku
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Upraviť ponuku */}
      {showEdit && editForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm overflow-y-auto py-8">
          <div className="bg-white rounded-[12px] shadow-xl w-full max-w-2xl mx-4 my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f4f6f9]">
              <h2 className="font-semibold text-[#1a2332]">Upraviť ponuku {ponuka.cislo_ponuky}</h2>
              <button onClick={() => setShowEdit(false)} className="p-1 rounded-[6px] text-[#8b9bb4] hover:bg-[#f4f6f9]"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Zákazník"><input value={editForm.zakaznik_nazov} onChange={ef('zakaznik_nazov')} className={inputCls} /></Field>
                <Field label="Stav">
                  <select value={editForm.stav} onChange={ef('stav')} className={inputCls}>
                    <option value="rozpracovana">Rozpracovaná</option>
                    <option value="odoslana">Odoslaná</option>
                    <option value="odsouhlasena">Odsúhlasená</option>
                    <option value="zamietnuta">Zamietnutá</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Adresa montáže"><input value={editForm.adresa_montaze} onChange={ef('adresa_montaze')} className={inputCls} /></Field>
                <Field label="Kontakt"><input value={editForm.kontakt} onChange={ef('kontakt')} className={inputCls} /></Field>
                <Field label="E-mail"><input value={editForm.email} onChange={ef('email')} type="email" className={inputCls} /></Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Systém"><input value={editForm.popis_systemu} onChange={ef('popis_systemu')} className={inputCls} /></Field>
                <Field label="Typ prác"><input value={editForm.typ_prac} onChange={ef('typ_prac')} className={inputCls} /></Field>
                <Field label="Počet nápilkov"><input value={editForm.pocet_napilkov} onChange={ef('pocet_napilkov')} type="number" className={inputCls} /></Field>
              </div>
              <Field label="Rozsah výrobkov"><input value={editForm.rozsah_vyrobkov} onChange={ef('rozsah_vyrobkov')} className={inputCls} /></Field>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Objem (€)"><input value={editForm.objem_spolu} onChange={ef('objem_spolu')} className={inputCls} /></Field>
                <Field label="Záloha (€)"><input value={editForm.zalona} onChange={ef('zalona')} className={inputCls} /></Field>
                <Field label="Platnosť"><input value={editForm.termin_platnosti} onChange={ef('termin_platnosti')} type="date" className={inputCls} /></Field>
              </div>
              <Field label="Poznámka"><textarea value={editForm.poznamka} onChange={ef('poznamka')} rows={2} className={`${inputCls} resize-none`} /></Field>
              {saveError && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-[8px]">{saveError}</p>}
            </div>
            <div className="px-6 pb-5 flex justify-end gap-2">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm border border-[#e0e0e0] rounded-[8px] hover:bg-[#f4f6f9] transition-colors">Zrušiť</button>
              <button onClick={saveEdit} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-[#0779e4] text-white text-sm font-medium rounded-[8px] hover:bg-[#0669cc] disabled:opacity-60 transition-colors">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Uložiť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
