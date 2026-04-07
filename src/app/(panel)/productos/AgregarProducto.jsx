"use client";

import { useState } from "react";
import { createProducto } from "@/services/productosService";
import ProductoFormModal from "./ProductoFormModal";

export default function AgregarProducto({ categorias, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (form) => {
    try {
      setSaving(true);
      setError("");
      await createProducto(form);
      await onSaved?.();
    } catch (err) {
      setError(err.message || "No se pudo crear producto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProductoFormModal
      title="Agregar producto"
      categorias={categorias}
      saving={saving}
      error={error}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}