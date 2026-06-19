export default function Ponuky() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2332]">Cenové ponuky</h1>
          <p className="text-sm text-[#8b9bb4]">Orientačné a finálne ponuky, PDF, emaily</p>
        </div>
        <button className="px-4 py-2 bg-[#66bb6a] text-white text-sm font-medium rounded-[8px] hover:bg-[#57a85b] transition-colors">
          + Nová ponuka
        </button>
      </div>
      <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-8 text-center text-[#8b9bb4]">
        <p className="text-lg font-medium">Modul sa buduje...</p>
      </div>
    </div>
  )
}
