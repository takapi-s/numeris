import { createCookieSessionStorage } from "react-router";

type SessionData = {
  playerId?: string;
  displayName?: string;
};

const sessionStorage = createCookieSessionStorage<SessionData>({
  cookie: {
    name: "__numeris",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: ["dev-secret-change-me"],
    secure: false,
  },
});

export async function getSession(request: Request) {
  return sessionStorage.getSession(request.headers.get("Cookie"));
}

export function commitSession(session: Awaited<ReturnType<typeof getSession>>) {
  return sessionStorage.commitSession(session);
}

export function destroySession(session: Awaited<ReturnType<typeof getSession>>) {
  return sessionStorage.destroySession(session);
}

