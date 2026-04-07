"use client";

import { useState } from "react";
import { updateProducto } from "@/services/productosService";
import ProductoFormModal from "./ProductoFormModal";

export default function EditarProducto({ producto, categorias, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (form) => {
    try {
      setSaving(true);
      setError("");
      await updateProducto(producto.id_producto, form);
      await onSaved?.();
    } catch (err) {
      setError(err.message || "No se pudo editar producto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProductoFormModal
      title="Editar producto"
      categorias={categorias}
      initialData={{
        nombre: producto.nombre || "",
        descripcion: producto.descripcion || "",
        imagen_url: producto.imagen_url || "",
        id_categoria: producto.id_categoria,
        activo: producto.activo === 1 || producto.activo === true || producto.activo === "1",
      }}
      saving={saving}
      error={error}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}