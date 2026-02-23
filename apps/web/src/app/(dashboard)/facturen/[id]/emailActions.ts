'use server'

import { eq, and } from 'drizzle-orm'
import { invoices, users } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { renderToBuffer } from '@react-pdf/renderer'
import { FactuurPDF } from '@/lib/pdf/FactuurPDF'
import { Resend } from 'resend'
import type { InvoiceLineItem } from '@fiscio/db'

export async function factuurEmailVersturen(factuurId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')

  const [factuur] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, factuurId), eq(invoices.userId, user.id)))
    .limit(1)

  if (!factuur) throw new Error('Factuur niet gevonden')
  if (!factuur.clientEmail) throw new Error('Klant heeft geen e-mailadres')

  const [profiel] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  const apiKey = process.env['RESEND_API_KEY']
  if (!apiKey) throw new Error('RESEND_API_KEY niet geconfigureerd')

  const fromEmail = process.env['RESEND_FROM_EMAIL'] ?? 'facturen@fiscio.app'
  const afzenderNaam = profiel?.companyName ?? profiel?.fullName ?? 'Fiscio'

  // PDF genereren
  const pdfBuffer = await renderToBuffer(
    FactuurPDF({
      factuur: { ...factuur, lineItems: (factuur.lineItems ?? []) as InvoiceLineItem[] },
      profiel: profiel ?? null,
    })
  )

  const bedrag = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' })
    .format(parseFloat(factuur.total ?? '0'))

  const verval = factuur.dueDate
    ? new Date(factuur.dueDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-'

  const resend = new Resend(apiKey)

  await resend.emails.send({
    from: `${afzenderNaam} <${fromEmail}>`,
    to: factuur.clientEmail,
    subject: `Factuur ${factuur.invoiceNumber} — ${bedrag}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="color: #2563eb;">Factuur ${factuur.invoiceNumber}</h2>
        <p>Beste ${factuur.clientName},</p>
        <p>Bijgaand ontvang je factuur <strong>${factuur.invoiceNumber}</strong> voor een bedrag van <strong>${bedrag}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
          <tr style="background: #f9fafb;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;">Factuurnummer</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>${factuur.invoiceNumber}</strong></td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">Bedrag</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>${bedrag}</strong></td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;">Vervaldatum</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${verval}</td>
          </tr>
          ${profiel?.iban ? `<tr><td style="padding: 12px; border: 1px solid #e5e7eb;">IBAN</td><td style="padding: 12px; border: 1px solid #e5e7eb;">${profiel.iban}</td></tr>` : ''}
        </table>
        <p>Betaling graag o.v.v. factuurnummer <strong>${factuur.invoiceNumber}</strong>.</p>
        <p>Met vriendelijke groet,<br/><strong>${afzenderNaam}</strong></p>
      </div>
    `,
    attachments: [
      {
        filename: `factuur-${factuur.invoiceNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
  })

  // Status → verzonden
  await db
    .update(invoices)
    .set({ status: 'sent', sentAt: new Date(), updatedAt: new Date() })
    .where(eq(invoices.id, factuurId))

  revalidatePath(`/facturen/${factuurId}`)
  revalidatePath('/facturen')
}
