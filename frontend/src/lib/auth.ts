const TOKEN_KEY = "careeros_token";

function decodeExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export function isExpired(): boolean {
  const token = getToken();
  if (!token) return true;
  const exp = decodeExp(token);
  if (exp === null) return true;
  return exp * 1000 < Date.now();
}

export function isAuthenticated(): boolean {
  return !!getToken() && !isExpired();
}
