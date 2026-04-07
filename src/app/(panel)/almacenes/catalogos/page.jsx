import { Warehouse } from "lucide-react";
import PageTitle from "@/components/ui/PageTitle";
import AlmacenesCatalogo from "../AlmacenesCatalogo";

export default function AlmacenesCatalogosPage() {
    return (
        <div className="space-y-4">
            <PageTitle title="Almacenes" subtitle="Control de inventario, movimientos y alertas." icon={Warehouse} />
            <AlmacenesCatalogo />
        </div>
    );
}
