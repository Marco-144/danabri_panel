"use client";

import DescuentosCatalogoPage from "@/components/catalogos/DescuentosCatalogoPage";
import { createFamilia, deleteFamilia, getFamilias, updateFamilia } from "@/services/productosService";

export default function ProductosFamiliasPage() {
    return (
        <DescuentosCatalogoPage
            title="Familias"
            subtitle="Catalogo de familias para productos"
            singularLabel="Familia"
            addLabel="Agregar familia"
            idKey="id_familia"
            getItems={getFamilias}
            createItem={createFamilia}
            updateItem={updateFamilia}
            deleteItem={deleteFamilia}
        />
    );
}
