'use server'

import { db } from '@/lib/db'
import { users } from '@fiscio/db'
import { eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function slaUrenOp(uren: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await db
    .update(users)
    .set({ urenHuidigJaar: uren, updatedAt: new Date() })
    .where(eq(users.id, user.id))

  revalidatePath('/belastingtips')
}
