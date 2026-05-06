import React from "react";

export default function Card({ children, className = "" }) {
    return <section className={`p-6 rounded-2xl shadow-card border border-border ${className}`}>{children}</section>;
}
