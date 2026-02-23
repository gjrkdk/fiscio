'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { trips } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

const ritSchema = z.object({
  description: z.string().min(1, 'Omschrijving is verplicht'),
  startAddress: z.string().min(1, 'Vertrekadres is verplicht'),
  endAddress: z.string().min(1, 'Aankomstadres is verplicht'),
  distanceKm: z.coerce.number().positive('Afstand moet positief zijn'),
  date: z.string().min(1, 'Datum is verplicht'),
  isBusinessTrip: z.coerce.boolean().default(true),
  notes: z.string().optional(),
})

async function getUserId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user.id
}

export async function ritToevoegen(formData: FormData) {
  const userId = await getUserId()

  const parsed = ritSchema.safeParse({
    description: formData.get('description'),
    startAddress: formData.get('startAddress'),
    endAddress: formData.get('endAddress'),
    distanceKm: formData.get('distanceKm'),
    date: formData.get('date'),
    isBusinessTrip: formData.get('isBusinessTrip') === 'true',
    notes: formData.get('notes') ?? undefined,
  })

  if (!parsed.success) {
    // In een echte app: return errors naar client
    throw new Error(parsed.error.errors[0]?.message ?? 'Ongeldige invoer')
  }

  const { description, startAddress, endAddress, distanceKm, date, isBusinessTrip, notes } = parsed.data
  const startedAt = new Date(date)
  const endedAt = new Date(date)
  endedAt.setHours(23, 59, 59)

  await db.insert(trips).values({
    userId,
    description,
    startAddress,
    endAddress,
    distanceKm: distanceKm.toString(),
    startedAt,
    endedAt,
    isBusinessTrip,
    notes: notes ?? null,
  })

  revalidatePath('/ritten')
}

export async function ritVerwijderen(ritId: string) {
  const userId = await getUserId()

  await db
    .delete(trips)
    .where(and(eq(trips.id, ritId), eq(trips.userId, userId)))

  revalidatePath('/ritten')
}
