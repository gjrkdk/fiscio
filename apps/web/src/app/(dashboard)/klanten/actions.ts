'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { clients } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'

const klantSchema = z.object({
  name: z.string().min(1, 'Naam is verplicht'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  kvkNumber: z.string().optional(),
  btwNumber: z.string().optional(),
  notes: z.string().optional(),
})

async function getUserId() {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user.id
}

export async function klantToevoegen(formData: FormData) {
  const userId = await getUserId()

  const parsed = klantSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email') ?? '',
    address: formData.get('address') ?? undefined,
    kvkNumber: formData.get('kvkNumber') ?? undefined,
    btwNumber: formData.get('btwNumber') ?? undefined,
    notes: formData.get('notes') ?? undefined,
  })

  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message ?? 'Ongeldige invoer')

  await db.insert(clients).values({
    userId,
    ...parsed.data,
    email: parsed.data.email || null,
  })

  revalidatePath('/klanten')
  revalidatePath('/facturen/nieuw')
}

export async function klantUpdaten(klantId: string, formData: FormData) {
  const userId = await getUserId()

  const parsed = klantSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email') ?? '',
    address: formData.get('address') ?? undefined,
    kvkNumber: formData.get('kvkNumber') ?? undefined,
    btwNumber: formData.get('btwNumber') ?? undefined,
    notes: formData.get('notes') ?? undefined,
  })

  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message ?? 'Ongeldige invoer')

  await db
    .update(clients)
    .set({ ...parsed.data, email: parsed.data.email || null, updatedAt: new Date() })
    .where(and(eq(clients.id, klantId), eq(clients.userId, userId)))

  revalidatePath('/klanten')
  revalidatePath('/facturen/nieuw')
}

export async function klantVerwijderen(klantId: string) {
  const userId = await getUserId()

  await db
    .delete(clients)
    .where(and(eq(clients.id, klantId), eq(clients.userId, userId)))

  revalidatePath('/klanten')
}
