import { useState, useEffect } from 'react'
import { Users, Briefcase, Calendar, Clock, AlertTriangle, CheckCircle2, ChevronRight, Loader2, Euro } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { stavLabels, Zakazka, PIPELINE } from '@/types/zakazka'
import { useAuth } from '@/context/AuthContext'
import clsx from 'clsx'

interface Stats {
  nova: number
  aktivna: number
  caka: number
  hotova: number
  celkovyObjem: number
  zakaznikCount: number
  bliziaTerminy: number
  otvoreneReklamacie: number
  otvoreneNedorobky: number
}

function formatEur(n: number) {
  return n.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function formatDatum(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric', year: '2-digit' })
}

function dniDo(d: string) {
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  if (diff < 0) return { text: `${Math.abs(diff)}d po termíne`, cls: 'text-red-500 font-semibold' }
  if (diff === 0) return { text: 'dnes', cls: 'text-red-500 font-semibold' }
  if (diff <= 7) return { text: `za ${diff}d`, cls: 'text-amber-600 font-medium' }
  return { text: `za ${diff}d`, cls: 'text-[#8b9bb4]' }
}

// Nájde aktuálny krok v pipeline pre danú zákazku
function aktualnyKrok(z: Zakazka): number {
  const rec = z as unknown as Record<string, unknown>
  const last = [...PIPELINE].reverse().findIndex(p => !!rec[p.key])
  if (last === -1) return 0
  return PIPELINE.length - last
}

export default function Dashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [posledne, setPosledne] = useState<Zakazka[]>([])
  const [bliziaZakazky, setBliziaZakazky] = useState<Zakazka[]>([])
  const [pipelineDistrib, setPipelineDistrib] = useState<{ label: string; count: number; group: string }[]>([])
  const [loading, setLoading] = useState(true)

  const dnes = new Date().toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  useEffect(() => {
    async function load() {
      const dnesISO = new Date().toISOString().split('T')[0]
      const za14 = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]

      const [
        { data: zakazky },
        { count: zakaznikCount },
        { data: bliziaData },
        { count: rekCount },
        { count: nedCount },
      ] = await Promise.all([
        supabase.from('zakazky').select('*').neq('stav', 'storno').order('created_at', { ascending: false }),
        supabase.from('zakaznici').select('*', { count: 'exact', head: true }),
        supabase.from('zakazky')
          .select('*')
          .gte('termin_zod', dnesISO)
          .lte('termin_zod', za14)
          .neq('stav', 'hotova')
          .neq('stav', 'storno')
          .order('termin_zod'),
        supabase.from('reklamacie').select('*', { count: 'exact', head: true }).in('stav', ['nova', 'v_rieseni']),
        supabase.from('nedorobky').select('*', { count: 'exact', head: true }).eq('stav', 'otvorena'),
      ])

      const all = (zakazky ?? []) as Zakazka[]
      const aktualneStavy = ['nova', 'aktivna', 'caka']

      // Rozdelenie zákaziek podľa pipeline kroku
      const distrib = PIPELINE.map(step => ({
        label: step.label,
        group: step.group,
        count: all.filter(z => {
          const rec = z as unknown as Record<string, unknown>
          const idx = PIPELINE.findIndex(p => p.key === step.key)
          const done = !!rec[step.key]
          const next = idx === 0 ? !rec[PIPELINE[0].key] : !!rec[PIPELINE[idx - 1].key] && !rec[step.key]
          return done || (aktualneStavy.includes(z.stav) && next)
        }).length,
      }))

      setStats({
        nova: all.filter(z => z.stav === 'nova').length,
        aktivna: all.filter(z => z.stav === 'aktivna').length,
        caka: all.filter(z => z.stav === 'caka').length,
        hotova: all.filter(z => z.stav === 'hotova').length,
        celkovyObjem: all.reduce((s, z) => s + (z.objem_spolu || 0), 0),
        zakaznikCount: zakaznikCount ?? 0,
        bliziaTerminy: (bliziaData ?? []).length,
        otvoreneReklamacie: rekCount ?? 0,
        otvoreneNedorobky: nedCount ?? 0,
      })
      setPosledne(all.slice(0, 6))
      setBliziaZakazky((bliziaData ?? []).slice(0, 5))
      setPipelineDistrib(distrib)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-[#8b9bb4]">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Načítavam dashboard...</span>
      </div>
    )
  }

  const aktualneZakazky = (stats?.nova ?? 0) + (stats?.aktivna ?? 0) + (stats?.caka ?? 0)
  const total = aktualneZakazky + (stats?.hotova ?? 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1a2332]">
          Dobrý deň{profile?.meno ? `, ${profile.meno.split(' ')[0]}` : ''}
        </h1>
        <p className="text-sm text-[#8b9bb4] capitalize">{dnes}</p>
      </div>

      {/* Stat karty */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[#8b9bb4] font-medium">Aktívne zákazky</p>
            <div className="w-8 h-8 rounded-[8px] bg-[#e8f5e9] flex items-center justify-center">
              <Briefcase size={15} className="text-[#66bb6a]" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[#1a2332]">{aktualneZakazky}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="text-xs bg-[#e3f0fd] text-[#0779e4] px-1.5 py-0.5 rounded-full">{stats?.nova} nové</span>
            <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">{stats?.caka} čakajú</span>
          </div>
        </div>

        <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[#8b9bb4] font-medium">Celkový objem</p>
            <div className="w-8 h-8 rounded-[8px] bg-[#e3f0fd] flex items-center justify-center">
              <Euro size={15} className="text-[#0779e4]" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#1a2332]">{formatEur(stats?.celkovyObjem ?? 0)}</p>
          <p className="text-xs text-[#8b9bb4] mt-2">{stats?.hotova} zákaziek hotových</p>
        </div>

        <div className={clsx(
          'rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4',
          (stats?.bliziaTerminy ?? 0) > 0 ? 'bg-amber-50' : 'bg-white'
        )}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[#8b9bb4] font-medium">Blížia sa termíny</p>
            <div className="w-8 h-8 rounded-[8px] bg-amber-100 flex items-center justify-center">
              <Clock size={15} className="text-amber-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[#1a2332]">{stats?.bliziaTerminy}</p>
          <p className="text-xs text-[#8b9bb4] mt-2">do 14 dní</p>
        </div>

        <div className={clsx(
          'rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4',
          (stats?.otvoreneReklamacie ?? 0) > 0 ? 'bg-red-50' : 'bg-white'
        )}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[#8b9bb4] font-medium">Otvorené reklamácie</p>
            <div className="w-8 h-8 rounded-[8px] bg-red-100 flex items-center justify-center">
              <AlertTriangle size={15} className="text-red-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[#1a2332]">{stats?.otvoreneReklamacie}</p>
          <p className="text-xs text-[#8b9bb4] mt-2">{stats?.otvoreneNedorobky} otvorených nedorobkov</p>
        </div>
      </div>

      {/* Pipeline distribúcia */}
      <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
        <h2 className="font-semibold text-[#1a2332] mb-4">Pipeline – kde sú zákazky</h2>
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-2 min-w-max">
            {pipelineDistrib.map((step, i) => {
              const groupColors: Record<string, { bar: string; bg: string; text: string }> = {
                predpredaj: { bar: '#0779e4', bg: '#e3f0fd', text: '#1e40af' },
                zmluva:     { bar: '#e65100', bg: '#fff3e0', text: '#92400e' },
                vyroba:     { bar: '#2e7d32', bg: '#e8f5e9', text: '#14532d' },
                realizacia: { bar: '#6a1b9a', bg: '#f3e5f5', text: '#4c1d95' },
              }
              const gc = groupColors[step.group]
              const max = Math.max(...pipelineDistrib.map(s => s.count), 1)
              const pct = Math.round((step.count / max) * 100)
              return (
                <div key={i} className="flex flex-col items-center w-[58px]">
                  <span className="text-sm font-bold mb-1" style={{ color: step.count > 0 ? gc.bar : '#d1d5db' }}>
                    {step.count}
                  </span>
                  <div className="w-full h-16 rounded-[6px] flex items-end overflow-hidden" style={{ background: '#f4f6f9' }}>
                    <div className="w-full rounded-[6px] transition-all duration-500"
                      style={{ height: `${Math.max(pct, step.count > 0 ? 8 : 0)}%`, background: step.count > 0 ? gc.bar : '#e0e0e0' }} />
                  </div>
                  <p className="text-[9px] text-center mt-1 leading-tight" style={{ color: step.count > 0 ? gc.text : '#9ca3af' }}>
                    {step.label}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Posledné zákazky */}
        <div className="xl:col-span-2 bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f4f6f9]">
            <h2 className="font-semibold text-[#1a2332]">Posledné zákazky</h2>
            <Link to="/zakazky" className="text-sm text-[#0779e4] hover:underline flex items-center gap-1">
              Všetky <ChevronRight size={14} />
            </Link>
          </div>
          {posledne.length === 0 ? (
            <div className="px-5 py-10 text-center text-[#8b9bb4] text-sm">
              Žiadne zákazky — <Link to="/zakazky" className="text-[#0779e4] hover:underline">pridaj prvú</Link>
            </div>
          ) : (
            <div className="divide-y divide-[#f4f6f9]">
              {posledne.map(z => {
                const s = stavLabels[z.stav]
                const krok = aktualnyKrok(z)
                const step = krok > 0 ? PIPELINE[krok - 1] : null
                const progress = Math.round((krok / PIPELINE.length) * 100)
                return (
                  <div
                    key={z.id}
                    onClick={() => navigate(`/zakazky/${z.id}`)}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#f8f9fb] transition-colors cursor-pointer group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-xs font-mono text-[#8b9bb4]">{z.cislo_zod}</span>
                        <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', s.cls)}>{s.label}</span>
                        {step && <span className="text-xs text-[#8b9bb4]">· {step.label}</span>}
                      </div>
                      <p className="text-sm font-medium text-[#1a2332] truncate">{z.zakaznik_nazov}</p>
                      {/* mini progress bar */}
                      <div className="w-full bg-[#f4f6f9] rounded-full h-1 mt-1.5">
                        <div className="h-1 rounded-full bg-[#66bb6a] transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="text-sm font-semibold text-[#1a2332]">
                        {z.objem_spolu ? formatEur(z.objem_spolu) : '—'}
                      </p>
                      {z.termin_zod && <p className="text-xs text-[#8b9bb4]">do {formatDatum(z.termin_zod)}</p>}
                    </div>
                    <ChevronRight size={14} className="text-[#e0e0e0] group-hover:text-[#8b9bb4] flex-shrink-0" />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pravý stĺpec */}
        <div className="space-y-4">

          {/* Blížiace termíny */}
          <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#f4f6f9]">
              <h2 className="font-semibold text-[#1a2332] flex items-center gap-2">
                <Clock size={15} className="text-amber-500" /> Blížiace termíny
              </h2>
            </div>
            {bliziaZakazky.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <CheckCircle2 size={24} className="text-[#66bb6a] mx-auto mb-2" />
                <p className="text-sm text-[#8b9bb4]">Žiadne blížiace termíny</p>
              </div>
            ) : (
              <div className="divide-y divide-[#f4f6f9]">
                {bliziaZakazky.map(z => {
                  const dni = z.termin_zod ? dniDo(z.termin_zod) : null
                  return (
                    <div
                      key={z.id}
                      onClick={() => navigate(`/zakazky/${z.id}`)}
                      className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-[#f8f9fb] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1a2332] truncate">{z.zakaznik_nazov}</p>
                        <p className="text-xs text-[#8b9bb4]">{z.cislo_zod} · {formatDatum(z.termin_zod)}</p>
                      </div>
                      {dni && <span className={clsx('text-xs flex-shrink-0', dni.cls)}>{dni.text}</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Rýchle akcie */}
          <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4">
            <h2 className="font-semibold text-[#1a2332] mb-3">Rýchle akcie</h2>
            <div className="space-y-2">
              <Link to="/zakazky" className="flex items-center gap-2 w-full px-3 py-2.5 rounded-[8px] bg-[#66bb6a] text-white text-sm font-medium hover:bg-[#57a85b] transition-colors">
                <Briefcase size={15} /> Nová zákazka
              </Link>
              <Link to="/zakaznici" className="flex items-center gap-2 w-full px-3 py-2.5 rounded-[8px] border border-[#e0e0e0] text-[#4a5568] text-sm font-medium hover:bg-[#f4f6f9] transition-colors">
                <Users size={15} /> Zákazníci
              </Link>
              <Link to="/montaze" className="flex items-center gap-2 w-full px-3 py-2.5 rounded-[8px] border border-[#e0e0e0] text-[#4a5568] text-sm font-medium hover:bg-[#f4f6f9] transition-colors">
                <Calendar size={15} /> Plán montáží
              </Link>
            </div>
          </div>

          {/* Stav zákaziek */}
          <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4">
            <h2 className="font-semibold text-[#1a2332] mb-3">Stav zákaziek</h2>
            <div className="space-y-2.5">
              {[
                { label: 'Nové',    count: stats?.nova ?? 0,    cls: 'bg-[#0779e4]' },
                { label: 'Aktívne', count: stats?.aktivna ?? 0, cls: 'bg-[#66bb6a]' },
                { label: 'Čakajú', count: stats?.caka ?? 0,    cls: 'bg-amber-400' },
                { label: 'Hotové',  count: stats?.hotova ?? 0,  cls: 'bg-gray-300' },
              ].map(item => {
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0
                return (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#8b9bb4]">{item.label}</span>
                      <span className="font-medium text-[#1a2332]">{item.count}</span>
                    </div>
                    <div className="w-full bg-[#f4f6f9] rounded-full h-1.5">
                      <div className={clsx('h-1.5 rounded-full transition-all', item.cls)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
