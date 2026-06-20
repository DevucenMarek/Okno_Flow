export type StavZakazky = 'nova' | 'aktivna' | 'caka' | 'hotova' | 'storno'

export interface Zakazka {
  id: string
  cislo_zod: string
  zakaznik_nazov: string
  adresa_montaze?: string | null
  kontakt?: string | null
  obchodnik?: string | null
  stav: StavZakazky
  rozsah_vyrobkov?: string | null
  typ_prac?: string | null
  popis_systemu?: string | null
  pocet_napilkov?: number | null
  poznamka?: string | null
  objem_spolu?: number | null
  objem_f?: number | null
  zalona?: number | null
  doplatok?: number | null
  termin_zod?: string | null
  // Míľniky
  dat_inventura?: string | null
  dat_dokumentacia?: string | null
  dat_objednavka?: string | null
  dat_ace?: string | null
  dat_potvrdenie?: string | null
  dat_lozny_plan?: string | null
  dat_prijem_sklad?: string | null
  dat_montaz?: string | null
  // KLAES
  cislo_vyrobnej_davky?: string | null
  created_at: string
  // index signature pre dynamický prístup cez milestone keys
  [key: string]: unknown
}

export const stavLabels: Record<StavZakazky, { label: string; cls: string }> = {
  nova:    { label: 'Nová',    cls: 'bg-[#e3f0fd] text-[#0779e4]' },
  aktivna: { label: 'Aktívna', cls: 'bg-[#e8f5e9] text-[#57a85b]' },
  caka:    { label: 'Čaká',    cls: 'bg-amber-50 text-amber-600' },
  hotova:  { label: 'Hotová',  cls: 'bg-gray-100 text-gray-500' },
  storno:  { label: 'Storno',  cls: 'bg-red-50 text-red-500' },
}
