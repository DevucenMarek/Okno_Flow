export type StavZakazky = 'nova' | 'aktivna' | 'caka' | 'hotova' | 'storno'

export interface Zakazka {
  id: string
  cislo_zod: string
  zakaznik_nazov: string
  adresa_montaze?: string | null
  kontakt?: string | null
  email?: string | null
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

  // ── Pipeline míľniky (11 krokov) ──────────────────────────────────────────
  dat_dopyt?: string | null           // 1. Prvý kontakt / dopyt
  dat_ponuka?: string | null          // 2. Cenová ponuka odoslaná
  dat_odsouhlasenie?: string | null   // 3. Zákazník odsúhlasil cenu
  dat_zameranie?: string | null       // 4. Fyzické zameranie
  dat_zmluva?: string | null          // 5. Zmluva o dielo podpísaná
  dat_zalona_prijata?: string | null  // 6. Záloha prijatá
  dat_objednavka?: string | null      // 7. Výrobky objednané u dodávateľa
  dat_prijem_sklad?: string | null    // 8. Výrobky prijaté na sklad
  dat_montaz?: string | null          // 9. Montáž vykonaná
  dat_odovzdanie?: string | null      // 10. Odovzdanie zákazníkovi
  dat_dofakturacia?: string | null    // 11. Dofaktúrácia uhradená

  // ── Dodávateľ ─────────────────────────────────────────────────────────────
  cislo_obj_dodavatela?: string | null  // externé číslo objednávky od dodávateľa
  cislo_vyrobnej_davky?: string | null  // KLAES interné číslo výrobnej dávky

  // ── Zachované pre spätnú kompatibilitu ────────────────────────────────────
  dat_inventura?: string | null
  dat_dokumentacia?: string | null
  dat_ace?: string | null
  dat_potvrdenie?: string | null
  dat_lozny_plan?: string | null

  created_at: string
  [key: string]: unknown
}

export const stavLabels: Record<StavZakazky, { label: string; cls: string }> = {
  nova:    { label: 'Nová',    cls: 'bg-[#e3f0fd] text-[#0779e4]' },
  aktivna: { label: 'Aktívna', cls: 'bg-[#e8f5e9] text-[#57a85b]' },
  caka:    { label: 'Čaká',    cls: 'bg-amber-50 text-amber-600' },
  hotova:  { label: 'Hotová',  cls: 'bg-gray-100 text-gray-500' },
  storno:  { label: 'Storno',  cls: 'bg-red-50 text-red-500' },
}

// ── Pipeline definícia ─────────────────────────────────────────────────────
export const PIPELINE = [
  { key: 'dat_dopyt',          label: 'Dopyt',          group: 'predpredaj' },
  { key: 'dat_ponuka',         label: 'Ponuka',          group: 'predpredaj' },
  { key: 'dat_odsouhlasenie',  label: 'Odsúhlasenie',   group: 'predpredaj' },
  { key: 'dat_zameranie',      label: 'Zameranie',       group: 'zmluva' },
  { key: 'dat_zmluva',         label: 'Zmluva',          group: 'zmluva' },
  { key: 'dat_zalona_prijata', label: 'Záloha',          group: 'zmluva' },
  { key: 'dat_objednavka',     label: 'Objednávka',      group: 'vyroba' },
  { key: 'dat_prijem_sklad',   label: 'Na sklade',       group: 'vyroba' },
  { key: 'dat_montaz',         label: 'Montáž',          group: 'realizacia' },
  { key: 'dat_odovzdanie',     label: 'Odovzdanie',      group: 'realizacia' },
  { key: 'dat_dofakturacia',   label: 'Dofaktúrácia',   group: 'realizacia' },
] as const

export type PipelineKey = typeof PIPELINE[number]['key']

export const GROUP_COLORS: Record<string, { dot: string; done: string; next: string; text: string }> = {
  predpredaj: { dot: '#0779e4', done: '#e3f0fd',  next: '#bfdbfe', text: '#1e40af' },
  zmluva:     { dot: '#e65100', done: '#fff3e0',  next: '#fed7aa', text: '#92400e' },
  vyroba:     { dot: '#2e7d32', done: '#e8f5e9',  next: '#bbf7d0', text: '#14532d' },
  realizacia: { dot: '#6a1b9a', done: '#f3e5f5',  next: '#e9d5ff', text: '#4c1d95' },
}
