"use client";

import DescuentosCatalogoPage from "@/components/catalogos/DescuentosCatalogoPage";
import { createMarca, deleteMarca, getMarcas, updateMarca } from "@/services/productosService";

export default function ProductosMarcasPage() {
    return (
        <DescuentosCatalogoPage
            title="Marcas"
            subtitle="Catalogo de marcas para productos"
            singularLabel="Marca"
            addLabel="Agregar marca"
            idKey="id_marca"
            getItems={getMarcas}
            createItem={createMarca}
            updateItem={updateMarca}
            deleteItem={deleteMarca}
        />
    );
}
