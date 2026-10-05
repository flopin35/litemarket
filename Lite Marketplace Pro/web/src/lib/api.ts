/**
 * API client. Keeps the short-lived access token in memory, refreshes it with the HttpOnly
 * cookie when it expires, and turns error responses into ApiError with a readable message.
 * In demo mode every call is answered by the in-browser mock in ./demo.
 */
import { API_URL, DEMO_MODE } from "../config";
import type { AuthResponse } from "./types";

export class ApiError extends Error {
  status: number;
  code: string;
  fields: Record<string, string>;

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

let accessToken: string | null = null;
let refreshing: Promise<AuthResponse | null> | null = null;
const listeners = new Set<(auth: AuthResponse | null) => void>();

export function setAccessToken(token: string | null) {
  accessToken = token;
}

/** Auth changes made by the client itself (refresh failed => logged out). */
export function onAuthChange(fn: (auth: AuthResponse | null) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function raw(method: Method, path: string, body?: unknown, form?: FormData): Promise<Response> {
  if (DEMO_MODE) {
    const { mockFetch } = await import("./demo/mockApi");
    return mockFetch(method, path, body, form, accessToken);
  }
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (body !== undefined && !form) headers["Content-Type"] = "application/json";
  return fetch(API_URL + path, {
    method,
    headers,
    credentials: "include",
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error ?? "ERROR",
      data?.message || (res.status >= 500 ? "The server had a problem. Please try again." : "Something went wrong."),
      data?.fields ?? {},
    );
  }
  return data as T;
}

async function request<T>(method: Method, path: string, body?: unknown, form?: FormData): Promise<T> {
  let res: Response;
  try {
    res = await raw(method, path, body, form);
  } catch {
    throw new ApiError(0, "NETWORK", "Can't reach the server. Check your connection and try again.");
  }
  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    const renewed = await refreshSession();
    if (renewed) {
      res = await raw(method, path, body, form);
    }
  }
  return parse<T>(res);
}

/** Uses the refresh cookie to get a new access token. Only one refresh runs at a time. */
export function refreshSession(): Promise<AuthResponse | null> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await raw("POST", "/api/auth/refresh");
        if (!res.ok) {
          setAccessToken(null);
          listeners.forEach((l) => l(null));
          return null;
        }
        const auth = (await res.json()) as AuthResponse;
        setAccessToken(auth.accessToken);
        listeners.forEach((l) => l(auth));
        return auth;
      } catch {
        return null;
      } finally {
        setTimeout(() => (refreshing = null), 0);
      }
    })();
  }
  return refreshing;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  del: <T = void>(path: string) => request<T>("DELETE", path),
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ url: string }>("POST", "/api/uploads", undefined, form);
  },
};

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}
