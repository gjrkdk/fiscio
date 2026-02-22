import { z } from 'zod'
import { eq, desc } from 'drizzle-orm'
import { trips, type NewTrip } from '@fiscio/db'
import { router, protectedProcedure } from '../trpc'

export const tripsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(trips)
      .where(eq(trips.userId, ctx.userId))
      .orderBy(desc(trips.startedAt))
  }),

  create: protectedProcedure
    .input(
      z.object({
        description: z.string().min(1),
        startAddress: z.string().min(1),
        endAddress: z.string().min(1),
        distanceKm: z.string(),
        startedAt: z.string().datetime(),
        endedAt: z.string().datetime(),
        isBusinessTrip: z.boolean().default(true),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const newTrip: NewTrip = {
        ...input,
        userId: ctx.userId,
        startedAt: new Date(input.startedAt),
        endedAt: new Date(input.endedAt),
      }
      const [trip] = await ctx.db.insert(trips).values(newTrip).returning()
      return trip
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(trips)
        .where(eq(trips.id, input.id))
      return { success: true }
    }),
})
