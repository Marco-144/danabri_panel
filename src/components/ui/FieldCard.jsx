import React from "react";

export default function FieldCard({ label, value }) {
    return (
        <article className="rounded-xl border border-border bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-muted mb-2">{label}</p>
            <p className="text-sm font-medium text-primary">{value || "-"}</p>
        </article>
    );
}
