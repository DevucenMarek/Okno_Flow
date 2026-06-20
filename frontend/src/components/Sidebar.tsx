import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, Ruler, Briefcase,
  Calendar, ClipboardCheck, Receipt, Wrench, Package,
  ChevronLeft, ChevronRight, Settings, LogOut,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth, Rola } from '@/context/AuthContext'

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
  end?: boolean
  roles?: Rola[]  // ak undefined = všetci
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/zakaznici', label: 'Zákazníci', icon: Users, roles: ['admin', 'obchodnik'] },
  { to: '/ponuky', label: 'Cenové ponuky', icon: FileText, roles: ['admin', 'obchodnik'] },
  { to: '/zameranie', label: 'Zameranie', icon: Ruler, roles: ['admin', 'obchodnik'] },
  { to: '/zakazky', label: 'Zákazky', icon: Briefcase },
  { to: '/montaze', label: 'Montáže', icon: Calendar, roles: ['admin', 'obchodnik', 'montaznik'] },
  { to: '/protokoly', label: 'Protokoly', icon: ClipboardCheck, roles: ['admin', 'obchodnik', 'montaznik'] },
  { to: '/faktury', label: 'Fakturácia', icon: Receipt, roles: ['admin', 'obchodnik'] },
  { to: '/servis', label: 'Servis', icon: Wrench, roles: ['admin', 'obchodnik', 'montaznik'] },
  { to: '/sklad', label: 'Sklad', icon: Package, roles: ['admin', 'skladnik'] },
]

const rolaLabels: Record<Rola, string> = {
  admin: 'Administrátor',
  obchodnik: 'Obchodník',
  montaznik: 'Montážnik',
  skladnik: 'Skladník',
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { profile, rola, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  // Filter nav items by role
  const visibleItems = navItems.filter(item => {
    if (!item.roles) return true
    if (rola === 'admin') return true
    return rola ? item.roles.includes(rola) : false
  })

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
              <p className="text-[#8b9bb4] text-xs">ORSAG s.r.o.</p>
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
        {visibleItems.map(({ to, label, icon: Icon, end }) => (
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

      {/* Bottom – user info + logout */}
      <div className="px-2 py-3 border-t border-[#2a3547] space-y-1">
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

        {/* User info */}
        {!collapsed && profile && (
          <div className="px-3 py-2 rounded-[8px] bg-[#152030]">
            <p className="text-xs font-medium text-white truncate">{profile.meno || profile.email}</p>
            {rola && <p className="text-[10px] text-[#66bb6a]">{rolaLabels[rola]}</p>}
          </div>
        )}

        <button
          onClick={handleSignOut}
          title={collapsed ? 'Odhlásiť sa' : undefined}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-[#8b9bb4] hover:bg-[#263044] hover:text-red-400 transition-all group"
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Odhlásiť sa</span>}
        </button>
      </div>
    </aside>
  )
}
