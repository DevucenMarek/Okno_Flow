export type StavZakazky = 'nova' | 'aktivna' | 'caka' | 'hotova' | 'storno'

export interface Zakazka {
  id: string
  cislo_zod: string
  zakaznik_nazov: string
  adresa_montaze: string
  kontakt: string
  obchodnik: string
  stav: StavZakazky
  rozsah_vyrobkov: string
  typ_prac: string
  popis_systemu: string
  pocet_napilkov: number
  poznamka?: string
  objem_spolu: number
  zalona?: number
  doplatok?: number
  termin_zod: string
  // Míľniky
  dat_inventura?: string
  dat_dokumentacia?: string
  dat_objednavka?: string
  dat_ace?: string
  dat_potvrdenie?: string
  dat_lozny_plan?: string
  dat_prijem_sklad?: string
  dat_montaz?: string
  // KLAES
  cislo_vyrobnej_davky?: string
  created_at: string
}

export const stavLabels: Record<StavZakazky, { label: string; cls: string }> = {
  nova:    { label: 'Nová',    cls: 'bg-[#e3f0fd] text-[#0779e4]' },
  aktivna: { label: 'Aktívna', cls: 'bg-[#e8f5e9] text-[#57a85b]' },
  caka:    { label: 'Čaká',    cls: 'bg-amber-50 text-amber-600' },
  hotova:  { label: 'Hotová',  cls: 'bg-gray-100 text-gray-500' },
  storno:  { label: 'Storno',  cls: 'bg-red-50 text-red-500' },
}
