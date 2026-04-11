"use client";

import DescuentosCatalogoPage from "@/components/catalogos/DescuentosCatalogoPage";
import { createLinea, deleteLinea, getLineas, updateLinea } from "@/services/productosService";

export default function ProductosLineasPage() {
    return (
        <DescuentosCatalogoPage
            title="Lineas"
            subtitle="Catalogo de lineas para productos"
            singularLabel="Linea"
            addLabel="Agregar linea"
            idKey="id_linea"
            getItems={getLineas}
            createItem={createLinea}
            updateItem={updateLinea}
            deleteItem={deleteLinea}
        />
    );
}
