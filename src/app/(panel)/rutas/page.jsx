import PageTitle from "@/components/ui/PageTitle";
import Card from "@/components/ui/Card";

export default function RutasPage() {
    return (
        <div className="space-y-4">
            <PageTitle title="Rutas" subtitle="Modulo listo para integrar logistica y reparto" />
            <Card className="p-4 text-sm text-muted">
                Esta seccion esta preparada para conectar rutas de reparto cuando se defina el esquema de BD correspondiente.
            </Card>
        </div>
    );
}
