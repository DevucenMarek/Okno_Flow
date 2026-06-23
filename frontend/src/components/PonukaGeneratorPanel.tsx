import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, FileText, Loader2, CheckCircle2, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType,
  convertInchesToTwip,
} from 'docx'
import { saveAs } from 'file-saver'
import { readWorkbook, parseKalkulacia, type KalkulaciaData, type PolozkaItem } from '@/lib/xlsParser'
import type { Ponuka } from '@/pages/Ponuky'

interface Props { ponuka: Ponuka }

// ─── helpers ─────────────────────────────────────────────────────────────────
function dnes() {
  return new Date().toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })
}
const NONE_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const THIN_BORDER = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }

function cell(
  text: string,
  opts: {
    bold?: boolean; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]
    bg?: string; color?: string; width?: number; span?: number; borders?: 'none' | 'thin'
    italic?: boolean
  } = {}
): TableCell {
  const borders = opts.borders === 'none'
    ? { top: NONE_BORDER, bottom: NONE_BORDER, left: NONE_BORDER, right: NONE_BORDER }
    : { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER }
  return new TableCell({
    columnSpan: opts.span,
    shading: opts.bg ? { type: ShadingType.SOLID, color: opts.bg, fill: opts.bg } : undefined,
    borders,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    children: [new Paragraph({
      alignment: opts.align ?? AlignmentType.LEFT,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({
        text,
        bold: opts.bold,
        italics: opts.italic,
        size: (opts.size ?? 9) * 2,
        color: opts.color ?? '1a2332',
      })],
    })],
  })
}

function hdrCell(text: string, w?: number) {
  return cell(text, { bold: true, size: 8, bg: '1C2636', color: 'FFFFFF', align: AlignmentType.CENTER, width: w })
}

function sectionHeader(text: string) {
  return new Paragraph({
    spacing: { before: 140, after: 60 },
    children: [new TextRun({ text, bold: true, size: 20, color: '0779e4' })],
  })
}

function itemsTable(items: PolozkaItem[], colWidths: number[]) {
  const [wPol, wTyp, wRozmer, wKs, wCenaKs, wCenaSp, wMontaz] = colWidths
  const rows: TableRow[] = [
    new TableRow({ children: [
      hdrCell('Pol.', wPol), hdrCell('Typ', wTyp), hdrCell('Rozmer', wRozmer),
      hdrCell('ks', wKs), hdrCell('Cena/ks (€)', wCenaKs),
      hdrCell('Cena spolu (€)', wCenaSp), hdrCell('Montáž (€)', wMontaz),
    ]}),
    ...items.map((it, idx) => new TableRow({
      children: [
        cell(it.pol, { size: 8, align: AlignmentType.CENTER, bg: idx % 2 === 1 ? 'F8F9FB' : 'FFFFFF' }),
        cell(it.typ, { size: 8, bg: idx % 2 === 1 ? 'F8F9FB' : 'FFFFFF' }),
        cell(it.rozmer, { size: 8, align: AlignmentType.CENTER, bg: idx % 2 === 1 ? 'F8F9FB' : 'FFFFFF' }),
        cell(it.ks, { size: 8, align: AlignmentType.CENTER, bg: idx % 2 === 1 ? 'F8F9FB' : 'FFFFFF' }),
        cell(it.cena_ks, { size: 8, align: AlignmentType.RIGHT, bg: idx % 2 === 1 ? 'F8F9FB' : 'FFFFFF' }),
        cell(it.cena_sp, { size: 8, align: AlignmentType.RIGHT, bg: idx % 2 === 1 ? 'F8F9FB' : 'FFFFFF' }),
        cell(it.montaz, { size: 8, align: AlignmentType.RIGHT, bg: idx % 2 === 1 ? 'F8F9FB' : 'FFFFFF' }),
      ],
    })),
  ]
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  })
}

function totalRow(label: string, value: string, bold = false, bg = 'F4F6F9') {
  return new TableRow({ children: [
    cell(label, { bold, size: 8, align: AlignmentType.RIGHT, bg, span: 5 }),
    cell(value, { bold, size: 9, align: AlignmentType.RIGHT, bg, span: 2 }),
  ]})
}

function totalsTable(vm: string, dph: string, celkom: string) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      totalRow('Výrobky a montáž:', vm, true),
      totalRow('DPH 23%:', dph),
      totalRow('Cena s daňou (EUR):', celkom, true, 'E8F5E9'),
    ],
  })
}

function buildSection(
  label: string,
  items: PolozkaItem[],
  vm: string, dph: string, celkom: string,
  colWidths: number[],
) {
  if (items.length === 0) return []
  return [
    sectionHeader(label),
    itemsTable(items, colWidths),
    totalsTable(vm, dph, celkom),
    new Paragraph({ spacing: { before: 80, after: 0 }, children: [] }),
  ]
}

function conditionParagraph(label: string, text: string) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({ text: label + '  ', bold: true, size: 18 }),
      new TextRun({ text, size: 18 }),
    ],
  })
}

// ─── main builder ─────────────────────────────────────────────────────────────
async function buildDocx(ponuka: Ponuka, kal: KalkulaciaData, extras: {
  farba: string; zasklenie: string; kovanie: string; platnost: string
}): Promise<Blob> {
  const colWidths = [700, 3600, 1400, 500, 1300, 1500, 1300]

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(0.6),
            bottom: convertInchesToTwip(0.6),
            left: convertInchesToTwip(0.8),
            right: convertInchesToTwip(0.6),
          },
        },
      },
      children: [
        // ── HEADER ──
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({ children: [
            // Left: customer
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              borders: { top: NONE_BORDER, bottom: NONE_BORDER, left: NONE_BORDER, right: NONE_BORDER },
              children: [
                new Paragraph({ spacing: { before: 0, after: 40 }, children: [new TextRun({ text: 'Vážená pani / Vážený pán', size: 18, color: '666666' })] }),
                new Paragraph({ spacing: { before: 0, after: 40 }, children: [new TextRun({ text: ponuka.kontakt || ponuka.zakaznik_nazov, bold: true, size: 22 })] }),
                new Paragraph({ spacing: { before: 0, after: 40 }, children: [new TextRun({ text: ponuka.adresa_montaze || '', size: 18 })] }),
                new Paragraph({ spacing: { before: 0, after: 20 }, children: [new TextRun({ text: ponuka.kontakt ? `Tel.: ${ponuka.kontakt}` : '', size: 18 })] }),
                new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: ponuka.email ? `e-mail: ${ponuka.email}` : '', size: 18 })] }),
              ],
            }),
            // Right: company
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              borders: { top: NONE_BORDER, bottom: NONE_BORDER, left: NONE_BORDER, right: NONE_BORDER },
              children: [
                new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 40 }, children: [new TextRun({ text: 'ORSAG, s.r.o.', bold: true, size: 24, color: '1C2636' })] }),
                new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 20 }, children: [new TextRun({ text: 'Partizánska 687/88, 058 01  Poprad', size: 16 })] }),
                new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 20 }, children: [new TextRun({ text: 'Tel/fax: 052 – 776 91 01-2', size: 16 })] }),
                new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 20 }, children: [new TextRun({ text: 'e-mail: info@orsagsro.sk', size: 16 })] }),
                new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 20 }, children: [new TextRun({ text: 'IČO: 47 124 547  |  IČ DPH: SK2023 753 138', size: 16 })] }),
              ],
            }),
          ]})],
        }),

        new Paragraph({ spacing: { before: 120, after: 0 }, children: [] }),

        // ── REFERENCE TABLE ──
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [
              cell('Váš list (dopyt)', { bold: true, size: 8, bg: 'F4F6F9', align: AlignmentType.CENTER }),
              cell('Vybavuje', { bold: true, size: 8, bg: 'F4F6F9', align: AlignmentType.CENTER }),
              cell('Zo dňa', { bold: true, size: 8, bg: 'F4F6F9', align: AlignmentType.CENTER }),
              cell('Číslo ponuky', { bold: true, size: 8, bg: 'F4F6F9', align: AlignmentType.CENTER }),
              cell('Dátum', { bold: true, size: 8, bg: 'F4F6F9', align: AlignmentType.CENTER }),
            ]}),
            new TableRow({ children: [
              cell('', { size: 9, align: AlignmentType.CENTER }),
              cell(ponuka.obchodnik || 'Ing. Orság Pavel', { size: 9, align: AlignmentType.CENTER }),
              cell('', { size: 9, align: AlignmentType.CENTER }),
              cell(ponuka.cislo_ponuky, { size: 9, bold: true, align: AlignmentType.CENTER }),
              cell(dnes(), { size: 9, align: AlignmentType.CENTER }),
            ]}),
          ],
        }),

        new Paragraph({ spacing: { before: 160, after: 0 }, children: [] }),

        // ── SUBJECT ──
        new Paragraph({
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: 'Vec: Cenová ponuka', bold: true, size: 24 })],
        }),

        // System description
        ...([
          ['profilový systém', ponuka.popis_systemu || '—'],
          ['farba',            extras.farba || '—'],
          ['zasklenie',        extras.zasklenie],
          ['kovanie',          extras.kovanie],
          ['parapety',         kal.parapety.length > 0 ? 'áno' : '—'],
          ['žalúzie',          kal.zaluzie.length > 0 ? 'áno' : '—'],
          ['sitá',             kal.sietky.length > 0 ? 'áno' : '—'],
        ] as [string, string][]).map(([label, val]) => new Paragraph({
          spacing: { before: 40, after: 0 },
          indent: { left: convertInchesToTwip(0.2) },
          children: [
            new TextRun({ text: `- ${label}:   `, size: 18 }),
            new TextRun({ text: val, bold: true, size: 18 }),
          ],
        })),

        new Paragraph({ spacing: { before: 100, after: 60 }, children: [
          new TextRun({ text: 'JKR -jednokrídlové, DKR -dvojkrídlové, TKR -trojkrídlové, PZ -pevné zasklenie, OS -otváravo-sklopné, S -sklopné, O-otváravé', size: 14, color: '8B9BB4', italics: true }),
        ]}),

        new Paragraph({ spacing: { before: 0, after: 60 }, children: [
          new TextRun({ text: 'Ceny dodávky a montáže:', bold: true, size: 18 }),
        ]}),

        // ── SECTIONS ──
        ...buildSection('Okná', kal.okna, kal.okna_vm, kal.okna_dph, kal.okna_celkom, colWidths),
        ...buildSection('Parapetné dosky a plechy', kal.parapety, kal.parapety_vm, kal.parapety_dph, kal.parapety_celkom, colWidths),
        ...buildSection('Žalúzie', kal.zaluzie, kal.zaluzie_vm, kal.zaluzie_dph, kal.zaluzie_celkom, colWidths),
        ...buildSection('Sieťky proti hmyzu', kal.sietky, kal.sietky_vm, kal.sietky_dph, kal.sietky_celkom, colWidths),

        new Paragraph({ spacing: { before: 100, after: 0 }, children: [] }),

        // ── REKAPITULÁCIA ──
        new Paragraph({ spacing: { before: 0, after: 80 }, children: [new TextRun({ text: 'Rekapitulácia ceny dodávky s montážou:', bold: true, size: 20 })] }),
        new Table({
          width: { size: 60, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [
              cell('Cena výrobkov spolu:', { size: 9 }),
              cell(kal.celk_vyrobky + ' €', { size: 9, bold: true, align: AlignmentType.RIGHT }),
            ]}),
            new TableRow({ children: [
              cell('Cena montáže spolu:', { size: 9 }),
              cell(kal.celk_montaz + ' €', { size: 9, bold: true, align: AlignmentType.RIGHT }),
            ]}),
            new TableRow({ children: [
              cell('Cena spolu bez DPH:', { size: 9, bold: true, bg: 'F4F6F9' }),
              cell(kal.celk_bez_dph + ' €', { size: 9, bold: true, align: AlignmentType.RIGHT, bg: 'F4F6F9' }),
            ]}),
            new TableRow({ children: [
              cell('DPH 23%:', { size: 9 }),
              cell(kal.celk_dph + ' €', { size: 9, bold: true, align: AlignmentType.RIGHT }),
            ]}),
            new TableRow({ children: [
              cell('Cena s daňou (EUR):', { size: 9, bold: true, bg: 'E8F5E9', color: '2e7d32' }),
              cell(kal.celk_s_dph + ' €', { size: 10, bold: true, align: AlignmentType.RIGHT, bg: 'E8F5E9', color: '2e7d32' }),
            ]}),
          ],
        }),

        new Paragraph({ spacing: { before: 160, after: 0 }, children: [] }),

        // ── PODMIENKY ──
        conditionParagraph('Platnosť ponuky:', extras.platnost),
        conditionParagraph('Spôsob platby:', 'Štandardne záloha 70 %, zvyšok po dodaní. Zákazky do 500,00 € sú hradené 100% zálohou.'),
        conditionParagraph('Dodacia lehota:', 'Pre biele prevedenie 3–4 týždne od uzavretia zmluvy. Pre imitáciu dreva 5–8 týždňov.'),
        conditionParagraph('Záruky:', 'Všeobecná záručná doba je 2 roky.'),

        new Paragraph({ spacing: { before: 300, after: 0 }, children: [] }),

        // ── PODPIS ──
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 0, after: 60 },
          children: [new TextRun({ text: 'S pozdravom', size: 18 })],
        }),
        new Paragraph({ spacing: { before: 300, after: 60 }, alignment: AlignmentType.RIGHT, children: [
          new TextRun({ text: 'Ing. Pavel Orság', bold: true, size: 18 }),
        ]}),
        new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 0 }, children: [
          new TextRun({ text: 'ORSAG, s.r.o. – konateľ', size: 18, color: '666666' }),
        ]}),
      ],
    }],
  })

  return Packer.toBlob(doc)
}

// ─── component ────────────────────────────────────────────────────────────────
export default function PonukaGeneratorPanel({ ponuka }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [wb, setWb] = useState<XLSX.WorkBook | null>(null)
  const [fileName, setFileName] = useState('')
  const [sheetName, setSheetName] = useState('')
  const [kal, setKal] = useState<KalkulaciaData | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [farba, setFarba] = useState('')
  const [zasklenie, setZasklenie] = useState('izolačné dvojsklo 4-16-4 číre')
  const [kovanie, setKovanie] = useState('—')
  const [platnost, setPlatnost] = useState('1 mesiac od dátumu spracovania')

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true); setError(null); setKal(null)
    try {
      const workbook = await readWorkbook(file)
      setWb(workbook); setFileName(file.name)
      const first = workbook.SheetNames[0]
      setSheetName(first)
      setKal(parseKalkulacia(workbook, first))
    } catch (err: any) { setError('Chyba pri čítaní: ' + err.message) }
    setLoading(false); e.target.value = ''
  }

  function onSheet(name: string) {
    if (!wb) return
    setSheetName(name)
    try { setKal(parseKalkulacia(wb, name)) }
    catch (err: any) { setError('Chyba sheetu: ' + err.message) }
  }

  async function generate() {
    if (!kal) return
    setGenerating(true); setError(null)
    try {
      const blob = await buildDocx(ponuka, kal, { farba, zasklenie, kovanie, platnost })
      const name = `${ponuka.cislo_ponuky}_${ponuka.zakaznik_nazov.replace(/\s+/g, '_')}.docx`
      saveAs(blob, name)
    } catch (err: any) {
      console.error(err)
      setError('Chyba: ' + (err.message || String(err)))
    }
    setGenerating(false)
  }

  const inp = 'w-full px-3 py-2 rounded-[8px] border border-[#e0e0e0] text-sm focus:outline-none focus:border-[#0779e4] focus:ring-2 focus:ring-[#0779e4]/10 bg-white'

  return (
    <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <FileText size={16} className="text-[#0779e4]" />
        <h2 className="font-semibold text-[#1a2332]">Generátor cenovej ponuky (Word)</h2>
      </div>

      {/* Upload */}
      <div>
        <p className="text-xs font-medium text-[#8b9bb4] mb-2">1. Nahrať kalkulačný Excel</p>
        <input ref={fileRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={onFile} />
        <button onClick={() => fileRef.current?.click()} disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-[#e0e0e0] rounded-[8px] text-sm text-[#8b9bb4] hover:border-[#0779e4] hover:text-[#0779e4] transition-colors w-full justify-center">
          {loading ? <><Loader2 size={14} className="animate-spin" /> Načítavam...</>
                   : <><Upload size={14} /> {fileName || 'Vybrať XLS / XLSX súbor'}</>}
        </button>
      </div>

      {/* Sheet selector */}
      {wb && wb.SheetNames.length > 1 && (
        <div>
          <p className="text-xs font-medium text-[#8b9bb4] mb-2">2. Verzia cien</p>
          <div className="flex gap-2 flex-wrap">
            {wb.SheetNames.map(n => (
              <button key={n} onClick={() => onSheet(n)}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  sheetName === n ? 'bg-[#1c2636] text-white' : 'bg-[#f4f6f9] text-[#4a5568] hover:bg-[#e0e0e0]'}`}>
                <FileSpreadsheet size={11} />{n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {kal && (
        <div className="bg-[#f8f9fb] rounded-[8px] p-4 space-y-1.5">
          <p className="text-xs font-semibold text-[#1a2332] mb-2 flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-[#66bb6a]" /> Načítané z Excelu
          </p>
          {([['Okná', kal.okna, kal.okna_celkom], ['Parapety', kal.parapety, kal.parapety_celkom],
             ['Žalúzie', kal.zaluzie, kal.zaluzie_celkom], ['Sieťky', kal.sietky, kal.sietky_celkom]] as [string, PolozkaItem[], string][])
            .filter(([,items]) => items.length > 0)
            .map(([label, items, celkom]) => (
              <div key={label} className="flex justify-between text-xs text-[#4a5568]">
                <span>{label}: <span className="font-medium">{items.length} pol.</span></span>
                <span className="font-medium">{celkom} €</span>
              </div>
            ))}
          <div className="border-t border-[#e0e0e0] pt-2 mt-1 flex justify-between text-sm font-bold text-[#1a2332]">
            <span>Celkom s DPH:</span>
            <span className="text-[#0779e4]">{kal.celk_s_dph} €</span>
          </div>
        </div>
      )}

      {/* Extra fields */}
      {kal && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-[#8b9bb4]">{wb && wb.SheetNames.length > 1 ? '3.' : '2.'} Doplnkové údaje</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-[#8b9bb4] mb-1">Farba profilu</label>
              <input value={farba} onChange={e => setFarba(e.target.value)} placeholder="napr. biela" className={inp} /></div>
            <div><label className="block text-xs text-[#8b9bb4] mb-1">Zasklenie</label>
              <input value={zasklenie} onChange={e => setZasklenie(e.target.value)} className={inp} /></div>
            <div><label className="block text-xs text-[#8b9bb4] mb-1">Kovanie</label>
              <input value={kovanie} onChange={e => setKovanie(e.target.value)} className={inp} /></div>
            <div><label className="block text-xs text-[#8b9bb4] mb-1">Platnosť ponuky</label>
              <input value={platnost} onChange={e => setPlatnost(e.target.value)} className={inp} /></div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-[8px]">
          <X size={14} className="mt-0.5 flex-shrink-0" />{error}
        </div>
      )}

      {kal && (
        <>
          <button onClick={generate} disabled={generating}
            className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-[#0779e4] text-white text-sm font-semibold rounded-[8px] hover:bg-[#0669cc] disabled:opacity-60 transition-colors">
            {generating ? <><Loader2 size={15} className="animate-spin" /> Generujem...</>
                        : <><FileText size={15} /> Generovať Word (DOCX)</>}
          </button>
          <p className="text-xs text-[#8b9bb4] text-center">
            Stiahne DOCX → otvor vo Worde → uprav → ulož ako PDF
          </p>
        </>
      )}
    </div>
  )
}
