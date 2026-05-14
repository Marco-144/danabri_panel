import db from "@/lib/db";
import { searchProductosCatalog as searchPresentacionesEmpresaCatalog } from "@/modules/cotizaciones-empresas.service";

let ensureSchemaPromise = null;

async function ensureCotizacionesClienteSchema() {
    if (ensureSchemaPromise) return ensureSchemaPromise;

    ensureSchemaPromise = (async () => {
        const [cotizacionColumns] = await db.execute(
            `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cotizaciones'`
        );
        const [detalleColumns] = await db.execute(
            `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'detalle_cotizacion'`
        );

        const cotSet = new Set(cotizacionColumns.map((row) => row.COLUMN_NAME));
        const detSet = new Set(detalleColumns.map((row) => row.COLUMN_NAME));

        if (!cotSet.has("vigencia_modo") || !cotSet.has("vigencia_dias") || !cotSet.has("fecha_vencimiento")) {
            await db.execute(`
                ALTER TABLE cotizaciones
                    ADD COLUMN vigencia_modo enum('dias','manual') NOT NULL DEFAULT 'dias' AFTER total,
                    ADD COLUMN vigencia_dias int NOT NULL DEFAULT 30 AFTER vigencia_modo,
                    ADD COLUMN fecha_vencimiento date DEFAULT NULL AFTER vigencia_dias
            `);
            await db.execute(`
                UPDATE cotizaciones
                SET vigencia_modo = 'dias',
                    vigencia_dias = 30,
                    fecha_vencimiento = DATE_ADD(DATE(created_at), INTERVAL 30 DAY)
            `);
        }

        if (!detSet.has("id_almacen") || !detSet.has("descripcion_personalizada") || !detSet.has("requerimiento") || !detSet.has("cantidad_sistema") || !detSet.has("unidad") || !detSet.has("nivel_precio") || !detSet.has("precio_sin_iva") || !detSet.has("precio_con_iva")) {
            await db.execute(`
                ALTER TABLE detalle_cotizacion
                    ADD COLUMN id_almacen int DEFAULT NULL AFTER id_presentacion,
                    ADD COLUMN descripcion_personalizada text DEFAULT NULL AFTER id_almacen,
                    ADD COLUMN requerimiento varchar(100) DEFAULT NULL AFTER descripcion_personalizada,
                    ADD COLUMN cantidad_sistema int NOT NULL DEFAULT 0 AFTER requerimiento,
                    ADD COLUMN unidad enum('pieza','caja','paquete') NOT NULL DEFAULT 'pieza' AFTER cantidad,
                    ADD COLUMN nivel_precio tinyint NOT NULL DEFAULT 1 AFTER unidad,
                    ADD COLUMN precio_sin_iva decimal(10,2) NOT NULL DEFAULT 0.00 AFTER precio,
                    ADD COLUMN precio_con_iva decimal(10,2) NOT NULL DEFAULT 0.00 AFTER precio_sin_iva,
                    ADD KEY id_almacen (id_almacen),
                    ADD CONSTRAINT detalle_cotizacion_ibfk_4 FOREIGN KEY (id_almacen) REFERENCES almacenes (id_almacen) ON DELETE SET NULL ON UPDATE CASCADE
            `);
            await db.execute(`
                UPDATE detalle_cotizacion
                SET cantidad_sistema = CASE WHEN cantidad_sistema > 0 THEN cantidad_sistema ELSE cantidad END,
                    unidad = 'pieza',
                    nivel_precio = CASE WHEN nivel_precio > 0 THEN nivel_precio ELSE 1 END,
                    precio_sin_iva = CASE WHEN precio_sin_iva > 0 THEN precio_sin_iva ELSE precio END,
                    precio_con_iva = CASE WHEN precio_con_iva > 0 THEN precio_con_iva ELSE ROUND(precio * 1.16, 2) END
            `);
        }
    })();

    return ensureSchemaPromise;
}

function toPositiveInt(value, fieldName) {
    const number = Number(value);
    if (!Number.isInteger(number) || number <= 0) {
        throw new Error(`${fieldName} invalido`);
    }
    return number;
}

function toPositiveIntOrNull(value, fieldName) {
    if (value === undefined || value === null) return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return null;
    if (!Number.isInteger(number)) throw new Error(`${fieldName} invalido`);
    return number;
}

function toDate(value, fieldName) {
    const text = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        throw new Error(`${fieldName} invalida`);
    }
    return text;
}

function toMoney(value, fieldName) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) {
        throw new Error(`${fieldName} invalido`);
    }
    return Math.round(number * 100) / 100;
}

function to6(value) {
    return Math.round(Number(value || 0) * 1000000) / 1000000;
}

async function buildNextFolio(connection) {
    const [[{ nextNum }]] = await connection.execute(
        "SELECT COALESCE(MAX(id_cotizacion), 0) + 1 AS nextNum FROM cotizaciones"
    );
    return `COT-C-${String(nextNum).padStart(6, "0")}`;
}

async function getDefaultPresentacionId(connection, id_producto) {
    const [rows] = await connection.execute(
        `
        SELECT pp.id_presentacion
        FROM producto_presentaciones pp
        WHERE pp.id_producto = ? AND pp.activo = 1
        ORDER BY pp.id_presentacion ASC
        LIMIT 1
        `,
        [id_producto]
    );

    return rows && rows.length ? rows[0].id_presentacion : null;
}

function normalizeHeaderRow(row) {
    return {
        id_cotizacion: row.id_cotizacion,
        folio: row.folio,
        id_cliente: row.id_cliente,
        cliente_nombre: row.cliente_nombre,
        cliente_rfc: row.cliente_rfc,
        cliente_telefono: row.cliente_telefono,
        tipo_cliente: row.tipo_cliente,
        nivel_precio: row.nivel_precio ? Number(row.nivel_precio) : null,
        id_usuario: row.id_usuario,
        usuario_nombre: row.usuario_nombre,
        fecha_emision: row.fecha_emision,
        vigencia_modo: String(row.vigencia_modo || "dias").toLowerCase(),
        vigencia_dias: Number(row.vigencia_dias || 0),
        fecha_vencimiento: row.fecha_vencimiento || null,
        estado: row.estado,
        total: Number(row.total || 0),
        created_at: row.created_at,
    };
}

function normalizeDetalleRow(row) {
    const priceLevels = [1, 2, 3, 4, 5]
        .map((level) => {
            const priceBase = Number(row[`precio_nivel_${level}`] ?? row[`precio_nivel_${level}_default`] ?? 0);
            if (!Number.isFinite(priceBase) || priceBase <= 0) return null;

            return {
                level,
                label: `Precio ${level}`,
                priceWithoutTax: to6(priceBase),
                priceWithTax: to6(priceBase * (1 + 0.16)),
            };
        })
        .filter(Boolean);

    const firstLevel = priceLevels[0] || null;
    const cantidadFactura = Number(row.cantidad_factura || row.cantidad || 0);
    const cantidadSistema = Number(row.cantidad_sistema || cantidadFactura || 0);
    const stockAlmacen = Number(row.stock_almacen || 0);

    const almacenesStock = Array.isArray(row.almacenes_stock) ? row.almacenes_stock : [];

    return {
        id_detalle: row.id_detalleCotizacion,
        id_producto: row.id_producto,
        id_presentacion: row.id_presentacion ? Number(row.id_presentacion) : (row.id_presentacion_default ? Number(row.id_presentacion_default) : null),
        id_almacen: row.id_almacen ? Number(row.id_almacen) : null,
        producto_nombre: row.producto_nombre,
        presentacion_nombre: row.presentacion_nombre || row.presentacion_nombre_default || "",
        almacen_nombre: row.almacen_nombre || "",
        cantidad: cantidadFactura,
        cantidad_factura: cantidadFactura,
        cantidad_sistema: cantidadSistema,
        precio: Number(row.precio_sin_iva || row.precio || 0),
        subtotal: Number(row.subtotal || 0),
        descripcion_personalizada: row.descripcion_personalizada || "",
        requerimiento: row.requerimiento || "",
        unidad: String(row.unidad || "pieza"),
        piezas_por_presentacion: Number(row.piezas_por_presentacion || row.piezas_por_presentacion_default || 1),
        id_presentacion_default: row.id_presentacion_default ? Number(row.id_presentacion_default) : null,
        presentacion_nombre_default: row.presentacion_nombre_default || "",
        almacenes_stock: almacenesStock,
        stock_almacen: stockAlmacen,
        stock_total: almacenesStock.reduce((acc, item) => acc + Number(item.stock || 0), 0),
        niveles_precio: priceLevels,
        nivel_precio: Number(row.nivel_precio || firstLevel?.level || 1),
        precio_manual_con_iva: Number(row.precio_con_iva || (firstLevel ? firstLevel.priceWithTax : row.precio || 0) || 0),
        precio_manual_sin_iva: Number(row.precio_sin_iva || (firstLevel ? firstLevel.priceWithoutTax : row.precio || 0) || 0),
    };
}

function normalizeDetalles(detalles) {
    if (!Array.isArray(detalles) || !detalles.length) {
        throw new Error("Debes agregar al menos una partida");
    }

    return detalles.map((detalle, index) => {
        const line = index + 1;
        const id_producto = toPositiveInt(detalle.id_producto, `id_producto de la partida ${line}`);
        const rawIdPresentacion = detalle.id_presentacion ?? detalle.id_presentacion_default ?? null;
        const id_presentacion = toPositiveIntOrNull(rawIdPresentacion, `id_presentacion de la partida ${line}`);
        const id_almacen = toPositiveIntOrNull(detalle.id_almacen, `id_almacen de la partida ${line}`);
        const cantidad_factura = toPositiveInt(
            detalle.cantidad_factura !== undefined ? detalle.cantidad_factura : detalle.cantidad,
            `cantidad de la partida ${line}`
        );
        const cantidad_sistema_raw = Number(detalle.cantidad_sistema ?? cantidad_factura);
        const cantidad_sistema = Number.isInteger(cantidad_sistema_raw) && cantidad_sistema_raw > 0
            ? cantidad_sistema_raw
            : cantidad_factura;
        const nivel_precio = Number.isInteger(Number(detalle.nivel_precio)) && Number(detalle.nivel_precio) >= 1 && Number(detalle.nivel_precio) <= 5
            ? Number(detalle.nivel_precio)
            : 1;
        const precio_sin_iva = toMoney(
            detalle.precio_sin_iva ?? detalle.precio_manual_sin_iva ?? detalle.precio ?? 0,
            `precio sin IVA de la partida ${line}`
        );
        const precio_con_iva = toMoney(
            detalle.precio_con_iva ?? detalle.precio_manual_con_iva ?? (precio_sin_iva * (1 + 0.16)),
            `precio con IVA de la partida ${line}`
        );
        const unidad = String(detalle.unidad || "pieza").trim().toLowerCase();
        const descripcion_personalizada = String(detalle.descripcion_personalizada || "").trim();
        const requerimiento = String(detalle.requerimiento || "").trim();
        const subtotal = toMoney(cantidad_factura * precio_sin_iva, `subtotal de la partida ${line}`);

        return {
            id_producto,
            id_presentacion,
            id_almacen,
            cantidad: cantidad_factura,
            cantidad_factura,
            cantidad_sistema,
            nivel_precio,
            precio_sin_iva,
            precio_con_iva,
            precio: precio_sin_iva,
            subtotal,
            unidad,
            descripcion_personalizada,
            requerimiento,
        };
    });
}

export async function getCotizacionesClientes({
    search = "",
    id_cliente = "",
    estado = "",
    fecha_desde = "",
    fecha_hasta = "",
} = {}) {
    await ensureCotizacionesClienteSchema();
    let sql = `
        SELECT
            c.id_cotizacion,
            c.folio,
            c.id_cliente,
            cl.nombre AS cliente_nombre,
            cl.rfc AS cliente_rfc,
            cl.telefono AS cliente_telefono,
            cl.tipo_cliente,
            tc.nivel_precio,
            c.id_usuario,
            u.nombre AS usuario_nombre,
            c.total,
            c.estado,
            c.created_at,
            DATE(c.created_at) AS fecha_emision
        FROM cotizaciones c
        INNER JOIN clientes cl ON cl.id_cliente = c.id_cliente
        LEFT JOIN catalogo_tipos_cliente tc ON tc.nombre = cl.tipo_cliente
        INNER JOIN usuarios u ON u.id_usuario = c.id_usuario
        WHERE 1 = 1
    `;

    const params = [];

    if (search) {
        const q = `%${String(search).trim()}%`;
        sql += " AND (c.folio LIKE ? OR cl.nombre LIKE ? OR cl.rfc LIKE ?)";
        params.push(q, q, q);
    }

    if (id_cliente) {
        sql += " AND c.id_cliente = ?";
        params.push(toPositiveInt(id_cliente, "id_cliente"));
    }

    if (estado) {
        sql += " AND c.estado = ?";
        params.push(String(estado));
    }

    if (fecha_desde) {
        sql += " AND DATE(c.created_at) >= ?";
        params.push(toDate(fecha_desde, "fecha_desde"));
    }

    if (fecha_hasta) {
        sql += " AND DATE(c.created_at) <= ?";
        params.push(toDate(fecha_hasta, "fecha_hasta"));
    }

    sql += " ORDER BY c.id_cotizacion DESC";

    const [rows] = await db.execute(sql, params);
    return rows.map(normalizeHeaderRow);
}

export async function getCotizacionClienteById(id) {
    await ensureCotizacionesClienteSchema();
    const idCotizacion = toPositiveInt(id, "id_cotizacion");

    const [headerRows] = await db.execute(
        `
        SELECT
            c.id_cotizacion,
            c.folio,
            c.id_cliente,
            cl.nombre AS cliente_nombre,
            cl.rfc AS cliente_rfc,
            cl.telefono AS cliente_telefono,
            cl.tipo_cliente,
            tc.nivel_precio,
            c.id_usuario,
            u.nombre AS usuario_nombre,
            c.total,
            c.vigencia_modo,
            c.vigencia_dias,
            c.fecha_vencimiento,
            c.estado,
            c.created_at,
            DATE(c.created_at) AS fecha_emision
        FROM cotizaciones c
        INNER JOIN clientes cl ON cl.id_cliente = c.id_cliente
        LEFT JOIN catalogo_tipos_cliente tc ON tc.nombre = cl.tipo_cliente
        INNER JOIN usuarios u ON u.id_usuario = c.id_usuario
        WHERE c.id_cotizacion = ?
        LIMIT 1
        `,
        [idCotizacion]
    );

    if (!headerRows.length) {
        throw new Error("Cotizacion no encontrada");
    }

    const [detalleRows] = await db.execute(
        `
        SELECT
            dc.id_detalleCotizacion,
            dc.id_producto,
            dc.id_presentacion,
            dc.id_almacen,
            p.nombre AS producto_nombre,
            pp.nombre AS presentacion_nombre,
            a.nombre AS almacen_nombre,
            dc.descripcion_personalizada,
            dc.requerimiento,
            dc.cantidad_sistema,
            dc.cantidad AS cantidad_factura,
            dc.unidad,
            dc.nivel_precio,
            dc.precio AS precio_sin_iva,
            dc.precio_con_iva,
            dc.subtotal,
            COALESCE(i.stock, 0) AS stock_almacen,
            pp_default.id_presentacion AS id_presentacion_default,
            pp_default.nombre AS presentacion_nombre_default,
            pp_default.piezas_por_presentacion AS piezas_por_presentacion_default,
            COALESCE(pp.precio_nivel_1, pp_default.precio_nivel_1) AS precio_nivel_1,
            COALESCE(pp.precio_nivel_2, pp_default.precio_nivel_2) AS precio_nivel_2,
            COALESCE(pp.precio_nivel_3, pp_default.precio_nivel_3) AS precio_nivel_3,
            COALESCE(pp.precio_nivel_4, pp_default.precio_nivel_4) AS precio_nivel_4,
            COALESCE(pp.precio_nivel_5, pp_default.precio_nivel_5) AS precio_nivel_5,
            pp_default.precio_nivel_1 AS precio_nivel_1_default,
            pp_default.precio_nivel_2 AS precio_nivel_2_default,
            pp_default.precio_nivel_3 AS precio_nivel_3_default,
            pp_default.precio_nivel_4 AS precio_nivel_4_default,
            pp_default.precio_nivel_5 AS precio_nivel_5_default
        FROM detalle_cotizacion dc
        INNER JOIN productos p ON p.id_producto = dc.id_producto
        LEFT JOIN producto_presentaciones pp ON pp.id_presentacion = dc.id_presentacion
        LEFT JOIN producto_presentaciones pp_default ON pp_default.id_presentacion = (
            SELECT pp2.id_presentacion
            FROM producto_presentaciones pp2
            WHERE pp2.id_producto = dc.id_producto AND pp2.activo = 1
            ORDER BY pp2.id_presentacion ASC
            LIMIT 1
        )
        LEFT JOIN almacenes a ON a.id_almacen = dc.id_almacen
        LEFT JOIN inventario i ON i.id_presentacion = dc.id_presentacion AND i.id_almacen = dc.id_almacen
        WHERE dc.id_cotizacion = ?
        ORDER BY dc.id_detalleCotizacion ASC
        `,
        [idCotizacion]
    );

    const presentacionIds = detalleRows
        .map((row) => Number(row.id_presentacion || row.id_presentacion_default))
        .filter((presentacionId) => Number.isInteger(presentacionId) && presentacionId > 0);
    const almacenesStockByPresentacion = new Map();

    if (presentacionIds.length) {
        const placeholders = presentacionIds.map(() => "?").join(", ");
        const [stockRows] = await db.execute(
            `
            SELECT
                inv.id_presentacion,
                inv.id_almacen,
                a.nombre AS almacen_nombre,
                COALESCE(inv.stock, 0) AS stock
            FROM inventario inv
            INNER JOIN almacenes a ON a.id_almacen = inv.id_almacen
            WHERE inv.id_presentacion IN (${placeholders})
            ORDER BY a.nombre ASC
            `,
            presentacionIds
        );

        for (const stockRow of stockRows) {
            const key = Number(stockRow.id_presentacion);
            if (!almacenesStockByPresentacion.has(key)) {
                almacenesStockByPresentacion.set(key, []);
            }

            almacenesStockByPresentacion.get(key).push({
                id_almacen: Number(stockRow.id_almacen),
                nombre: String(stockRow.almacen_nombre || "").trim(),
                stock: Number(stockRow.stock || 0),
            });
        }
    }

    return {
        ...normalizeHeaderRow(headerRows[0]),
        detalles: detalleRows.map((row) => {
            const normalized = normalizeDetalleRow(row);
            const presentacionKey = Number(row.id_presentacion || row.id_presentacion_default);
            const almacenes_stock = almacenesStockByPresentacion.get(presentacionKey) || normalized.almacenes_stock;
            return {
                ...normalized,
                almacenes_stock,
                stock_total: almacenes_stock.reduce((acc, item) => acc + Number(item.stock || 0), 0),
            };
        }),
    };
}

export async function createCotizacionCliente(data) {
    await ensureCotizacionesClienteSchema();
    const id_cliente = toPositiveInt(data.id_cliente, "id_cliente");
    const id_usuario = toPositiveInt(data.id_usuario, "id_usuario");
    const estado = String(data.estado || "pendiente").toLowerCase();
    const vigencia_modo = String(data.vigencia_modo || "dias").toLowerCase() === "manual" ? "manual" : "dias";
    const vigencia_dias = toPositiveInt(data.vigencia_dias || 1, "vigencia_dias");
    const fecha_vencimiento = data.fecha_vencimiento ? toDate(data.fecha_vencimiento, "fecha_vencimiento") : null;
    if (!["pendiente", "aprobada", "rechazada", "convertida"].includes(estado)) {
        throw new Error("estado invalido");
    }

    const detalles = normalizeDetalles(data.detalles);
    const total = toMoney(detalles.reduce((acc, item) => acc + Number(item.subtotal || 0), 0), "total");

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const folio = await buildNextFolio(conn);

        const [insertResult] = await conn.execute(
            `
            INSERT INTO cotizaciones (folio, id_cliente, id_usuario, total, estado, vigencia_modo, vigencia_dias, fecha_vencimiento)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [folio, id_cliente, id_usuario, total, estado, vigencia_modo, vigencia_dias, fecha_vencimiento]
        );

        const id_cotizacion = insertResult.insertId;

        for (const item of detalles) {
            let id_presentacion_to_use = item.id_presentacion;
            if (id_presentacion_to_use == null) {
                id_presentacion_to_use = await getDefaultPresentacionId(conn, item.id_producto);
                if (id_presentacion_to_use == null) {
                    throw new Error(`No hay presentacion activa para el producto ${item.id_producto}`);
                }
            }

            await conn.execute(
                `
                INSERT INTO detalle_cotizacion (
                    id_cotizacion,
                    id_producto,
                    id_presentacion,
                    id_almacen,
                    descripcion_personalizada,
                    requerimiento,
                    cantidad_sistema,
                    cantidad,
                    unidad,
                    nivel_precio,
                    precio,
                    precio_sin_iva,
                    precio_con_iva,
                    subtotal
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    id_cotizacion,
                    item.id_producto,
                    id_presentacion_to_use,
                    item.id_almacen,
                    item.descripcion_personalizada || null,
                    item.requerimiento || null,
                    item.cantidad_sistema,
                    item.cantidad_factura,
                    item.unidad,
                    item.nivel_precio,
                    item.precio_sin_iva,
                    item.precio_sin_iva,
                    item.precio_con_iva,
                    item.subtotal,
                ]
            );
        }

        await conn.commit();
        return { id_cotizacion, folio, message: "Cotizacion creada" };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

export async function updateCotizacionCliente(id, data) {
    await ensureCotizacionesClienteSchema();
    const id_cotizacion = toPositiveInt(id, "id_cotizacion");
    const id_cliente = toPositiveInt(data.id_cliente, "id_cliente");
    const id_usuario = toPositiveInt(data.id_usuario, "id_usuario");
    const estado = String(data.estado || "pendiente").toLowerCase();
    const vigencia_modo = String(data.vigencia_modo || "dias").toLowerCase() === "manual" ? "manual" : "dias";
    const vigencia_dias = toPositiveInt(data.vigencia_dias || 1, "vigencia_dias");
    const fecha_vencimiento = data.fecha_vencimiento ? toDate(data.fecha_vencimiento, "fecha_vencimiento") : null;
    if (!["pendiente", "aprobada", "rechazada", "convertida"].includes(estado)) {
        throw new Error("estado invalido");
    }

    const detalles = normalizeDetalles(data.detalles);
    const total = toMoney(detalles.reduce((acc, item) => acc + Number(item.subtotal || 0), 0), "total");

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [updateResult] = await conn.execute(
            `
            UPDATE cotizaciones
            SET id_cliente = ?, id_usuario = ?, total = ?, estado = ?, vigencia_modo = ?, vigencia_dias = ?, fecha_vencimiento = ?
            WHERE id_cotizacion = ?
            `,
            [id_cliente, id_usuario, total, estado, vigencia_modo, vigencia_dias, fecha_vencimiento, id_cotizacion]
        );

        if (!updateResult.affectedRows) {
            throw new Error("Cotizacion no encontrada");
        }

        await conn.execute("DELETE FROM detalle_cotizacion WHERE id_cotizacion = ?", [id_cotizacion]);

        for (const item of detalles) {
            let id_presentacion_to_use = item.id_presentacion;
            if (id_presentacion_to_use == null) {
                id_presentacion_to_use = await getDefaultPresentacionId(conn, item.id_producto);
                if (id_presentacion_to_use == null) {
                    throw new Error(`No hay presentacion activa para el producto ${item.id_producto}`);
                }
            }

            await conn.execute(
                `
                INSERT INTO detalle_cotizacion (
                    id_cotizacion,
                    id_producto,
                    id_presentacion,
                    id_almacen,
                    descripcion_personalizada,
                    requerimiento,
                    cantidad_sistema,
                    cantidad,
                    unidad,
                    nivel_precio,
                    precio,
                    precio_sin_iva,
                    precio_con_iva,
                    subtotal
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    id_cotizacion,
                    item.id_producto,
                    id_presentacion_to_use,
                    item.id_almacen,
                    item.descripcion_personalizada || null,
                    item.requerimiento || null,
                    item.cantidad_sistema,
                    item.cantidad_factura,
                    item.unidad,
                    item.nivel_precio,
                    item.precio_sin_iva,
                    item.precio_sin_iva,
                    item.precio_con_iva,
                    item.subtotal,
                ]
            );
        }

        await conn.commit();
        return { message: "Cotizacion actualizada" };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

export async function deleteCotizacionCliente(id) {
    await ensureCotizacionesClienteSchema();
    const id_cotizacion = toPositiveInt(id, "id_cotizacion");
    const [result] = await db.execute("DELETE FROM cotizaciones WHERE id_cotizacion = ?", [id_cotizacion]);

    if (!result.affectedRows) {
        throw new Error("Cotizacion no encontrada");
    }

    return { message: "Cotizacion eliminada" };
}

export async function searchClientesCatalog({ search = "", limit = 15 } = {}) {
    const top = Math.min(Math.max(Number(limit) || 15, 1), 50);
    const q = `%${String(search || "").trim()}%`;

    const [rows] = await db.execute(
        `
        SELECT
            c.id_cliente,
            c.nombre,
            c.rfc,
            c.telefono,
            c.email,
            c.ciudad,
            c.estado,
            c.tipo_cliente,
            tc.nivel_precio
        FROM clientes c
        LEFT JOIN catalogo_tipos_cliente tc ON tc.nombre = c.tipo_cliente
        WHERE (? = '%%' OR c.nombre LIKE ? OR c.rfc LIKE ? OR c.telefono LIKE ?)
        ORDER BY c.nombre ASC
        LIMIT ${top}
        `,
        [q, q, q, q]
    );

    return rows;
}

export async function searchProductosCotizacionClienteCatalog({ search = "", limit = 20 } = {}) {
    return searchPresentacionesEmpresaCatalog({ search, limit });
}

export async function searchPresentacionesCatalog(params = {}) {
    return searchPresentacionesEmpresaCatalog(params);
}
