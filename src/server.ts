import { load } from 'dotenv';
import { serve } from 'http';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { type AppRouter, appRouter } from './router.ts';

function handler(req: Request) {
  if (req.method === 'HEAD') return new Response();

  return fetchRequestHandler<AppRouter>({
    endpoint: '/trpc',
    req,
    router: appRouter,
    createContext: () => ({}),
  });
}

if (!Deno.env.get('DENO_DEPLOYMENT_ID')) await load({ export: true });
const port = parseInt(Deno.env.get('PORT') ?? '4000');

serve(handler, { port });
