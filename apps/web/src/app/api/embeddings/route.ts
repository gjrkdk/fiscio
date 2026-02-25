import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trips, receipts, invoices } from '@fiscio/db'
import { isNull, eq } from 'drizzle-orm'
import { genereerEmbedding, ritNaarTekst, bonNaarTekst, factuurNaarTekst } from '@/lib/embeddings'

// GET: Vercel cron job
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Onbevoegd' }, { status: 401 })
  }
  return backfill()
}

// POST: handmatig triggeren
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Onbevoegd' }, { status: 401 })
  }
  return backfill()
}

async function backfill() {

  let ingebed = 0
  let fouten = 0

  // ─── Ritten zonder embedding ────────────────────────────────────────────
  const openRitten = await db.select().from(trips).where(isNull(trips.embedding)).limit(50)
  for (const rit of openRitten) {
    try {
      const tekst = ritNaarTekst(rit)
      const embedding = await genereerEmbedding(tekst)
      await db.update(trips).set({ embedding }).where(eq(trips.id, rit.id))
      ingebed++
    } catch {
      fouten++
    }
  }

  // ─── Bonnetjes zonder embedding ─────────────────────────────────────────
  const openBonnen = await db.select().from(receipts).where(isNull(receipts.embedding)).limit(50)
  for (const bon of openBonnen) {
    try {
      const tekst = bonNaarTekst(bon)
      if (!tekst.trim()) continue
      const embedding = await genereerEmbedding(tekst)
      await db.update(receipts).set({ embedding }).where(eq(receipts.id, bon.id))
      ingebed++
    } catch {
      fouten++
    }
  }

  // ─── Facturen zonder embedding ──────────────────────────────────────────
  const openFacturen = await db.select().from(invoices).where(isNull(invoices.embedding)).limit(50)
  for (const factuur of openFacturen) {
    try {
      const tekst = factuurNaarTekst({
        ...factuur,
        lineItems: factuur.lineItems as Array<{ description: string }> | null,
      })
      const embedding = await genereerEmbedding(tekst)
      await db.update(invoices).set({ embedding }).where(eq(invoices.id, factuur.id))
      ingebed++
    } catch {
      fouten++
    }
  }

  const nogOpen = openRitten.length + openBonnen.length + openFacturen.length - ingebed
  return NextResponse.json({
    ingebed,
    fouten,
    nogOpen,
    klaar: nogOpen === 0 && fouten === 0,
  })
}
