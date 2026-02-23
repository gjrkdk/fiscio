import { NextRequest, NextResponse } from 'next/server'
import { and, eq, isNull, lt, sql } from 'drizzle-orm'
import { invoices, users } from '@fiscio/db'
import { db } from '@/lib/db'
import { Resend } from 'resend'

// Vercel Cron stuurt automatisch Authorization: Bearer <CRON_SECRET>
function isBevoegd(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isBevoegd(req)) {
    return NextResponse.json({ error: 'Onbevoegd' }, { status: 401 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY niet geconfigureerd' }, { status: 500 })
  }

  const resend = new Resend(apiKey)
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'facturen@fiscio.app'

  // Facturen: status 'sent', verstuurd > 14 dagen geleden, nog geen herinnering
  const veertienDagenGeleden = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  const openFacturen = await db
    .select({
      id: invoices.id,
      userId: invoices.userId,
      invoiceNumber: invoices.invoiceNumber,
      clientName: invoices.clientName,
      clientEmail: invoices.clientEmail,
      total: invoices.total,
      dueDate: invoices.dueDate,
      sentAt: invoices.sentAt,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.status, 'sent'),
        isNull(invoices.reminderSentAt),
        lt(invoices.sentAt, veertienDagenGeleden)
      )
    )

  if (openFacturen.length === 0) {
    return NextResponse.json({ verzonden: 0, bericht: 'Geen openstaande facturen' })
  }

  // Per factuur: haal gebruikersprofiel op + stuur e-mail
  let verzonden = 0
  const fouten: string[] = []

  for (const factuur of openFacturen) {
    if (!factuur.clientEmail) continue

    try {
      const [profiel] = await db
        .select({ companyName: users.companyName, fullName: users.fullName, iban: users.iban })
        .from(users)
        .where(eq(users.id, factuur.userId))
        .limit(1)

      const afzenderNaam = profiel?.companyName ?? profiel?.fullName ?? 'Fiscio'
      const bedrag = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' })
        .format(parseFloat(factuur.total ?? '0'))
      const verval = factuur.dueDate
        ? new Date(factuur.dueDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
        : null
      const verstuurdOp = factuur.sentAt
        ? new Date(factuur.sentAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
        : '-'

      await resend.emails.send({
        from: `${afzenderNaam} <${fromEmail}>`,
        to: factuur.clientEmail,
        subject: `Betalingsherinnering — Factuur ${factuur.invoiceNumber}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
            <h2 style="color: #2563eb;">Betalingsherinnering</h2>
            <p>Beste ${factuur.clientName},</p>
            <p>Hierbij attenderen wij je vriendelijk op onderstaande openstaande factuur, 
               die op <strong>${verstuurdOp}</strong> is verstuurd en nog niet is voldaan.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
              <tr style="background: #f9fafb;">
                <td style="padding: 12px; border: 1px solid #e5e7eb;">Factuurnummer</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>${factuur.invoiceNumber}</strong></td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">Openstaand bedrag</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong style="color: #dc2626;">${bedrag}</strong></td>
              </tr>
              ${verval ? `<tr style="background: #f9fafb;"><td style="padding: 12px; border: 1px solid #e5e7eb;">Vervaldatum</td><td style="padding: 12px; border: 1px solid #e5e7eb;">${verval}</td></tr>` : ''}
              ${profiel?.iban ? `<tr><td style="padding: 12px; border: 1px solid #e5e7eb;">IBAN</td><td style="padding: 12px; border: 1px solid #e5e7eb;">${profiel.iban}</td></tr>` : ''}
            </table>
            <p>Mocht je de betaling al hebben voldaan, dan kun je deze herinnering uiteraard negeren.</p>
            <p>Heb je vragen over deze factuur? Neem dan gerust contact met ons op.</p>
            <p>Met vriendelijke groet,<br/><strong>${afzenderNaam}</strong></p>
          </div>
        `,
      })

      // reminder_sent_at bijwerken
      await db
        .update(invoices)
        .set({ reminderSentAt: new Date() })
        .where(eq(invoices.id, factuur.id))

      verzonden++
    } catch (e) {
      fouten.push(`${factuur.invoiceNumber}: ${e instanceof Error ? e.message : 'onbekende fout'}`)
    }
  }

  return NextResponse.json({
    verzonden,
    totaalGevonden: openFacturen.length,
    fouten: fouten.length > 0 ? fouten : undefined,
  })
}
