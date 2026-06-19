import clsx from 'clsx'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon: LucideIcon
  color?: 'green' | 'blue' | 'amber' | 'gray'
  trend?: { value: string; up: boolean }
}

const colorMap = {
  green: { bg: 'bg-[#e8f5e9]', text: 'text-[#66bb6a]' },
  blue: { bg: 'bg-[#e3f0fd]', text: 'text-[#0779e4]' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-500' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-500' },
}

export default function StatCard({ label, value, sub, icon: Icon, color = 'green', trend }: StatCardProps) {
  const colors = colorMap[color]
  return (
    <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5 flex items-center gap-4">
      <div className={clsx('w-12 h-12 rounded-[10px] flex items-center justify-center flex-shrink-0', colors.bg)}>
        <Icon size={22} className={colors.text} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#8b9bb4] font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-[#1a2332] leading-tight">{value}</p>
        {sub && <p className="text-xs text-[#8b9bb4] mt-0.5">{sub}</p>}
      </div>
      {trend && (
        <div className={clsx('text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0',
          trend.up ? 'bg-[#e8f5e9] text-[#66bb6a]' : 'bg-red-50 text-red-500')}>
          {trend.up ? '↑' : '↓'} {trend.value}
        </div>
      )}
    </div>
  )
}
