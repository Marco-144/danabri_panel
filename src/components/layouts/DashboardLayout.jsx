"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./sidebar";
import { clearAuthToken, getAuthToken, getTokenExpirationMs, isTokenExpired } from "@/services/auth";

export default function DashboardLayout({ children }) {
    const router = useRouter();
    const [sessionReady, setSessionReady] = useState(false);

    useEffect(() => {
        let timeoutId;
        const originalFetch = window.fetch.bind(window);

        const redirectToLogin = (expired = false) => {
            clearAuthToken();
            router.replace(expired ? "/login?expired=1" : "/login");
        };

        const validateAndScheduleExpiration = () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            const token = getAuthToken();
            if (!token) {
                setSessionReady(false);
                redirectToLogin(false);
                return;
            }

            if (isTokenExpired(token)) {
                setSessionReady(false);
                redirectToLogin(true);
                return;
            }

            const expirationMs = getTokenExpirationMs(token);
            const remainingMs = Math.max(0, expirationMs - Date.now());

            timeoutId = window.setTimeout(() => {
                setSessionReady(false);
                redirectToLogin(true);
            }, remainingMs);

            setSessionReady(true);
        };

        window.fetch = async (input, init = {}) => {
            const token = getAuthToken();
            const requestUrl = typeof input === "string" ? input : input?.url || "";
            const isApiRequest = requestUrl.startsWith("/api") || requestUrl.includes("/api/");

            const headers = new Headers(init.headers || (typeof input !== "string" ? input.headers : undefined));

            if (isApiRequest && token && !headers.has("Authorization")) {
                headers.set("Authorization", `Bearer ${token}`);
            }

            const response = await originalFetch(input, { ...init, headers });

            if (isApiRequest && response.status === 401) {
                setSessionReady(false);
                redirectToLogin(true);
            }

            return response;
        };

        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                validateAndScheduleExpiration();
            }
        };

        const onStorage = (event) => {
            if (event.key === "token") {
                validateAndScheduleExpiration();
            }
        };

        validateAndScheduleExpiration();
        document.addEventListener("visibilitychange", onVisibilityChange);
        window.addEventListener("storage", onStorage);

        return () => {
            window.fetch = originalFetch;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            document.removeEventListener("visibilitychange", onVisibilityChange);
            window.removeEventListener("storage", onStorage);
        };
    }, [router]);

    if (!sessionReady) {
        return null;
    }

    return (
        <div className="flex bg-primary min-h-screen">
            <Sidebar />

            <main className="flex-1 min-w-0 bg-gray-100 min-h-screen p-6 overflow-x-hidden">
                {children}
            </main>
        </div>
    )
}