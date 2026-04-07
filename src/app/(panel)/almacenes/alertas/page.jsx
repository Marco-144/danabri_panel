import { Warehouse } from "lucide-react";
import PageTitle from "@/components/ui/PageTitle";
import Alertas from "../Alertas";

export default function AlmacenesAlertasPage() {
    return (
        <div className="space-y-4">
            <PageTitle title="Alertas" subtitle="Control de inventario, movimientos y alertas." icon={Warehouse} />
            <Alertas />
        </div>
    );
}
