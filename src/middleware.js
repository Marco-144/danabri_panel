import { NextResponse } from "next/server";

const PUBLIC_API_PATHS = new Set([
    "/api/auth/login",
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

export function middleware(request) {
    const { pathname } = request.nextUrl;

    if (!pathname.startsWith("/api")) {
        return NextResponse.next();
    }

    if (PUBLIC_API_PATHS.has(pathname)) {
        return NextResponse.next();
    }

    const authHeader = request.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Token requerido" }, { status: 401 });
    }

    const token = authHeader.slice(7).trim();
    const payload = decodeTokenPayload(token);

    if (!payload || typeof payload.exp !== "number") {
        return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    if (Date.now() >= payload.exp * 1000) {
        return NextResponse.json({ error: "Token expirado" }, { status: 401 });
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/api/:path*"],
};
