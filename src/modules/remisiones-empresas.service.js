import db from "@/lib/db";
import { aplicarMovimientoRemision, reversorMovimientoRemision } from "./almacenes.service";

const IVA_RATE = 0.16;

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

function normalizeUnidad(value) {
    const unit = String(value || "").toLowerCase();
    if (["pieza", "caja", "paquete"].includes(unit)) return unit;
    return "pieza";
}

function toMoney(value, fieldName) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
        throw new Error(`${fieldName} invalido`);
    }
    return Math.round(n * 100) / 100;
}

function to6(value) {
    return Math.round(Number(value || 0) * 1000000) / 1000000;
}

function fmtDateOnly(value) {
    if (!value) return null;
    return new Date(value).toISOString().slice(0, 10);
}

async function buildNextFolio(connection) {
    const [[{ nextNum }]] = await connection.execute(
        "SELECT COALESCE(MAX(id_remision_empresa), 0) + 1 AS nextNum FROM remisiones_empresa"
    );
    return `REM-E-${String(nextNum).padStart(6, "0")}`;
}

function normalizeDetalleInput(detalle, line) {
    const descripcion = String(detalle.descripcion || "").trim();
    if (!descripcion) throw new Error(`descripcion de la partida ${line} es requerida`);

    const id_presentacion = toPositiveInt(detalle.id_presentacion, `id_presentacion de la partida ${line}`);
    const id_almacen = toPositiveInt(detalle.id_almacen, `id_almacen de la partida ${line}`);

    const cantidad_factura = toPositiveInt(
        detalle.cantidad_factura !== undefined ? detalle.cantidad_factura : detalle.cantidad,
        `cantidad factura de la partida ${line}`
    );

    const cantidadSistemaRaw = Number(detalle.cantidad_sistema ?? cantidad_factura);
    const cantidad_sistema = Number.isInteger(cantidadSistemaRaw) && cantidadSistemaRaw > 0
        ? cantidadSistemaRaw
        : cantidad_factura;

    const precio_sin_iva = toMoney(detalle.precio_sin_iva, `precio sin IVA de la partida ${line}`);
    const precio_con_iva = toMoney(
        detalle.precio_con_iva !== undefined ? detalle.precio_con_iva : precio_sin_iva * (1 + IVA_RATE),
        `precio con IVA de la partida ${line}`
    );

    return {
        descripcion,
        id_presentacion,
        id_almacen,
        requerimiento: String(detalle.requerimiento || "").trim() || null,
        cantidad_sistema,
        cantidad_factura,
        unidad: normalizeUnidad(detalle.unidad),
        precio_sin_iva,
        precio_con_iva,
        total_sin_iva: to6(cantidad_factura * precio_sin_iva),
        total_con_iva: to6(cantidad_factura * precio_con_iva),
        piso: Number(detalle.piso || 0),
        bodega: Number(detalle.bodega || 0),
        orden: Number.isInteger(Number(detalle.orden)) ? Number(detalle.orden) : line,
    };
}

function parseListRow(row) {
    return {
        id_remision_empresa: row.id_remision_empresa,
        folio_remision: row.folio_remision,
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
        empresa_pago_habitual: row.empresa_pago_habitual,
        id_usuario: row.id_usuario,
        usuario_nombre: row.usuario_nombre,
        fecha_remision: row.fecha_remision,
        fecha_vencimiento: row.fecha_vencimiento,
        total_sin_iva: Number(row.total_sin_iva || 0),
        total_con_iva: Number(row.total_con_iva || 0),
        saldo_pendiente: Number(row.saldo_pendiente || 0),
        estado_pago: row.estado_pago,
        facturada: Boolean(row.facturada),
        folio_factura: row.folio_factura,
        fecha_factura: row.fecha_factura,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

async function ensureHeaderRefs(connection, payload) {
    const idEmpresa = toPositiveInt(payload.id_empresa, "id_empresa");
    const idUsuario = toPositiveInt(payload.id_usuario, "id_usuario");

    const [[empresa]] = await connection.execute(
        "SELECT id_empresa FROM empresas WHERE id_empresa = ? LIMIT 1",
        [idEmpresa]
    );
    if (!empresa) throw new Error("empresa no encontrada");

    const [[usuario]] = await connection.execute(
        "SELECT id_usuario FROM usuarios WHERE id_usuario = ? LIMIT 1",
        [idUsuario]
    );
    if (!usuario) throw new Error("usuario no encontrado");

    return { idEmpresa, idUsuario };
}

async function getCotizacionDetalleForRemision(connection, idCotizacion) {
    const [[header]] = await connection.execute(
        `
        SELECT id_cotizacion_empresa, id_empresa, id_usuario, fecha_emision, vigencia_dias
        FROM cotizacion_empresa
        WHERE id_cotizacion_empresa = ?
        LIMIT 1
        `,
        [idCotizacion]
    );

    if (!header) throw new Error("cotizacion no encontrada");

    const [detalleRows] = await connection.execute(
        `
        SELECT
            id_detalleCotizacionEmpresa,
            id_presentacion,
            id_almacen,
            descripcion,
            cantidad,
            precio_sin_iva,
            precio_con_iva,
            unidad,
            total,
            (SELECT pp.nombre FROM producto_presentaciones pp WHERE pp.id_presentacion = detalle_cotizacion_empresa.id_presentacion LIMIT 1) AS presentacion_nombre,
            (SELECT a.nombre FROM almacenes a WHERE a.id_almacen = detalle_cotizacion_empresa.id_almacen LIMIT 1) AS almacen_nombre
        FROM detalle_cotizacion_empresa
        WHERE id_cotizacion_empresa = ?
        ORDER BY id_detalleCotizacionEmpresa ASC
        `,
        [idCotizacion]
    );

    if (!detalleRows.length) {
        throw new Error("la cotizacion no tiene partidas");
    }

    const detalles = detalleRows.map((row, idx) => {
        const rawDesc = String(row.descripcion || "").trim();
        const metaMatch = rawDesc.match(/^\[REQ:([^\]]+)\]\s*(.*)$/i);
        const requerimiento = metaMatch ? String(metaMatch[1] || "").trim() : null;
        const descripcion = metaMatch ? String(metaMatch[2] || "").trim() : rawDesc;

        const cantidad = toPositiveInt(row.cantidad, `cantidad de la partida ${idx + 1}`);
        const precioSin = toMoney(row.precio_sin_iva, `precio sin IVA de la partida ${idx + 1}`);
        const precioCon = toMoney(row.precio_con_iva, `precio con IVA de la partida ${idx + 1}`);

        return {
            descripcion,
            requerimiento,
            id_presentacion: row.id_presentacion ? Number(row.id_presentacion) : null,
            id_almacen: row.id_almacen ? Number(row.id_almacen) : null,
            presentacion_nombre: row.presentacion_nombre || "",
            almacen_nombre: row.almacen_nombre || "",
            cantidad_sistema: cantidad,
            cantidad_factura: cantidad,
            unidad: normalizeUnidad(row.unidad),
            precio_sin_iva: precioSin,
            precio_con_iva: precioCon,
            total_sin_iva: to6(cantidad * precioSin),
            total_con_iva: to6(cantidad * precioCon),
            piso: 0,
            bodega: 0,
            orden: idx + 1,
        };
    });

    return { header, detalles };
}

export async function getRemisionesEmpresas({
    search = "",
    estado = "",
    facturada = "",
    id_empresa = "",
    desde = "",
    hasta = "",
} = {}) {
    let sql = `
        SELECT
            re.id_remision_empresa,
            re.folio_remision,
            re.id_cotizacion_empresa,
            re.id_empresa,
            e.nombre AS empresa_nombre,
            e.nombre_fiscal AS empresa_nombre_fiscal,
            e.rfc AS empresa_rfc,
            e.direccion AS empresa_direccion,
            e.colonia AS empresa_colonia,
            e.ciudad AS empresa_ciudad,
            e.cp AS empresa_cp,
            e.estado AS empresa_estado,
            e.pago_habitual AS empresa_pago_habitual,
            re.id_usuario,
            u.nombre AS usuario_nombre,
            re.fecha_remision,
            re.fecha_vencimiento,
            re.total_sin_iva,
            re.total_con_iva,
            re.saldo_pendiente,
            re.estado_pago,
            re.facturada,
            re.folio_factura,
            re.fecha_factura,
            re.created_at,
            re.updated_at
        FROM remisiones_empresa re
        INNER JOIN empresas e ON e.id_empresa = re.id_empresa
        INNER JOIN usuarios u ON u.id_usuario = re.id_usuario
        WHERE 1 = 1
    `;

    const params = [];

    if (search) {
        const q = `%${search}%`;
        sql += " AND (re.folio_remision LIKE ? OR e.nombre LIKE ? OR re.folio_factura LIKE ?)";
        params.push(q, q, q);
    }

    if (estado) {
        sql += " AND re.estado_pago = ?";
        params.push(estado);
    }

    if (facturada === "1" || facturada === "0") {
        sql += " AND re.facturada = ?";
        params.push(Number(facturada));
    }

    if (id_empresa) {
        sql += " AND re.id_empresa = ?";
        params.push(toPositiveInt(id_empresa, "id_empresa"));
    }

    if (desde) {
        sql += " AND re.fecha_remision >= ?";
        params.push(toDate(desde, "desde"));
    }

    if (hasta) {
        sql += " AND re.fecha_remision <= ?";
        params.push(toDate(hasta, "hasta"));
    }

    sql += " ORDER BY re.id_remision_empresa DESC";

    const [rows] = await db.execute(sql, params);
    return rows.map(parseListRow);
}

export async function getRemisionEmpresaById(id) {
    const idRemision = toPositiveInt(id, "id_remision_empresa");

    const [headers] = await db.execute(
        `
        SELECT
            re.id_remision_empresa,
            re.folio_remision,
            re.id_cotizacion_empresa,
            re.id_empresa,
            e.nombre AS empresa_nombre,
            e.nombre_fiscal AS empresa_nombre_fiscal,
            e.rfc AS empresa_rfc,
            e.direccion AS empresa_direccion,
            e.colonia AS empresa_colonia,
            e.ciudad AS empresa_ciudad,
            e.cp AS empresa_cp,
            e.estado AS empresa_estado,
            e.pago_habitual AS empresa_pago_habitual,
            re.id_usuario,
            u.nombre AS usuario_nombre,
            re.fecha_remision,
            re.fecha_vencimiento,
            re.total_sin_iva,
            re.total_con_iva,
            re.saldo_pendiente,
            re.estado_pago,
            re.facturada,
            re.folio_factura,
            re.fecha_factura,
            re.metodo_pago,
            re.forma_pago,
            re.uso_cfdi,
            re.regimen_fiscal,
            re.correo_destino,
            re.observaciones,
            re.created_at,
            re.updated_at
        FROM remisiones_empresa re
        INNER JOIN empresas e ON e.id_empresa = re.id_empresa
        INNER JOIN usuarios u ON u.id_usuario = re.id_usuario
        WHERE re.id_remision_empresa = ?
        LIMIT 1
        `,
        [idRemision]
    );

    if (!headers.length) throw new Error("remision no encontrada");

    const [detalles] = await db.execute(
        `
        SELECT
            id_detalle_remision_empresa,
            id_presentacion,
            id_almacen,
            descripcion,
            requerimiento,
            cantidad_sistema,
            cantidad_factura,
            unidad,
            precio_sin_iva,
            precio_con_iva,
            total_sin_iva,
            total_con_iva,
            piso,
            bodega,
            orden,
            (SELECT pp.nombre FROM producto_presentaciones pp WHERE pp.id_presentacion = detalle_remision_empresa.id_presentacion LIMIT 1) AS presentacion_nombre,
            (SELECT a.nombre FROM almacenes a WHERE a.id_almacen = detalle_remision_empresa.id_almacen LIMIT 1) AS almacen_nombre
        FROM detalle_remision_empresa
        WHERE id_remision_empresa = ?
        ORDER BY orden ASC, id_detalle_remision_empresa ASC
        `,
        [idRemision]
    );

    return {
        ...parseListRow(headers[0]),
        metodo_pago: headers[0].metodo_pago,
        forma_pago: headers[0].forma_pago,
        uso_cfdi: headers[0].uso_cfdi,
        regimen_fiscal: headers[0].regimen_fiscal,
        correo_destino: headers[0].correo_destino,
        observaciones: headers[0].observaciones,
        detalles: detalles.map((line) => ({
            id_detalle_remision_empresa: line.id_detalle_remision_empresa,
            id_presentacion: Number(line.id_presentacion || 0),
            id_almacen: Number(line.id_almacen || 0),
            presentacion_nombre: line.presentacion_nombre || "",
            almacen_nombre: line.almacen_nombre || "",
            descripcion: line.descripcion,
            requerimiento: line.requerimiento,
            cantidad_sistema: Number(line.cantidad_sistema || 0),
            cantidad_factura: Number(line.cantidad_factura || 0),
            unidad: normalizeUnidad(line.unidad),
            precio_sin_iva: Number(line.precio_sin_iva || 0),
            precio_con_iva: Number(line.precio_con_iva || 0),
            total_sin_iva: Number(line.total_sin_iva || 0),
            total_con_iva: Number(line.total_con_iva || 0),
            piso: Number(line.piso || 0),
            bodega: Number(line.bodega || 0),
            orden: Number(line.orden || 0),
        })),
    };
}

export async function createRemisionEmpresa(payload) {
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        let idCotizacion = null;
        let headerSeed = null;
        let detalles = [];

        if (payload.id_cotizacion_empresa) {
            idCotizacion = toPositiveInt(payload.id_cotizacion_empresa, "id_cotizacion_empresa");
            const fromCot = await getCotizacionDetalleForRemision(conn, idCotizacion);
            headerSeed = fromCot.header;
            detalles = fromCot.detalles;

            const [[exists]] = await conn.execute(
                "SELECT id_remision_empresa FROM remisiones_empresa WHERE id_cotizacion_empresa = ? LIMIT 1",
                [idCotizacion]
            );
            if (exists) {
                throw new Error("esa cotizacion ya tiene una remision creada");
            }
        }

        if (Array.isArray(payload.detalles) && payload.detalles.length) {
            detalles = payload.detalles.map((d, idx) => normalizeDetalleInput(d, idx + 1));
        }

        if (!detalles.length) {
            throw new Error("debes agregar al menos una partida para la remision");
        }

        const headerValues = {
            id_empresa: payload.id_empresa ?? headerSeed?.id_empresa,
            id_usuario: payload.id_usuario ?? headerSeed?.id_usuario,
        };

        const { idEmpresa, idUsuario } = await ensureHeaderRefs(conn, headerValues);

        const fechaRemision = toDate(payload.fecha_remision || fmtDateOnly(new Date()), "fecha_remision");

        let fechaVencimiento = null;
        if (payload.fecha_vencimiento) {
            fechaVencimiento = toDate(payload.fecha_vencimiento, "fecha_vencimiento");
        } else if (headerSeed?.fecha_emision && headerSeed?.vigencia_dias) {
            const base = new Date(headerSeed.fecha_emision);
            base.setDate(base.getDate() + Number(headerSeed.vigencia_dias || 0));
            fechaVencimiento = fmtDateOnly(base);
        }

        const totalSinIva = to6(detalles.reduce((acc, d) => acc + Number(d.total_sin_iva || 0), 0));
        const totalConIva = to6(detalles.reduce((acc, d) => acc + Number(d.total_con_iva || 0), 0));

        const folioRemision = String(payload.folio_remision || "").trim() || await buildNextFolio(conn);

        const [ins] = await conn.execute(
            `
            INSERT INTO remisiones_empresa (
                folio_remision,
                id_cotizacion_empresa,
                id_empresa,
                id_usuario,
                fecha_remision,
                fecha_vencimiento,
                total_sin_iva,
                total_con_iva,
                saldo_pendiente,
                estado_pago,
                facturada,
                observaciones
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', 0, ?)
            `,
            [
                folioRemision,
                idCotizacion,
                idEmpresa,
                idUsuario,
                fechaRemision,
                fechaVencimiento,
                totalSinIva,
                totalConIva,
                totalConIva,
                String(payload.observaciones || "").trim() || null,
            ]
        );

        const idRemision = ins.insertId;

        for (let i = 0; i < detalles.length; i += 1) {
            const d = detalles[i];
            await conn.execute(
                `
                INSERT INTO detalle_remision_empresa (
                    id_remision_empresa,
                    id_presentacion,
                    id_almacen,
                    descripcion,
                    requerimiento,
                    cantidad_sistema,
                    cantidad_factura,
                    unidad,
                    precio_sin_iva,
                    precio_con_iva,
                    total_sin_iva,
                    total_con_iva,
                    piso,
                    bodega,
                    orden
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    idRemision,
                    d.id_presentacion,
                    d.id_almacen,
                    d.descripcion,
                    d.requerimiento,
                    d.cantidad_sistema,
                    d.cantidad_factura,
                    d.unidad,
                    d.precio_sin_iva,
                    d.precio_con_iva,
                    d.total_sin_iva,
                    d.total_con_iva,
                    d.piso,
                    d.bodega,
                    i + 1,
                ]
            );
        }

        await aplicarMovimientoRemision(conn, idRemision, detalles.map((item) => ({
            id_presentacion: item.id_presentacion,
            id_almacen: item.id_almacen,
            cantidad: item.cantidad_factura,
        })));

        await conn.commit();
        return getRemisionEmpresaById(idRemision);
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

export async function updateRemisionEmpresa(id, payload) {
    const idRemision = toPositiveInt(id, "id_remision_empresa");
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [[current]] = await conn.execute(
            `
            SELECT id_remision_empresa, facturada
            FROM remisiones_empresa
            WHERE id_remision_empresa = ?
            LIMIT 1
            `,
            [idRemision]
        );

        if (!current) throw new Error("remision no encontrada");

        await reversorMovimientoRemision(conn, idRemision);

        const { idEmpresa, idUsuario } = await ensureHeaderRefs(conn, {
            id_empresa: payload.id_empresa,
            id_usuario: payload.id_usuario,
        });

        const fechaRemision = toDate(payload.fecha_remision, "fecha_remision");
        const fechaVencimiento = payload.fecha_vencimiento
            ? toDate(payload.fecha_vencimiento, "fecha_vencimiento")
            : null;

        const detalles = Array.isArray(payload.detalles)
            ? payload.detalles.map((d, idx) => normalizeDetalleInput(d, idx + 1))
            : [];

        if (!detalles.length) {
            throw new Error("debes agregar al menos una partida");
        }

        const totalSinIva = to6(detalles.reduce((acc, d) => acc + Number(d.total_sin_iva || 0), 0));
        const totalConIva = to6(detalles.reduce((acc, d) => acc + Number(d.total_con_iva || 0), 0));

        await conn.execute(
            `
            UPDATE remisiones_empresa
            SET
                id_empresa = ?,
                id_usuario = ?,
                fecha_remision = ?,
                fecha_vencimiento = ?,
                total_sin_iva = ?,
                total_con_iva = ?,
                saldo_pendiente = CASE
                    WHEN estado_pago = 'pagada' THEN 0
                    ELSE LEAST(?, total_con_iva)
                END,
                observaciones = ?,
                updated_at = NOW()
            WHERE id_remision_empresa = ?
            `,
            [
                idEmpresa,
                idUsuario,
                fechaRemision,
                fechaVencimiento,
                totalSinIva,
                totalConIva,
                totalConIva,
                String(payload.observaciones || "").trim() || null,
                idRemision,
            ]
        );

        await conn.execute(
            "DELETE FROM detalle_remision_empresa WHERE id_remision_empresa = ?",
            [idRemision]
        );

        for (let i = 0; i < detalles.length; i += 1) {
            const d = detalles[i];
            await conn.execute(
                `
                INSERT INTO detalle_remision_empresa (
                    id_remision_empresa,
                    id_presentacion,
                    id_almacen,
                    descripcion,
                    requerimiento,
                    cantidad_sistema,
                    cantidad_factura,
                    unidad,
                    precio_sin_iva,
                    precio_con_iva,
                    total_sin_iva,
                    total_con_iva,
                    piso,
                    bodega,
                    orden
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    idRemision,
                    d.id_presentacion,
                    d.id_almacen,
                    d.descripcion,
                    d.requerimiento,
                    d.cantidad_sistema,
                    d.cantidad_factura,
                    d.unidad,
                    d.precio_sin_iva,
                    d.precio_con_iva,
                    d.total_sin_iva,
                    d.total_con_iva,
                    d.piso,
                    d.bodega,
                    i + 1,
                ]
            );
        }

        await aplicarMovimientoRemision(conn, idRemision, detalles.map((item) => ({
            id_presentacion: item.id_presentacion,
            id_almacen: item.id_almacen,
            cantidad: item.cantidad_factura,
        })));

        await conn.commit();
        return getRemisionEmpresaById(idRemision);
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

export async function deleteRemisionEmpresa(id) {
    const idRemision = toPositiveInt(id, "id_remision_empresa");

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [[exists]] = await conn.execute(
            "SELECT id_remision_empresa FROM remisiones_empresa WHERE id_remision_empresa = ? LIMIT 1",
            [idRemision]
        );
        if (!exists) throw new Error("remision no encontrada");

        const [[abonos]] = await conn.execute(
            "SELECT COUNT(*) AS total FROM abonos_remision_empresa WHERE id_remision_empresa = ?",
            [idRemision]
        );

        if (Number(abonos.total || 0) > 0) {
            throw new Error("no se puede eliminar una remision con abonos registrados");
        }

        await reversorMovimientoRemision(conn, idRemision);

        await conn.execute("DELETE FROM remisiones_empresa WHERE id_remision_empresa = ?", [idRemision]);

        await conn.commit();
        return { success: true };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

export async function facturarRemisionEmpresa(id, payload) {
    const idRemision = toPositiveInt(id, "id_remision_empresa");
    const fechaFactura = toDate(payload.fecha_factura, "fecha_factura");
    const metodoPago = String(payload.metodo_pago || "").trim();
    const formaPago = String(payload.forma_pago || "").trim();
    const usoCfdi = String(payload.uso_cfdi || "").trim();
    const regimenFiscal = String(payload.regimen_fiscal || "").trim();
    const folioFactura = String(payload.folio_factura || "").trim();

    if (!folioFactura) throw new Error("folio_factura es requerido");
    if (!metodoPago) throw new Error("metodo_pago es requerido");
    if (!formaPago) throw new Error("forma_pago es requerido");
    if (!usoCfdi) throw new Error("uso_cfdi es requerido");
    if (!regimenFiscal) throw new Error("regimen_fiscal es requerido");

    const [[remision]] = await db.execute(
        `
        SELECT folio_remision
        FROM remisiones_empresa
        WHERE id_remision_empresa = ?
        LIMIT 1
        `,
        [idRemision]
    );

    if (!remision) throw new Error("remision no encontrada");

    const folioFacturaFinal = folioFactura || `FAC-${String(remision.folio_remision || idRemision)}`;

    await db.execute(
        `
        UPDATE remisiones_empresa
        SET
            facturada = 1,
            folio_factura = ?,
            fecha_factura = ?,
            metodo_pago = ?,
            forma_pago = ?,
            uso_cfdi = ?,
            regimen_fiscal = ?,
            correo_destino = ?,
            observaciones = ?,
            updated_at = NOW()
        WHERE id_remision_empresa = ?
        `,
        [
            folioFacturaFinal,
            fechaFactura,
            metodoPago,
            formaPago,
            usoCfdi,
            regimenFiscal,
            String(payload.correo_destino || "").trim() || null,
            String(payload.observaciones || "").trim() || null,
            idRemision,
        ]
    );

    return getRemisionEmpresaById(idRemision);
}
