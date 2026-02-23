'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import { bonToevoegen } from './actions'
import { bonFotoVerwerken, type OcrResultaat } from './uploadActions'

const CATEGORIEËN = [
  { value: 'kantoor', label: 'Kantoor' },
  { value: 'reizen', label: 'Reizen' },
  { value: 'software', label: 'Software' },
  { value: 'maaltijden', label: 'Maaltijden' },
  { value: 'abonnement', label: 'Abonnement' },
  { value: 'overig', label: 'Overig' },
]

const BTW_TARIEVEN = [
  { value: '0', label: '0% (vrijgesteld)' },
  { value: '9', label: '9% (laag tarief)' },
  { value: '21', label: '21% (hoog tarief)' },
]

type ScanStatus = 'idle' | 'uploading' | 'scanning' | 'done' | 'error'

export function BonToevoegenModal() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isScanPending, startScanTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  // Formuliervelden (controlled voor OCR auto-fill)
  const [vendor, setVendor] = useState('')
  const [bedrag, setBedrag] = useState('')
  const [vatRate, setVatRate] = useState('21')
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')

  // Upload state
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [ocrRaw, setOcrRaw] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  const btwBedrag = bedrag && !isNaN(+bedrag)
    ? (+bedrag * +vatRate / 100).toFixed(2) : '0.00'
  const inclBedrag = bedrag && !isNaN(+bedrag)
    ? (+bedrag + +btwBedrag).toFixed(2) : '0.00'

  function resetForm() {
    setVendor(''); setBedrag(''); setVatRate('21')
    setReceiptDate(new Date().toISOString().split('T')[0])
    setCategory(''); setDescription('')
    setScanStatus('idle'); setPreviewUrl(null)
    setImageUrl(null); setOcrRaw(null); setScanError(null)
    formRef.current?.reset()
  }

  function applyOcr(ocr: OcrResultaat) {
    if (ocr.vendor) setVendor(ocr.vendor)
    if (ocr.amount) setBedrag(ocr.amount)
    if (ocr.vatRate) setVatRate(ocr.vatRate)
    if (ocr.receiptDate) setReceiptDate(ocr.receiptDate)
    if (ocr.category && CATEGORIEËN.find(c => c.value === ocr.category)) setCategory(ocr.category)
    if (ocr.description) setDescription(ocr.description)
  }

  const verwerkFoto = useCallback((file: File) => {
    // Preview tonen
    const reader = new FileReader()
    reader.onload = e => setPreviewUrl(e.target?.result as string)
    reader.readAsDataURL(file)

    setScanStatus('uploading')
    setScanError(null)

    const fd = new FormData()
    fd.append('foto', file)

    startScanTransition(async () => {
      try {
        setScanStatus('scanning')
        const result = await bonFotoVerwerken(fd)
        setImageUrl(result.imageUrl)
        setOcrRaw(result.ocrRaw)
        if (result.ocr && Object.keys(result.ocr).length > 0) {
          applyOcr(result.ocr)
          setScanStatus('done')
        } else {
          setScanStatus('done') // upload gelukt, geen OCR (geen API key)
        }
      } catch (e) {
        setScanStatus('error')
        setScanError(e instanceof Error ? e.message : 'Upload mislukt')
      }
    })
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) verwerkFoto(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) verwerkFoto(file)
  }

  function handleSubmit(formData: FormData) {
    // Velden zijn controlled, voeg ze handmatig toe
    formData.set('vendor', vendor ?? '')
    formData.set('amount', bedrag ?? '')
    formData.set('vatRate', vatRate ?? '21')
    formData.set('receiptDate', receiptDate ?? '')
    formData.set('category', category ?? '')
    formData.set('description', description ?? '')
    if (imageUrl) formData.set('imageUrl', imageUrl)
    if (ocrRaw) formData.set('ocrRaw', ocrRaw)

    startTransition(async () => {
      await bonToevoegen(formData)
      setOpen(false)
      resetForm()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        + Bon toevoegen
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />

          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Bon toevoegen</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            {/* Foto upload zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => scanStatus === 'idle' && fileInputRef.current?.click()}
              className={`mb-4 rounded-xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden
                ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}
                ${scanStatus !== 'idle' ? 'cursor-default' : ''}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {previewUrl ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Bonnetje" className="w-full max-h-40 object-contain bg-gray-50 py-2" />
                  {(scanStatus === 'uploading' || scanStatus === 'scanning') && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white text-sm gap-1">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {scanStatus === 'uploading' ? 'Uploaden...' : 'Scannen met AI...'}
                    </div>
                  )}
                  {scanStatus === 'done' && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      ✓ {ocrRaw ? 'AI ingevuld' : 'Geüpload'}
                    </div>
                  )}
                  {scanStatus !== 'scanning' && scanStatus !== 'uploading' && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); resetForm() }}
                      className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full hover:bg-black/70"
                    >
                      Verwijder
                    </button>
                  )}
                </div>
              ) : (
                <div className="py-5 flex flex-col items-center gap-1 text-gray-400">
                  <span className="text-2xl">📷</span>
                  <p className="text-sm font-medium text-gray-500">Foto of PDF uploaden</p>
                  <p className="text-xs">Klik of sleep een bonnetje hiernaartoe</p>
                  <p className="text-xs text-blue-500 mt-0.5">AI vult de velden automatisch in</p>
                </div>
              )}
            </div>

            {scanError && (
              <p className="mb-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{scanError}</p>
            )}

            <form ref={formRef} action={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leverancier <span className="text-red-500">*</span></label>
                <input name="vendor" type="text" required placeholder="Bijv. Albert Heijn, AWS, NS"
                  value={vendor} onChange={e => setVendor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datum <span className="text-red-500">*</span></label>
                <input name="receiptDate" type="date" required
                  value={receiptDate} onChange={e => setReceiptDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bedrag excl. BTW <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                    <input name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00"
                      value={bedrag} onChange={e => setBedrag(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">BTW tarief</label>
                  <select name="vatRate" value={vatRate} onChange={e => setVatRate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {BTW_TARIEVEN.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              {bedrag && +bedrag > 0 && (
                <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700 flex justify-between">
                  <span>BTW: € {btwBedrag}</span>
                  <span className="font-medium">Incl. BTW: € {inclBedrag}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categorie <span className="text-red-500">*</span></label>
                <select name="category" required value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="" disabled>Selecteer categorie</option>
                  {CATEGORIEËN.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Omschrijving</label>
                <input name="description" type="text" placeholder="Optioneel"
                  value={description} onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setOpen(false); resetForm() }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  Annuleren
                </button>
                <button type="submit" disabled={isPending || scanStatus === 'uploading' || scanStatus === 'scanning'}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {isPending ? 'Opslaan...' : 'Toevoegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
