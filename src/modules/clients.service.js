import db from "@/lib/db";
// Backend data-access layer for the clientes table.

const toNullableString = (value) => {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text.length === 0 ? null : text;
};

const toTinyInt = (value) => (value ? 1 : 0);

const toNullableNumber = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

const toNullableText = (value) => {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text.length === 0 ? null : text;
};

export const getClientes = async (search = "") => {
    // Lista clientes con filtro opcional por nombre o RFC.
    let query = `
        SELECT * FROM clientes
        WHERE 1 = 1
    `;

    const params = [];

    if (search) {
        query += ` AND (nombre LIKE ? OR rfc LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY created_at DESC`;

    const [rows] = await db.execute(query, params);
    return rows;
};

export const getClienteById = async (id) => {
    // Obtiene un cliente por su id primario.
    const [rows] = await db.execute(
        `SELECT * FROM clientes WHERE id_cliente = ?`,
        [id]
    );

    if (rows.length === 0) {
        throw new Error("Cliente no encontrado");
    }

    return rows[0];
};

export const createCliente = async (data) => {
    // Inserta cliente nuevo con campos fiscales opcionales y datos de credito.
    const {
        nombre,
        tipo_cliente,
        rfc,
        curp,
        uso_cfdi,
        telefono,
        email,
        calle,
        num_exterior,
        num_interior,
        colonia,
        cp,
        ciudad,
        estado,
        pais,
        giro,
        credito_habilitado,
        limite_credito,
        dias_credito,
        facturar_sin_pagar,
        dias_ruta,
    } = data;

    if (!nombre || !tipo_cliente || !telefono || !calle || !num_exterior || !colonia || !cp || !ciudad || !estado || !giro) {
        throw new Error("Faltan campos obligatorios del cliente");
    }

    const creditoHabilitado = toTinyInt(credito_habilitado);
    const limiteCredito = creditoHabilitado ? toNullableNumber(limite_credito) : null;
    const diasCredito = creditoHabilitado ? toNullableNumber(dias_credito) : null;
    const facturarSinPagar = toTinyInt(facturar_sin_pagar);
    const diasRuta = toNullableText(dias_ruta);

    const [result] = await db.execute(
        `INSERT INTO clientes (
            nombre, tipo_cliente, rfc, curp, uso_cfdi,
            telefono, email,
            calle, num_exterior, num_interior, colonia, cp, ciudad, estado, pais,
            giro, credito_habilitado, limite_credito, dias_credito, facturar_sin_pagar, dias_rutas
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
            nombre,
            tipo_cliente,
            toNullableString(rfc),
            toNullableString(curp),
            toNullableString(uso_cfdi),
            telefono,
            toNullableString(email),
            calle,
            num_exterior,
            toNullableString(num_interior),
            colonia,
            cp,
            ciudad,
            estado,
            toNullableString(pais) || "México",
            giro,
            creditoHabilitado,
            limiteCredito,
            diasCredito,
            facturarSinPagar,
            diasRuta,
        ]
    );

    return { id: result.insertId };
};

export const updateCliente = async (id, data) => {
    // Actualiza dinamicamente solo los campos recibidos.
    const payload = { ...data };

    if (Object.prototype.hasOwnProperty.call(payload, "rfc")) payload.rfc = toNullableString(payload.rfc);
    if (Object.prototype.hasOwnProperty.call(payload, "curp")) payload.curp = toNullableString(payload.curp);
    if (Object.prototype.hasOwnProperty.call(payload, "uso_cfdi")) payload.uso_cfdi = toNullableString(payload.uso_cfdi);
    if (Object.prototype.hasOwnProperty.call(payload, "email")) payload.email = toNullableString(payload.email);
    if (Object.prototype.hasOwnProperty.call(payload, "num_interior")) payload.num_interior = toNullableString(payload.num_interior);
    if (Object.prototype.hasOwnProperty.call(payload, "pais")) payload.pais = toNullableString(payload.pais) || "México";
    if (Object.prototype.hasOwnProperty.call(payload, "credito_habilitado")) payload.credito_habilitado = toTinyInt(payload.credito_habilitado);
    if (Object.prototype.hasOwnProperty.call(payload, "facturar_sin_pagar")) payload.facturar_sin_pagar = toTinyInt(payload.facturar_sin_pagar);
    if (Object.prototype.hasOwnProperty.call(payload, "limite_credito")) payload.limite_credito = toNullableNumber(payload.limite_credito);
    if (Object.prototype.hasOwnProperty.call(payload, "dias_credito")) payload.dias_credito = toNullableNumber(payload.dias_credito);
    if (Object.prototype.hasOwnProperty.call(payload, "dias_ruta")) {
        payload.dias_rutas = toNullableText(payload.dias_ruta);
        delete payload.dias_ruta;
    }

    if (payload.credito_habilitado === 0) {
        payload.limite_credito = null;
        payload.dias_credito = null;
    }

    const fields = [];
    const params = [];

    Object.entries(payload).forEach(([key, value]) => {
        if (key === "id_cliente" || key === "id") return;
        fields.push(`${key} = ?`);
        params.push(value);
    });

    if (fields.length === 0) {
        throw new Error("No hay datos para actualizar");
    }

    params.push(id);

    await db.execute(
        `UPDATE clientes SET ${fields.join(", ")} WHERE id_cliente = ?`,
        params
    );

    return { message: "Cliente actualizado" };
}

export const deleteCliente = async (id) => {
    // Elimina el cliente de forma fisica en base de datos.
    await db.query(
        `DELETE FROM clientes WHERE id_cliente = ?`,
        [id]
    );

    return { message: "Cliente eliminado" };
};