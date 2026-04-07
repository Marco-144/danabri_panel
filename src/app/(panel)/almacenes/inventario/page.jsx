import { Warehouse } from "lucide-react";
import PageTitle from "@/components/ui/PageTitle";
import Inventario from "../Inventario";

export default function AlmacenesInventarioPage() {
    return (
        <div className="space-y-4">
            <PageTitle title="Inventario" subtitle="Control de inventario, movimientos y alertas." icon={Warehouse} />
            <Inventario />
        </div>
    );
}
