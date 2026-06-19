import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, Ruler, Briefcase,
  Calendar, ClipboardCheck, Receipt, Wrench, Package,
  ChevronLeft, ChevronRight, Settings,
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/zakaznici', label: 'Zákazníci', icon: Users },
  { to: '/ponuky', label: 'Cenové ponuky', icon: FileText },
  { to: '/zameranie', label: 'Zameranie', icon: Ruler },
  { to: '/zakazky', label: 'Zákazky', icon: Briefcase },
  { to: '/montaze', label: 'Montáže', icon: Calendar },
  { to: '/protokoly', label: 'Protokoly', icon: ClipboardCheck },
  { to: '/faktury', label: 'Fakturácia', icon: Receipt },
  { to: '/servis', label: 'Servis', icon: Wrench },
  { to: '/sklad', label: 'Sklad', icon: Package },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={clsx(
      'flex flex-col h-full transition-all duration-300 bg-[#1c2636] border-r border-[#2a3547] flex-shrink-0',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#2a3547] min-h-[64px]">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#66bb6a] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">OF</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">Okno Flow</p>
              <p className="text-[#8b9bb4] text-xs">Admin systém</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-[#66bb6a] flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-sm">OF</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-[#8b9bb4] hover:text-white transition-colors p-1 rounded ml-auto"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-[8px] transition-all duration-150 group',
              isActive
                ? 'bg-[#2e3d56] text-white'
                : 'text-[#8b9bb4] hover:bg-[#263044] hover:text-white'
            )}
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={clsx(
                  'flex-shrink-0 transition-colors',
                  isActive ? 'text-[#66bb6a]' : 'text-[#8b9bb4] group-hover:text-[#66bb6a]'
                )} />
                {!collapsed && (
                  <span className="text-sm font-medium truncate">{label}</span>
                )}
                {isActive && !collapsed && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#66bb6a]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-[#2a3547]">
        <NavLink
          to="/nastavenia"
          title={collapsed ? 'Nastavenia' : undefined}
          className={({ isActive }) => clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-[8px] transition-all group',
            isActive ? 'bg-[#2e3d56] text-white' : 'text-[#8b9bb4] hover:bg-[#263044] hover:text-white'
          )}
        >
          <Settings size={18} className="flex-shrink-0 group-hover:text-[#66bb6a] transition-colors" />
          {!collapsed && <span className="text-sm font-medium">Nastavenia</span>}
        </NavLink>
      </div>
    </aside>
  )
}
