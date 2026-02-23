'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { receipts } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

const bonSchema = z.object({
  vendor: z.string().min(1, 'Leverancier is verplicht'),
  amount: z.coerce.number().positive('Bedrag moet positief zijn'),
  vatRate: z.coerce.number().min(0).max(100),
  category: z.string().min(1, 'Categorie is verplicht'),
  description: z.string().optional(),
  receiptDate: z.string().min(1, 'Datum is verplicht'),
})

async function getUserId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user.id
}

export async function bonToevoegen(formData: FormData) {
  const userId = await getUserId()

  const parsed = bonSchema.safeParse({
    vendor: formData.get('vendor'),
    amount: formData.get('amount'),
    vatRate: formData.get('vatRate'),
    category: formData.get('category'),
    description: formData.get('description') ?? undefined,
    receiptDate: formData.get('receiptDate'),
  })

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? 'Ongeldige invoer')
  }

  const { vendor, amount, vatRate, category, description, receiptDate } = parsed.data
  const vatAmount = +(amount * vatRate / 100).toFixed(2)

  await db.insert(receipts).values({
    userId,
    vendor,
    amount: amount.toString(),
    vatRate: vatRate.toString(),
    vatAmount: vatAmount.toString(),
    category,
    description: description ?? null,
    receiptDate: new Date(receiptDate),
  })

  revalidatePath('/kosten')
}

export async function bonVerwijderen(bonId: string) {
  const userId = await getUserId()

  await db
    .delete(receipts)
    .where(and(eq(receipts.id, bonId), eq(receipts.userId, userId)))

  revalidatePath('/kosten')
}
