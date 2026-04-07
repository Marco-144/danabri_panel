import React from "react";

export default function Input({
    label,
    error,
    className = "",
    inputClassName = "",
    id,
    ...props
}) {
    return (
        <div className={className}>
            {label ? <label htmlFor={id || props.name} className="text-sm text-muted block mb-1">{label}</label> : null}
            <input
                id={id || props.name}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm bg-background/40 focus:outline-none focus:ring-2 ${error ? "border-red-300 focus:ring-red-200" : "border-border focus:ring-secondary"} ${inputClassName}`}
                {...props}
            />
            {error ? <p className="text-red-600 text-xs mt-1">{error}</p> : null}
        </div>
    );
}
