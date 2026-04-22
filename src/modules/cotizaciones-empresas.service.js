import db from "@/lib/db";

const IVA_RATE = 0.16;

function to6(value) {
    return Math.round(Number(value || 0) * 1000000) / 1000000;
}

function toPositiveInt(value, fieldName) {
    const number = Number(value);
    if (!Number.isInteger(number) || number <= 0) {
        throw new Error(`${fieldName} invalido`);
    }
    return number;
}

function toDate(value, fieldName) {
    const text = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        throw new Error(`${fieldName} invalida`);
    }
    return text;
}

function toText(value, fieldName) {
    const text = String(value || "").trim();
    if (!text) {
        throw new Error(`${fieldName} es requerido`);
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

function normalizeUnidad(value) {
    const unidad = String(value || "").trim().toLowerCase();
    if (["pieza", "caja", "paquete"].includes(unidad)) {
        return unidad;
    }
    return "pieza";
}

function parseDescripcionMeta(rawValue) {
    const raw = String(rawValue || "").trim();
    const match = raw.match(/^\[REQ:([^\]]+)\]\s*(.*)$/i);
    if (!match) {
        return {
            descripcion_personalizada: raw,
            requerimiento: "",
        };
    }

    return {
        requerimiento: String(match[1] || "").trim(),
        descripcion_personalizada: String(match[2] || "").trim(),
    };
}

function composeDescripcion({ descripcion_personalizada, requerimiento }) {
    const descripcion = String(descripcion_personalizada || "").trim();
    const req = String(requerimiento || "").trim();

    if (!descripcion) {
        throw new Error("descripcion de la partida es requerida");
    }

    if (!req) {
        return descripcion;
    }

    return `[REQ:${req}] ${descripcion}`;
}

function normalizeDetalleRow(row) {
    const parsed = parseDescripcionMeta(row.descripcion);
    const cantidadFactura = Number(row.cantidad || 0);
    const cantidadSistema = Number(row.cantidad_sistema || cantidadFactura || 0);

    return {
        id_detalle: row.id_detalleCotizacionEmpresa,
        descripcion: String(row.descripcion || "").trim(),
        descripcion_personalizada: parsed.descripcion_personalizada,
        requerimiento: parsed.requerimiento,
        cantidad: cantidadFactura,
        cantidad_factura: cantidadFactura,
        cantidad_sistema: cantidadSistema,
        piso: Number(row.piso || 0),
        bodega: Number(row.bodega || 0),
        precio_sin_iva: to6(row.precio_sin_iva || 0),
        precio_con_iva: to6(row.precio_con_iva || 0),
        unidad: normalizeUnidad(row.unidad),
        total: to6(row.total || 0),
    };
}

function normalizeHeaderRow(row) {
    return {
        id_cotizacion_empresa: row.id_cotizacion_empresa,
        id_empresa: row.id_empresa,
        empresa_nombre: row.empresa_nombre,
        empresa_nombre_fiscal: row.empresa_nombre_fiscal,
        empresa_rfc: row.empresa_rfc,
        empresa_direccion: row.empresa_direccion,
        empresa_colonia: row.empresa_colonia,
        empresa_ciudad: row.empresa_ciudad,
        empresa_cp: row.empresa_cp,
        empresa_estado: row.empresa_estado,
        id_usuario: row.id_usuario,
        usuario_nombre: row.usuario_nombre,
        fecha_emision: row.fecha_emision,
        vigencia_dias: Number(row.vigencia_dias || 0),
        total: Number(row.total || 0),
        created_at: row.created_at,
    };
}

function normalizeDetalles(detalles) {
    if (!Array.isArray(detalles) || !detalles.length) {
        throw new Error("Debes agregar al menos una partida");
    }

    return detalles.map((detalle, index) => {
        const line = index + 1;
        const cantidad_factura = toPositiveInt(
            detalle.cantidad_factura !== undefined ? detalle.cantidad_factura : detalle.cantidad,
            `cantidad factura de la partida ${line}`
        );

        const cantidad_sistema_raw = Number(detalle.cantidad_sistema ?? cantidad_factura);
        const cantidad_sistema = Number.isInteger(cantidad_sistema_raw) && cantidad_sistema_raw > 0
            ? cantidad_sistema_raw
            : cantidad_factura;

        const isDivisible = (cantidad_factura % cantidad_sistema === 0) || (cantidad_sistema % cantidad_factura === 0);
        if (!isDivisible) {
            throw new Error(`La cantidad factura de la partida ${line} debe ser multiplo o divisor de la cantidad de sistema`);
        }

        const precio_sin_iva = to6(toMoney(detalle.precio_sin_iva, `precio sin IVA de la partida ${line}`));
        const precio_con_iva = to6(toMoney(
            detalle.precio_con_iva !== undefined ? detalle.precio_con_iva : precio_sin_iva * (1 + IVA_RATE),
            `precio con IVA de la partida ${line}`
        ));
        const unidad = normalizeUnidad(detalle.unidad);
        const total = to6(cantidad_factura * precio_sin_iva);
        const descripcion = composeDescripcion({
            descripcion_personalizada: detalle.descripcion_personalizada ?? detalle.descripcion,
            requerimiento: detalle.requerimiento,
        });

        return {
            descripcion,
            cantidad: cantidad_factura,
            cantidad_factura,
            cantidad_sistema,
            piso: Number(detalle.piso || 0),
            bodega: Number(detalle.bodega || 0),
            precio_sin_iva,
            precio_con_iva,
            unidad,
            total,
        };
    });
}

export async function getCotizacionesEmpresas({ search = "", id_empresa, fecha_desde, fecha_hasta } = {}) {
    let sql = `
        SELECT
            ce.id_cotizacion_empresa,
            ce.id_empresa,
            e.nombre AS empresa_nombre,
            e.nombre_fiscal AS empresa_nombre_fiscal,
            e.rfc AS empresa_rfc,
            e.direccion AS empresa_direccion,
            e.colonia AS empresa_colonia,
            e.ciudad AS empresa_ciudad,
            e.cp AS empresa_cp,
            e.estado AS empresa_estado,
            ce.id_usuario,
            u.nombre AS usuario_nombre,
            ce.fecha_emision,
            ce.vigencia_dias,
            ce.total,
            ce.created_at
        FROM cotizacion_empresa ce
        INNER JOIN empresas e ON e.id_empresa = ce.id_empresa
        INNER JOIN usuarios u ON u.id_usuario = ce.id_usuario
        WHERE 1 = 1
    `;

    const params = [];

    if (search) {
        sql += " AND (e.nombre LIKE ? OR ce.id_cotizacion_empresa LIKE ?)";
        const q = `%${search}%`;
        params.push(q, q);
    }

    if (id_empresa) {
        sql += " AND ce.id_empresa = ?";
        params.push(toPositiveInt(id_empresa, "id_empresa"));
    }

    if (fecha_desde) {
        sql += " AND ce.fecha_emision >= ?";
        params.push(toDate(fecha_desde, "fecha_desde"));
    }

    if (fecha_hasta) {
        sql += " AND ce.fecha_emision <= ?";
        params.push(toDate(fecha_hasta, "fecha_hasta"));
    }

    sql += " ORDER BY ce.id_cotizacion_empresa DESC";

    const [rows] = await db.execute(sql, params);
    return rows.map(normalizeHeaderRow);
}

export async function getCotizacionEmpresaById(id) {
    const idCotizacion = toPositiveInt(id, "id_cotizacion_empresa");

    const [headerRows] = await db.execute(
        `
        SELECT
            ce.id_cotizacion_empresa,
            ce.id_empresa,
            e.nombre AS empresa_nombre,
            e.nombre_fiscal AS empresa_nombre_fiscal,
            e.rfc AS empresa_rfc,
            e.direccion AS empresa_direccion,
            e.colonia AS empresa_colonia,
            e.ciudad AS empresa_ciudad,
            e.cp AS empresa_cp,
            e.estado AS empresa_estado,
            ce.id_usuario,
            u.nombre AS usuario_nombre,
            ce.fecha_emision,
            ce.vigencia_dias,
            ce.total,
            ce.created_at
        FROM cotizacion_empresa ce
        INNER JOIN empresas e ON e.id_empresa = ce.id_empresa
        INNER JOIN usuarios u ON u.id_usuario = ce.id_usuario
        WHERE ce.id_cotizacion_empresa = ?
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
            id_detalleCotizacionEmpresa,
            descripcion,
            cantidad,
            precio_sin_iva,
            precio_con_iva,
            unidad,
            total,
            0 AS cantidad_sistema,
            0 AS piso,
            0 AS bodega
        FROM detalle_cotizacion_empresa
        WHERE id_cotizacion_empresa = ?
        ORDER BY id_detalleCotizacionEmpresa ASC
        `,
        [idCotizacion]
    );

    return {
        ...normalizeHeaderRow(headerRows[0]),
        detalles: detalleRows.map(normalizeDetalleRow),
    };
}

export async function createCotizacionEmpresa(data) {
    const id_empresa = toPositiveInt(data.id_empresa, "id_empresa");
    const id_usuario = toPositiveInt(data.id_usuario, "id_usuario");
    const fecha_emision = toDate(data.fecha_emision, "fecha_emision");
    const vigencia_dias = toPositiveInt(data.vigencia_dias, "vigencia_dias");
    const detalles = normalizeDetalles(data.detalles);
    const total = Math.round(detalles.reduce((acc, item) => acc + item.total, 0) * 100) / 100;

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [insertResult] = await conn.execute(
            `
            INSERT INTO cotizacion_empresa (id_empresa, id_usuario, fecha_emision, vigencia_dias, total)
            VALUES (?, ?, ?, ?, ?)
            `,
            [id_empresa, id_usuario, fecha_emision, vigencia_dias, total]
        );

        const id_cotizacion_empresa = insertResult.insertId;

        for (const item of detalles) {
            await conn.execute(
                `
                INSERT INTO detalle_cotizacion_empresa
                (id_cotizacion_empresa, descripcion, cantidad, precio_sin_iva, precio_con_iva, unidad, total)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    id_cotizacion_empresa,
                    item.descripcion,
                    item.cantidad,
                    item.precio_sin_iva,
                    item.precio_con_iva,
                    item.unidad,
                    item.total,
                ]
            );
        }

        await conn.commit();

        return { id_cotizacion_empresa, message: "Cotizacion creada" };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

export async function updateCotizacionEmpresa(id, data) {
    const id_cotizacion_empresa = toPositiveInt(id, "id_cotizacion_empresa");
    const id_empresa = toPositiveInt(data.id_empresa, "id_empresa");
    const id_usuario = toPositiveInt(data.id_usuario, "id_usuario");
    const fecha_emision = toDate(data.fecha_emision ?? data.emision, "fecha_emision");
    const vigencia_dias = toPositiveInt(data.vigencia_dias, "vigencia_dias");
    const detalles = normalizeDetalles(data.detalles);
    const total = Math.round(detalles.reduce((acc, item) => acc + item.total, 0) * 100) / 100;

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [updateResult] = await conn.execute(
            `
            UPDATE cotizacion_empresa
            SET id_empresa = ?, id_usuario = ?, fecha_emision = ?, vigencia_dias = ?, total = ?
            WHERE id_cotizacion_empresa = ?
            `,
            [id_empresa, id_usuario, fecha_emision, vigencia_dias, total, id_cotizacion_empresa]
        );

        if (!updateResult.affectedRows) {
            throw new Error("Cotizacion no encontrada");
        }

        await conn.execute(
            `DELETE FROM detalle_cotizacion_empresa WHERE id_cotizacion_empresa = ?`,
            [id_cotizacion_empresa]
        );

        for (const item of detalles) {
            await conn.execute(
                `
                INSERT INTO detalle_cotizacion_empresa
                (id_cotizacion_empresa, descripcion, cantidad, precio_sin_iva, precio_con_iva, unidad, total)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    id_cotizacion_empresa,
                    item.descripcion,
                    item.cantidad,
                    item.precio_sin_iva,
                    item.precio_con_iva,
                    item.unidad,
                    item.total,
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

export async function deleteCotizacionEmpresa(id) {
    const id_cotizacion_empresa = toPositiveInt(id, "id_cotizacion_empresa");

    const [result] = await db.execute(
        "DELETE FROM cotizacion_empresa WHERE id_cotizacion_empresa = ?",
        [id_cotizacion_empresa]
    );

    if (!result.affectedRows) {
        throw new Error("Cotizacion no encontrada");
    }

    return { message: "Cotizacion eliminada" };
}

export async function searchEmpresasCatalog({ search = "", limit = 15 } = {}) {
    const top = Math.min(Math.max(Number(limit) || 15, 1), 50);
    const q = `%${String(search || "").trim()}%`;

    const [rows] = await db.execute(
        `
        SELECT id_empresa, nombre, rfc, nombre_fiscal, direccion, colonia, ciudad, cp, estado
        FROM empresas
        WHERE (? = '%%' OR nombre LIKE ? OR nombre_fiscal LIKE ? OR rfc LIKE ?)
        ORDER BY nombre ASC
        LIMIT ${top}
        `,
        [q, q, q, q]
    );

    return rows;
}

export async function searchProductosCatalog({ search = "", limit = 20 } = {}) {
    const top = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const q = `%${String(search || "").trim()}%`;

    const [rows] = await db.execute(
        `
        SELECT
            pp.id_presentacion,
            p.id_producto,
            p.nombre AS producto_nombre,
            pp.nombre AS presentacion_nombre,
            pp.codigo_barras,
            pp.tipo_presentacion,
            pp.piezas_por_presentacion,
            pp.costo,
            pp.ultimo_costo,
            pp.precio_nivel_1,
            pp.precio_nivel_2,
            pp.precio_nivel_3,
            pp.precio_nivel_4,
            pp.precio_nivel_5,
            COALESCE(SUM(CASE WHEN LOWER(a.nombre) LIKE '%piso%' THEN inv.stock ELSE 0 END), 0) AS piso,
            COALESCE(SUM(CASE WHEN LOWER(a.nombre) LIKE '%bodega%' THEN inv.stock ELSE 0 END), 0) AS bodega
        FROM producto_presentaciones pp
        INNER JOIN productos p ON p.id_producto = pp.id_producto
        LEFT JOIN inventario inv ON inv.id_presentacion = pp.id_presentacion
        LEFT JOIN almacenes a ON a.id_almacen = inv.id_almacen
        WHERE pp.activo = 1
          AND p.activo = 1
          AND (
            ? = '%%'
            OR p.nombre LIKE ?
            OR pp.nombre LIKE ?
            OR pp.codigo_barras LIKE ?
          )
        GROUP BY
            pp.id_presentacion,
            p.id_producto,
            p.nombre,
            pp.nombre,
            pp.codigo_barras,
            pp.tipo_presentacion,
            pp.piezas_por_presentacion,
            pp.costo,
            pp.ultimo_costo,
            pp.precio_nivel_1,
            pp.precio_nivel_2,
            pp.precio_nivel_3,
            pp.precio_nivel_4,
            pp.precio_nivel_5
        ORDER BY p.nombre ASC, pp.nombre ASC
        LIMIT ${top}
        `,
        [q, q, q, q]
    );

    return rows.map((row) => {
        const unidadRaw = String(row.tipo_presentacion || "").toLowerCase();
        const unidad = ["pieza", "caja", "paquete"].includes(unidadRaw) ? unidadRaw : "pieza";
        const preciosConIva = [
            Number(row.precio_nivel_1 ?? 0),
            Number(row.precio_nivel_2 ?? 0),
            Number(row.precio_nivel_3 ?? 0),
            Number(row.precio_nivel_4 ?? 0),
            Number(row.precio_nivel_5 ?? 0),
        ];
        const firstPrecio = preciosConIva.find((precio) => Number.isFinite(precio) && precio > 0);
        const precioReferencia = Number(firstPrecio ?? row.costo ?? row.ultimo_costo ?? 0);
        const manualPriceNet = to6(precioReferencia / (1 + IVA_RATE));
        const quantitySistema = Number(row.piezas_por_presentacion || 1) || 1;
        const priceLevels = preciosConIva
            .map((precioConIva, index) => {
                if (!Number.isFinite(precioConIva) || precioConIva <= 0) return null;
                return {
                    level: index + 1,
                    price_with_tax: to6(precioConIva),
                    price_without_tax: to6(precioConIva / (1 + IVA_RATE)),
                };
            })
            .filter(Boolean);

        return {
            id_presentacion: row.id_presentacion,
            id_producto: row.id_producto,
            name: `${row.producto_nombre} ${row.presentacion_nombre}`.trim(),
            producto_nombre: row.producto_nombre,
            presentacion_nombre: row.presentacion_nombre,
            codigo_barras: row.codigo_barras,
            tax_unit: unidad,
            quantity: quantitySistema,
            tax_quantity: quantitySistema,
            tipo_presentacion: unidad,
            piezas_por_presentacion: quantitySistema,
            unit_cost: Number(row.costo || 0),
            manual_price: to6(precioReferencia),
            manual_price_net: manualPriceNet,
            price_levels: priceLevels,
            custom_description: `${row.producto_nombre} ${row.presentacion_nombre}`.trim(),
            piso: Number(row.piso || 0),
            bodega: Number(row.bodega || 0),
        };
    });
}
