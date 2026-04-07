"use client";

import { useState } from "react";
import { X } from "lucide-react";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";

export default function ProductoFormModal({
    title,
    categorias,
    initialData = { nombre: "", descripcion: "", imagen_url: "", id_categoria: "", activo: true },
    saving,
    error,
    onClose,
    onSubmit,
}) {
    const [form, setForm] = useState({
        nombre: initialData.nombre || "",
        descripcion: initialData.descripcion || "",
        imagen_url: initialData.imagen_url || "",
        imagen: null,
        id_categoria: initialData.id_categoria ? String(initialData.id_categoria) : "",
        activo: Boolean(initialData.activo),
    });

    const [preview, setPreview] = useState(initialData.imagen_url || "");

    const submit = (e) => {
        e.preventDefault();
        onSubmit?.({
            nombre: form.nombre.trim(),
            descripcion: form.descripcion.trim() || null,
            imagen: form.imagen,
            id_categoria: Number(form.id_categoria),
            activo: Boolean(form.activo),
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
            <form onSubmit={submit} className="bg-white rounded-2xl border border-border shadow-card w-full max-w-xl">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="text-lg font-semibold text-primary">{title}</h3>
                    <Button variant="ghost" className="p-0 h-auto" onClick={onClose}><X size={18} className="text-muted hover:text-primary" /></Button>
                </div>

                <div className="p-4 grid grid-cols-1 gap-3">
                    {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}

                    <Input
                        label="Nombre"
                        value={form.nombre}
                        onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                        inputClassName="py-2"
                    />

                    <Select
                        label="Categoria"
                        value={form.id_categoria}
                        onChange={(e) => setForm((p) => ({ ...p, id_categoria: e.target.value }))}
                        options={categorias.map((c) => ({ value: c.id_categoria, label: c.nombre }))}
                        placeholder="Selecciona categoria"
                        selectClassName="py-2"
                    />

                    <Textarea
                        label="Descripcion"
                        value={form.descripcion}
                        onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                        rows={3}
                        textareaClassName="py-2"
                    />

                    <Input
                        label="Imagen del producto"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setForm((p) => ({ ...p, imagen: file }));
                            if (file) {
                                setPreview(URL.createObjectURL(file));
                            }
                        }}
                        inputClassName="py-2"
                    />

                    {preview && (
                        <div className="mt-3 w-32 h-32 rounded-xl border border-border bg-background overflow-hidden">
                            <Image src={preview} alt="Vista previa" width={128} height={128} className="w-full h-full object-cover" unoptimized />
                        </div>
                    )}

                    <label className="flex items-center gap-2 text-sm text-primary">
                        <input type="checkbox" checked={form.activo} onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))} />
                        Activo
                    </label>
                </div>

                <div className="p-4 border-t border-border flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={saving} variant="primary">
                        {saving ? "Guardando..." : "Guardar"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
