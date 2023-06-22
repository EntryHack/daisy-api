import { initTRPC } from '@trpc/server';
import z from 'zod';

const { procedure, router } = initTRPC.create();

export const appRouter = router({
  test: procedure
    .input(z.object({ test: z.string() }))
    .query(async ({ input: { test } }) => {
      return test;
    }),
});

export type AppRouter = typeof appRouter;
