import React from "react";

export default function PageTitle({ title, subtitle, icon: Icon, breadcrumb, actions }) {
    return (
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <div>
                {breadcrumb ? <p className="text-sm text-muted">{breadcrumb}</p> : null}
                <h1 className="text-2xl font-semibold text-primary flex items-center gap-2">
                    {Icon ? <Icon size={22} /> : null}
                    {title}
                </h1>
                {subtitle ? <p className="text-sm text-muted mt-1">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
    );
}
