import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { invoices, users } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { FactuurPDF } from '@/lib/pdf/FactuurPDF'
import type { InvoiceLineItem } from '@fiscio/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [factuur] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, user.id)))
    .limit(1)

  if (!factuur) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [profiel] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  const pdfBuffer = await renderToBuffer(
    FactuurPDF({
      factuur: {
        ...factuur,
        lineItems: (factuur.lineItems ?? []) as InvoiceLineItem[],
      },
      profiel: profiel ?? null,
    })
  )

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="factuur-${factuur.invoiceNumber}.pdf"`,
    },
  })
}
