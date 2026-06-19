import { Bell, Search, ChevronDown } from 'lucide-react'

export default function TopBar() {
  return (
    <header className="flex items-center justify-between px-6 h-16 bg-white border-b border-[#e0e0e0] flex-shrink-0">
      <div className="flex items-center gap-2 bg-[#f4f6f9] rounded-[8px] px-3 py-2 w-72">
        <Search size={16} className="text-[#8b9bb4]" />
        <input
          type="text"
          placeholder="Hľadať zákazníka, zákazku..."
          className="bg-transparent text-sm text-[#4a5568] placeholder:text-[#8b9bb4] outline-none w-full"
        />
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-[8px] text-[#8b9bb4] hover:bg-[#f4f6f9] hover:text-[#4a5568] transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#66bb6a] rounded-full" />
        </button>
        <button className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-[8px] hover:bg-[#f4f6f9] transition-colors">
          <div className="w-7 h-7 rounded-full bg-[#0779e4] flex items-center justify-center">
            <span className="text-white text-xs font-semibold">M</span>
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-[#1a2332] leading-tight">Majiteľ</p>
            <p className="text-xs text-[#8b9bb4] leading-tight">Admin</p>
          </div>
          <ChevronDown size={14} className="text-[#8b9bb4]" />
        </button>
      </div>
    </header>
  )
}
