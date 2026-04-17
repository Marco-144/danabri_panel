const TOKEN_KEY = "token";
const TOKEN_COOKIE = "auth_token";

function decodeJwtPayload(token) {
    try {
        const payloadBase64 = token.split(".")[1];
        if (!payloadBase64) return null;

        const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
        const decoded = JSON.parse(atob(padded));
        return decoded;
    } catch {
        return null;
    }
}

function syncAuthCookie(token) {
    if (typeof document === "undefined") return;

    if (!token) {
        document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
        return;
    }

    const expirationMs = getTokenExpirationMs(token);
    const maxAgeSeconds = expirationMs ? Math.max(0, Math.floor((expirationMs - Date.now()) / 1000)) : 60 * 60 * 8;
    document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function getAuthToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
}

export function getAuthUserFromToken(token) {
    const payload = decodeJwtPayload(token);
    if (!payload) return null;

    return {
        id: payload.id ?? null,
        nombre: payload.nombre ?? null,
    };
}

export function saveAuthToken(token) {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, token);
    syncAuthCookie(token);
}

export function clearAuthToken() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
    syncAuthCookie(null);
}

export function logout() {
    clearAuthToken();
}

export function getTokenExpirationMs(token) {
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return 0;
    return Number(payload.exp) * 1000;
}

export function isTokenExpired(token) {
    const expirationMs = getTokenExpirationMs(token);
    if (!expirationMs) return true;
    return Date.now() >= expirationMs;
}

export const login = async (nombre, password) => {
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nombre, password }),
    });

    return res.json();
};