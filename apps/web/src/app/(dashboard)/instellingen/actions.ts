'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { users } from '@fiscio/db'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

const instellingenSchema = z.object({
  fullName: z.string().min(1, 'Naam is verplicht'),
  companyName: z.string().optional(),
  kvkNumber: z.string().optional(),
  btwNumber: z.string().optional(),
  iban: z.string().optional(),
  address: z.string().optional(),
  zipCode: z.string().optional(),
  city: z.string().optional(),
})

export async function instellingenOpslaan(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const parsed = instellingenSchema.safeParse({
    fullName: formData.get('fullName'),
    companyName: formData.get('companyName') || undefined,
    kvkNumber: formData.get('kvkNumber') || undefined,
    btwNumber: formData.get('btwNumber') || undefined,
    iban: formData.get('iban') || undefined,
    address: formData.get('address') || undefined,
    zipCode: formData.get('zipCode') || undefined,
    city: formData.get('city') || undefined,
  })

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? 'Ongeldige invoer')
  }

  await db
    .insert(users)
    .values({
      id: user.id,
      email: user.email!,
      ...parsed.data,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        ...parsed.data,
        updatedAt: new Date(),
      },
    })

  revalidatePath('/instellingen')
}
