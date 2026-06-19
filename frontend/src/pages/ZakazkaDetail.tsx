import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, Circle, Clock, MapPin,
  Phone, User, Package, Euro, Calendar, FileText,
  Wrench, ChevronRight, Edit2,
} from 'lucide-react'
import { mockZakazky } from '@/data/mockZakazky'
import { stavLabels } from '@/types/zakazka'
import clsx from 'clsx'

function formatEur(n?: number) {
  if (!n) return '—'
  return n.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function formatDatum(d?: string, long = false) {
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

export default function ZakazkaDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const zakazka = mockZakazky.find(z => z.id === id)

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
  const record = zakazka as Record<string, unknown>

  // Zisti aktuálny míľnik
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
        <button className="flex items-center gap-2 px-3 py-2 border border-[#e0e0e0] text-[#4a5568] text-sm font-medium rounded-[8px] hover:bg-white transition-colors">
          <Edit2 size={14} /> Upraviť
        </button>
      </div>

      {/* Progress bar míľnikov */}
      <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[#1a2332]">Priebeh zákazky</h2>
          <span className="text-sm text-[#8b9bb4]">{prvyNesplneny === -1 ? milnikyDef.length : prvyNesplneny}/{milnikyDef.length} krokov</span>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-[#f4f6f9] rounded-full h-1.5 mb-5">
          <div
            className="bg-[#66bb6a] h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Míľniky */}
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
                {record[m.key] && (
                  <p className="text-[10px] text-[#66bb6a]">{formatDatum(record[m.key] as string)}</p>
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
          {zakazka.poznamka && <InfoRow label="Poznámka" value={zakazka.poznamka} icon={FileText} />}
        </div>

        {/* Financie */}
        <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
          <h2 className="font-semibold text-[#1a2332] mb-3 flex items-center gap-2">
            <Euro size={16} className="text-[#0779e4]" /> Financie
          </h2>
          {/* Objem */}
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
          {zakazka.objem_f && (
            <div className="flex justify-between py-2 border-b border-[#f4f6f9] text-sm">
              <span className="text-[#8b9bb4]">Objem F (Fenestra)</span>
              <span className="font-medium text-[#1a2332]">{formatEur(zakazka.objem_f)}</span>
            </div>
          )}
          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-[#8b9bb4]">Termín ZoD</span>
            <div className="flex items-center gap-1.5 text-sm font-medium text-[#1a2332]">
              <Calendar size={13} className="text-[#0779e4]" />
              {formatDatum(zakazka.termin_zod, true)}
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
    </div>
  )
}
