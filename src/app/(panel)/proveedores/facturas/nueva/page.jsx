"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Loader } from "lucide-react";
import FacturaFormView from "../FacturaFormView";

export default function NuevaFacturaPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader className="animate-spin text-primary" /></div>}>
            <NuevaFacturaContent />
        </Suspense>
    );
}

function NuevaFacturaContent() {
    const searchParams = useSearchParams();
    return <FacturaFormView idOrdenCompra={searchParams.get("id_orden_compra") || ""} />;
}
