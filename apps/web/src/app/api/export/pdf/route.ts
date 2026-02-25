import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { db } from '@/lib/db'
import { invoices, receipts, trips, users } from '@fiscio/db'
import { eq, and, gte, lt } from 'drizzle-orm'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { JaaroverzichtPDF } from '@/lib/pdf/JaaroverzichtPDF'
import React, { type JSXElementConstructor, type ReactElement } from 'react'

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.slice(7)
  if (!token) return new Response('Niet ingelogd', { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Onbevoegd', { status: 401 })

  const { searchParams } = new URL(req.url)
  const jaar = parseInt(searchParams.get('jaar') ?? String(new Date().getFullYear()))
  const begin = new Date(jaar, 0, 1)
  const eind  = new Date(jaar + 1, 0, 1)

  const [factuurData, bonData, ritData, gebruikerData] = await Promise.all([
    db.select().from(invoices).where(and(eq(invoices.userId, user.id), gte(invoices.createdAt, begin), lt(invoices.createdAt, eind))),
    db.select().from(receipts).where(and(eq(receipts.userId, user.id), gte(receipts.receiptDate, begin), lt(receipts.receiptDate, eind))),
    db.select().from(trips).where(and(eq(trips.userId, user.id), gte(trips.startedAt, begin), lt(trips.startedAt, eind))),
    db.select().from(users).where(eq(users.id, user.id)).limit(1),
  ])

  const omzet  = factuurData.filter(f => f.status !== 'draft').reduce((s, f) => s + parseFloat(f.subtotal ?? '0'), 0)
  const btw    = factuurData.filter(f => f.status !== 'draft').reduce((s, f) => s + parseFloat(f.vatAmount ?? '0'), 0)
  const kosten = bonData.reduce((s, b) => s + parseFloat(b.amount ?? '0'), 0)
  const kmZak  = ritData.filter(r => r.isBusinessTrip).reduce((s, r) => s + parseFloat(r.distanceKm ?? '0'), 0)
  const openstaand = factuurData.filter(f => f.status === 'sent').reduce((s, f) => s + parseFloat(f.total ?? '0'), 0)

  const kostenPerCat = bonData.reduce<Record<string, number>>((acc, b) => {
    const cat = b.category ?? 'Overig'
    acc[cat] = (acc[cat] ?? 0) + parseFloat(b.amount ?? '0')
    return acc
  }, {})

  const kwartalen = [0, 1, 2, 3].map(q => {
    const sm = q * 3
    const qF = factuurData.filter(f => { const m = new Date(f.createdAt).getMonth(); return f.status !== 'draft' && m >= sm && m < sm + 3 })
    const qB = bonData.filter(b => { if (!b.receiptDate) return false; const m = new Date(b.receiptDate).getMonth(); return m >= sm && m < sm + 3 })
    const qOmzet  = qF.reduce((s, f) => s + parseFloat(f.subtotal ?? '0'), 0)
    const qKosten = qB.reduce((s, b) => s + parseFloat(b.amount ?? '0'), 0)
    return { omzet: qOmzet, kosten: qKosten, winst: qOmzet - qKosten, btw: qF.reduce((s, f) => s + parseFloat(f.vatAmount ?? '0'), 0) }
  })

  const perMaand = Array.from({ length: 12 }, (_, i) => {
    const mF = factuurData.filter(f => f.status !== 'draft' && new Date(f.createdAt).getMonth() === i)
    const mB = bonData.filter(b => b.receiptDate && new Date(b.receiptDate).getMonth() === i)
    return {
      omzet:  mF.reduce((s, f) => s + parseFloat(f.subtotal ?? '0'), 0),
      kosten: mB.reduce((s, b) => s + parseFloat(b.amount ?? '0'), 0),
      btw:    mF.reduce((s, f) => s + parseFloat(f.vatAmount ?? '0'), 0),
    }
  })

  const element = React.createElement(JaaroverzichtPDF, {
    jaar,
    bedrijfsnaam: gebruikerData[0]?.companyName ?? 'Mijn bedrijf',
    omzet, kosten, winst: omzet - kosten, btw,
    kmZakelijk: kmZak,
    factuurAantal: factuurData.length,
    openstaand,
    perMaand,
    kostenPerCat,
    kwartalen,
  }) as ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>

  const pdf = await renderToBuffer(element)

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="fiscio-jaaroverzicht-${jaar}.pdf"`,
    },
  })
}
