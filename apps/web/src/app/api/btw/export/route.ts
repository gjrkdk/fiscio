import { NextRequest, NextResponse } from 'next/server'
import { eq, and, gte, lte, sum, desc } from 'drizzle-orm'
import { invoices, receipts } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

function kwartaalDatums(jaar: number, kwartaal: number) {
  const startMaand = (kwartaal - 1) * 3
  const start = new Date(jaar, startMaand, 1)
  const eind = new Date(jaar, startMaand + 3, 0, 23, 59, 59)
  return { start, eind }
}

function csvEscape(val: string | null | undefined) {
  const s = String(val ?? '')
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

function euro(val: string | number | null | undefined) {
  const n = typeof val === 'number' ? val : parseFloat(val ?? '0')
  return isNaN(n) ? '0.00' : n.toFixed(2).replace('.', ',')
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const jaar = parseInt(searchParams.get('jaar') ?? String(new Date().getFullYear()))
  const kwartaal = parseInt(searchParams.get('kwartaal') ?? '1')
  const { start, eind } = kwartaalDatums(jaar, kwartaal)

  // Facturen
  const factuurLijst = await db
    .select()
    .from(invoices)
    .where(and(
      eq(invoices.userId, user.id),
      gte(invoices.createdAt, start),
      lte(invoices.createdAt, eind),
    ))
    .orderBy(desc(invoices.createdAt))

  // Kosten
  const kostenLijst = await db
    .select()
    .from(receipts)
    .where(and(
      eq(receipts.userId, user.id),
      gte(receipts.receiptDate, start),
      lte(receipts.receiptDate, eind),
    ))
    .orderBy(desc(receipts.receiptDate))

  // Totalen
  const [fStats] = await db.select({ omzet: sum(invoices.subtotal), btw: sum(invoices.vatAmount) })
    .from(invoices).where(and(eq(invoices.userId, user.id), gte(invoices.createdAt, start), lte(invoices.createdAt, eind)))

  const [kStats] = await db.select({ kosten: sum(receipts.amount), btw: sum(receipts.vatAmount) })
    .from(receipts).where(and(eq(receipts.userId, user.id), gte(receipts.receiptDate, start), lte(receipts.receiptDate, eind)))

  const btwOntvangen = parseFloat(fStats?.btw ?? '0') || 0
  const btwBetaald = parseFloat(kStats?.btw ?? '0') || 0
  const saldo = btwOntvangen - btwBetaald

  const rows: string[] = []
  const sep = '\r\n'

  rows.push(`BTW-aangifte Q${kwartaal} ${jaar}`)
  rows.push('')

  // Samenvatting
  rows.push('SAMENVATTING')
  rows.push('Omschrijving,Bedrag')
  rows.push(`Omzet excl. BTW (1a),${euro(fStats?.omzet)}`)
  rows.push(`Verschuldigde BTW (1b),${euro(btwOntvangen)}`)
  rows.push(`Kosten excl. BTW,${euro(kStats?.kosten)}`)
  rows.push(`Aftrekbare BTW (5b),${euro(btwBetaald)}`)
  rows.push(`${saldo >= 0 ? 'Te betalen BTW' : 'Teruggaaf BTW'} (5c),${euro(Math.abs(saldo))}`)
  rows.push('')

  // Facturen
  rows.push('UITGAANDE FACTUREN')
  rows.push('Datum,Factuurnummer,Klant,Excl. BTW,BTW,Incl. BTW,Status')
  for (const f of factuurLijst) {
    const datum = f.createdAt ? new Date(f.createdAt).toLocaleDateString('nl-NL') : ''
    rows.push([
      datum, f.invoiceNumber, csvEscape(f.clientName),
      euro(f.subtotal), euro(f.vatAmount), euro(f.total), f.status,
    ].join(','))
  }
  rows.push('')

  // Kosten
  rows.push('INKOMENDE KOSTEN')
  rows.push('Datum,Leverancier,Categorie,Omschrijving,Excl. BTW,BTW %,BTW,Incl. BTW')
  for (const k of kostenLijst) {
    const datum = k.receiptDate ? new Date(k.receiptDate).toLocaleDateString('nl-NL') : ''
    const incl = (parseFloat(k.amount ?? '0') + parseFloat(k.vatAmount ?? '0')).toFixed(2).replace('.', ',')
    rows.push([
      datum, csvEscape(k.vendor), csvEscape(k.category), csvEscape(k.description),
      euro(k.amount), `${k.vatRate}%`, euro(k.vatAmount), incl,
    ].join(','))
  }

  const csv = rows.join(sep)
  const filename = `btw-aangifte-q${kwartaal}-${jaar}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
