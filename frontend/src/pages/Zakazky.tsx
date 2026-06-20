import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, ChevronRight, CheckCircle2, Circle, Clock, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { StavZakazky, stavLabels, Zakazka } from '@/types/zakazka'
import clsx from 'clsx'

const filtre: { key: StavZakazky | 'vsetky'; label: string }[] = [
  { key: 'vsetky', label: 'Všetky' },
  { key: 'nova', label: 'Nové' },
  { key: 'aktivna', label: 'Aktívne' },
  { key: 'caka', label: 'Čakajú' },
  { key: 'hotova', label: 'Hotové' },
  { key: 'storno', label: 'Storno' },
]

const milniky = [
  { key: 'dat_dokumentacia', label: 'Dok.' },
  { key: 'dat_objednavka',   label: 'Obj.' },
  { key: 'dat_ace',          label: 'ACE' },
  { key: 'dat_potvrdenie',   label: 'Potv.' },
  { key: 'dat_lozny_plan',   label: 'Lož.' },
  { key: 'dat_prijem_sklad', label: 'Sklad' },
  { key: 'dat_montaz',       label: 'Mont.' },
]

function formatEur(n?: number) {
  if (!n) return '—'
  return n.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function formatDatum(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric', year: '2-digit' })
}

export default function Zakazky() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<StavZakazky | 'vsetky'>('vsetky')
  const [search, setSearch] = useState('')
  const [zakazky, setZakazky] = useState<Zakazka[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
    load()
  }, [filter, search])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2332]">Zákazky</h1>
          <p className="text-sm text-[#8b9bb4]">{zakazky.length} zákaziek</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#66bb6a] text-white text-sm font-medium rounded-[8px] hover:bg-[#57a85b] transition-colors">
          <Plus size={15} /> Nová zákazka
        </button>
      </div>

      {/* Filtre + Hľadanie */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1 bg-white rounded-[8px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-1">
          {filtre.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={clsx(
                'px-3 py-1.5 rounded-[6px] text-sm font-medium transition-colors',
                filter === f.key
                  ? 'bg-[#1c2636] text-white'
                  : 'text-[#8b9bb4] hover:text-[#1a2332] hover:bg-[#f4f6f9]'
              )}
            >
              {f.label}
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
                  const record = z as Record<string, unknown>
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
                        <p className="text-xs text-[#8b9bb4]">{z.typ_prac} · {z.pocet_napilkov} nápilkov</p>
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
    </div>
  )
}
