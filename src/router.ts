import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import stickers from './stickers/stickers.ts';
import { graphql } from './lib/graphql.ts';

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

      const pageStickers: (Omit<
        typeof stickers[number],
        'authors' | 'images'
      > & {
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
            images: undefined,
          };
        });

      return pageStickers;
    }),
  getSticker: procedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input: { id } }) => {
      const sticker = stickers.find((sticker) => sticker.id === id);
      if (!sticker) return undefined;

      const authors = [...new Set(sticker.authors)];
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

      const pageSticker: Omit<typeof stickers[number], 'authors'> & {
        authors: { id: string; name: string }[];
      } = {
        ...sticker,
        authors: sticker.authors.map((author) => ({
          id: author,
          name: nicknames[author],
        })),
      };

      return pageSticker;
    }),
  getNickname: procedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input: { id } }) => {
      const data = await graphql<{ id?: { nickname: string } }>(
        `query ($id: String) {
  id: userstatus(id: $id) {
    nickname
  }
}`,
        {
          id,
        },
      );

      return data.id?.nickname;
    }),
});

export type AppRouter = typeof appRouter;
