import db from "@/lib/db";

const columnCache = new Map();

async function hasProveedorColumn(columnName) {
    if (columnCache.has(columnName)) return columnCache.get(columnName);

    const [rows] = await db.execute(
        `SELECT COUNT(*) AS total
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'proveedores'
           AND COLUMN_NAME = ?`,
        [columnName]
    );

    const exists = Number(rows?.[0]?.total || 0) > 0;
    columnCache.set(columnName, exists);
    return exists;
}

function toNullableString(value) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text ? text : null;
}

function toTinyInt(value) {
    return value ? 1 : 0;
}

function normalizeProveedorRow(row) {
    const parts = [
        toNullableString(row.calle),
        toNullableString(row.num_exterior) ? `Ext. ${toNullableString(row.num_exterior)}` : null,
        toNullableString(row.num_interior) ? `Int. ${toNullableString(row.num_interior)}` : null,
        toNullableString(row.colonia),
        toNullableString(row.cp),
        toNullableString(row.ciudad),
        toNullableString(row.estado),
        toNullableString(row.pais),
    ].filter(Boolean);

    return {
        ...row,
        giro: toNullableString(row.giro),
        rfc: toNullableString(row.rfc),
        metodo_pago: toNullableString(row.metodo_pago),
        cuenta_bancaria: toNullableString(row.cuenta_bancaria),
        calle: toNullableString(row.calle),
        num_exterior: toNullableString(row.num_exterior),
        num_interior: toNullableString(row.num_interior),
        colonia: toNullableString(row.colonia),
        cp: toNullableString(row.cp),
        ciudad: toNullableString(row.ciudad),
        estado: toNullableString(row.estado),
        pais: toNullableString(row.pais),
        direccion_display: parts.length > 0 ? parts.join(", ") : "-",
    };
}

export async function getProveedores({ search = "", soloActivos = false } = {}) {
    const hasCalle = await hasProveedorColumn("calle");
    const hasNumExterior = await hasProveedorColumn("num_exterior");
    const hasNumInterior = await hasProveedorColumn("num_interior");
    const hasColonia = await hasProveedorColumn("colonia");
    const hasCp = await hasProveedorColumn("cp");
    const hasCiudad = await hasProveedorColumn("ciudad");
    const hasEstado = await hasProveedorColumn("estado");
    const hasPais = await hasProveedorColumn("pais");
    const hasGiro = await hasProveedorColumn("giro");
    const hasRfc = await hasProveedorColumn("rfc");
    const hasMetodoPago = await hasProveedorColumn("metodo_pago");
    const hasCuentaBancaria = await hasProveedorColumn("cuenta_bancaria");
    const hasCreatedAt = await hasProveedorColumn("created_at");

    const selectColumns = [
        "id_proveedor",
        "nombre",
        "telefono",
        "email",
        "activo",
        hasCalle ? "calle" : "NULL AS calle",
        hasNumExterior ? "num_exterior" : "NULL AS num_exterior",
        hasNumInterior ? "num_interior" : "NULL AS num_interior",
        hasColonia ? "colonia" : "NULL AS colonia",
        hasCp ? "cp" : "NULL AS cp",
        hasCiudad ? "ciudad" : "NULL AS ciudad",
        hasEstado ? "estado" : "NULL AS estado",
        hasPais ? "pais" : "NULL AS pais",
        hasGiro ? "giro" : "NULL AS giro",
        hasRfc ? "rfc" : "NULL AS rfc",
        hasMetodoPago ? "metodo_pago" : "NULL AS metodo_pago",
        hasCuentaBancaria ? "cuenta_bancaria" : "NULL AS cuenta_bancaria",
    ];

    let query = `SELECT ${selectColumns.join(", ")} FROM proveedores WHERE 1 = 1`;
    const params = [];

    if (search) {
        query += " AND (nombre LIKE ? OR telefono LIKE ? OR email LIKE ? OR rfc LIKE ? OR giro LIKE ? OR metodo_pago LIKE ? OR ciudad LIKE ? OR estado LIKE ? OR colonia LIKE ?)";
        const wildcard = `%${search}%`;
        params.push(wildcard, wildcard, wildcard, wildcard, wildcard, wildcard, wildcard, wildcard, wildcard);
    }

    if (soloActivos) {
        query += " AND (activo = 1 OR activo = true)";
    }

    query += hasCreatedAt ? " ORDER BY created_at DESC" : " ORDER BY id_proveedor DESC";

    const [rows] = await db.execute(query, params);
    return rows.map(normalizeProveedorRow);
}

export async function getProveedorById(id) {
    const items = await getProveedores();
    const found = items.find((item) => String(item.id_proveedor) === String(id));

    if (!found) {
        throw new Error("Proveedor no encontrado");
    }

    return found;
}

export async function createProveedor(data) {
    const nombre = toNullableString(data.nombre);
    const telefono = toNullableString(data.telefono);
    const email = toNullableString(data.email);
    const activo = data.activo === undefined ? 1 : toTinyInt(data.activo);

    if (!nombre || !telefono) {
        throw new Error("Nombre y telefono son obligatorios");
    }

    const columns = ["nombre", "telefono", "email", "activo"];
    const values = [nombre, telefono, email, activo];

    const optionalColumns = [
        "giro",
        "rfc",
        "metodo_pago",
        "cuenta_bancaria",
        "calle",
        "num_exterior",
        "num_interior",
        "colonia",
        "cp",
        "ciudad",
        "estado",
        "pais",
    ];

    for (const column of optionalColumns) {
        if (await hasProveedorColumn(column)) {
            columns.push(column);
            values.push(toNullableString(data[column]));
        }
    }

    const [result] = await db.execute(
        `INSERT INTO proveedores (${columns.map((column) => `\`${column}\``).join(", ")})
         VALUES (${columns.map(() => "?").join(", ")})`,
        values
    );

    return { id: result.insertId };
}

export async function updateProveedor(id, data) {
    const fields = [];
    const params = [];

    if (data.nombre !== undefined) {
        const value = toNullableString(data.nombre);
        if (!value) throw new Error("El nombre no puede ir vacio");
        fields.push("nombre = ?");
        params.push(value);
    }

    if (data.telefono !== undefined) {
        const value = toNullableString(data.telefono);
        if (!value) throw new Error("El telefono no puede ir vacio");
        fields.push("telefono = ?");
        params.push(value);
    }

    if (data.email !== undefined) {
        fields.push("email = ?");
        params.push(toNullableString(data.email));
    }

    if (data.activo !== undefined) {
        fields.push("activo = ?");
        params.push(toTinyInt(data.activo));
    }

    const optionalColumns = [
        "giro",
        "rfc",
        "metodo_pago",
        "cuenta_bancaria",
        "calle",
        "num_exterior",
        "num_interior",
        "colonia",
        "cp",
        "ciudad",
        "estado",
        "pais",
    ];

    for (const column of optionalColumns) {
        if ((data[column] !== undefined) && await hasProveedorColumn(column)) {
            fields.push(`${column} = ?`);
            params.push(toNullableString(data[column]));
        }
    }

    if (fields.length === 0) {
        throw new Error("No hay datos para actualizar");
    }

    params.push(id);

    const [result] = await db.execute(
        `UPDATE proveedores SET ${fields.join(", ")} WHERE id_proveedor = ?`,
        params
    );

    if (result.affectedRows === 0) {
        throw new Error("Proveedor no encontrado");
    }

    return { message: "Proveedor actualizado" };
}

export async function deleteProveedor(id) {
    const [result] = await db.execute(
        "DELETE FROM proveedores WHERE id_proveedor = ?",
        [id]
    );

    if (result.affectedRows === 0) {
        throw new Error("Proveedor no encontrado");
    }

    return { message: "Proveedor eliminado" };
}