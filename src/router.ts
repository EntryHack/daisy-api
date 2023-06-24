import { initTRPC } from 'npm:@trpc/server';
import z from 'npm:zod';
import stickers from '~/stickers/stickers.json' assert { type: 'json' };
import { graphql } from '~/lib/graphql.ts';

stickers.sort((a, b) => a.date - b.date);
const { procedure, router } = initTRPC.create();

export const appRouter = router({
  getStickers: procedure
    .input(z.object({ display: z.number(), page: z.number() }))
    .query(async ({ input: { display, page } }) => {
      const authors = [
        ...new Set(
          stickers
            .slice((page - 1) * display, page * display)
            .flatMap((sticker) => sticker.authors),
        ),
      ];
      const query = `query (${authors
        .map((author) => {
          return `$id${author}: String`;
        })
        .join(', ')}) {
  ${authors
    .map((author) => {
      return `id${author}: userstatus(id: $id${author}) { nickname }`;
    })
    .join('\n  ')}
}`;

      const data = await graphql<{ [key: string]: { nickname: string } }>(
        query,
        Object.fromEntries(
          authors.map((author) => {
            return [`id${author}`, author];
          }),
        ),
      );
      const nicknames = Object.entries(data).reduce((prev, curr) => {
        prev[curr[0].slice(2)] = curr[1].nickname;
        return prev;
      }, {} as { [key: string]: string });

      const pageStickers: (Omit<typeof stickers[number], 'authors'> & {
        authors: { id: string; name: string }[];
      })[] = stickers
        .slice((page - 1) * display, page * display)
        .map((sticker) => {
          return {
            ...sticker,
            authors: sticker.authors.map((author) => ({
              id: author,
              name: nicknames[author],
            })),
          };
        });

      return pageStickers;
    }),
});

export type AppRouter = typeof appRouter;
