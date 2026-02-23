'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { eq, and, count } from 'drizzle-orm'
import { invoices } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import type { InvoiceLineItem } from '@fiscio/db'

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().positive(),
  vatRate: z.coerce.number().min(0).max(100),
})

const factuurSchema = z.object({
  clientName: z.string().min(1, 'Klantnaam is verplicht'),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientAddress: z.string().optional(),
  clientKvk: z.string().optional(),
  clientBtw: z.string().optional(),
  invoiceDate: z.string().min(1, 'Factuurdatum is verplicht'),
  dueDate: z.string().min(1, 'Vervaldatum is verplicht'),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, 'Voeg minimaal één regel toe'),
})

async function getUserId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user.id
}

function generateInvoiceNumber(year: number, seq: number) {
  return `${year}-${String(seq).padStart(4, '0')}`
}

function calcTotals(lineItems: InvoiceLineItem[]) {
  let subtotal = 0
  let vatAmount = 0
  for (const item of lineItems) {
    const lineTotal = item.quantity * item.unitPrice
    subtotal += lineTotal
    vatAmount += lineTotal * item.vatRate / 100
  }
  return {
    subtotal: +subtotal.toFixed(2),
    vatAmount: +vatAmount.toFixed(2),
    total: +(subtotal + vatAmount).toFixed(2),
  }
}

export async function factuurAanmaken(formData: FormData) {
  const userId = await getUserId()

  // Parse line items from JSON string
  let lineItemsRaw: unknown
  try {
    lineItemsRaw = JSON.parse(formData.get('lineItems') as string)
  } catch {
    throw new Error('Ongeldige regelitems')
  }

  const parsed = factuurSchema.safeParse({
    clientName: formData.get('clientName'),
    clientEmail: formData.get('clientEmail') ?? '',
    clientAddress: formData.get('clientAddress') ?? undefined,
    clientKvk: formData.get('clientKvk') ?? undefined,
    clientBtw: formData.get('clientBtw') ?? undefined,
    invoiceDate: formData.get('invoiceDate'),
    dueDate: formData.get('dueDate'),
    notes: formData.get('notes') ?? undefined,
    lineItems: lineItemsRaw,
  })

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? 'Ongeldige invoer')
  }

  const { clientName, clientEmail, clientAddress, clientKvk, clientBtw, invoiceDate, dueDate, notes, lineItems } = parsed.data

  // Factuurnummer genereren
  const countResult = await db
    .select({ totaal: count() })
    .from(invoices)
    .where(eq(invoices.userId, userId))

  const aantalFacturen = countResult[0]?.totaal ?? 0
  const jaar = new Date(invoiceDate).getFullYear()
  const invoiceNumber = generateInvoiceNumber(jaar, aantalFacturen + 1)

  const { subtotal, vatAmount, total } = calcTotals(lineItems as InvoiceLineItem[])

  await db.insert(invoices).values({
    userId,
    invoiceNumber,
    clientName,
    clientEmail: clientEmail || null,
    clientAddress: clientAddress ?? null,
    clientKvk: clientKvk ?? null,
    clientBtw: clientBtw ?? null,
    subtotal: subtotal.toString(),
    vatAmount: vatAmount.toString(),
    total: total.toString(),
    status: 'draft',
    dueDate: new Date(dueDate),
    lineItems: lineItems as InvoiceLineItem[],
    notes: notes ?? null,
    createdAt: new Date(invoiceDate),
  })

  revalidatePath('/facturen')
  redirect('/facturen')
}

export async function factuurStatusUpdaten(factuurId: string, status: 'draft' | 'sent' | 'paid') {
  const userId = await getUserId()

  const extra: Record<string, Date> = {}
  if (status === 'sent') extra.sentAt = new Date()
  if (status === 'paid') extra.paidAt = new Date()

  await db
    .update(invoices)
    .set({ status, updatedAt: new Date(), ...extra })
    .where(and(eq(invoices.id, factuurId), eq(invoices.userId, userId)))

  revalidatePath('/facturen')
  revalidatePath(`/facturen/${factuurId}`)
}

export async function factuurVerwijderen(factuurId: string) {
  const userId = await getUserId()

  await db
    .delete(invoices)
    .where(and(eq(invoices.id, factuurId), eq(invoices.userId, userId)))

  revalidatePath('/facturen')
  redirect('/facturen')
}
