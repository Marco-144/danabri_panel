"use client";
import Sidebar from "./sidebar";

export default function DashboardLayout({ children }) {
    return (
        <div className="flex bg-primary min-h-screen">
            <Sidebar />

            <main className="flex-1 min-w-0 bg-gray-100 min-h-screen p-6 overflow-x-hidden">
                {children}
            </main>
        </div>
    )
}