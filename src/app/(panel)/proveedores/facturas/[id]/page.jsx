import FacturaDetalleView from "../FacturaDetalleView";

export default async function FacturaDetallePage({ params }) {
    const { id } = await params;

    return <FacturaDetalleView id={id} />;
}
