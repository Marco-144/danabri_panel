import { useCallback, useEffect, useState } from "react";
import { X, Plus, Pencil, Trash2 } from "lucide-react";
import { getPresentacionCatalogoItems, createPresentacionCatalogoItem, updatePresentacionCatalogoItem, deletePresentacionCatalogoItem } from "@/services/productosService";
import { getAlmacenes } from "@/services/almacenesService";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

export default function GestionUbicaciones({ onClose, onUpdated }) {
    const [campo, setCampo] = useState("rack");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [items, setItems] = useState([]);
    const [nuevoNombre, setNuevoNombre] = useState("");
    const [editId, setEditId] = useState(null);
    const [editNombre, setEditNombre] = useState("");
    const [nuevoParentId, setNuevoParentId] = useState("");
    const [editParentId, setEditParentId] = useState("");
    const [parentOptions, setParentOptions] = useState([]);

    const parentLabelByCampo = {
        rack: "Almacen",
        nivel: "Rack",
        seccion: "Nivel",
    };
    const currentParentLabel = parentLabelByCampo[campo];

    const getParentName = (item) => {
        if (!item?.parent_id) return "-";
        const parent = parentOptions.find((option) => String(option.value) === String(item.parent_id));
        return parent?.label || `#${item.parent_id}`;
    };

    const loadItems = useCallback(async (targetCampo = campo) => {
        try {
            setLoading(true);
            const data = await getPresentacionCatalogoItems(targetCampo);
            setItems(Array.isArray(data) ? data : []);
            setError("");
        } catch (err) {
            setError(err.message || "No se pudo cargar el catalogo");
        } finally {
            setLoading(false);
        }
    }, [campo]);

    const loadParentOptions = useCallback(async (targetCampo = campo) => {
        if (targetCampo === "rack") {
            const data = await getAlmacenes();
            setParentOptions(
                (Array.isArray(data) ? data : []).map((a) => ({
                    value: a.id_almacen,
                    label: a.nombre,
                }))
            );
            return;
        }

        if (targetCampo === "nivel") {
            const data = await getPresentacionCatalogoItems("rack");
            setParentOptions(
                (Array.isArray(data) ? data : []).map((item) => ({
                    value: item.id,
                    label: item.label,
                }))
            );
            return;
        }

        const data = await getPresentacionCatalogoItems("nivel");
        setParentOptions(
            (Array.isArray(data) ? data : []).map((item) => ({
                value: item.id,
                label: item.label,
            }))
        );
    }, [campo]);

    useEffect(() => {
        const run = async () => {
            await Promise.all([loadItems(campo), loadParentOptions(campo)]);
            setNuevoParentId("");
            setEditId(null);
            setEditNombre("");
            setEditParentId("");
        };
        run();
    }, [campo, loadItems, loadParentOptions]);

    const onCreate = async () => {
        const nombre = String(nuevoNombre || "").trim();
        if (!nombre) return;

        try {
            if (!nuevoParentId) {
                setError(`Selecciona ${parentLabelByCampo[campo].toLowerCase()} antes de agregar`);
                return;
            }

            await createPresentacionCatalogoItem(campo, { nombre, parent_id: Number(nuevoParentId) });
            setNuevoNombre("");
            setNuevoParentId("");
            await loadItems(campo);
            await onUpdated?.();
            setError("");
        } catch (err) {
            setError(err.message || "No se pudo crear");
        }
    };

    const onSaveEdit = async () => {
        const nombre = String(editNombre || "").trim();
        if (!editId || !nombre) return;

        try {
            await updatePresentacionCatalogoItem(campo, editId, {
                nombre,
                parent_id: editParentId ? Number(editParentId) : undefined,
            });
            setEditId(null);
            setEditNombre("");
            setEditParentId("");
            await loadItems(campo);
            await onUpdated?.();
            setError("");
        } catch (err) {
            setError(err.message || "No se pudo actualizar");
        }
    };

    const onDelete = async (id) => {
        if (!confirm("Deseas eliminar este registro?")) return;

        try {
            await deletePresentacionCatalogoItem(campo, id);
            await loadItems(campo);
            await onUpdated?.();
            setError("");
        } catch (err) {
            setError(err.message || "No se pudo eliminar");
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-border shadow-card w-full max-w-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="text-lg font-semibold text-primary">Gestión de Ubicaciones</h3>
                    <Button variant="ghost" className="p-0 h-auto" onClick={onClose}><X size={18} className="text-muted hover:text-primary" /></Button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {[
                            { value: "rack", label: "Rack" },
                            { value: "nivel", label: "Nivel" },
                            { value: "seccion", label: "Seccion" },
                        ].map((tab) => (
                            <Button
                                key={tab.value}
                                variant={campo === tab.value ? "primary" : "outline"}
                                onClick={() => setCampo(tab.value)}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </div>

                    {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

                    <div className="flex gap-2">
                        <div className="w-full max-w-[220px]">
                            <Select
                                value={nuevoParentId}
                                onChange={(e) => setNuevoParentId(e.target.value)}
                                options={parentOptions}
                                placeholder={`Seleccionar ${parentLabelByCampo[campo].toLowerCase()}`}
                                selectClassName="bg-white"
                            />
                        </div>
                        <Input
                            placeholder="Nombre"
                            value={nuevoNombre}
                            onChange={(e) => setNuevoNombre(e.target.value)}
                            inputClassName="bg-white"
                        />
                        <Button onClick={onCreate}><Plus size={16} /> Agregar</Button>
                    </div>

                    <div className="border border-border rounded-xl max-h-[40vh] overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-muted text-sm">Cargando...</div>
                        ) : items.length === 0 ? (
                            <div className="p-4 text-center text-muted text-sm">Sin registros</div>
                        ) : (
                            <div>
                                <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-border bg-background text-xs font-semibold text-primary sticky top-0 z-10">
                                    <div className="col-span-2">ID</div>
                                    <div className="col-span-4">Nombre</div>
                                    <div className="col-span-4">{currentParentLabel}</div>
                                    <div className="col-span-2 text-center">Acciones</div>
                                </div>

                                <div className="divide-y divide-border">
                                {items.map((item) => {
                                    const isEditing = editId === item.id;
                                    return (
                                        <div key={item.id} className="grid grid-cols-12 gap-2 p-3 items-center">
                                            <span className="col-span-2 text-xs text-muted">#{item.id}</span>

                                            {isEditing ? (
                                                <>
                                                    <Select
                                                        containerClassName="col-span-4"
                                                        value={editParentId}
                                                        onChange={(e) => setEditParentId(e.target.value)}
                                                        options={parentOptions}
                                                        placeholder={parentLabelByCampo[campo]}
                                                        selectClassName="bg-white"
                                                    />
                                                    <Input
                                                        containerClassName="col-span-4"
                                                        value={editNombre}
                                                        onChange={(e) => setEditNombre(e.target.value)}
                                                        inputClassName="bg-white"
                                                    />
                                                </>
                                            ) : (
                                                <>
                                                    <p className="col-span-4 text-sm text-primary">{item.label}</p>
                                                    <p className="col-span-4 text-sm text-muted">{getParentName(item)}</p>
                                                </>
                                            )}

                                            {isEditing ? (
                                                <div className="col-span-2 flex justify-center gap-2">
                                                    <Button variant="primary" onClick={onSaveEdit}>Guardar</Button>
                                                    <Button variant="outline" onClick={() => { setEditId(null); setEditNombre(""); }}>Cancelar</Button>
                                                </div>
                                            ) : (
                                                <div className="col-span-2 flex justify-center gap-2">
                                                    <Button
                                                        variant="lightghost"
                                                        className="p-0 h-auto"
                                                        onClick={() => {
                                                            setEditId(item.id);
                                                            setEditNombre(item.nombre || item.label || "");
                                                            setEditParentId(item.parent_id ? String(item.parent_id) : "");
                                                        }}
                                                    >
                                                        <Pencil size={16} className="hover:text-yellow-700"/>
                                                    </Button>
                                                    <Button variant="lightghost" className="p-0 h-auto" onClick={() => onDelete(item.id)}>
                                                        <Trash2 size={16} className="hover:text-red-700" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
