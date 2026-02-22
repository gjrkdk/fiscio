import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '@fiscio/api'
import { db } from '@fiscio/db'
import { createClient } from '@/lib/supabase/server'

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async () => {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      return {
        db,
        userId: user?.id ?? null,
      }
    },
  })

export { handler as GET, handler as POST }
