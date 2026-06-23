import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, FileText, Loader2, CheckCircle2, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { saveAs } from 'file-saver'
import { readWorkbook, parseKalkulacia, type KalkulaciaData } from '@/lib/xlsParser'
import { PONUKA_TEMPLATE_B64 } from '@/lib/ponukaTemplate'
import type { Ponuka } from '@/pages/Ponuky'

interface Props {
  ponuka: Ponuka
}

function b64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function dnes(): string {
  return new Date().toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function PonukaGeneratorPanel({ ponuka }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [wb, setWb] = useState<XLSX.WorkBook | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [sheetName, setSheetName] = useState<string>('')
  const [kalkulacia, setKalkulacia] = useState<KalkulaciaData | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Extra fields user can override
  const [farba, setFarba] = useState('')
  const [zasklenie, setZasklenie] = useState('izolačné dvojsklo 4-16-4 číre')
  const [kovanie, setKovanie] = useState('—')
  const [platnost, setPlatnost] = useState('1 mesiac od dátumu spracovania')

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true); setError(null); setKalkulacia(null)
    try {
      const workbook = await readWorkbook(file)
      setWb(workbook)
      setFileName(file.name)
      const first = workbook.SheetNames[0]
      setSheetName(first)
      const data = parseKalkulacia(workbook, first)
      setKalkulacia(data)
    } catch (err: any) {
      setError('Chyba pri čítaní Excelu: ' + err.message)
    }
    setLoading(false)
    // Reset input so same file can be re-uploaded
    e.target.value = ''
  }

  function onSheetChange(name: string) {
    if (!wb) return
    setSheetName(name)
    try {
      const data = parseKalkulacia(wb, name)
      setKalkulacia(data)
    } catch (err: any) {
      setError('Chyba pri čítaní sheetu: ' + err.message)
    }
  }

  async function generate() {
    if (!kalkulacia) return
    setGenerating(true); setError(null)
    try {
      // Load template
      const templateBuf = b64ToArrayBuffer(PONUKA_TEMPLATE_B64)
      const zip = new PizZip(templateBuf)
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      })

      // Build template data
      const data = {
        kontakt:        ponuka.kontakt || ponuka.zakaznik_nazov,
        adresa_montaze: ponuka.adresa_montaze || '',
        tel:            ponuka.kontakt || '',
        email:          ponuka.email || '',
        cislo_ponuky:   ponuka.cislo_ponuky,
        datum:          dnes(),
        obchodnik:      ponuka.obchodnik || 'Ing. Orság Pavel',
        popis_systemu:  ponuka.popis_systemu || '',
        farba:          farba || '—',
        zasklenie,
        kovanie,
        parapety_text:  kalkulacia.parapety.length > 0 ? 'áno' : '—',
        zaluzie_text:   kalkulacia.zaluzie.length > 0  ? 'áno' : '—',
        sita_text:      kalkulacia.sietky.length > 0   ? 'áno' : '—',
        platnost_text:  platnost,

        // Section items
        okna:     kalkulacia.okna,
        parapety: kalkulacia.parapety,
        zaluzie:  kalkulacia.zaluzie,
        sietky:   kalkulacia.sietky,

        // Section totals
        okna_montaz_riadok:     kalkulacia.okna_montaz_riadok,
        okna_vm:                kalkulacia.okna_vm,
        okna_dph:               kalkulacia.okna_dph,
        okna_celkom:            kalkulacia.okna_celkom,

        parapety_montaz_riadok: kalkulacia.parapety_montaz_riadok,
        parapety_vm:            kalkulacia.parapety_vm,
        parapety_dph:           kalkulacia.parapety_dph,
        parapety_celkom:        kalkulacia.parapety_celkom,

        zaluzie_montaz_riadok:  kalkulacia.zaluzie_montaz_riadok,
        zaluzie_vm:             kalkulacia.zaluzie_vm,
        zaluzie_dph:            kalkulacia.zaluzie_dph,
        zaluzie_celkom:         kalkulacia.zaluzie_celkom,

        sietky_montaz_riadok:   kalkulacia.sietky_montaz_riadok,
        sietky_vm:              kalkulacia.sietky_vm,
        sietky_dph:             kalkulacia.sietky_dph,
        sietky_celkom:          kalkulacia.sietky_celkom,

        // Grand totals
        celk_vyrobky:  kalkulacia.celk_vyrobky,
        celk_montaz:   kalkulacia.celk_montaz,
        celk_bez_dph:  kalkulacia.celk_bez_dph,
        celk_dph:      kalkulacia.celk_dph,
        celk_s_dph:    kalkulacia.celk_s_dph,
      }

      doc.render(data)

      const out = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })

      const outName = `${ponuka.cislo_ponuky}_${ponuka.zakaznik_nazov.replace(/\s+/g, '_')}.docx`
      saveAs(out, outName)
    } catch (err: any) {
      console.error(err)
      setError('Chyba pri generovaní: ' + (err.message || String(err)))
    }
    setGenerating(false)
  }

  const inputCls = 'w-full px-3 py-2 rounded-[8px] border border-[#e0e0e0] text-sm text-[#1a2332] focus:outline-none focus:border-[#0779e4] focus:ring-2 focus:ring-[#0779e4]/10 bg-white'

  return (
    <div className="bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <FileText size={16} className="text-[#0779e4]" />
        <h2 className="font-semibold text-[#1a2332]">Generátor cenovej ponuky</h2>
      </div>

      {/* Step 1: Upload Excel */}
      <div>
        <p className="text-xs font-medium text-[#8b9bb4] mb-2">1. Nahrať kalkulačný Excel</p>
        <input ref={fileRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={onFileChange} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-[#e0e0e0] rounded-[8px] text-sm text-[#8b9bb4] hover:border-[#0779e4] hover:text-[#0779e4] transition-colors w-full justify-center"
        >
          {loading
            ? <><Loader2 size={15} className="animate-spin" /> Načítavam...</>
            : <><Upload size={15} /> {fileName || 'Vybrať XLS / XLSX súbor'}</>}
        </button>
      </div>

      {/* Sheet selector */}
      {wb && wb.SheetNames.length > 1 && (
        <div>
          <p className="text-xs font-medium text-[#8b9bb4] mb-2">2. Vybrať verziu cien (sheet)</p>
          <div className="flex gap-2 flex-wrap">
            {wb.SheetNames.map(name => (
              <button
                key={name}
                onClick={() => onSheetChange(name)}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  sheetName === name
                    ? 'bg-[#1c2636] text-white'
                    : 'bg-[#f4f6f9] text-[#4a5568] hover:bg-[#e0e0e0]'
                }`}
              >
                <FileSpreadsheet size={12} />
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preview of parsed data */}
      {kalkulacia && (
        <div className="bg-[#f8f9fb] rounded-[8px] p-4 space-y-2">
          <p className="text-xs font-semibold text-[#1a2332] mb-2 flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-[#66bb6a]" /> Načítané z Excelu
          </p>
          {[
            { label: 'Okná', items: kalkulacia.okna, celkom: kalkulacia.okna_celkom },
            { label: 'Parapety', items: kalkulacia.parapety, celkom: kalkulacia.parapety_celkom },
            { label: 'Žalúzie', items: kalkulacia.zaluzie, celkom: kalkulacia.zaluzie_celkom },
            { label: 'Sieťky', items: kalkulacia.sietky, celkom: kalkulacia.sietky_celkom },
          ].map(({ label, items, celkom }) => items.length > 0 && (
            <div key={label} className="flex justify-between text-xs text-[#4a5568]">
              <span>{label}: <span className="font-medium">{items.length} pol.</span></span>
              <span className="font-medium text-[#1a2332]">{celkom} €</span>
            </div>
          ))}
          <div className="border-t border-[#e0e0e0] pt-2 mt-1 flex justify-between text-sm font-bold text-[#1a2332]">
            <span>Celkom s DPH:</span>
            <span className="text-[#0779e4]">{kalkulacia.celk_s_dph} €</span>
          </div>
        </div>
      )}

      {/* Extra fields */}
      {kalkulacia && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-[#8b9bb4]">{wb && wb.SheetNames.length > 1 ? '3.' : '2.'} Doplniť do ponuky</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#8b9bb4] mb-1">Farba profilu</label>
              <input value={farba} onChange={e => setFarba(e.target.value)} placeholder="napr. biela / zlatý dub" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-[#8b9bb4] mb-1">Zasklenie</label>
              <input value={zasklenie} onChange={e => setZasklenie(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-[#8b9bb4] mb-1">Kovanie</label>
              <input value={kovanie} onChange={e => setKovanie(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-[#8b9bb4] mb-1">Platnosť ponuky</label>
              <input value={platnost} onChange={e => setPlatnost(e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-[8px]">
          <X size={14} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Generate button */}
      {kalkulacia && (
        <button
          onClick={generate}
          disabled={generating}
          className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-[#0779e4] text-white text-sm font-semibold rounded-[8px] hover:bg-[#0669cc] disabled:opacity-60 transition-colors"
        >
          {generating
            ? <><Loader2 size={15} className="animate-spin" /> Generujem...</>
            : <><FileText size={15} /> Generovať Word (DOCX)</>}
        </button>
      )}
      {kalkulacia && (
        <p className="text-xs text-[#8b9bb4] text-center">
          Stiahne sa DOCX → otvor vo Worde → uprav → ulož ako PDF
        </p>
      )}
    </div>
  )
}
