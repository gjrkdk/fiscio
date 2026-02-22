import { z } from 'zod'
import { eq, desc } from 'drizzle-orm'
import { receipts, type NewReceipt } from '@fiscio/db'
import { router, protectedProcedure } from '../trpc'

export const receiptsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(receipts)
      .where(eq(receipts.userId, ctx.userId))
      .orderBy(desc(receipts.createdAt))
  }),

  create: protectedProcedure
    .input(
      z.object({
        vendor: z.string().optional(),
        amount: z.string().optional(),
        vatAmount: z.string().optional(),
        vatRate: z.string().optional(),
        category: z.string().optional(),
        description: z.string().optional(),
        receiptDate: z.string().datetime().optional(),
        imageUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const newReceipt: NewReceipt = {
        ...input,
        userId: ctx.userId,
        receiptDate: input.receiptDate ? new Date(input.receiptDate) : undefined,
      }
      const [receipt] = await ctx.db.insert(receipts).values(newReceipt).returning()
      return receipt
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(receipts)
        .where(eq(receipts.id, input.id))
      return { success: true }
    }),
})
