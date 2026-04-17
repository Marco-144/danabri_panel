import { NextResponse } from "next/server";

// Rutas de API que no requiere token
const PUBLIC_API_PATHS = new Set([
    "/api/auth/login",
]);

// Rutas de página que NO requieren sesión
const PUBLIC_PAGE_PATHS = new Set([
    "/login",
    "/"
]);

function decodeTokenPayload(token) {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;

        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
}

function isTokenValid(token) {
    if (!token) return false;
    const payload = decodeTokenPayload(token);
    if (!payload || typeof payload.exp !== "number") return false;
    return Date.now() < payload.exp * 1000;
}

function getRequestToken(request) {
    const authHeader = request.headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
        return authHeader.slice(7).trim();
    }

    return request.cookies.get("auth_token")?.value || "";
}

export function middleware(request) {
    const { pathname } = request.nextUrl;

    // ── Rutas de API ───────────────────────────────
    if (pathname.startsWith("/api")) {
        if (PUBLIC_API_PATHS.has(pathname)) return NextResponse.next();

        const token = getRequestToken(request);
        if (!token) {
            return NextResponse.json({ error: "Token requerido" }, { status: 401 });
        }

        if (!isTokenValid(token)) {
            return NextResponse.json({ error: "Token expirado" }, { status: 401 });
        }

        return NextResponse.next();
    }

    // ── Rutas de página ────────────────────────────────
    const isPublicPage = PUBLIC_PAGE_PATHS.has(pathname);

    if (!isPublicPage) {
        const tokenCookie = request.cookies.get("auth_token")?.value;
        if (!isTokenValid(tokenCookie)) {
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set("redirect", pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    // Si ya tiene sesión e intenta ir a /login, redirigir al dashboard
    if (pathname === "/login") {
        const tokenCookie = request.cookies.get("auth_token")?.value;
        if (isTokenValid(tokenCookie)) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
    ],
};
