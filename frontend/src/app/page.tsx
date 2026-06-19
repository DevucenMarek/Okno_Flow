import {
  Users,
  Briefcase,
  FileText,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import StatCard from '@/components/StatCard'

const recentZakazky = [
  { id: 'Z-2024-047', zakaznik: 'Peter Novák', typ: 'Okná + montáž', stav: 'active', suma: '4 850 €', termin: '28.6.2024' },
  { id: 'Z-2024-046', zakaznik: 'Jana Kováčová', typ: 'Dvere', stav: 'pending', suma: '1 240 €', termin: '15.6.2024' },
  { id: 'Z-2024-045', zakaznik: 'MH Stavby s.r.o.', typ: 'Okná 12ks', stav: 'done', suma: '12 300 €', termin: '10.6.2024' },
  { id: 'Z-2024-044', zakaznik: 'Ľuboš Hrušovský', typ: 'Okná + tieniaca tech.', stav: 'active', suma: '3 600 €', termin: '5.7.2024' },
  { id: 'Z-2024-043', zakaznik: 'Silvia Benková', typ: 'Balkónové dvere', stav: 'new', suma: '890 €', termin: '20.6.2024' },
]

const stavMap: Record<string, { label: string; class: string }> = {
  new: { label: 'Nová', class: 'bg-[#e3f0fd] text-[#0779e4]' },
  active: { label: 'Aktívna', class: 'bg-[#e8f5e9] text-[#66bb6a]' },
  pending: { label: 'Čaká', class: 'bg-amber-50 text-amber-600' },
  done: { label: 'Hotová', class: 'bg-gray-100 text-gray-500' },
}

const montaze = [
  { cas: '08:00', zakaznik: 'Peter Novák', adresa: 'Moyzesova 12, Poprad', partia: 'Tím A' },
  { cas: '11:30', zakaznik: 'MH Stavby s.r.o.', adresa: 'Priemyselná 5, Poprad', partia: 'Tím B' },
  { cas: '14:00', zakaznik: 'Ľuboš Hrušovský', adresa: 'Tatranská 88, Tatranská Lomnica', partia: 'Tím A' },
]

export default function DashboardPage() {
  const dnes = new Date().toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1a2332]">Dashboard</h1>
        <p className="text-sm text-[#8b9bb4] capitalize">{dnes}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Aktívne zákazky" value={12} sub="3 čakajú na zameranie" icon={Briefcase} color="green" trend={{ value: '+2', up: true }} />
        <StatCard label="Zákazníci" value={148} sub="8 nových tento mesiac" icon={Users} color="blue" />
        <StatCard label="Ponuky čakajú" value={5} sub="Na schválenie zákazníka" icon={FileText} color="amber" />
        <StatCard label="Montáže dnes" value={3} sub="2 tímy v teréne" icon={Calendar} color="blue" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Posledné zákazky */}
        <div className="xl:col-span-2 bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e0e0e0]">
            <h2 className="font-semibold text-[#1a2332]">Posledné zákazky</h2>
            <a href="/zakazky" className="text-sm text-[#0779e4] hover:underline">Všetky →</a>
          </div>
          <div className="divide-y divide-[#f4f6f9]">
            {recentZakazky.map((z) => (
              <div key={z.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#f4f6f9] transition-colors cursor-pointer">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono text-[#8b9bb4]">{z.id}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stavMap[z.stav].class}`}>
                      {stavMap[z.stav].label}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[#1a2332] truncate">{z.zakaznik}</p>
                  <p className="text-xs text-[#8b9bb4]">{z.typ}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-[#1a2332]">{z.suma}</p>
                  <p className="text-xs text-[#8b9bb4]">do {z.termin}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Dnešné montáže */}
          <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e0e0e0]">
              <h2 className="font-semibold text-[#1a2332]">Montáže dnes</h2>
              <a href="/montaze" className="text-sm text-[#0779e4] hover:underline">Plán →</a>
            </div>
            <div className="divide-y divide-[#f4f6f9]">
              {montaze.map((m, i) => (
                <div key={i} className="px-5 py-3 flex gap-3">
                  <div className="text-xs font-semibold text-[#0779e4] w-10 flex-shrink-0 pt-0.5">{m.cas}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1a2332] truncate">{m.zakaznik}</p>
                    <p className="text-xs text-[#8b9bb4] truncate">{m.adresa}</p>
                    <span className="text-xs text-[#66bb6a] font-medium">{m.partia}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rýchle akcie */}
          <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4">
            <h2 className="font-semibold text-[#1a2332] mb-3">Rýchle akcie</h2>
            <div className="space-y-2">
              <a href="/zakaznici/novy" className="flex items-center gap-2 w-full px-3 py-2.5 rounded-[8px] bg-[#66bb6a] text-white text-sm font-medium hover:bg-[#57a85b] transition-colors">
                <Users size={15} />
                Nový zákazník
              </a>
              <a href="/ponuky/nova" className="flex items-center gap-2 w-full px-3 py-2.5 rounded-[8px] border border-[#e0e0e0] text-[#4a5568] text-sm font-medium hover:bg-[#f4f6f9] transition-colors">
                <FileText size={15} />
                Nová cenová ponuka
              </a>
              <a href="/zakazky/nova" className="flex items-center gap-2 w-full px-3 py-2.5 rounded-[8px] border border-[#e0e0e0] text-[#4a5568] text-sm font-medium hover:bg-[#f4f6f9] transition-colors">
                <Briefcase size={15} />
                Nová zákazka
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Upozornenia */}
      <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
        <h2 className="font-semibold text-[#1a2332] mb-3">Upozornenia</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-[8px] bg-amber-50 border border-amber-100">
            <Clock size={16} className="text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">2 zamerania bez ponuky</p>
              <p className="text-xs text-amber-600">Čakajú viac ako 3 dni</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-[8px] bg-[#e3f0fd] border border-blue-100">
            <TrendingUp size={16} className="text-[#0779e4] flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#0779e4]">3 ponuky na schválenie</p>
              <p className="text-xs text-blue-500">Zákazníci čakajú odpoveď</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-[8px] bg-[#e8f5e9] border border-green-100">
            <CheckCircle size={16} className="text-[#66bb6a] flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#2e7d32]">1 zákazka dokončená</p>
              <p className="text-xs text-[#66bb6a]">Čaká na protokol</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
