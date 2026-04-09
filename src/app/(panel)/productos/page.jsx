"use client";

import { useState, useMemo, useEffect } from "react";
import { Loader, Search, Plus, Eye, Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import Image from "next/image";
import {
    getProductos,
    getProductoById,
    deleteProducto,
    getCategorias,
} from "@/services/productosService";
import AgregarProducto from "./AgregarProducto";
import EditarProducto from "./EditarProducto";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FieldCard from "@/components/ui/FieldCard";
import PageTitle from "@/components/ui/PageTitle";

export default function ProductosPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);

    const [viewItem, setViewItem] = useState(null);
    const [deleteItem, setDeleteItem] = useState(null);

    const [addOpen, setAddOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [p, c] = await Promise.all([getProductos(), getCategorias()]);
            setProductos(Array.isArray(p) ? p : []);
            setCategorias(Array.isArray(c) ? c : []);
            setError("");
        } catch (err) {
            setError(err.message || "Error al cargar productos");
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return productos;

        return productos.filter((p) => {
            const n = String(p.nombre || "").toLowerCase();
            const c = String(p.nombre_categoria || "").toLowerCase();
            return n.includes(q) || c.includes(q);
        });
    }, [productos, search]);

    const onView = async (id) => {
        try {
            const detalle = await getProductoById(id);
            setViewItem(detalle);
        } catch (err) {
            setError(err.message || "No se pudo cargar detalle");
        }
    };

    const onEdit = async (id) => {
        try {
            const detalle = await getProductoById(id);
            setEditItem(detalle);
        } catch (err) {
            setError(err.message || "No se pudo cargar producto");
        }
    };

    const onDeleteConfirm = async () => {
        try {
            await deleteProducto(deleteItem.id_producto);
            setDeleteItem(null);
            await loadData();
        } catch (err) {
            setError(err.message || "No se pudo eliminar producto");
        }
    };

    if (loading) {
        return (
            <div className="h-64 flex items-center justify-center">
                <Loader className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <PageTitle title="Productos" subtitle="Gestion de productos del catalogo." />

            {error && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

            <div className="p-4 rounded-2xl flex flex-col md:flex-row mb-4 gap-3 md:items-center">
                <div className="relative inline-block w-full md:w-[460px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <Input
                        type="text"
                        placeholder="Buscar..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        inputClassName="bg-white text-primary w-full py-2.5 pl-10 pr-4 rounded-full"
                    />
                </div>

                <Button
                    onClick={() => setAddOpen(true)}
                    variant="primary"
                    className="md:ml-auto rounded-xl shadow-sm"
                >
                    <Plus size={16} /> Agregar Producto
                </Button>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">Imagen</th>
                            <th className="text-left p-3">Nombre</th>
                            <th className="text-left p-3">Categoría</th>
                            <th className="text-left p-3">Descripcion</th>
                            <th className="text-left p-3">Estado</th>
                            <th className="text-center p-3">Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-6 text-center text-muted">No hay productos para mostrar.</td>
                            </tr>
                        )}

                        {filtered.map((p) => {
                            const isActivo = p.activo === 1 || p.activo === true || p.activo === "1";

                            return (
                                <tr key={p.id_producto} className="border-t border-border hover:bg-background/50">
                                    <td className="p-3">
                                        <div className="w-14 h-14 rounded-lg border border-border bg-background overflow-hidden">
                                            {p.imagen_url ? (
                                                <Image src={p.imagen_url} alt={p.nombre} width={56} height={56} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs text-muted">Sin img</div>
                                            )}
                                        </div>
                                    </td>

                                    <td className="p-3">{p.nombre}</td>
                                    <td className="p-3">{p.nombre_categoria || "-"}</td>
                                    <td className="p-3 max-w-[340px] truncate">{p.descripcion || "-"}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs rounded-full ${isActivo ? "bg-activo text-white" : "bg-inactivo text-white"}`}>
                                            {isActivo ? "Activo" : "Inactivo"}
                                        </span>
                                    </td>

                                    <td className="p-3">
                                        <div className="flex justify-center text-muted">
                                            <Button variant="ghost" className="p-0 h-auto" onClick={() => onView(p.id_producto)}><Eye size={18} className="hover:text-primary" /></Button>
                                            <Button variant="ghost" className="p-0 h-auto" onClick={() => onEdit(p.id_producto)}><Pencil size={18} className="hover:text-yellow-700" /></Button>
                                            <Button variant="ghost" className="p-0 h-auto" onClick={() => setDeleteItem(p)}><Trash2 size={18} className="hover:text-red-600" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {addOpen && (
                <AgregarProducto
                    categorias={categorias}
                    onClose={() => setAddOpen(false)}
                    onSaved={async () => {
                        setAddOpen(false);
                        await loadData();
                    }}
                />
            )}

            {editItem && (
                <EditarProducto
                    producto={editItem}
                    categorias={categorias}
                    onClose={() => setEditItem(null)}
                    onSaved={async () => {
                        setEditItem(null);
                        await loadData();
                    }}
                />
            )}

            {viewItem && (
                <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-border shadow-card w-full max-w-3xl max-h-[90vh] overflow-auto">
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h3 className="text-lg font-semibold text-primary">Detalle de producto</h3>
                            <Button variant="ghost" className="p-0 h-auto" onClick={() => setViewItem(null)}><X size={18} className="text-muted hover:text-primary" /></Button>
                        </div>

                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="rounded-xl border border-border bg-white p-4 md:row-span-2">
                                <p className="text-xs uppercase tracking-wide text-muted mb-2">Imagen</p>
                                <div className="w-full h-56 rounded-xl border border-border bg-background overflow-hidden">
                                    {viewItem.imagen_url ? (
                                        <Image src={viewItem.imagen_url} alt={viewItem.nombre} width={640} height={320} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-sm text-muted">Sin imagen</div>
                                    )}
                                </div>
                            </div>

                            <FieldCard label="Nombre" value={viewItem.nombre} />
                            <FieldCard label="Categoria" value={viewItem.nombre_categoria || "-"} />
                            <FieldCard label="Estado" value={viewItem.activo ? "Activo" : "Inactivo"} />
                            <FieldCard label="Descripcion" value={viewItem.descripcion || "-"} />
                        </div>

                        <div className="px-4 pb-4">
                            <h4 className="font-semibold text-primary mb-2">Presentaciones</h4>
                            <div className="rounded-xl border border-border overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-background text-primary">
                                        <tr>
                                            <th className="text-left p-2">Nombre</th>
                                            <th className="text-left p-2">Codigo</th>
                                            <th className="text-left p-2">Piezas</th>
                                            <th className="text-left p-2">Costo</th>
                                            <th className="text-left p-2">Precio N1</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(viewItem.presentaciones || []).length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-3 text-center text-muted">Sin presentaciones</td>
                                            </tr>
                                        )}
                                        {(viewItem.presentaciones || []).map((pp) => (
                                            <tr key={pp.id_presentacion} className="border-t border-border">
                                                <td className="p-2">{pp.nombre}</td>
                                                <td className="p-2">{pp.codigo_barras}</td>
                                                <td className="p-2">{pp.piezas_por_presentacion}</td>
                                                <td className="p-2">${Number(pp.costo || 0).toFixed(2)}</td>
                                                <td className="p-2">${Number(pp.precio_nivel_1 || 0).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {deleteItem && (
                <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-border shadow-card w-full max-w-md p-5">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-full bg-red-100 p-2 text-red-700"><AlertTriangle size={18} /></div>
                            <div>
                                <h3 className="text-lg font-semibold text-primary">Confirmar Eliminación</h3>
                                <p className="text-sm text-muted mt-1">{`Se eliminará ${deleteItem.nombre}. Esta acción no se puede deshacer. ¿Desea continuar?`}</p>
                            </div>
                        </div>

                        <div className="mt-5 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancelar</Button>
                            <Button variant="accent" onClick={onDeleteConfirm}>Confirmar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
