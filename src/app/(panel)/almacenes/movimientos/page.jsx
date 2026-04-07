import { Warehouse } from "lucide-react";
import PageTitle from "@/components/ui/PageTitle";
import Movimientos from "../Movimientos";

export default function AlmacenesMovimientosPage() {
    return (
        <div className="space-y-4">
            <PageTitle title="Movimientos" subtitle="Control de inventario, movimientos y alertas." icon={Warehouse} />
            <Movimientos />
        </div>
    );
}
