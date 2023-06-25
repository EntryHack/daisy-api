import { load } from 'dotenv';
import { serve } from 'http';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { type AppRouter, appRouter } from './router.ts';
import { getCSRFToken } from './lib/graphql.ts';

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://172.30.1.42:3000',
  'https://daisy.lol',
];

function handler(req: Request) {
  if (['HEAD', 'OPTIONS'].includes(req.method))
    return Promise.resolve(new Response());

  return fetchRequestHandler<AppRouter>({
    endpoint: '/trpc',
    req,
    router: appRouter,
    createContext: () => ({}),
  });
}

if (!Deno.env.get('DENO_DEPLOYMENT_ID')) await load({ export: true });
const port = parseInt(Deno.env.get('PORT') ?? '4000');

await getCSRFToken();

serve(
  (req) =>
    handler(req).then((res: Response) => {
      if (allowedOrigins.includes(req.headers.get('Origin')!)) {
        res.headers.append(
          'Access-Control-Allow-Origin',
          req.headers.get('Origin')!,
        );
        res.headers.append('Access-Control-Allow-Headers', '*');
      }
      return res;
    }),
  { port },
);
