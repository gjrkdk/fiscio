import { z } from 'zod'
import { eq, desc } from 'drizzle-orm'
import { invoices, type NewInvoice, type InvoiceLineItem } from '@fiscio/db'
import { router, protectedProcedure } from '../trpc'

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  vatRate: z.number().min(0).max(100),
})

export const invoicesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(invoices)
      .where(eq(invoices.userId, ctx.userId))
      .orderBy(desc(invoices.createdAt))
  }),

  create: protectedProcedure
    .input(
      z.object({
        invoiceNumber: z.string().min(1),
        clientName: z.string().min(1),
        clientEmail: z.string().email().optional(),
        clientAddress: z.string().optional(),
        clientKvk: z.string().optional(),
        clientBtw: z.string().optional(),
        lineItems: z.array(lineItemSchema).min(1),
        dueDate: z.string().datetime().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const subtotal = input.lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      )
      const vatAmount = input.lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice * (item.vatRate / 100),
        0
      )
      const total = subtotal + vatAmount

      const newInvoice: NewInvoice = {
        ...input,
        userId: ctx.userId,
        subtotal: subtotal.toFixed(2),
        vatAmount: vatAmount.toFixed(2),
        total: total.toFixed(2),
        lineItems: input.lineItems as InvoiceLineItem[],
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      }

      const [invoice] = await ctx.db.insert(invoices).values(newInvoice).returning()
      return invoice
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['draft', 'sent', 'paid', 'overdue']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [invoice] = await ctx.db
        .update(invoices)
        .set({
          status: input.status,
          ...(input.status === 'sent' ? { sentAt: new Date() } : {}),
          ...(input.status === 'paid' ? { paidAt: new Date() } : {}),
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, input.id))
        .returning()
      return invoice
    }),
})
