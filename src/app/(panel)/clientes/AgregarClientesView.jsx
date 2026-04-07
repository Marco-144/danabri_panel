import ClienteFormView from "./ClienteFormView";
// Vista de alta de cliente reutilizando el formulario base.

export default function AgregarClientesView() {
    return <ClienteFormView isEdit={false} />;
}
