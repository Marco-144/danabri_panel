"use client";

export default function StatKpiCard({
    icon,
    title,
    value,
    hint,
    tone = "default",
}) {
    const toneClasses = {
        default: "bg-primary/10 text-primary",
        success: "bg-emerald-100 text-emerald-700",
        warning: "bg-yellow-100 text-yellow-700",
        danger: "bg-red-100 text-red-700",
        info: "bg-blue-100 text-blue-700",
    };

    return (
        <div className="bg-white rounded-2xl shadow-card border border-border p-5 flex items-center gap-4">
            <div className={`rounded-xl p-3 ${toneClasses[tone] || toneClasses.default}`}>
                {icon}
            </div>
            <div>
                <p className="text-xs text-muted">{title}</p>
                <p className="text-xl font-bold text-primary mt-0.5">{value}</p>
                {hint ? <p className="text-xs text-muted mt-0.5">{hint}</p> : null}
            </div>
        </div>
    );
}
