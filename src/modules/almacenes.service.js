import db from "@/lib/db";

const TIPOS_ALMACEN = new Set(["matriz", "sucursal"]);
const TIPOS_MOV = new Set(["entrada", "salida", "ajuste"]);
const ORIGEN_MOV = new Set(["venta", "compra", "remision", "ajuste", "traspaso"]);
const TIPOS_ALERTA = new Set(["bajo_tienda", "bajo_bodega", "resurtido_tienda", "compra_proveedor"]);
const ESTADOS_ALERTA = new Set(["activa", "resuelta", "omitida"]);

function toPositiveInt(value, fieldName) {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) {
        throw new Error(`${fieldName} debe ser entero mayor a 0`);
    }
    return n;
}

function toOptionalInt(value, fieldName) {
    if (value === undefined || value === null || value === "") return null;
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) {
        throw new Error(`${fieldName} invalido`);
    }
    return n;
}

function normalizeTipoAlmacen(tipo) {
    const t = String(tipo || "").trim().toLowerCase();
    if (!TIPOS_ALMACEN.has(t)) {
        throw new Error("tipo invalido. Usa matriz o sucursal");
    }
    return t;
}

function normalizeTipoMovimiento(tipo) {
    const t = String(tipo || "").trim().toLowerCase();
    if (!TIPOS_MOV.has(t)) {
        throw new Error("tipo de movimiento invalido. Usa entrada, salida o ajuste");
    }
    return t;
}

function normalizeOrigen(origen) {
    const o = String(origen || "").trim().toLowerCase();
    if (!ORIGEN_MOV.has(o)) throw new Error("origen invalido");
    return o;
}

function normalizeTipoAlerta(tipo) {
    const t = String(tipo || "").trim().toLowerCase();
    if (!TIPOS_ALERTA.has(t)) throw new Error("tipo_alerta invalido");
    return t;
}

function normalizeEstadoAlerta(estado) {
    const e = String(estado || "").trim().toLowerCase();
    if (!ESTADOS_ALERTA.has(e)) throw new Error("estado invalido");
    return e;
}

function buildFolio(prefix = "ALM") {
    return `${prefix}-${Date.now()}`;
}

function normalizeNota(value) {
    const text = String(value || "").trim();
    return text || null;
}

async function getPresentacionContext(conn, idPresentacion) {
    const [rows] = await conn.execute(
        `SELECT
           pp.id_presentacion,
           pp.id_producto,
           pp.nombre AS presentacion_nombre,
           pp.piezas_por_presentacion,
           p.nombre AS producto_nombre
         FROM producto_presentaciones pp
         INNER JOIN productos p ON p.id_producto = pp.id_producto
         WHERE pp.id_presentacion = ?`,
        [idPresentacion]
    );

    if (!rows.length) {
        throw new Error("Presentacion no encontrada");
    }

    return rows[0];
}

export async function getAlmacenes(search = "") {
    let sql = `
    SELECT
      a.id_almacen,
      a.nombre,
      a.tipo,
      a.activo,
      COUNT(i.id_inventario) AS registros_inventario
    FROM almacenes a
    LEFT JOIN inventario i ON i.id_almacen = a.id_almacen
    WHERE 1=1
  `;

    const params = [];

    if (search) {
        sql += " AND (a.nombre LIKE ? OR a.tipo LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
    }

    sql += " GROUP BY a.id_almacen, a.nombre, a.tipo, a.activo ORDER BY a.id_almacen DESC";

    const [rows] = await db.execute(sql, params);
    return rows;
}

export async function createAlmacen(data) {
    const nombre = String(data?.nombre || "").trim();
    const tipo = normalizeTipoAlmacen(data?.tipo);
    const activo = data?.activo === undefined ? 1 : data.activo ? 1 : 0;

    if (!nombre) throw new Error("nombre es requerido");

    const [result] = await db.execute(
        "INSERT INTO almacenes (nombre, tipo, activo) VALUES (?, ?, ?)",
        [nombre, tipo, activo]
    );

    return { id_almacen: result.insertId };
}

export async function updateAlmacen(id, data) {
    const idAlmacen = toPositiveInt(id, "id");

    const fields = [];
    const params = [];

    if (data?.nombre !== undefined) {
        const nombre = String(data.nombre || "").trim();
        if (!nombre) throw new Error("nombre no puede ir vacio");
        fields.push("nombre = ?");
        params.push(nombre);
    }

    if (data?.tipo !== undefined) {
        fields.push("tipo = ?");
        params.push(normalizeTipoAlmacen(data.tipo));
    }

    if (data?.activo !== undefined) {
        fields.push("activo = ?");
        params.push(data.activo ? 1 : 0);
    }

    if (!fields.length) throw new Error("No hay campos para actualizar");

    params.push(idAlmacen);

    const [result] = await db.execute(
        `UPDATE almacenes SET ${fields.join(", ")} WHERE id_almacen = ?`,
        params
    );

    if (result.affectedRows === 0) throw new Error("Almacen no encontrado");

    return { ok: true };
}

export async function deleteAlmacen(id) {
    const idAlmacen = toPositiveInt(id, "id");

    const [inv] = await db.execute(
        "SELECT COUNT(*) AS total FROM inventario WHERE id_almacen = ?",
        [idAlmacen]
    );

    if (Number(inv[0]?.total || 0) > 0) {
        throw new Error("No puedes eliminar un almacen con inventario asociado");
    }

    const [result] = await db.execute("DELETE FROM almacenes WHERE id_almacen = ?", [idAlmacen]);

    if (result.affectedRows === 0) throw new Error("Almacen no encontrado");

    return { ok: true };
}

export async function getInventario({ id_almacen = null, search = "", soloBajoMinimo = false } = {}) {
    let sql = `
    SELECT
      i.id_inventario,
      i.id_almacen,
      a.nombre AS almacen_nombre,
      a.tipo AS almacen_tipo,
      i.id_presentacion,
      pp.nombre AS presentacion_nombre,
      pp.codigo_barras,
      pp.piezas_por_presentacion,
      p.id_producto,
      p.nombre AS producto_nombre,
      i.stock,
      i.stock_minimo,
      CASE WHEN i.stock <= i.stock_minimo THEN 1 ELSE 0 END AS bajo_minimo
    FROM inventario i
    INNER JOIN almacenes a ON a.id_almacen = i.id_almacen
    INNER JOIN producto_presentaciones pp ON pp.id_presentacion = i.id_presentacion
    INNER JOIN productos p ON p.id_producto = pp.id_producto
    WHERE 1=1
  `;

    const params = [];

    if (id_almacen) {
        sql += " AND i.id_almacen = ?";
        params.push(toPositiveInt(id_almacen, "id_almacen"));
    }

    if (search) {
        sql += " AND (p.nombre LIKE ? OR pp.nombre LIKE ? OR pp.codigo_barras LIKE ?)";
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (soloBajoMinimo) {
        sql += " AND i.stock <= i.stock_minimo";
    }

    sql += " ORDER BY p.nombre ASC, pp.nombre ASC, a.nombre ASC";

    const [rows] = await db.execute(sql, params);
    return rows;
}

export async function createInventario(payload) {
    const id_presentacion = toPositiveInt(payload?.id_presentacion, "id_presentacion");
    const id_almacen = toPositiveInt(payload?.id_almacen, "id_almacen");
    const stock = Number(payload?.stock || 0);
    const stock_minimo = Number(payload?.stock_minimo || 0);

    if (!Number.isInteger(stock) || stock < 0) throw new Error("stock invalido");
    if (!Number.isInteger(stock_minimo) || stock_minimo < 0) throw new Error("stock_minimo invalido");

    const [r] = await db.execute(
        `INSERT INTO inventario (id_presentacion, id_almacen, stock, stock_minimo)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE stock = VALUES(stock), stock_minimo = VALUES(stock_minimo)`,
        [id_presentacion, id_almacen, stock, stock_minimo]
    );

    return { ok: true, id_inventario: r.insertId || null };
}

export async function updateInventario(id, payload) {
    const id_inventario = toPositiveInt(id, "id");
    const fields = [];
    const params = [];

    if (payload?.id_presentacion !== undefined) {
        fields.push("id_presentacion = ?");
        params.push(toPositiveInt(payload.id_presentacion, "id_presentacion"));
    }
    if (payload?.id_almacen !== undefined) {
        fields.push("id_almacen = ?");
        params.push(toPositiveInt(payload.id_almacen, "id_almacen"));
    }
    if (payload?.stock !== undefined) {
        const n = Number(payload.stock);
        if (!Number.isInteger(n) || n < 0) throw new Error("stock invalido");
        fields.push("stock = ?");
        params.push(n);
    }
    if (payload?.stock_minimo !== undefined) {
        const n = Number(payload.stock_minimo);
        if (!Number.isInteger(n) || n < 0) throw new Error("stock_minimo invalido");
        fields.push("stock_minimo = ?");
        params.push(n);
    }

    if (!fields.length) throw new Error("No hay campos para actualizar");

    params.push(id_inventario);
    const [r] = await db.execute(`UPDATE inventario SET ${fields.join(", ")} WHERE id_inventario = ?`, params);
    if (r.affectedRows === 0) throw new Error("Inventario no encontrado");
    return { ok: true };
}

export async function deleteInventario(id) {
    const id_inventario = toPositiveInt(id, "id");
    const [r] = await db.execute("DELETE FROM inventario WHERE id_inventario = ?", [id_inventario]);
    if (r.affectedRows === 0) throw new Error("Inventario no encontrado");
    return { ok: true };
}

export async function getMovimientos({ id_almacen = null, tipo = "", origen = "", desde = "", hasta = "", search = "" } = {}) {
    let sql = `
    SELECT
      m.id_movimiento,
      m.created_at,
      m.tipo,
      m.origen,
      m.id_origen,
    m.nota,
      m.cantidad,
      m.id_almacen,
      a.nombre AS almacen_nombre,
      m.id_presentacion,
      p.nombre AS producto_nombre,
      pp.nombre AS presentacion_nombre,
      pp.codigo_barras
    FROM movimientos_inventario m
    INNER JOIN almacenes a ON a.id_almacen = m.id_almacen
    INNER JOIN producto_presentaciones pp ON pp.id_presentacion = m.id_presentacion
    INNER JOIN productos p ON p.id_producto = pp.id_producto
    WHERE 1=1
  `;

    const params = [];

    if (id_almacen) {
        sql += " AND m.id_almacen = ?";
        params.push(toPositiveInt(id_almacen, "id_almacen"));
    }

    if (tipo) {
        sql += " AND m.tipo = ?";
        params.push(normalizeTipoMovimiento(tipo));
    }

    if (origen) {
        sql += " AND m.origen = ?";
        params.push(origen);
    }

    if (desde) {
        sql += " AND DATE(m.created_at) >= ?";
        params.push(desde);
    }

    if (hasta) {
        sql += " AND DATE(m.created_at) <= ?";
        params.push(hasta);
    }

    if (search) {
        sql += " AND (p.nombre LIKE ? OR pp.codigo_barras LIKE ? OR a.nombre LIKE ? OR m.nota LIKE ?)";
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += " ORDER BY m.id_movimiento DESC";

    const [rows] = await db.execute(sql, params);
    return rows;
}

export async function createMovimiento(payload) {
    const id_presentacion = toPositiveInt(payload?.id_presentacion, "id_presentacion");
    const id_almacen = toPositiveInt(payload?.id_almacen, "id_almacen");
    const tipo = normalizeTipoMovimiento(payload?.tipo);
    const cantidad = toPositiveInt(payload?.cantidad, "cantidad");
    const origen = normalizeOrigen(payload?.origen);
    const id_origen = toPositiveInt(payload?.id_origen, "id_origen");
    const nota = normalizeNota(payload?.nota);

    const [r] = await db.execute(
        `INSERT INTO movimientos_inventario (id_presentacion, id_almacen, tipo, cantidad, origen, id_origen, nota)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id_presentacion, id_almacen, tipo, cantidad, origen, id_origen, nota]
    );

    return { ok: true, id_movimiento: r.insertId };
}

export async function updateMovimiento(id, payload) {
    const id_movimiento = toPositiveInt(id, "id");
    const fields = [];
    const params = [];

    if (payload?.id_presentacion !== undefined) {
        fields.push("id_presentacion = ?");
        params.push(toPositiveInt(payload.id_presentacion, "id_presentacion"));
    }
    if (payload?.id_almacen !== undefined) {
        fields.push("id_almacen = ?");
        params.push(toPositiveInt(payload.id_almacen, "id_almacen"));
    }
    if (payload?.tipo !== undefined) {
        fields.push("tipo = ?");
        params.push(normalizeTipoMovimiento(payload.tipo));
    }
    if (payload?.cantidad !== undefined) {
        fields.push("cantidad = ?");
        params.push(toPositiveInt(payload.cantidad, "cantidad"));
    }
    if (payload?.origen !== undefined) {
        fields.push("origen = ?");
        params.push(normalizeOrigen(payload.origen));
    }
    if (payload?.id_origen !== undefined) {
        fields.push("id_origen = ?");
        params.push(toPositiveInt(payload.id_origen, "id_origen"));
    }
    if (payload?.nota !== undefined) {
        fields.push("nota = ?");
        params.push(normalizeNota(payload.nota));
    }

    if (!fields.length) throw new Error("No hay campos para actualizar");

    params.push(id_movimiento);
    const [r] = await db.execute(`UPDATE movimientos_inventario SET ${fields.join(", ")} WHERE id_movimiento = ?`, params);
    if (r.affectedRows === 0) throw new Error("Movimiento no encontrado");
    return { ok: true };
}

export async function deleteMovimiento(id) {
    const id_movimiento = toPositiveInt(id, "id");
    const [r] = await db.execute("DELETE FROM movimientos_inventario WHERE id_movimiento = ?", [id_movimiento]);
    if (r.affectedRows === 0) throw new Error("Movimiento no encontrado");
    return { ok: true };
}

export async function ajusteInventario(payload) {
    const id_almacen = toPositiveInt(payload?.id_almacen, "id_almacen");
    const id_presentacion = toPositiveInt(payload?.id_presentacion, "id_presentacion");
    const id_presentacion_destino = toOptionalInt(payload?.id_presentacion_destino, "id_presentacion_destino");
    const tipo = id_presentacion_destino ? "ajuste" : normalizeTipoMovimiento(payload?.tipo);
    const origen = String(payload?.origen || "ajuste").toLowerCase();
    const id_origen = toOptionalInt(payload?.id_origen, "id_origen") || Number(`${Date.now()}`.slice(-9));
    const nota = normalizeNota(payload?.nota || payload?.motivo || payload?.observaciones);

    if (!id_presentacion_destino && !nota) {
        throw new Error("El ajuste requiere una nota o motivo");
    }

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const presentacionOrigen = await getPresentacionContext(conn, id_presentacion);

        if (id_presentacion_destino) {
            if (id_presentacion_destino === id_presentacion) {
                throw new Error("La presentacion destino debe ser diferente a la origen");
            }

            const presentacionDestino = await getPresentacionContext(conn, id_presentacion_destino);

            if (Number(presentacionOrigen.id_producto) !== Number(presentacionDestino.id_producto)) {
                throw new Error("Solo puedes ajustar presentaciones del mismo producto");
            }

            const cantidadDestino = toPositiveInt(payload?.cantidad_destino ?? payload?.cantidad, "cantidad_destino");
            const piezasOrigen = toPositiveInt(presentacionOrigen.piezas_por_presentacion, "piezas_origen");
            const piezasDestino = toPositiveInt(presentacionDestino.piezas_por_presentacion, "piezas_destino");
            const cantidadOrigenExacta = (cantidadDestino * piezasDestino) / piezasOrigen;

            if (!Number.isInteger(cantidadOrigenExacta) || cantidadOrigenExacta <= 0) {
                throw new Error("La cantidad destino no se puede convertir exactamente desde la presentacion origen");
            }

            const cantidadOrigen = cantidadOrigenExacta;

            const [invOrigenRows] = await conn.execute(
                "SELECT id_inventario, stock, stock_minimo FROM inventario WHERE id_almacen = ? AND id_presentacion = ? FOR UPDATE",
                [id_almacen, id_presentacion]
            );

            if (!invOrigenRows.length) {
                throw new Error("No existe inventario para la presentacion origen");
            }

            const [invDestinoRows] = await conn.execute(
                "SELECT id_inventario, stock, stock_minimo FROM inventario WHERE id_almacen = ? AND id_presentacion = ? FOR UPDATE",
                [id_almacen, id_presentacion_destino]
            );

            if (Number(invOrigenRows[0].stock || 0) < cantidadOrigen) {
                throw new Error("Stock insuficiente para convertir la presentacion origen");
            }

            if (!invDestinoRows.length) {
                await conn.execute(
                    "INSERT INTO inventario (id_presentacion, id_almacen, stock, stock_minimo) VALUES (?, ?, 0, 0)",
                    [id_presentacion_destino, id_almacen]
                );
            }

            await conn.execute(
                "UPDATE inventario SET stock = stock - ? WHERE id_almacen = ? AND id_presentacion = ?",
                [cantidadOrigen, id_almacen, id_presentacion]
            );

            await conn.execute(
                "UPDATE inventario SET stock = stock + ? WHERE id_almacen = ? AND id_presentacion = ?",
                [cantidadDestino, id_almacen, id_presentacion_destino]
            );

            const baseNota = `Conversion de ${cantidadOrigen} ${presentacionOrigen.presentacion_nombre} (${presentacionOrigen.producto_nombre}) a ${cantidadDestino} ${presentacionDestino.presentacion_nombre}`;
            const notaSalida = nota ? `${baseNota}. Motivo: ${nota}` : baseNota;
            const notaEntrada = nota ? `${baseNota}. Motivo: ${nota}` : baseNota;

            await conn.execute(
                "INSERT INTO movimientos_inventario (id_presentacion, id_almacen, tipo, cantidad, origen, id_origen, nota) VALUES (?, ?, 'salida', ?, 'ajuste', ?, ?)",
                [id_presentacion, id_almacen, cantidadOrigen, id_origen, notaSalida]
            );

            await conn.execute(
                "INSERT INTO movimientos_inventario (id_presentacion, id_almacen, tipo, cantidad, origen, id_origen, nota) VALUES (?, ?, 'entrada', ?, 'ajuste', ?, ?)",
                [id_presentacion_destino, id_almacen, cantidadDestino, id_origen, notaEntrada]
            );

            await conn.commit();

            return {
                ok: true,
                folio: buildFolio("AJ"),
                conversion: true,
                cantidad_origen: cantidadOrigen,
                cantidad_destino: cantidadDestino,
                producto: presentacionOrigen.producto_nombre,
            };
        }

        let delta = 0;
        if (tipo === "entrada") {
            delta = toPositiveInt(payload?.cantidad, "cantidad");
        } else if (tipo === "salida") {
            delta = -toPositiveInt(payload?.cantidad, "cantidad");
        } else {
            const n = Number(payload?.cantidad);
            if (!Number.isInteger(n) || n === 0) {
                throw new Error("En ajuste, cantidad debe ser entero distinto de 0");
            }
            delta = n;
        }

        const [invRows] = await conn.execute(
            "SELECT id_inventario, stock, stock_minimo FROM inventario WHERE id_almacen = ? AND id_presentacion = ? FOR UPDATE",
            [id_almacen, id_presentacion]
        );

        let stockActual = 0;
        let stockMinimo = 0;

        if (!invRows.length) {
            if (delta < 0) throw new Error("No existe inventario para salida/ajuste negativo");

            await conn.execute(
                "INSERT INTO inventario (id_presentacion, id_almacen, stock, stock_minimo) VALUES (?, ?, 0, 0)",
                [id_presentacion, id_almacen]
            );
        } else {
            stockActual = Number(invRows[0].stock || 0);
            stockMinimo = Number(invRows[0].stock_minimo || 0);
        }

        const stockNuevo = stockActual + delta;
        if (stockNuevo < 0) throw new Error("Stock insuficiente");

        await conn.execute(
            "UPDATE inventario SET stock = ? WHERE id_almacen = ? AND id_presentacion = ?",
            [stockNuevo, id_almacen, id_presentacion]
        );

        await conn.execute(
            "INSERT INTO movimientos_inventario (id_presentacion, id_almacen, tipo, cantidad, origen, id_origen, nota) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [id_presentacion, id_almacen, tipo, Math.abs(delta), origen, id_origen, nota]
        );

        await conn.commit();

        return {
            ok: true,
            folio: buildFolio("AJ"),
            stock_anterior: stockActual,
            stock_nuevo: stockNuevo,
            stock_minimo: stockMinimo,
            bajo_minimo: stockNuevo <= stockMinimo,
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

export async function traspasoInventario(payload) {
    const id_almacen_origen = toPositiveInt(payload?.id_almacen_origen, "id_almacen_origen");
    const id_almacen_destino = toPositiveInt(payload?.id_almacen_destino, "id_almacen_destino");
    const id_presentacion = toPositiveInt(payload?.id_presentacion, "id_presentacion");
    const cantidad = toPositiveInt(payload?.cantidad, "cantidad");
    const id_origen = toOptionalInt(payload?.id_origen, "id_origen") || Number(`${Date.now()}`.slice(-9));
    const nota = normalizeNota(payload?.nota || payload?.motivo || payload?.observaciones);

    if (id_almacen_origen === id_almacen_destino) {
        throw new Error("Origen y destino deben ser diferentes");
    }

    if (!nota) {
        throw new Error("El traspaso requiere una nota o motivo");
    }

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [origenRows] = await conn.execute(
            "SELECT stock FROM inventario WHERE id_almacen = ? AND id_presentacion = ? FOR UPDATE",
            [id_almacen_origen, id_presentacion]
        );

        if (!origenRows.length) throw new Error("No hay inventario en almacen origen");

        const stockOrigen = Number(origenRows[0].stock || 0);
        if (stockOrigen < cantidad) throw new Error("Stock insuficiente en origen");

        const [destinoRows] = await conn.execute(
            "SELECT stock FROM inventario WHERE id_almacen = ? AND id_presentacion = ? FOR UPDATE",
            [id_almacen_destino, id_presentacion]
        );

        if (!destinoRows.length) {
            await conn.execute(
                "INSERT INTO inventario (id_presentacion, id_almacen, stock, stock_minimo) VALUES (?, ?, 0, 0)",
                [id_presentacion, id_almacen_destino]
            );
        }

        await conn.execute(
            "UPDATE inventario SET stock = stock - ? WHERE id_almacen = ? AND id_presentacion = ?",
            [cantidad, id_almacen_origen, id_presentacion]
        );

        await conn.execute(
            "UPDATE inventario SET stock = stock + ? WHERE id_almacen = ? AND id_presentacion = ?",
            [cantidad, id_almacen_destino, id_presentacion]
        );

        await conn.execute(
            "INSERT INTO movimientos_inventario (id_presentacion, id_almacen, tipo, cantidad, origen, id_origen, nota) VALUES (?, ?, 'salida', ?, 'traspaso', ?, ?)",
            [id_presentacion, id_almacen_origen, cantidad, id_origen, `Salida por traspaso. ${nota}`]
        );

        await conn.execute(
            "INSERT INTO movimientos_inventario (id_presentacion, id_almacen, tipo, cantidad, origen, id_origen, nota) VALUES (?, ?, 'entrada', ?, 'traspaso', ?, ?)",
            [id_presentacion, id_almacen_destino, cantidad, id_origen, `Entrada por traspaso. ${nota}`]
        );

        await conn.commit();

        return {
            ok: true,
            folio: buildFolio("TR"),
            message: "Traspaso aplicado",
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

export async function aplicarMovimientoRemision(conn, id_remision, detalles) {
    if (!Array.isArray(detalles) || !detalles.length) {
        throw new Error("Detalles de remisión requeridos");
    }

    for (const detalle of detalles) {
        const id_presentacion = toPositiveInt(detalle.id_presentacion, "id_presentacion");
        const id_almacen = toPositiveInt(detalle.id_almacen, "id_almacen");
        const cantidad = toPositiveInt(detalle.cantidad, "cantidad");

        const [inventarioRows] = await conn.execute(
            "SELECT stock FROM inventario WHERE id_almacen = ? AND id_presentacion = ? FOR UPDATE",
            [id_almacen, id_presentacion]
        );

        if (!inventarioRows.length) {
            throw new Error(`No hay inventario para presentación en almacén`);
        }

        const stockActual = Number(inventarioRows[0].stock || 0);
        if (stockActual < cantidad) {
            throw new Error(`Stock insuficiente para presentación (disponible: ${stockActual}, solicitado: ${cantidad})`);
        }

        await conn.execute(
            "UPDATE inventario SET stock = stock - ? WHERE id_almacen = ? AND id_presentacion = ?",
            [cantidad, id_almacen, id_presentacion]
        );

        await conn.execute(
            "INSERT INTO movimientos_inventario (id_presentacion, id_almacen, tipo, cantidad, origen, id_origen, nota) VALUES (?, ?, 'salida', ?, 'remision', ?, ?)",
            [id_presentacion, id_almacen, cantidad, id_remision, `Salida por remisión cliente #${id_remision}`]
        );
    }
}

export async function reversorMovimientoRemision(conn, id_remision) {
    const [movimientos] = await conn.execute(
        "SELECT id_presentacion, id_almacen, cantidad FROM movimientos_inventario WHERE origen = 'remision' AND id_origen = ?",
        [id_remision]
    );

    for (const mov of movimientos) {
        const id_presentacion = mov.id_presentacion;
        const id_almacen = mov.id_almacen;
        const cantidad = Number(mov.cantidad || 0);

        await conn.execute(
            "UPDATE inventario SET stock = stock + ? WHERE id_almacen = ? AND id_presentacion = ?",
            [cantidad, id_almacen, id_presentacion]
        );

        await conn.execute(
            "INSERT INTO movimientos_inventario (id_presentacion, id_almacen, tipo, cantidad, origen, id_origen, nota) VALUES (?, ?, 'entrada', ?, 'remision', ?, ?)",
            [id_presentacion, id_almacen, cantidad, id_remision, `Reversión de remisión cliente #${id_remision}`]
        );

        await conn.execute(
            "DELETE FROM movimientos_inventario WHERE origen = 'remision' AND id_origen = ?",
            [id_remision]
        );
    }
}

export async function getAlertasStock({ id_almacen = null, search = "", id_rack = null, id_marca = null, id_proveedor = null } = {}) {
    let sql = `
    SELECT
            al.id_alerta_stock,
            al.id_almacen,
      a.nombre AS almacen_nombre,
            al.id_presentacion,
      pp.codigo_barras,
      p.nombre AS producto_nombre,
      pp.nombre AS presentacion_nombre,
            al.tipo_alerta,
            al.estado,
            al.cantidad_sugerida AS sugerido_resurtido,
            al.created_at,
      i.stock,
            i.stock_minimo,
      p.id_marca,
      m.nombre AS marca_nombre,
      COALESCE(pp.id_proveedor, p.id_proveedor) AS id_proveedor,
      prov.nombre AS proveedor_nombre
        FROM alertas_stock al
        INNER JOIN almacenes a ON a.id_almacen = al.id_almacen
        INNER JOIN producto_presentaciones pp ON pp.id_presentacion = al.id_presentacion
    INNER JOIN productos p ON p.id_producto = pp.id_producto
        LEFT JOIN inventario i ON i.id_almacen = al.id_almacen AND i.id_presentacion = al.id_presentacion
        LEFT JOIN marcas m ON m.id_marca = p.id_marca
        LEFT JOIN proveedores prov ON prov.id_proveedor = COALESCE(pp.id_proveedor, p.id_proveedor)
        WHERE 1=1
  `;

    const params = [];

    if (id_almacen) {
        sql += " AND al.id_almacen = ?";
        params.push(toPositiveInt(id_almacen, "id_almacen"));
    }

    if (id_marca) {
        sql += " AND p.id_marca = ?";
        params.push(toPositiveInt(id_marca, "id_marca"));
    }

    if (id_proveedor) {
        sql += " AND COALESCE(pp.id_proveedor, p.id_proveedor) = ?";
        params.push(toPositiveInt(id_proveedor, "id_proveedor"));
    }

    if (search) {
        sql += " AND (p.nombre LIKE ? OR pp.codigo_barras LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
    }

    sql += " ORDER BY al.created_at DESC, p.nombre ASC";

    const [rows] = await db.execute(sql, params);
    return rows;
}

export async function createAlertaStock(payload) {
    const id_presentacion = toPositiveInt(payload?.id_presentacion, "id_presentacion");
    const id_almacen = toPositiveInt(payload?.id_almacen, "id_almacen");
    const tipo_alerta = normalizeTipoAlerta(payload?.tipo_alerta);
    const cantidad_sugerida = Number(payload?.cantidad_sugerida || 0);
    const estado = payload?.estado ? normalizeEstadoAlerta(payload.estado) : "activa";

    if (!Number.isInteger(cantidad_sugerida) || cantidad_sugerida < 0) {
        throw new Error("cantidad_sugerida invalida");
    }

    const [r] = await db.execute(
        `INSERT INTO alertas_stock (id_presentacion, id_almacen, tipo_alerta, cantidad_sugerida, estado)
         VALUES (?, ?, ?, ?, ?)`,
        [id_presentacion, id_almacen, tipo_alerta, cantidad_sugerida, estado]
    );

    return { ok: true, id_alerta_stock: r.insertId };
}

export async function updateAlertaStock(id, payload) {
    const id_alerta_stock = toPositiveInt(id, "id");
    const fields = [];
    const params = [];

    if (payload?.id_presentacion !== undefined) {
        fields.push("id_presentacion = ?");
        params.push(toPositiveInt(payload.id_presentacion, "id_presentacion"));
    }
    if (payload?.id_almacen !== undefined) {
        fields.push("id_almacen = ?");
        params.push(toPositiveInt(payload.id_almacen, "id_almacen"));
    }
    if (payload?.tipo_alerta !== undefined) {
        fields.push("tipo_alerta = ?");
        params.push(normalizeTipoAlerta(payload.tipo_alerta));
    }
    if (payload?.cantidad_sugerida !== undefined) {
        const n = Number(payload.cantidad_sugerida);
        if (!Number.isInteger(n) || n < 0) throw new Error("cantidad_sugerida invalida");
        fields.push("cantidad_sugerida = ?");
        params.push(n);
    }
    if (payload?.estado !== undefined) {
        fields.push("estado = ?");
        params.push(normalizeEstadoAlerta(payload.estado));
    }

    if (!fields.length) throw new Error("No hay campos para actualizar");

    params.push(id_alerta_stock);
    const [r] = await db.execute(`UPDATE alertas_stock SET ${fields.join(", ")} WHERE id_alerta_stock = ?`, params);
    if (r.affectedRows === 0) throw new Error("Alerta no encontrada");
    return { ok: true };
}

export async function deleteAlertaStock(id) {
    const id_alerta_stock = toPositiveInt(id, "id");
    const [r] = await db.execute("DELETE FROM alertas_stock WHERE id_alerta_stock = ?", [id_alerta_stock]);
    if (r.affectedRows === 0) throw new Error("Alerta no encontrada");
    return { ok: true };
}