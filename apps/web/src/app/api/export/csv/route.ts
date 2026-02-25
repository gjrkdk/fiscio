import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { db } from '@/lib/db'
import { invoices, receipts, trips } from '@fiscio/db'
import { eq, and, gte, lt } from 'drizzle-orm'

function csvRij(velden: (string | number | null | undefined)[]): string {
  return velden.map(v => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }).join(',')
}

function csvBestand(rijen: string[]): string {
  return rijen.join('\r\n')
}

function datumNL(d: Date | null | undefined): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('nl-NL')
}

function bedrag(n: string | null | undefined): string {
  if (!n) return '0,00'
  return parseFloat(n).toFixed(2).replace('.', ',')
}

export async function GET(req: NextRequest) {
  // Auth
  const token = req.headers.get('authorization')?.slice(7)
  if (!token) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Onbevoegd' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'facturen'
  const jaar = parseInt(searchParams.get('jaar') ?? String(new Date().getFullYear()))
  const begin = new Date(jaar, 0, 1)
  const eind  = new Date(jaar + 1, 0, 1)

  let csv = ''
  let bestandsnaam = ''

  // ─── Facturen ────────────────────────────────────────────────────────────
  if (type === 'facturen') {
    const data = await db.select().from(invoices)
      .where(and(eq(invoices.userId, user.id), gte(invoices.createdAt, begin), lt(invoices.createdAt, eind)))

    const rijen = [
      csvRij(['Factuurnummer', 'Klant', 'Datum', 'Status', 'Subtotaal (excl. BTW)', 'BTW', 'Totaal (incl. BTW)', 'Vervaldatum', 'Betaald op']),
      ...data.map(f => csvRij([
        f.invoiceNumber,
        f.clientName,
        datumNL(f.createdAt),
        f.status,
        bedrag(f.subtotal),
        bedrag(f.vatAmount),
        bedrag(f.total),
        datumNL(f.dueDate),
        datumNL(f.paidAt),
      ])),
    ]
    csv = csvBestand(rijen)
    bestandsnaam = `fiscio-facturen-${jaar}.csv`
  }

  // ─── Bonnetjes / Kosten ──────────────────────────────────────────────────
  else if (type === 'bonnetjes') {
    const data = await db.select().from(receipts)
      .where(and(eq(receipts.userId, user.id), gte(receipts.receiptDate, begin), lt(receipts.receiptDate, eind)))

    const rijen = [
      csvRij(['Datum', 'Leverancier', 'Categorie', 'Omschrijving', 'Bedrag (excl. BTW)', 'BTW', 'BTW %', 'Totaal']),
      ...data.map(b => {
        const excl = parseFloat(b.amount ?? '0') - parseFloat(b.vatAmount ?? '0')
        return csvRij([
          datumNL(b.receiptDate),
          b.vendor ?? '',
          b.category ?? 'Overig',
          b.description ?? '',
          excl.toFixed(2).replace('.', ','),
          bedrag(b.vatAmount),
          b.vatRate ? `${parseFloat(b.vatRate).toFixed(0)}%` : '',
          bedrag(b.amount),
        ])
      }),
    ]
    csv = csvBestand(rijen)
    bestandsnaam = `fiscio-kosten-${jaar}.csv`
  }

  // ─── Ritten ──────────────────────────────────────────────────────────────
  else if (type === 'ritten') {
    const data = await db.select().from(trips)
      .where(and(eq(trips.userId, user.id), gte(trips.startedAt, begin), lt(trips.startedAt, eind)))

    const rijen = [
      csvRij(['Datum', 'Omschrijving', 'Van', 'Naar', 'Afstand (km)', 'Type', 'Km-vergoeding (€0,23)', 'AI geclassificeerd', 'Notities']),
      ...data.map(r => {
        const km = parseFloat(r.distanceKm ?? '0')
        return csvRij([
          datumNL(r.startedAt),
          r.description,
          r.startAddress,
          r.endAddress,
          km.toFixed(1).replace('.', ','),
          r.isBusinessTrip ? 'Zakelijk' : 'Privé',
          r.isBusinessTrip ? (km * 0.23).toFixed(2).replace('.', ',') : '0,00',
          r.classifiedByAi ? 'Ja' : 'Nee',
          r.notes ?? '',
        ])
      }),
    ]
    csv = csvBestand(rijen)
    bestandsnaam = `fiscio-ritten-${jaar}.csv`
  }

  // ─── Jaaroverzicht ────────────────────────────────────────────────────────
  else if (type === 'jaaroverzicht') {
    const [factuurData, bonData, ritData] = await Promise.all([
      db.select().from(invoices).where(and(eq(invoices.userId, user.id), gte(invoices.createdAt, begin), lt(invoices.createdAt, eind))),
      db.select().from(receipts).where(and(eq(receipts.userId, user.id), gte(receipts.receiptDate, begin), lt(receipts.receiptDate, eind))),
      db.select().from(trips).where(and(eq(trips.userId, user.id), gte(trips.startedAt, begin), lt(trips.startedAt, eind))),
    ])

    const omzet  = factuurData.filter(f => f.status !== 'draft').reduce((s, f) => s + parseFloat(f.subtotal ?? '0'), 0)
    const btw    = factuurData.filter(f => f.status !== 'draft').reduce((s, f) => s + parseFloat(f.vatAmount ?? '0'), 0)
    const kosten = bonData.reduce((s, b) => s + parseFloat(b.amount ?? '0'), 0)
    const kmZak  = ritData.filter(r => r.isBusinessTrip).reduce((s, r) => s + parseFloat(r.distanceKm ?? '0'), 0)
    const winst  = omzet - kosten

    const MAANDEN = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December']
    const maandRijen = MAANDEN.map((maand, i) => {
      const mOmzet = factuurData.filter(f => f.status !== 'draft' && new Date(f.createdAt).getMonth() === i)
        .reduce((s, f) => s + parseFloat(f.subtotal ?? '0'), 0)
      const mKosten = bonData.filter(b => b.receiptDate && new Date(b.receiptDate).getMonth() === i)
        .reduce((s, b) => s + parseFloat(b.amount ?? '0'), 0)
      const mBtw = factuurData.filter(f => f.status !== 'draft' && new Date(f.createdAt).getMonth() === i)
        .reduce((s, f) => s + parseFloat(f.vatAmount ?? '0'), 0)
      return csvRij([maand, mOmzet.toFixed(2).replace('.', ','), mKosten.toFixed(2).replace('.', ','), (mOmzet - mKosten).toFixed(2).replace('.', ','), mBtw.toFixed(2).replace('.', ',')])
    })

    const rijen = [
      csvRij([`Fiscio Jaaroverzicht ${jaar}`]),
      csvRij([]),
      csvRij(['Samenvatting', 'Bedrag']),
      csvRij(['Totale omzet (excl. BTW)', bedrag(String(omzet))]),
      csvRij(['Totale kosten', bedrag(String(kosten))]),
      csvRij(['Nettowinst', bedrag(String(winst))]),
      csvRij(['BTW afdracht', bedrag(String(btw))]),
      csvRij(['Zakelijke km', `${Math.round(kmZak)} km`]),
      csvRij(['Km-vergoeding (€0,23/km)', bedrag(String(kmZak * 0.23))]),
      csvRij([]),
      csvRij(['Maand', 'Omzet', 'Kosten', 'Winst', 'BTW']),
      ...maandRijen,
    ]
    csv = csvBestand(rijen)
    bestandsnaam = `fiscio-jaaroverzicht-${jaar}.csv`
  }

  // BOM voor Excel UTF-8
  const bom = '\uFEFF'
  return new Response(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${bestandsnaam}"`,
    },
  })
}
