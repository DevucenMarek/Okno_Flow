import * as XLSX from 'xlsx'

export interface PolozkaItem {
  pol: string
  typ: string
  rozmer: string
  ks: string
  cena_ks: string
  cena_sp: string
  montaz: string
}

export interface Sekcia {
  items: PolozkaItem[]
  vm: string        // výrobky + montáž
  dph: string       // DPH
  celkom: string    // cena s DPH
  montaz_riadok: string // "X / Y" format pre summary riadok
}

export interface KalkulaciaData {
  sheetName: string
  okna: PolozkaItem[]
  okna_vm: string; okna_dph: string; okna_celkom: string; okna_montaz_riadok: string
  parapety: PolozkaItem[]
  parapety_vm: string; parapety_dph: string; parapety_celkom: string; parapety_montaz_riadok: string
  zaluzie: PolozkaItem[]
  zaluzie_vm: string; zaluzie_dph: string; zaluzie_celkom: string; zaluzie_montaz_riadok: string
  sietky: PolozkaItem[]
  sietky_vm: string; sietky_dph: string; sietky_celkom: string; sietky_montaz_riadok: string
  celk_vyrobky: string
  celk_montaz: string
  celk_bez_dph: string
  celk_dph: string
  celk_s_dph: string
}

function fmt(n: number | undefined | null): string {
  if (!n || n === 0) return '—'
  return n.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getNum(row: XLSX.CellObject[] | undefined, col: number): number {
  if (!row) return 0
  const cell = row[col]
  if (!cell) return 0
  const v = typeof cell === 'object' ? (cell as any).v : cell
  return typeof v === 'number' ? v : 0
}

function getStr(row: any[], col: number): string {
  const v = row[col]
  if (v === undefined || v === null) return ''
  return String(v).trim()
}

/** Parse section items from a sheet starting at a given row until next section header or end */
function parseSection(
  data: any[][],
  startRow: number,
  endRow: number
): PolozkaItem[] {
  const items: PolozkaItem[] = []
  for (let r = startRow; r < endRow && r < data.length; r++) {
    const row = data[r]
    if (!row) continue
    const col0 = row[0]
    // Item row: col 0 is a number (position)
    if (typeof col0 === 'number' && col0 > 0 && col0 < 200) {
      const typ = getStr(row, 1)
      if (!typ) continue
      const w = row[2]
      const h = row[4]
      const ks = row[5]
      const rozmer = (w && h && typeof w === 'number' && typeof h === 'number')
        ? `${Math.round(w)} x ${Math.round(h)}`
        : (w ? String(Math.round(w as number)) : '')
      const cena_ks_raw = getNum(row, 14)
      const cena_sp_raw = getNum(row, 16)
      const montaz_raw  = getNum(row, 19)

      items.push({
        pol: String(Math.round(col0)) + '.',
        typ,
        rozmer,
        ks: ks ? String(Math.round(ks as number)) : '',
        cena_ks: fmt(cena_ks_raw),
        cena_sp: fmt(cena_sp_raw),
        montaz: fmt(montaz_raw),
      })
    }
    // Also handle text-label rows that are not section headers (e.g. "Rabat", "Dodatočná zľava")
    // — skip them (no number in col 0)
  }
  return items
}

function findSectionTotal(data: any[][], startRow: number, endRow: number, keyword: string, valCol: number): number {
  for (let r = startRow; r < endRow && r < data.length; r++) {
    const row = data[r]
    if (!row) continue
    const found = row.some((v: any) => typeof v === 'string' && v.includes(keyword))
    if (found) {
      // find numeric value in row at valCol or nearby
      for (let c = valCol; c < row.length; c++) {
        const v = row[c]
        if (typeof v === 'number' && v > 1) return v
      }
    }
  }
  return 0
}

export function parseKalkulacia(workbook: XLSX.WorkBook, sheetName: string): KalkulaciaData {
  const ws = workbook.Sheets[sheetName]
  // Convert to array of arrays
  const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

  // ── find section boundaries by looking for section-label rows ──────────
  // Known section labels in order: Okná (col 0 = "Pol." header at r2),
  // Parapetné dosky (r16-ish), Žalúzie (r32-ish), Sieťky (r48-ish), Rekapitulácia (r65-ish)

  // Find rows with section headers
  const sectionRows: { name: string; row: number }[] = []
  for (let r = 0; r < data.length; r++) {
    const row = data[r]
    if (!row) continue
    const col0 = row[0]
    if (typeof col0 === 'string') {
      if (col0.toLowerCase().includes('parapet')) sectionRows.push({ name: 'parapety', row: r })
      else if (col0.toLowerCase().includes('žalúzi') || col0.toLowerCase().includes('zaluzi')) sectionRows.push({ name: 'zaluzie', row: r })
      else if (col0.toLowerCase().includes('siet')) sectionRows.push({ name: 'sietky', row: r })
      else if (col0.toLowerCase().includes('rekapitu') || col0.toLowerCase().includes('cena výrobkov spolu')) sectionRows.push({ name: 'rekapitulacia', row: r })
    }
  }

  // Okná: rows 2 to first sectionRow
  const oknaStart = 3
  const oknaEnd = sectionRows.find(s => s.name === 'parapety')?.row ?? 16

  const paraStart = oknaEnd + 1
  const paraEnd = sectionRows.find(s => s.name === 'zaluzie')?.row ?? paraStart + 16

  const zalStart = paraEnd + 1
  const zalEnd = sectionRows.find(s => s.name === 'sietky')?.row ?? zalStart + 16

  const sietStart = zalEnd + 1
  const rekRow = sectionRows.find(s => s.name === 'rekapitulacia')?.row ?? sietStart + 20
  const sietEnd = rekRow

  // Parse items
  const oknaItems = parseSection(data, oknaStart, oknaEnd)
  const paraItems = parseSection(data, paraStart, paraEnd)
  const zalItems  = parseSection(data, zalStart, zalEnd)
  const sietItems = parseSection(data, sietStart, sietEnd)

  // Section totals — "Výrobky a montáž" is in different col per section
  // Okná: col 20, Parapety: col 20, Žalúzie: col 26, Sieťky: col 26
  const oknaVM     = findSectionTotal(data, oknaStart, oknaEnd + 4, 'Výrobky a montáž', 18)
  const oknaDPH    = findSectionTotal(data, oknaStart, oknaEnd + 4, 'DPH', 18)
  const oknaCelk   = findSectionTotal(data, oknaStart, oknaEnd + 4, 'Cena s daňou', 18)

  const paraVM     = findSectionTotal(data, paraStart, paraEnd + 4, 'Výrobky a montáž', 18)
  const paraDPH    = findSectionTotal(data, paraStart, paraEnd + 4, 'DPH', 18)
  const paraCelk   = findSectionTotal(data, paraStart, paraEnd + 4, 'Cena s daňou', 18)

  const zalVM      = findSectionTotal(data, zalStart, zalEnd + 4, 'Výrobky a montáž', 20)
  const zalDPH     = findSectionTotal(data, zalStart, zalEnd + 4, 'DPH', 20)
  const zalCelk    = findSectionTotal(data, zalStart, zalEnd + 4, 'Cena s daňou', 20)

  const sietVM     = findSectionTotal(data, sietStart, sietEnd + 4, 'Výrobky a montáž', 20)
  const sietDPH    = findSectionTotal(data, sietStart, sietEnd + 4, 'DPH', 20)
  const sietCelk   = findSectionTotal(data, sietStart, sietEnd + 4, 'Cena s daňou', 20)

  // Grand totals: rows 65-70 area, col 20
  const celkBezDPH = findSectionTotal(data, rekRow, rekRow + 10, 'bez DPH', 18)
  const celkDPH    = findSectionTotal(data, rekRow, rekRow + 10, 'DPH 23', 18)
  const celkSDPH   = findSectionTotal(data, rekRow, rekRow + 10, 'Cena s daňou', 18)
  // výrobky / montáž sumy
  const celkVyr    = findSectionTotal(data, rekRow, rekRow + 10, 'výrobkov spolu', 18)
  const celkMon    = findSectionTotal(data, rekRow, rekRow + 10, 'montáže spolu', 18)

  // Compute montaz_riadok (summary line: výrobky / montáž)
  const oknaSumVyr = oknaItems.reduce((s, i) => s + (parseFloat(i.cena_sp.replace(/\s/g,'').replace(',','.')) || 0), 0)
  const oknaSumMon = oknaItems.reduce((s, i) => s + (parseFloat(i.montaz.replace(/\s/g,'').replace(',','.')) || 0), 0)
  const paraSumVyr = paraItems.reduce((s, i) => s + (parseFloat(i.cena_sp.replace(/\s/g,'').replace(',','.')) || 0), 0)
  const paraSumMon = paraItems.reduce((s, i) => s + (parseFloat(i.montaz.replace(/\s/g,'').replace(',','.')) || 0), 0)
  const zalSumVyr  = zalItems.reduce((s, i) => s + (parseFloat(i.cena_sp.replace(/\s/g,'').replace(',','.')) || 0), 0)
  const zalSumMon  = zalItems.reduce((s, i) => s + (parseFloat(i.montaz.replace(/\s/g,'').replace(',','.')) || 0), 0)
  const sietSumVyr = sietItems.reduce((s, i) => s + (parseFloat(i.cena_sp.replace(/\s/g,'').replace(',','.')) || 0), 0)
  const sietSumMon = sietItems.reduce((s, i) => s + (parseFloat(i.montaz.replace(/\s/g,'').replace(',','.')) || 0), 0)

  return {
    sheetName,
    okna: oknaItems,
    okna_vm: fmt(oknaVM), okna_dph: fmt(oknaDPH), okna_celkom: fmt(oknaCelk),
    okna_montaz_riadok: `${fmt(oknaSumVyr)} / ${fmt(oknaSumMon)}`,
    parapety: paraItems,
    parapety_vm: fmt(paraVM), parapety_dph: fmt(paraDPH), parapety_celkom: fmt(paraCelk),
    parapety_montaz_riadok: `${fmt(paraSumVyr)} / ${fmt(paraSumMon)}`,
    zaluzie: zalItems,
    zaluzie_vm: fmt(zalVM), zaluzie_dph: fmt(zalDPH), zaluzie_celkom: fmt(zalCelk),
    zaluzie_montaz_riadok: `${fmt(zalSumVyr)} / ${fmt(zalSumMon)}`,
    sietky: sietItems,
    sietky_vm: fmt(sietVM), sietky_dph: fmt(sietDPH), sietky_celkom: fmt(sietCelk),
    sietky_montaz_riadok: `${fmt(sietSumVyr)} / ${fmt(sietSumMon)}`,
    celk_vyrobky: fmt(celkVyr || (oknaSumVyr + paraSumVyr + zalSumVyr + sietSumVyr)),
    celk_montaz:  fmt(celkMon || (oknaSumMon + paraSumMon + zalSumMon + sietSumMon)),
    celk_bez_dph: fmt(celkBezDPH),
    celk_dph:     fmt(celkDPH),
    celk_s_dph:   fmt(celkSDPH),
  }
}

export function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        resolve(wb)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}
