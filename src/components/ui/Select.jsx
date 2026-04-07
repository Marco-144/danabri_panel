import React from "react";

export default function Select({
    label,
    error,
    options = [],
    placeholder = "Seleccionar",
    className = "",
    selectClassName = "",
    id,
    ...props
}) {
    return (
        <div className={className}>
            {label ? <label htmlFor={id || props.name} className="text-sm text-muted block mb-1">{label}</label> : null}
            <select
                id={id || props.name}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm bg-background/40 focus:outline-none focus:ring-2 ${error ? "border-red-300 focus:ring-red-200" : "border-border focus:ring-secondary"} ${selectClassName}`}
                {...props}
            >
                <option value="">{placeholder}</option>
                {options.map((opt) => (
                    <option key={String(opt.value)} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {error ? <p className="text-red-600 text-xs mt-1">{error}</p> : null}
        </div>
    );
}
