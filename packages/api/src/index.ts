import { router } from './trpc'
import { tripsRouter } from './routers/trips'
import { receiptsRouter } from './routers/receipts'
import { invoicesRouter } from './routers/invoices'

export { router, publicProcedure, protectedProcedure } from './trpc'
export type { Context } from './trpc'

export const appRouter = router({
  trips: tripsRouter,
  receipts: receiptsRouter,
  invoices: invoicesRouter,
})

export type AppRouter = typeof appRouter
