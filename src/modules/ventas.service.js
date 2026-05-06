import db from "@/lib/db";

const METODOS_PAGO = new Set(["efectivo", "tarjeta", "transferencia", "vale"]);
const ESTADOS_VENTA = new Set(["pagada", "cancelada"]);

function toPositiveId(value, fieldName = "id") {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`${fieldName} invalido`);
  return id;
}

function toPositiveInt(value, fieldName = "cantidad") {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${fieldName} invalido`);
  return n;
}

function toMoney(value, fieldName = "monto") {
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) throw new Error(`${fieldName} invalido`);
  return Math.round(n * 100) / 100;
}

function normalizeText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizeMetodoPago(value) {
  const metodo = normalizeText(value).toLowerCase();
  if (!METODOS_PAGO.has(metodo)) throw new Error("Metodo de pago invalido");
  return metodo;
}

function normalizeEstadoVenta(value) {
  const estado = normalizeText(value).toLowerCase();
  if (!estado) return "pagada";
  if (!ESTADOS_VENTA.has(estado)) throw new Error("Estado de venta invalido");
  return estado;
}

function buildFolio(nextId) {
  return `VT-${String(nextId).padStart(5, "0")}`;
}

async function buildNextFolio(conn) {
  const [[{ nextFolio }]] = await conn.execute(
    "SELECT COALESCE(MAX(id_venta), 0) + 1 AS nextFolio FROM ventas"
  );
  return buildFolio(nextFolio);
}

function normalizeDetalles(detalles) {
  const items = Array.isArray(detalles) ? detalles : [];

  if (items.length === 0) {
    throw new Error("La venta debe tener al menos una partida");
  }

  return items.map((item) => {
    const id_presentacion = toPositiveId(item.id_presentacion, "id_presentacion");
    const cantidad = toPositiveInt(item.cantidad, "cantidad");
    const precio_unitario = toMoney(item.precio_unitario, "precio_unitario");
    const subtotal = Math.round(cantidad * precio_unitario * 100) / 100;

    return {
      id_presentacion,
      cantidad,
      precio_unitario,
      subtotal,
    };
  });
}

async function lockInventario(conn, idAlmacen, idPresentacion) {
  const [rows] = await conn.execute(
    "SELECT id_inventario, stock, stock_minimo FROM inventario WHERE id_almacen = ? AND id_presentacion = ? FOR UPDATE",
    [idAlmacen, idPresentacion]
  );

  return rows[0] || null;
}

async function aplicarMovimientoVenta(conn, { id_almacen, id_presentacion, cantidad, tipo, id_origen, nota = null }) {
  if (!id_almacen) throw new Error("La venta no tiene almacen asociado");

  const inventario = await lockInventario(conn, id_almacen, id_presentacion);

  if (tipo === "salida") {
    if (!inventario) {
      throw new Error("No hay inventario para la presentacion seleccionada");
    }

    const stockActual = Number(inventario.stock || 0);
    if (stockActual < cantidad) {
      throw new Error(`Stock insuficiente para la presentacion ${id_presentacion}`);
    }

    await conn.execute(
      "UPDATE inventario SET stock = stock - ? WHERE id_almacen = ? AND id_presentacion = ?",
      [cantidad, id_almacen, id_presentacion]
    );
  } else {
    if (!inventario) {
      await conn.execute(
        "INSERT INTO inventario (id_presentacion, id_almacen, stock, stock_minimo) VALUES (?, ?, 0, 0)",
        [id_presentacion, id_almacen]
      );
    }

    await conn.execute(
      "UPDATE inventario SET stock = stock + ? WHERE id_almacen = ? AND id_presentacion = ?",
      [cantidad, id_almacen, id_presentacion]
    );
  }

  await conn.execute(
    "INSERT INTO movimientos_inventario (id_presentacion, id_almacen, tipo, cantidad, origen, id_origen, nota) VALUES (?, ?, ?, ?, 'venta', ?, ?)",
    [id_presentacion, id_almacen, tipo, cantidad, id_origen, nota]
  );
}

async function revertirMovimientosVenta(conn, { id_almacen, detalles, id_origen }) {
  if (!id_almacen) return;

  for (const item of detalles) {
    await aplicarMovimientoVenta(conn, {
      id_almacen,
      id_presentacion: item.id_presentacion,
      cantidad: item.cantidad,
      tipo: "entrada",
      id_origen,
    });
  }
}

function toNumberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickFirstValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return row[key];
    }
  }
  return null;
}

function pickFirstNumber(row, keys) {
  for (const key of keys) {
    const n = toNumberOrNull(row[key]);
    if (n !== null) return n;
  }
  return null;
}

async function getPagosVentasByVentaId(idVenta) {
  try {
    const [rows] = await db.execute("SELECT * FROM pagos_ventas WHERE id_venta = ?", [idVenta]);
    return rows;
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE") {
      return [];
    }
    throw error;
  }
}

export async function getVentas({ search = "" } = {}) {
  let sql = `
  SELECT
    v.id_venta,
    v.folio,
    v.id_almacen,
    a.nombre AS almacen_nombre,
    v.total,
    v.metodo_pago,
    v.estado,
    v.created_at,
    u.nombre AS usuario_nombre,
    COUNT(d.id_detalleVenta) AS total_partidas
  FROM ventas v
  INNER JOIN usuarios u ON u.id_usuario = v.id_usuario
  LEFT JOIN almacenes a ON a.id_almacen = v.id_almacen
  LEFT JOIN detalle_venta d ON d.id_venta = v.id_venta
  WHERE 1=1
  `;

  const params = [];

  if (search) {
    sql += " AND (v.folio LIKE ? OR u.nombre LIKE ? OR v.metodo_pago LIKE ? OR a.nombre LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += " GROUP BY v.id_venta ORDER BY v.id_venta DESC";
  const [rows] = await db.execute(sql, params);
  return rows;
}

export async function getVentasCatalog({ id_almacen = null, search = "" } = {}) {
  const idAlmacen = toPositiveId(id_almacen, "id_almacen");

  let sql = `
  SELECT
    i.id_almacen,
    i.id_presentacion,
    i.stock,
    i.stock_minimo,
    p.id_producto,
    p.nombre AS producto_nombre,
    pp.nombre AS presentacion_nombre,
    pp.codigo_barras,
    pp.piezas_por_presentacion,
    pp.precio_nivel_1,
    pp.precio_nivel_2,
    pp.precio_nivel_3,
    pp.precio_nivel_4,
    pp.precio_nivel_5,
    pp.costo,
    COALESCE(pp.precio_nivel_1, pp.costo, 0) AS precio_sugerido
  FROM inventario i
  INNER JOIN producto_presentaciones pp ON pp.id_presentacion = i.id_presentacion
  INNER JOIN productos p ON p.id_producto = pp.id_producto
  WHERE i.id_almacen = ? AND i.stock > 0
  `;

  const params = [idAlmacen];

  if (search) {
    sql += " AND (p.nombre LIKE ? OR pp.nombre LIKE ? OR pp.codigo_barras LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += " ORDER BY p.nombre ASC, pp.nombre ASC";

  const [rows] = await db.execute(sql, params);
  return rows;
}

export async function getVentaById(id) {
  const idVenta = toPositiveId(id, "id_venta");

  const [rows] = await db.execute(
    `SELECT
      v.id_venta,
      v.folio,
      v.id_almacen,
      a.nombre AS almacen_nombre,
      v.id_usuario,
      u.nombre AS usuario_nombre,
      v.total,
      v.metodo_pago,
      v.estado,
      v.created_at
    FROM ventas v
    INNER JOIN usuarios u ON u.id_usuario = v.id_usuario
    LEFT JOIN almacenes a ON a.id_almacen = v.id_almacen
    WHERE v.id_venta = ?`,
    [idVenta]
  );

  if (rows.length === 0) throw new Error("Venta no encontrada");

  const venta = rows[0];

  const [detalles] = await db.execute(
    `SELECT
      d.id_detalleVenta,
      d.id_presentacion,
      d.cantidad,
      d.precio_unitario,
      d.subtotal,
      pp.nombre AS presentacion_nombre,
      pp.codigo_barras,
      pp.precio_nivel_1,
      pp.costo,
      p.nombre AS producto_nombre
    FROM detalle_venta d
    INNER JOIN producto_presentaciones pp ON pp.id_presentacion = d.id_presentacion
    INNER JOIN productos p ON p.id_producto = pp.id_producto
    WHERE d.id_venta = ?
    ORDER BY d.id_detalleVenta ASC`,
    [idVenta]
  );

  return { ...venta, detalles };
}

export async function getVentaTicketById(id) {
  const venta = await getVentaById(id);
  const pagosRaw = await getPagosVentasByVentaId(venta.id_venta);

  const pagos = pagosRaw.map((row) => {
    const monto = pickFirstNumber(row, ["monto", "monto_pagado", "monto_pago", "pago", "importe", "total_pagado"]) ?? 0;
    const montoRecibido = pickFirstNumber(row, ["monto_recibido", "pagado_con", "pago_recibido", "efectivo_recibido"]) ?? null;
    const cambio = pickFirstNumber(row, ["cambio", "monto_cambio"]) ?? null;

    return {
      metodo_pago: pickFirstValue(row, ["metodo_pago", "forma_pago", "metodo"]) || venta.metodo_pago || null,
      referencia: pickFirstValue(row, ["referencia", "referencia_pago", "folio_referencia"]) || null,
      fecha_pago: pickFirstValue(row, ["created_at", "fecha_pago", "fecha"]) || null,
      monto,
      monto_recibido: montoRecibido,
      cambio,
    };
  });

  const subtotal = venta.detalles.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
  const iva = toNumberOrNull(venta.iva) ?? toNumberOrNull(venta.impuesto) ?? 0;
  const total = toNumberOrNull(venta.total) ?? Math.round((subtotal + iva) * 100) / 100;
  const primerPago = pagos[0] || null;
  const montoPagado = pagos.reduce((acc, item) => acc + Number(item.monto || 0), 0);

  const pago =
    (primerPago && (primerPago.monto_recibido ?? primerPago.monto))
    ?? (montoPagado > 0 ? montoPagado : total);

  const cambio =
    (primerPago && primerPago.cambio !== null)
      ? primerPago.cambio
      : Math.max(Math.round((pago - total) * 100) / 100, 0);

  return {
    ...venta,
    subtotal,
    iva,
    total,
    pagos,
    ticket: {
      metodo_pago: primerPago?.metodo_pago || venta.metodo_pago || null,
      pago,
      cambio,
      total_pagado: montoPagado,
    },
  };
}

export async function createVenta(data, context = {}) {
  const id_usuario = toPositiveId(context.id_usuario, "id_usuario");
  const id_almacen = toPositiveId(data.id_almacen, "id_almacen");
  const metodo_pago = normalizeMetodoPago(data.metodo_pago);
  const estado = normalizeEstadoVenta(data.estado);
  const detalles = normalizeDetalles(data.detalles);

  const total = detalles.reduce((acc, item) => acc + item.subtotal, 0);
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    let resultVenta = null;
    let folio = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      folio = await buildNextFolio(conn);

      try {
        const [result] = await conn.execute(
          `INSERT INTO ventas (folio, id_usuario, id_almacen, total, metodo_pago, estado)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [folio, id_usuario, id_almacen, total, metodo_pago, estado]
        );
        resultVenta = result;
        break;
      } catch (error) {
        if (error?.code !== "ER_DUP_ENTRY" || attempt === 2) throw error;
      }
    }

    const idVenta = resultVenta.insertId;

    for (const item of detalles) {
      await conn.execute(
        `INSERT INTO detalle_venta (id_venta, id_presentacion, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [idVenta, item.id_presentacion, item.cantidad, item.precio_unitario, item.subtotal]
      );
    }

    if (estado === "pagada") {
      for (const item of detalles) {
        await aplicarMovimientoVenta(conn, {
          id_almacen,
          id_presentacion: item.id_presentacion,
          cantidad: item.cantidad,
          tipo: "salida",
          id_origen: idVenta,
          nota: `Salida por venta ${folio}`,
        });
      }
    }

    await conn.commit();
    return { id: idVenta, folio };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function updateVenta(id, data) {
  const idVenta = toPositiveId(id, "id_venta");
  const id_almacen = data.id_almacen !== undefined ? toPositiveId(data.id_almacen, "id_almacen") : null;
  const metodo_pago = data.metodo_pago !== undefined ? normalizeMetodoPago(data.metodo_pago) : null;
  const estado = data.estado !== undefined ? normalizeEstadoVenta(data.estado) : null;
  const detalles = data.detalles !== undefined ? normalizeDetalles(data.detalles) : null;

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [ventaRows] = await conn.execute(
      "SELECT id_venta, id_almacen, estado, total FROM ventas WHERE id_venta = ? FOR UPDATE",
      [idVenta]
    );

    if (!ventaRows.length) throw new Error("Venta no encontrada");

    const ventaActual = ventaRows[0];
    const almacenPrevio = Number(ventaActual.id_almacen || 0) || null;
    const estadoPrevio = String(ventaActual.estado || "");

    const [detallesPrevios] = await conn.execute(
      "SELECT id_presentacion, cantidad, precio_unitario, subtotal FROM detalle_venta WHERE id_venta = ? ORDER BY id_detalleVenta ASC",
      [idVenta]
    );

    const nuevasPartidas = detalles ?? detallesPrevios.map((item) => ({
      id_presentacion: item.id_presentacion,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal: item.subtotal,
    }));

    const nuevoEstado = estado ?? estadoPrevio;
    const nuevoAlmacen = id_almacen ?? almacenPrevio;
    const nuevoMetodo = metodo_pago ?? null;
    const total = nuevasPartidas.reduce((acc, item) => acc + item.subtotal, 0);

    if (estadoPrevio === "pagada") {
      for (const item of detallesPrevios) {
        await aplicarMovimientoVenta(conn, {
          id_almacen: almacenPrevio,
          id_presentacion: item.id_presentacion,
          cantidad: Number(item.cantidad || 0),
          tipo: "entrada",
          id_origen: idVenta,
          nota: `Reversion de venta ${ventaActual.folio}`,
        });
      }
    }

    await conn.execute("DELETE FROM detalle_venta WHERE id_venta = ?", [idVenta]);

    for (const item of nuevasPartidas) {
      await conn.execute(
        `INSERT INTO detalle_venta (id_venta, id_presentacion, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [idVenta, item.id_presentacion, item.cantidad, item.precio_unitario, item.subtotal]
      );
    }

    const fields = ["id_almacen = ?", "total = ?", "estado = ?"];
    const params = [nuevoAlmacen, total, nuevoEstado];

    if (nuevoMetodo) {
      fields.push("metodo_pago = ?");
      params.push(nuevoMetodo);
    }

    params.push(idVenta);

    await conn.execute(
      `UPDATE ventas SET ${fields.join(", ")} WHERE id_venta = ?`,
      params
    );

    if (nuevoEstado === "pagada") {
      for (const item of nuevasPartidas) {
        await aplicarMovimientoVenta(conn, {
          id_almacen: nuevoAlmacen,
          id_presentacion: item.id_presentacion,
          cantidad: item.cantidad,
          tipo: "salida",
          id_origen: idVenta,
          nota: `Salida por venta ${ventaActual.folio}`,
        });
      }
    }

    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function deleteVenta(id) {
  const idVenta = toPositiveId(id, "id_venta");
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [ventaRows] = await conn.execute(
      "SELECT id_venta, id_almacen, estado FROM ventas WHERE id_venta = ? FOR UPDATE",
      [idVenta]
    );

    if (!ventaRows.length) throw new Error("Venta no encontrada");

    const venta = ventaRows[0];

    const [detalles] = await conn.execute(
      "SELECT id_presentacion, cantidad FROM detalle_venta WHERE id_venta = ?",
      [idVenta]
    );

    if (String(venta.estado || "") === "pagada") {
      for (const item of detalles) {
        await aplicarMovimientoVenta(conn, {
          id_almacen: venta.id_almacen,
          id_presentacion: item.id_presentacion,
          cantidad: Number(item.cantidad || 0),
          tipo: "entrada",
          id_origen: idVenta,
          nota: `Reversion de venta ${venta.folio}`,
        });
      }
    }

    await conn.execute("DELETE FROM detalle_venta WHERE id_venta = ?", [idVenta]);
    const [result] = await conn.execute("DELETE FROM ventas WHERE id_venta = ?", [idVenta]);

    if (result.affectedRows === 0) throw new Error("Venta no encontrada");

    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
