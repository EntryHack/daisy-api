import { wrapFetch } from 'another_cookiejar';

const _csrfToken: { value?: string; updated: number } = { updated: 0 };

type Variables = {
  [key: string]: string | number | boolean | Variables;
};

const fetch = wrapFetch();

export async function getCSRFToken() {
  if (Date.now() - _csrfToken.updated <= 1000 * 60 * 60 * 3)
    return _csrfToken.value;

  console.log('Updating CSRF Token!');

  const res = await fetch('https://playentry.org');
  const text = await res.text();

  _csrfToken.value =
    (/<meta[^>]*?content=(["\'])?((?:.(?!\1|>))*.?)\1?/.exec(text) ?? [])[2] ??
    '';
  _csrfToken.updated = Date.now();

  return _csrfToken.value;
}

export async function graphql<T>(
  query: string,
  variables: Variables,
): Promise<T> {
  const csrfToken = await getCSRFToken();

  const res = await fetch('https://playentry.org/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken && { 'CSRF-Token': csrfToken }),
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();

  return json.data;
}
