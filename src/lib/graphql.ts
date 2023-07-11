import { cookieJar, originalFetch } from "./fetch.ts";

const _tokens: { csrfToken?: string; xToken?: string; updated: number } = {
  updated: 0,
};

type Variables = {
  [key: string]: string | number | boolean | Variables;
};

export async function getTokens() {
  if (Date.now() - _tokens.updated <= 1000 * 60 * 60 * 3) return _tokens;

  const username = Deno.env.get("USERNAME");
  const password = Deno.env.get("PASSWORD");

  console.log("Updating tokens!");

  const res = await fetch("https://playentry.org");
  const text = await res.text();

  const __NEXT_DATA__ = /\<script id="__NEXT_DATA__".*\>((.|\n)+)\<\/script\>/.exec(text)?.[1];
  if (!__NEXT_DATA__) return _tokens;

  const parsedData = JSON.parse(__NEXT_DATA__);

  const csrfToken = parsedData.props.initialProps.csrfToken;
  const xToken = parsedData.props.initialState.common.user?.xToken;

  if (!xToken) {
    const res = await fetch("https://playentry.org/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken && { "CSRF-Token": csrfToken }),
      },
      body: JSON.stringify({
        query: `mutation ($username: String!, $password: String!) {
        signin: signinByUsername(username: $username, password: $password, rememberme: true) {
          id
          username
          nickname
        }
      }`,
        variables: { username, password },
      }),
    });
    const json = await res.json();
    if (!res.ok) return _tokens;
    if (!json.data.signin) return _tokens;
    return getTokens();
  }

  _tokens.csrfToken = csrfToken;
  _tokens.xToken = xToken;
  _tokens.updated = Date.now();

  return _tokens;
}

export async function graphql<T>(query: string, variables: Variables): Promise<T> {
  const tokens = await getTokens();

  const res = await fetch("https://playentry.org/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(tokens.csrfToken && { "csrf-token": tokens.csrfToken }),
      ...(tokens.xToken && { "x-token": tokens.xToken }),
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();

  return json.data;
}
