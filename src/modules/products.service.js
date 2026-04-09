import db from "@/lib/db";

let hasImagenUrlCache;
const PRESENTACION_OPTION_COLUMNS = new Set([
    "tipo_presentacion",
    "ubicacion",
    "rack",
    "nivel",
    "seccion",
]);

const UBICACION_CATALOGO_CONFIG = {
    rack: {
        tableName: ["almacen_racks", "almacen_rack"],
        idColumn: "id_rack",
        parentColumn: "id_almacen",
    },
    nivel: {
        tableName: "almacen_rack_niveles",
        idColumn: "id_nivel",
        parentColumn: "id_rack",
    },
    seccion: {
        tableName: "almacen_rack_nivel_secciones",
        idColumn: "id_seccion",
        parentColumn: "id_nivel",
    },
};

function getUbicacionCatalogoConfig(campo) {
    const config = UBICACION_CATALOGO_CONFIG[campo];
    if (!config) {
        throw new Error("Catalogo de ubicacion invalido");
    }
    return config;
}

async function resolveExistingTableName(tableNameOrList) {
    const tableNames = Array.isArray(tableNameOrList) ? tableNameOrList : [tableNameOrList];
    for (const tableName of tableNames) {
        if (await hasTable(tableName)) {
            return tableName;
        }
    }
    return null;
}

async function hasImagenUrlColumn() {
    if (hasImagenUrlCache !== undefined) return hasImagenUrlCache;
    const [rows] = await db.execute(
        `SELECT COUNT(*) AS total
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'productos'
           AND COLUMN_NAME = 'imagen_url'`
    );
    hasImagenUrlCache = Number(rows?.[0]?.total || 0) > 0;
    return hasImagenUrlCache;
}

const presentacionColumnCache = new Map();
const tableColumnCache = new Map();

async function hasTableColumn(tableName, columnName) {
    const cacheKey = `${tableName}.${columnName}`;
    if (tableColumnCache.has(cacheKey)) {
        return tableColumnCache.get(cacheKey);
    }

    const [rows] = await db.execute(
        `SELECT COUNT(*) AS total
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND COLUMN_NAME = ?`,
        [tableName, columnName]
    );

    const exists = Number(rows?.[0]?.total || 0) > 0;
    tableColumnCache.set(cacheKey, exists);
    return exists;
}

async function hasTable(tableName) {
    const cacheKey = `table:${tableName}`;
    if (tableColumnCache.has(cacheKey)) {
        return tableColumnCache.get(cacheKey);
    }

    const [rows] = await db.execute(
        `SELECT COUNT(*) AS total
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?`,
        [tableName]
    );

    const exists = Number(rows?.[0]?.total || 0) > 0;
    tableColumnCache.set(cacheKey, exists);
    return exists;
}

async function hasPresentacionColumn(columnName) {
    if (presentacionColumnCache.has(columnName)) {
        return presentacionColumnCache.get(columnName);
    }

    const [rows] = await db.execute(
        `SELECT COUNT(*) AS total
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'producto_presentaciones'
           AND COLUMN_NAME = ?`,
        [columnName]
    );

    const exists = Number(rows?.[0]?.total || 0) > 0;
    presentacionColumnCache.set(columnName, exists);
    return exists;
}

async function resolveExistingColumnName(tableName, columnNames) {
    for (const columnName of columnNames) {
        if (await hasTableColumn(tableName, columnName)) {
            return columnName;
        }
    }
    return null;
}

async function syncPresentacionUbicacion(idPresentacion, data) {
    try {
        const hasUbicaciones =
            (await hasTable("ubicaciones")) &&
            (await hasTableColumn("ubicaciones", "id_ubicacion")) &&
            (await hasTableColumn("ubicaciones", "id_almacen")) &&
            (await hasTableColumn("ubicaciones", "id_rack")) &&
            (await hasTableColumn("ubicaciones", "id_nivel")) &&
            (await hasTableColumn("ubicaciones", "id_seccion"));

        const hasUbicacionesPresentaciones =
            (await hasTable("ubicaciones_presentaciones")) &&
            (await hasTableColumn("ubicaciones_presentaciones", "id_presentacion")) &&
            (await hasTableColumn("ubicaciones_presentaciones", "id_ubicacion"));

        if (!hasUbicaciones || !hasUbicacionesPresentaciones) return;

        const idRack = toOptionalPositiveId(data.id_rack, "id_rack");
        const idNivel = toOptionalPositiveId(data.id_nivel, "id_nivel");
        const idSeccion = toOptionalPositiveId(data.id_seccion, "id_seccion");
        const idAlmacen = toOptionalPositiveId(data.id_almacen, "id_almacen");

        if (!idRack || !idNivel || !idSeccion) {
            await db.execute("DELETE FROM ubicaciones_presentaciones WHERE id_presentacion = ?", [idPresentacion]);
            return;
        }

        let existing = [];

        if (idAlmacen) {
            const [byAllIds] = await db.execute(
                `SELECT id_ubicacion
                 FROM ubicaciones
                 WHERE id_almacen = ? AND id_rack = ? AND id_nivel = ? AND id_seccion = ?
                 LIMIT 1`,
                [idAlmacen, idRack, idNivel, idSeccion]
            );
            existing = byAllIds;
        }

        if (!existing?.length) {
            const [byUbicacionIds] = await db.execute(
                `SELECT id_ubicacion
                 FROM ubicaciones
                 WHERE id_rack = ? AND id_nivel = ? AND id_seccion = ?
                 LIMIT 1`,
                [idRack, idNivel, idSeccion]
            );
            existing = byUbicacionIds;
        }

        let idUbicacion = existing?.[0]?.id_ubicacion;

        if (!idUbicacion) {
            let targetAlmacen = idAlmacen;

            if (!targetAlmacen) {
                const rackTable = await resolveExistingTableName(["almacen_racks", "almacen_rack"]);
                if (!rackTable || !["almacen_racks", "almacen_rack"].includes(rackTable)) {
                    throw new Error("No se encontro tabla valida de racks para resolver almacen");
                }
                const [rackRows] = await db.execute(
                    `SELECT id_almacen FROM \`${rackTable}\` WHERE id_rack = ? LIMIT 1`,
                    [idRack]
                );
                targetAlmacen = rackRows?.[0]?.id_almacen || null;
            }

            if (!targetAlmacen) {
                throw new Error("No se pudo determinar el almacen para la ubicacion");
            }

            const hasActivoCol = await hasTableColumn("ubicaciones", "activo");
            const [insertUbicacion] = hasActivoCol
                ? await db.execute(
                    `INSERT INTO ubicaciones (id_almacen, id_rack, id_nivel, id_seccion, activo)
                     VALUES (?, ?, ?, ?, 1)`,
                    [targetAlmacen, idRack, idNivel, idSeccion]
                )
                : await db.execute(
                    `INSERT INTO ubicaciones (id_almacen, id_rack, id_nivel, id_seccion)
                     VALUES (?, ?, ?, ?)`,
                    [targetAlmacen, idRack, idNivel, idSeccion]
                );

            idUbicacion = insertUbicacion.insertId;
        }

        await db.execute("DELETE FROM ubicaciones_presentaciones WHERE id_presentacion = ?", [idPresentacion]);

        const hasCantidadActual = await hasTableColumn("ubicaciones_presentaciones", "cantidad_actual");
        if (hasCantidadActual) {
            await db.execute(
                `INSERT INTO ubicaciones_presentaciones (id_ubicacion, id_presentacion, cantidad_actual)
                 VALUES (?, ?, 0)`,
                [idUbicacion, idPresentacion]
            );
        } else {
            await db.execute(
                `INSERT INTO ubicaciones_presentaciones (id_ubicacion, id_presentacion)
                 VALUES (?, ?)`,
                [idUbicacion, idPresentacion]
            );
        }
    } catch (error) {
        // No bloquear guardado de presentacion por inconsistencias de ubicaciones/triggers.
        const message = error?.message || String(error);
        const hint =
            message.includes("almacen_racks") || message.includes("danabri.r")
                ? " Revisa triggers de `ubicaciones` para usar `almacen_rack`."
                : "";
        console.warn("No se pudo sincronizar ubicacion de presentacion:", message + hint);
    }
}

async function getPresentacionColumnValueList(columnName) {
    if (!PRESENTACION_OPTION_COLUMNS.has(columnName)) {
        throw new Error("Columna de presentacion invalida");
    }

    if (!(await hasPresentacionColumn(columnName))) {
        return [];
    }

    const [rows] = await db.execute(
        `SELECT DISTINCT \`${columnName}\` AS valor
         FROM producto_presentaciones
         WHERE \`${columnName}\` IS NOT NULL
           AND \`${columnName}\` <> ''
         ORDER BY valor ASC`
    );

    return rows.map((row) => ({
        value: row.valor,
        label: String(row.valor),
    }));
}

async function getUbicacionOptionList(tableName, idColumn) {
    const resolvedTableName = await resolveExistingTableName(tableName);
    if (!resolvedTableName) {
        return [];
    }

    const hasClave = await hasTableColumn(resolvedTableName, "clave");
    const hasNombre = await hasTableColumn(resolvedTableName, "nombre");

    const labelParts = [];
    if (hasClave) labelParts.push("clave");
    if (hasNombre) labelParts.push("nombre");

    let labelSql = `CAST(${idColumn} AS CHAR)`;
    if (labelParts.length === 2) {
        labelSql = `CONCAT(COALESCE(clave, ''), CASE WHEN clave IS NOT NULL AND clave <> '' AND nombre IS NOT NULL AND nombre <> '' THEN ' - ' ELSE '' END, COALESCE(nombre, ''))`;
    } else if (hasClave) {
        labelSql = "COALESCE(clave, CAST(" + idColumn + " AS CHAR))";
    } else if (hasNombre) {
        labelSql = "COALESCE(nombre, CAST(" + idColumn + " AS CHAR))";
    }

    const [rows] = await db.execute(
        `SELECT ${idColumn} AS value, ${labelSql} AS label
            FROM ${resolvedTableName}
         ORDER BY ${hasClave ? "clave" : idColumn} ASC`
    );

    return rows.map((row) => ({
        value: row.value,
        label: String(row.label),
    }));
}

function normalizeOptionalText(value) {
    if (value === undefined || value === null) return undefined;
    const text = String(value).trim();
    return text ? text : null;
}

function normalizeOptionalId(value) {
    if (value === undefined || value === null) return undefined;
    if (value === "") return null;
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Valor invalido");
    }
    return id;
}

function toPositiveId(value, fieldName = "id") {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        throw new Error(`${fieldName} invalido`);
    }
    return id;
}

function toOptionalPositiveId(value, fieldName) {
    if (value === undefined || value === null || value === "") return null;
    return toPositiveId(value, fieldName);
}


// CATEGORIAS DE PRODUCTOS
export const getCategories = async () => {
    const [rows] = await db.execute("SELECT * FROM categorias ORDER BY nombre ASC");
    return rows;
};

export const getCategorias = getCategories;

export const getCategoryById = async (id) => {
    const [rows] = await db.execute(
        `SELECT * FROM categorias WHERE id_categoria = ?`,
        [id]
    );

    if (rows.length === 0) {
        throw new Error("Categoría no encontrada");
    }

    return rows[0];
};

export const createCategory = async (data) => {
    const nombre = data.nombre ? String(data.nombre).trim() : "";
    const activo = data.activo === undefined ? true : Boolean(data.activo);

    if (!nombre) {
        throw new Error("El nombre de la categoría es requerido");
    }

    const [result] = await db.execute(
        `INSERT INTO categorias (nombre, activo) VALUES (?, ?)`,
        [nombre, activo]
    );

    return { id: result.insertId };
};

export const createCategoria = createCategory;

export const updateCategoria = async (id, data) => {
    const fields = [];
    const params = [];

    if (data.nombre !== undefined) {
        const nombre = String(data.nombre).trim();
        if (!nombre) throw new Error("El nombre de la categoría no puede estar vacío");
        fields.push("nombre = ?");
        params.push(nombre);
    }

    if (data.activo !== undefined) {
        fields.push("activo = ?");
        params.push(Boolean(data.activo));
    }

    if (fields.length === 0) {
        throw new Error("No se proporcionaron campos para actualizar");
    }

    params.push(id);

    const [result] = await db.execute(
        "UPDATE categorias SET " + fields.join(", ") + " WHERE id_categoria = ?",
        params
    );

    if (result.affectedRows === 0) {
        throw new Error("Categoría no encontrada");
    }

    return { message: "Categoria actualizada" };
};

export const deleteCategoria = async (id) => {
    const [result] = await db.execute(
        `DELETE FROM categorias WHERE id_categoria = ?`,
        [id]
    );

    if (result.affectedRows === 0) {
        throw new Error("Categoría no encontrada");
    }

    return { message: "Categoría eliminada" };
};

const toDiscount = (value, fieldName) => {
    if (value === undefined || value === null || value === "") return 0;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0) {
        throw new Error(`${fieldName} invalido`);
    }
    return n;
};

// MARCAS
export const getMarcas = async () => {
    const [rows] = await db.execute("SELECT * FROM marcas ORDER BY nombre ASC");
    return rows;
};

export const createMarca = async (data) => {
    const nombre = data.nombre ? String(data.nombre).trim() : "";
    const activo = data.activo === undefined ? true : Boolean(data.activo);

    if (!nombre) throw new Error("El nombre de la marca es requerido");

    const [result] = await db.execute(
        `INSERT INTO marcas (nombre, descuento_1, descuento_2, descuento_3, descuento_4, activo)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            nombre,
            toDiscount(data.descuento_1, "descuento_1"),
            toDiscount(data.descuento_2, "descuento_2"),
            toDiscount(data.descuento_3, "descuento_3"),
            toDiscount(data.descuento_4, "descuento_4"),
            activo,
        ]
    );

    return { id: result.insertId };
};

export const updateMarca = async (id, data) => {
    const fields = [];
    const params = [];

    if (data.nombre !== undefined) {
        const nombre = String(data.nombre).trim();
        if (!nombre) throw new Error("El nombre no puede estar vacio");
        fields.push("nombre = ?");
        params.push(nombre);
    }

    ["descuento_1", "descuento_2", "descuento_3", "descuento_4"].forEach((k) => {
        if (data[k] !== undefined) {
            fields.push(`${k} = ?`);
            params.push(toDiscount(data[k], k));
        }
    });

    if (data.activo !== undefined) {
        fields.push("activo = ?");
        params.push(Boolean(data.activo));
    }

    if (fields.length === 0) throw new Error("No se proporcionaron campos para actualizar");

    params.push(id);
    const [result] = await db.execute(
        "UPDATE marcas SET " + fields.join(", ") + " WHERE id_marca = ?",
        params
    );

    if (result.affectedRows === 0) throw new Error("Marca no encontrada");
    return { message: "Marca actualizada" };
};

export const deleteMarca = async (id) => {
    const [result] = await db.execute("DELETE FROM marcas WHERE id_marca = ?", [id]);
    if (result.affectedRows === 0) throw new Error("Marca no encontrada");
    return { message: "Marca eliminada" };
};

// LINEAS
export const getLineas = async () => {
    const [rows] = await db.execute("SELECT * FROM lineas ORDER BY nombre ASC");
    return rows;
};

export const createLinea = async (data) => {
    const nombre = data.nombre ? String(data.nombre).trim() : "";
    const activo = data.activo === undefined ? true : Boolean(data.activo);

    if (!nombre) throw new Error("El nombre de la linea es requerido");

    const [result] = await db.execute(
        `INSERT INTO lineas (nombre, descuento_1, descuento_2, descuento_3, descuento_4, activo)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            nombre,
            toDiscount(data.descuento_1, "descuento_1"),
            toDiscount(data.descuento_2, "descuento_2"),
            toDiscount(data.descuento_3, "descuento_3"),
            toDiscount(data.descuento_4, "descuento_4"),
            activo,
        ]
    );

    return { id: result.insertId };
};

export const updateLinea = async (id, data) => {
    const fields = [];
    const params = [];

    if (data.nombre !== undefined) {
        const nombre = String(data.nombre).trim();
        if (!nombre) throw new Error("El nombre no puede estar vacio");
        fields.push("nombre = ?");
        params.push(nombre);
    }

    ["descuento_1", "descuento_2", "descuento_3", "descuento_4"].forEach((k) => {
        if (data[k] !== undefined) {
            fields.push(`${k} = ?`);
            params.push(toDiscount(data[k], k));
        }
    });

    if (data.activo !== undefined) {
        fields.push("activo = ?");
        params.push(Boolean(data.activo));
    }

    if (fields.length === 0) throw new Error("No se proporcionaron campos para actualizar");

    params.push(id);
    const [result] = await db.execute(
        "UPDATE lineas SET " + fields.join(", ") + " WHERE id_linea = ?",
        params
    );

    if (result.affectedRows === 0) throw new Error("Linea no encontrada");
    return { message: "Linea actualizada" };
};

export const deleteLinea = async (id) => {
    const [result] = await db.execute("DELETE FROM lineas WHERE id_linea = ?", [id]);
    if (result.affectedRows === 0) throw new Error("Linea no encontrada");
    return { message: "Linea eliminada" };
};

// FAMILIAS
export const getFamilias = async () => {
    const [rows] = await db.execute(
        `SELECT f.*
         FROM familias f
         ORDER BY f.nombre ASC`
    );
    return rows;
};

export const createFamilia = async (data) => {
    const nombre = data.nombre ? String(data.nombre).trim() : "";
    const activo = data.activo === undefined ? true : Boolean(data.activo);

    if (!nombre) throw new Error("El nombre de la familia es requerido");

    const [result] = await db.execute(
        `INSERT INTO familias (nombre, descuento_1, descuento_2, descuento_3, descuento_4, activo)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            nombre,
            toDiscount(data.descuento_1, "descuento_1"),
            toDiscount(data.descuento_2, "descuento_2"),
            toDiscount(data.descuento_3, "descuento_3"),
            toDiscount(data.descuento_4, "descuento_4"),
            activo,
        ]
    );

    return { id: result.insertId };
};

export const updateFamilia = async (id, data) => {
    const fields = [];
    const params = [];

    if (data.nombre !== undefined) {
        const nombre = String(data.nombre).trim();
        if (!nombre) throw new Error("El nombre no puede estar vacio");
        fields.push("nombre = ?");
        params.push(nombre);
    }

    ["descuento_1", "descuento_2", "descuento_3", "descuento_4"].forEach((k) => {
        if (data[k] !== undefined) {
            fields.push(`${k} = ?`);
            params.push(toDiscount(data[k], k));
        }
    });

    if (data.activo !== undefined) {
        fields.push("activo = ?");
        params.push(Boolean(data.activo));
    }

    if (fields.length === 0) throw new Error("No se proporcionaron campos para actualizar");

    params.push(id);
    const [result] = await db.execute(
        "UPDATE familias SET " + fields.join(", ") + " WHERE id_familia = ?",
        params
    );

    if (result.affectedRows === 0) throw new Error("Familia no encontrada");
    return { message: "Familia actualizada" };
};

export const deleteFamilia = async (id) => {
    const [result] = await db.execute("DELETE FROM familias WHERE id_familia = ?", [id]);
    if (result.affectedRows === 0) throw new Error("Familia no encontrada");
    return { message: "Familia eliminada" };
};

// PRODUCTOS

export async function getProductos({ search = "", id_marca = "", id_linea = "", id_familia = "", id_proveedor = "" } = {}) {
    const hasImagen = await hasImagenUrlColumn();
    const imagenSelect = hasImagen ? "p.imagen_url," : "NULL AS imagen_url,";
    let sql = `
    SELECT
      p.id_producto,
      p.nombre,
      p.descripcion,
            ${imagenSelect}
      p.id_categoria,
      p.id_proveedor,
      p.id_marca,
      p.id_linea,
      p.id_familia,
      p.stock_minimo_tienda,
      p.stock_minimo_bodega,
      p.descuento_producto,
      p.activo,
      c.nombre AS nombre_categoria,
      pr.nombre AS proveedor_nombre,
      m.nombre AS marca_nombre,
      l.nombre AS linea_nombre,
      f.nombre AS familia_nombre
    FROM productos p
    LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
    LEFT JOIN proveedores pr ON pr.id_proveedor = p.id_proveedor
    LEFT JOIN marcas m ON m.id_marca = p.id_marca
    LEFT JOIN lineas l ON l.id_linea = p.id_linea
    LEFT JOIN familias f ON f.id_familia = p.id_familia
    WHERE 1=1
  `;
    const params = [];

    if (search) {
        sql += " AND (p.nombre LIKE ? OR p.descripcion LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
    }
    if (id_marca) {
        sql += " AND p.id_marca = ?";
        params.push(Number(id_marca));
    }
    if (id_linea) {
        sql += " AND p.id_linea = ?";
        params.push(Number(id_linea));
    }
    if (id_familia) {
        sql += " AND p.id_familia = ?";
        params.push(Number(id_familia));
    }
    if (id_proveedor) {
        sql += " AND p.id_proveedor = ?";
        params.push(Number(id_proveedor));
    }

    sql += " ORDER BY p.nombre ASC";
    const [rows] = await db.execute(sql, params);
    return rows;
}


export const getProductoById = async (id) => {
    const hasImagen = await hasImagenUrlColumn();
    const imagenSelect = hasImagen ? "p.imagen_url" : "NULL AS imagen_url";
    const [rows] = await db.execute(
        `SELECT p.id_producto, p.nombre, p.descripcion, ${imagenSelect}, p.id_categoria, p.activo, ` +
        "c.nombre AS nombre_categoria " +
        "FROM productos p " +
        "INNER JOIN categorias c ON c.id_categoria = p.id_categoria " +
        "WHERE p.id_producto = ?",
        [id]
    );

    if (rows.length === 0) {
        throw new Error("Producto no encontrado");
    }

    const producto = rows[0];

    const [presentaciones] = await db.execute(
        "SELECT id_presentacion, id_producto, nombre, codigo_barras, piezas_por_presentacion, costo, precio_nivel_1, " +
        "activo " +
        "FROM producto_presentaciones WHERE id_producto = ? ORDER BY id_presentacion DESC",
        [id]
    );

    return {
        ...producto,
        presentaciones
    };
}

export const createProducto = async (data) => {
    const nombre = data.nombre ? String(data.nombre).trim() : "";
    const descripcion = data.descripcion || null;
    const imagen_url = data.imagen_url || null;
    const id_categoria = data.id_categoria;
    const activo = data.activo === undefined ? true : Boolean(data.activo);
    const presentaciones = Array.isArray(data.presentaciones) ? data.presentaciones : [];

    if (!nombre) throw new Error("El nombre del producto es obligatorio");
    if (!id_categoria) throw new Error("La categoria es obligatoria");

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const hasImagen = await hasImagenUrlColumn();
        const [result] = hasImagen
            ? await conn.execute(
                "INSERT INTO productos (nombre, descripcion, imagen_url, id_categoria, activo) VALUES (?, ?, ?, ?, ?)",
                [nombre, descripcion, imagen_url, id_categoria, activo]
            )
            : await conn.execute(
                "INSERT INTO productos (nombre, descripcion, id_categoria, activo) VALUES (?, ?, ?, ?)",
                [nombre, descripcion, id_categoria, activo]
            );

        const idProducto = result.insertId;

        for (const p of presentaciones) {
            const nombrePresentacion = p.nombre ? String(p.nombre).trim() : "";
            const codigoBarras = p.codigo_barras ? String(p.codigo_barras).trim() : "";
            const piezas = Number(p.piezas_por_presentacion);
            const activoPresentacion = p.activo === undefined ? true : Boolean(p.activo);
            const costoPresentacion = p.costo !== undefined && p.costo !== null ? Number(p.costo) : null;

            if (!nombrePresentacion || !codigoBarras) {
                throw new Error("Cada presentacion requiere nombre y codigo_barras");
            }

            if (Number.isNaN(piezas)) {
                throw new Error("Valores numericos invalidos en presentaciones");
            }

            if (costoPresentacion !== null && Number.isNaN(costoPresentacion)) {
                throw new Error("Costo invalido en presentaciones");
            }

            const columns = [
                "id_producto",
                "nombre",
                "codigo_barras",
                "piezas_por_presentacion",
                "activo",
            ];
            const values = [
                idProducto,
                nombrePresentacion,
                codigoBarras,
                piezas,
                activoPresentacion,
            ];

            if (costoPresentacion !== null) {
                columns.push("costo", "ultimo_costo", "fecha_ultimo_costo");
                values.push(costoPresentacion, costoPresentacion, new Date());
            }

            await conn.execute(
                `INSERT INTO producto_presentaciones (${columns.map((column) => `\`${column}\``).join(", ")})
                 VALUES (${columns.map(() => "?").join(", ")})`,
                values
            );
        }

        await conn.commit();
        return { id: idProducto };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

export const updateProducto = async (id, data) => {
    const fields = [];
    const params = [];
    if (data.imagen_url !== undefined) {
        const hasImagen = await hasImagenUrlColumn();
        if (hasImagen) {
            fields.push("imagen_url = ?");
            params.push(data.imagen_url || null);
        }
    }


    if (data.nombre !== undefined) {
        const nombre = String(data.nombre).trim();
        if (!nombre) throw new Error("El nombre no puede ir vacio");
        fields.push("nombre = ?");
        params.push(nombre);
    }

    if (data.descripcion !== undefined) {
        fields.push("descripcion = ?");
        params.push(data.descripcion || null);
    }

    if (data.id_categoria !== undefined) {
        fields.push("id_categoria = ?");
        params.push(data.id_categoria);
    }

    if (data.activo !== undefined) {
        fields.push("activo = ?");
        params.push(Boolean(data.activo));
    }

    if (fields.length === 0) {
        throw new Error("No hay datos para actualizar");
    }

    params.push(id);

    const [result] = await db.execute(
        "UPDATE productos SET " + fields.join(", ") + " WHERE id_producto = ?",
        params
    );

    if (result.affectedRows === 0) {
        throw new Error("Producto no encontrado");
    }

    return { message: "Producto actualizado" };
};

export const deleteProducto = async (id) => {
    const [result] = await db.execute(
        "DELETE FROM productos WHERE id_producto = ?",
        [id]
    );

    if (result.affectedRows === 0) {
        throw new Error("Producto no encontrado");
    }

    return { message: "Producto eliminado" };
};


// PRESENTACIONES

export const getPresentacionesByProducto = async (idProducto) => {
    const hasTipoPresentacion = await hasPresentacionColumn("tipo_presentacion");
    const hasUbicacion = await hasPresentacionColumn("ubicacion");
    const hasCodigoUbicacion = await hasPresentacionColumn("codigo_ubicacion");
    const hasIdRack = await hasPresentacionColumn("id_rack");
    const hasIdNivel = await hasPresentacionColumn("id_nivel");
    const hasIdSeccion = await hasPresentacionColumn("id_seccion");
    const hasIdMarca = await hasPresentacionColumn("id_marca");
    const hasIdLinea = await hasPresentacionColumn("id_linea");
    const hasIdFamilia = await hasPresentacionColumn("id_familia");
    const hasCosto = await hasPresentacionColumn("costo");
    const hasIdProveedor = await hasPresentacionColumn("id_proveedor");
    const hasUltimoCosto = await hasPresentacionColumn("ultimo_costo");
    const hasFechaUltimoCosto = await hasPresentacionColumn("fecha_ultimo_costo");

    const selectColumns = [
        "pp.id_presentacion",
        "pp.id_producto",
        "pp.nombre",
        "pp.codigo_barras",
        "pp.piezas_por_presentacion",
        hasTipoPresentacion ? "pp.tipo_presentacion" : "NULL AS tipo_presentacion",
        hasUbicacion ? "pp.ubicacion" : "NULL AS ubicacion",
        hasCosto ? "pp.costo" : "NULL AS costo",
        hasIdProveedor ? "pp.id_proveedor" : "NULL AS id_proveedor",
        hasUltimoCosto ? "pp.ultimo_costo" : "NULL AS ultimo_costo",
        hasFechaUltimoCosto ? "pp.fecha_ultimo_costo" : "NULL AS fecha_ultimo_costo",
        // Niveles de precios
        hasCosto ? "pp.precio_nivel_1" : "NULL AS precio_nivel_1",
        hasCosto ? "pp.cantidad_nivel_1" : "NULL AS cantidad_nivel_1",
        hasCosto ? "pp.utilidad_nivel_1" : "NULL AS utilidad_nivel_1",
        hasCosto ? "pp.precio_nivel_2" : "NULL AS precio_nivel_2",
        hasCosto ? "pp.cantidad_nivel_2" : "NULL AS cantidad_nivel_2",
        hasCosto ? "pp.utilidad_nivel_2" : "NULL AS utilidad_nivel_2",
        hasCosto ? "pp.precio_nivel_3" : "NULL AS precio_nivel_3",
        hasCosto ? "pp.cantidad_nivel_3" : "NULL AS cantidad_nivel_3",
        hasCosto ? "pp.utilidad_nivel_3" : "NULL AS utilidad_nivel_3",
        hasCosto ? "pp.precio_nivel_4" : "NULL AS precio_nivel_4",
        hasCosto ? "pp.cantidad_nivel_4" : "NULL AS cantidad_nivel_4",
        hasCosto ? "pp.utilidad_nivel_4" : "NULL AS utilidad_nivel_4",
        hasCosto ? "pp.precio_nivel_5" : "NULL AS precio_nivel_5",
        hasCosto ? "pp.cantidad_nivel_5" : "NULL AS cantidad_nivel_5",
        hasCosto ? "pp.utilidad_nivel_5" : "NULL AS utilidad_nivel_5",
        "pp.activo",
        hasCodigoUbicacion ? "pp.codigo_ubicacion" : "NULL AS codigo_ubicacion",
        hasIdRack ? "pp.id_rack" : "NULL AS id_rack",
        hasIdNivel ? "pp.id_nivel" : "NULL AS id_nivel",
        hasIdSeccion ? "pp.id_seccion" : "NULL AS id_seccion",
        hasIdMarca ? "pp.id_marca" : "p.id_marca AS id_marca",
        hasIdLinea ? "pp.id_linea" : "p.id_linea AS id_linea",
        hasIdFamilia ? "pp.id_familia" : "p.id_familia AS id_familia",
        "COALESCE(m.nombre, pm.nombre) AS marca_nombre",
        "COALESCE(l.nombre, pl.nombre) AS linea_nombre",
        "COALESCE(f.nombre, pf.nombre) AS familia_nombre",
    ];

    const marcaJoinExpr = hasIdMarca
        ? "CASE WHEN pp.id_marca IS NULL THEN p.id_marca ELSE pp.id_marca END"
        : "p.id_marca";
    const lineaJoinExpr = hasIdLinea
        ? "CASE WHEN pp.id_linea IS NULL THEN p.id_linea ELSE pp.id_linea END"
        : "p.id_linea";
    const familiaJoinExpr = hasIdFamilia
        ? "CASE WHEN pp.id_familia IS NULL THEN p.id_familia ELSE pp.id_familia END"
        : "p.id_familia";

    const joins = [
        "FROM producto_presentaciones pp",
        "INNER JOIN productos p ON p.id_producto = pp.id_producto",
        "LEFT JOIN marcas pm ON pm.id_marca = p.id_marca",
        "LEFT JOIN lineas pl ON pl.id_linea = p.id_linea",
        "LEFT JOIN familias pf ON pf.id_familia = p.id_familia",
        `LEFT JOIN marcas m ON m.id_marca = ${marcaJoinExpr}`,
        `LEFT JOIN lineas l ON l.id_linea = ${lineaJoinExpr}`,
        `LEFT JOIN familias f ON f.id_familia = ${familiaJoinExpr}`,
    ];

    const hasUbicacionesJoin =
        (await hasTable("ubicaciones_presentaciones")) &&
        (await hasTable("ubicaciones")) &&
        (await hasTableColumn("ubicaciones_presentaciones", "id_presentacion")) &&
        (await hasTableColumn("ubicaciones_presentaciones", "id_ubicacion")) &&
        (await hasTableColumn("ubicaciones", "id_ubicacion"));

    if (hasUbicacionesJoin) {
        const codigoUbicacionColumn = await resolveExistingColumnName("ubicaciones", [
            "codigo_alfanumerico",
            "codigo_ubicacion",
            "codigo",
            "clave",
        ]);
        if (codigoUbicacionColumn) {
            selectColumns.push(`u.\`${codigoUbicacionColumn}\` AS codigo_ubicacion_db`);
        } else {
            selectColumns.push("NULL AS codigo_ubicacion_db");
        }
        selectColumns.push("u.id_almacen AS id_almacen_ubicacion");
        selectColumns.push("u.id_rack AS id_rack_ubicacion");
        selectColumns.push("u.id_nivel AS id_nivel_ubicacion");
        selectColumns.push("u.id_seccion AS id_seccion_ubicacion");
        joins.push("LEFT JOIN ubicaciones_presentaciones up ON up.id_presentacion = pp.id_presentacion");
        joins.push("LEFT JOIN ubicaciones u ON u.id_ubicacion = up.id_ubicacion");
    }

    const params = [];
    const whereClause = idProducto ? "WHERE pp.id_producto = ?" : "";
    if (idProducto) params.push(idProducto);

    const [rows] = await db.execute(
        `SELECT ${selectColumns.join(", ")}
         ${joins.join("\n         ")}
         ${whereClause}
         ORDER BY pp.id_presentacion DESC`,
        params
    );
    return rows.map((row) => ({
        ...row,
        codigo_ubicacion: row.codigo_ubicacion_db ?? row.codigo_ubicacion ?? null,
        id_almacen: row.id_almacen_ubicacion ?? null,
        id_rack: row.id_rack ?? row.id_rack_ubicacion ?? null,
        id_nivel: row.id_nivel ?? row.id_nivel_ubicacion ?? null,
        id_seccion: row.id_seccion ?? row.id_seccion_ubicacion ?? null,
    }));
};

export const getPresentacionOpciones = async (campo) => {
    if (campo === "rack" || campo === "nivel" || campo === "seccion") {
        const config = getUbicacionCatalogoConfig(campo);
        return await getUbicacionOptionList(config.tableName, config.idColumn);
    }

    return await getPresentacionColumnValueList(campo);
};

export const getPresentacionCatalogoItems = async (campo) => {
    const config = getUbicacionCatalogoConfig(campo);
    const { tableName, idColumn, parentColumn } = config;
    const resolvedTableName = await resolveExistingTableName(tableName);

    if (!resolvedTableName) {
        return [];
    }

    const hasClave = await hasTableColumn(resolvedTableName, "clave");
    const hasNombre = await hasTableColumn(resolvedTableName, "nombre");
    const hasActivo = await hasTableColumn(resolvedTableName, "activo");
    const hasParent = parentColumn ? await hasTableColumn(resolvedTableName, parentColumn) : false;

    const selectColumns = [`${idColumn} AS id`];
    if (hasClave) selectColumns.push("clave");
    if (hasNombre) selectColumns.push("nombre");
    if (hasActivo) selectColumns.push("activo");
    if (hasParent) selectColumns.push(`${parentColumn} AS parent_id`);

    const [rows] = await db.execute(
        `SELECT ${selectColumns.join(", ")}
            FROM ${resolvedTableName}
         ORDER BY ${hasClave ? "clave" : idColumn} ASC`
    );

    return rows.map((row) => {
        const nombre = row.nombre !== undefined && row.nombre !== null ? String(row.nombre) : "";
        const clave = row.clave !== undefined && row.clave !== null ? String(row.clave) : "";
        return {
            id: row.id,
            clave,
            nombre,
            activo: row.activo === undefined ? true : Boolean(row.activo),
            parent_id: row.parent_id === undefined ? null : row.parent_id,
            label: nombre || clave || String(row.id),
        };
    });
};

export const createPresentacionCatalogoItem = async (campo, data) => {
    const config = getUbicacionCatalogoConfig(campo);
    const { tableName, parentColumn } = config;
    const resolvedTableName = await resolveExistingTableName(tableName);

    if (!resolvedTableName) {
        throw new Error("La tabla del catalogo no existe");
    }

    const hasClave = await hasTableColumn(resolvedTableName, "clave");
    const hasNombre = await hasTableColumn(resolvedTableName, "nombre");
    const hasActivo = await hasTableColumn(resolvedTableName, "activo");
    const hasParent = parentColumn ? await hasTableColumn(resolvedTableName, parentColumn) : false;

    const columns = [];
    const values = [];

    if (hasNombre) {
        const nombre = String(data.nombre || data.label || "").trim();
        if (!nombre) throw new Error("El nombre es requerido");
        columns.push("nombre");
        values.push(nombre);
    }

    if (hasClave) {
        const fallbackBase = String(data.nombre || data.label || campo).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "UBI";
        const fallbackClave = `${fallbackBase}${Date.now().toString().slice(-4)}`.slice(0, 10);
        const claveRaw = data.clave === undefined || data.clave === null ? "" : String(data.clave).trim();
        columns.push("clave");
        values.push((claveRaw || fallbackClave).slice(0, 10));
    }

    if (hasActivo) {
        columns.push("activo");
        values.push(data.activo === undefined ? true : Boolean(data.activo));
    }

    if (hasParent) {
        if (data.parent_id === undefined || data.parent_id === null || data.parent_id === "") {
            throw new Error(`El campo ${parentColumn} es requerido`);
        }
        const parentId = toPositiveId(data.parent_id, parentColumn);
        columns.push(parentColumn);
        values.push(parentId);
    }

    if (columns.length === 0) {
        throw new Error("No hay datos validos para crear");
    }

    const [result] = await db.execute(
        `INSERT INTO ${resolvedTableName} (${columns.map((column) => `\`${column}\``).join(", ")})
         VALUES (${columns.map(() => "?").join(", ")})`,
        values
    );

    return { id: result.insertId };
};

export const updatePresentacionCatalogoItem = async (campo, id, data) => {
    const config = getUbicacionCatalogoConfig(campo);
    const { tableName, idColumn, parentColumn } = config;
    const resolvedTableName = await resolveExistingTableName(tableName);
    const itemId = toPositiveId(id, idColumn);

    if (!resolvedTableName) {
        throw new Error("La tabla del catalogo no existe");
    }

    const hasClave = await hasTableColumn(resolvedTableName, "clave");
    const hasNombre = await hasTableColumn(resolvedTableName, "nombre");
    const hasActivo = await hasTableColumn(resolvedTableName, "activo");
    const hasParent = parentColumn ? await hasTableColumn(resolvedTableName, parentColumn) : false;

    const fields = [];
    const params = [];

    if (hasNombre && data.nombre !== undefined) {
        const nombre = String(data.nombre || "").trim();
        if (!nombre) throw new Error("El nombre no puede ir vacio");
        fields.push("nombre = ?");
        params.push(nombre);
    }

    if (hasClave && data.clave !== undefined) {
        const clave = String(data.clave || "").trim();
        fields.push("clave = ?");
        params.push(clave || null);
    }

    if (hasActivo && data.activo !== undefined) {
        fields.push("activo = ?");
        params.push(Boolean(data.activo));
    }

    if (hasParent && data.parent_id !== undefined) {
        fields.push(`${parentColumn} = ?`);
        params.push(toOptionalPositiveId(data.parent_id, parentColumn));
    }

    if (fields.length === 0) {
        throw new Error("No se proporcionaron campos para actualizar");
    }

    params.push(itemId);
    const [result] = await db.execute(
        `UPDATE ${resolvedTableName} SET ${fields.join(", ")} WHERE ${idColumn} = ?`,
        params
    );

    if (result.affectedRows === 0) {
        throw new Error("Registro no encontrado");
    }

    return { message: "Registro actualizado" };
};

export const deletePresentacionCatalogoItem = async (campo, id) => {
    const config = getUbicacionCatalogoConfig(campo);
    const { tableName, idColumn } = config;
    const resolvedTableName = await resolveExistingTableName(tableName);
    const itemId = toPositiveId(id, idColumn);

    if (!resolvedTableName) {
        throw new Error("La tabla del catalogo no existe");
    }

    const [result] = await db.execute(
        `DELETE FROM ${resolvedTableName} WHERE ${idColumn} = ?`,
        [itemId]
    );

    if (result.affectedRows === 0) {
        throw new Error("Registro no encontrado");
    }

    return { message: "Registro eliminado" };
};

export const createPresentacion = async (idProducto, data) => {
    const nombre = data.nombre ? String(data.nombre).trim() : "";
    const codigo_barras = data.codigo_barras ? String(data.codigo_barras).trim() : "";
    const piezas_por_presentacion = Number(data.piezas_por_presentacion);
    const activo = data.activo === undefined ? true : Boolean(data.activo);
    const tipo_presentacion = normalizeOptionalText(data.tipo_presentacion);
    const id_marca = normalizeOptionalId(data.id_marca);
    const id_linea = normalizeOptionalId(data.id_linea);
    const id_familia = normalizeOptionalId(data.id_familia);
    const ubicacion = normalizeOptionalText(data.ubicacion);
    const id_rack = normalizeOptionalId(data.id_rack);
    const id_nivel = normalizeOptionalId(data.id_nivel);
    const id_seccion = normalizeOptionalId(data.id_seccion);
    const id_almacen = normalizeOptionalId(data.id_almacen);
    const costo = data.costo !== undefined && data.costo !== null ? Number(data.costo) : null;
    const id_proveedor = data.id_proveedor !== undefined && data.id_proveedor !== null ? Number(data.id_proveedor) : null;

    if (!nombre || !codigo_barras) {
        throw new Error("Nombre y codigo_barras son obligatorios");
    }

    if (Number.isNaN(piezas_por_presentacion)) {
        throw new Error("piezas_por_presentacion invalido");
    }

    if (costo !== null && Number.isNaN(costo)) {
        throw new Error("Costo invalido");
    }

    const columns = [
        "id_producto",
        "nombre",
        "codigo_barras",
        "piezas_por_presentacion",
        "activo",
    ];
    const values = [
        idProducto,
        nombre,
        codigo_barras,
        piezas_por_presentacion,
        activo,
    ];

    // Agregar nuevos campos de costo y proveedor
    if (costo !== null && !Number.isNaN(costo)) {
        columns.push("costo");
        values.push(costo);
        columns.push("ultimo_costo");
        values.push(costo);
        columns.push("fecha_ultimo_costo");
        values.push(new Date());
    }

    if (id_proveedor !== null && !Number.isNaN(id_proveedor)) {
        columns.push("id_proveedor");
        values.push(id_proveedor);
    }

    // Agregar niveles de precios
    for (let nivel = 1; nivel <= 5; nivel++) {
        const precio = data[`precio_nivel_${nivel}`] !== undefined ? Number(data[`precio_nivel_${nivel}`]) : null;
        const cantidad = data[`cantidad_nivel_${nivel}`] !== undefined ? Number(data[`cantidad_nivel_${nivel}`]) : null;
        const utilidad = data[`utilidad_nivel_${nivel}`] !== undefined ? Number(data[`utilidad_nivel_${nivel}`]) : null;

        if (precio !== null && !Number.isNaN(precio)) {
            columns.push(`precio_nivel_${nivel}`);
            values.push(precio);
        }
        if (cantidad !== null && !Number.isNaN(cantidad)) {
            columns.push(`cantidad_nivel_${nivel}`);
            values.push(cantidad);
        }
        if (utilidad !== null && !Number.isNaN(utilidad)) {
            columns.push(`utilidad_nivel_${nivel}`);
            values.push(utilidad);
        }
    }

    const extraFields = {
        tipo_presentacion,
        id_marca,
        id_linea,
        id_familia,
        ubicacion,
        codigo_ubicacion: normalizeOptionalText(data.codigo_ubicacion),
        id_rack,
        id_nivel,
        id_seccion,
    };

    for (const [column, value] of Object.entries(extraFields)) {
        if (value === undefined) continue;
        if (await hasPresentacionColumn(column)) {
            columns.push(column);
            values.push(value);
        }
    }

    const [result] = await db.execute(
        `INSERT INTO producto_presentaciones (${columns.map((column) => `\`${column}\``).join(", ")})
         VALUES (${columns.map(() => "?").join(", ")})`,
        values
    );

    await syncPresentacionUbicacion(result.insertId, {
        id_almacen,
        id_rack,
        id_nivel,
        id_seccion,
    });

    // Fallback: si la tabla de presentaciones no tiene estos campos, se guardan a nivel producto.
    const productFallbackFields = [];
    const productFallbackParams = [];

    if (!(await hasPresentacionColumn("id_marca")) && id_marca !== undefined) {
        productFallbackFields.push("id_marca = ?");
        productFallbackParams.push(id_marca);
    }
    if (!(await hasPresentacionColumn("id_linea")) && id_linea !== undefined) {
        productFallbackFields.push("id_linea = ?");
        productFallbackParams.push(id_linea);
    }
    if (!(await hasPresentacionColumn("id_familia")) && id_familia !== undefined) {
        productFallbackFields.push("id_familia = ?");
        productFallbackParams.push(id_familia);
    }

    if (productFallbackFields.length > 0) {
        productFallbackParams.push(idProducto);
        await db.execute(
            `UPDATE productos SET ${productFallbackFields.join(", ")} WHERE id_producto = ?`,
            productFallbackParams
        );
    }

    return { id: result.insertId };
};

export const updatePresentacion = async (idPresentacion, data) => {
    const fields = [];
    const params = [];

    if (data.nombre !== undefined) {
        const nombre = String(data.nombre).trim();
        if (!nombre) throw new Error("El nombre no puede ir vacio");
        fields.push("nombre = ?");
        params.push(nombre);
    }

    if (data.codigo_barras !== undefined) {
        const codigo = String(data.codigo_barras).trim();
        if (!codigo) throw new Error("El codigo_barras no puede ir vacio");
        fields.push("codigo_barras = ?");
        params.push(codigo);
    }

    if (data.piezas_por_presentacion !== undefined) {
        const n = Number(data.piezas_por_presentacion);
        if (Number.isNaN(n)) throw new Error("piezas_por_presentacion invalido");
        fields.push("piezas_por_presentacion = ?");
        params.push(n);
    }

    // Manejar nuevo campo costo
    if (data.costo !== undefined) {
        if (data.costo === null) {
            fields.push("costo = ?");
            params.push(null);
        } else {
            const n = Number(data.costo);
            if (Number.isNaN(n)) throw new Error("costo invalido");
            fields.push("costo = ?");
            params.push(n);
            // Actualizar último costo cuando cambia el costo
            if (await hasPresentacionColumn("ultimo_costo")) {
                fields.push("ultimo_costo = ?");
                params.push(n);
            }
            if (await hasPresentacionColumn("fecha_ultimo_costo")) {
                fields.push("fecha_ultimo_costo = ?");
                params.push(new Date());
            }
        }
    }

    if (data.id_proveedor !== undefined) {
        if (data.id_proveedor === null) {
            fields.push("id_proveedor = ?");
            params.push(null);
        } else {
            const n = Number(data.id_proveedor);
            if (Number.isNaN(n)) throw new Error("id_proveedor invalido");
            fields.push("id_proveedor = ?");
            params.push(n);
        }
    }

    // Agregar lógica para niveles de precios
    for (let nivel = 1; nivel <= 5; nivel++) {
        if (data[`precio_nivel_${nivel}`] !== undefined) {
            if (data[`precio_nivel_${nivel}`] === null) {
                fields.push(`precio_nivel_${nivel} = ?`);
                params.push(null);
            } else {
                const n = Number(data[`precio_nivel_${nivel}`]);
                if (Number.isNaN(n)) throw new Error(`precio_nivel_${nivel} invalido`);
                fields.push(`precio_nivel_${nivel} = ?`);
                params.push(n);
            }
        }
        if (data[`cantidad_nivel_${nivel}`] !== undefined) {
            if (data[`cantidad_nivel_${nivel}`] === null) {
                fields.push(`cantidad_nivel_${nivel} = ?`);
                params.push(null);
            } else {
                const n = Number(data[`cantidad_nivel_${nivel}`]);
                if (Number.isNaN(n)) throw new Error(`cantidad_nivel_${nivel} invalido`);
                fields.push(`cantidad_nivel_${nivel} = ?`);
                params.push(n);
            }
        }
        if (data[`utilidad_nivel_${nivel}`] !== undefined) {
            if (data[`utilidad_nivel_${nivel}`] === null) {
                fields.push(`utilidad_nivel_${nivel} = ?`);
                params.push(null);
            } else {
                const n = Number(data[`utilidad_nivel_${nivel}`]);
                if (Number.isNaN(n)) throw new Error(`utilidad_nivel_${nivel} invalido`);
                fields.push(`utilidad_nivel_${nivel} = ?`);
                params.push(n);
            }
        }
    }

    if (data.activo !== undefined) {
        fields.push("activo = ?");
        params.push(Boolean(data.activo));
    }

    const extraFields = {
        tipo_presentacion: normalizeOptionalText(data.tipo_presentacion),
        id_marca: normalizeOptionalId(data.id_marca),
        id_linea: normalizeOptionalId(data.id_linea),
        id_familia: normalizeOptionalId(data.id_familia),
        ubicacion: normalizeOptionalText(data.ubicacion),
        codigo_ubicacion: normalizeOptionalText(data.codigo_ubicacion),
        id_rack: normalizeOptionalId(data.id_rack),
        id_nivel: normalizeOptionalId(data.id_nivel),
        id_seccion: normalizeOptionalId(data.id_seccion),
    };

    for (const [column, value] of Object.entries(extraFields)) {
        if (value === undefined) continue;
        if (await hasPresentacionColumn(column)) {
            fields.push(`${column} = ?`);
            params.push(value);
        }
    }

    if (fields.length === 0) {
        throw new Error("No hay datos para actualizar");
    }

    params.push(idPresentacion);

    const [result] = await db.execute(
        "UPDATE producto_presentaciones SET " + fields.join(", ") + " WHERE id_presentacion = ?",
        params
    );

    if (result.affectedRows === 0) {
        throw new Error("Presentacion no encontrada");
    }

    await syncPresentacionUbicacion(idPresentacion, {
        id_almacen: data.id_almacen,
        id_rack: data.id_rack,
        id_nivel: data.id_nivel,
        id_seccion: data.id_seccion,
    });

    // Fallback: persistir marca/linea/familia en productos si esas columnas no existen en presentaciones.
    const productFallbackFields = [];
    const productFallbackParams = [];

    const normalizeProductRelationValue = (value) => {
        if (value === undefined) return undefined;
        if (value === null || value === "") return null;
        return normalizeOptionalId(value);
    };

    if (!(await hasPresentacionColumn("id_marca")) && data.id_marca !== undefined) {
        productFallbackFields.push("id_marca = ?");
        productFallbackParams.push(normalizeProductRelationValue(data.id_marca));
    }
    if (!(await hasPresentacionColumn("id_linea")) && data.id_linea !== undefined) {
        productFallbackFields.push("id_linea = ?");
        productFallbackParams.push(normalizeProductRelationValue(data.id_linea));
    }
    if (!(await hasPresentacionColumn("id_familia")) && data.id_familia !== undefined) {
        productFallbackFields.push("id_familia = ?");
        productFallbackParams.push(normalizeProductRelationValue(data.id_familia));
    }

    if (productFallbackFields.length > 0) {
        const [rows] = await db.execute(
            "SELECT id_producto FROM producto_presentaciones WHERE id_presentacion = ? LIMIT 1",
            [idPresentacion]
        );
        const idProducto = rows?.[0]?.id_producto;
        if (idProducto) {
            productFallbackParams.push(idProducto);
            await db.execute(
                `UPDATE productos SET ${productFallbackFields.join(", ")} WHERE id_producto = ?`,
                productFallbackParams
            );
        }
    }

    return { message: "Presentacion actualizada" };
};

export const deletePresentacion = async (idPresentacion) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const hasUbicacionesPresentaciones =
            (await hasTable("ubicaciones_presentaciones")) &&
            (await hasTableColumn("ubicaciones_presentaciones", "id_presentacion"));
        const hasIdUbicacionInUP =
            hasUbicacionesPresentaciones &&
            (await hasTableColumn("ubicaciones_presentaciones", "id_ubicacion"));
        const hasUbicaciones =
            (await hasTable("ubicaciones")) &&
            (await hasTableColumn("ubicaciones", "id_ubicacion"));

        let ubicacionIds = [];

        if (hasIdUbicacionInUP) {
            const [linkedRows] = await connection.execute(
                "SELECT id_ubicacion FROM ubicaciones_presentaciones WHERE id_presentacion = ?",
                [idPresentacion]
            );
            ubicacionIds = linkedRows
                .map((row) => Number(row.id_ubicacion))
                .filter((id) => Number.isInteger(id) && id > 0);
        }

        if (hasUbicacionesPresentaciones) {
            await connection.execute(
                "DELETE FROM ubicaciones_presentaciones WHERE id_presentacion = ?",
                [idPresentacion]
            );
        }

        const [result] = await connection.execute(
            "DELETE FROM producto_presentaciones WHERE id_presentacion = ?",
            [idPresentacion]
        );

        if (result.affectedRows === 0) {
            throw new Error("Presentacion no encontrada");
        }

        if (hasUbicaciones && ubicacionIds.length > 0) {
            const placeholders = ubicacionIds.map(() => "?").join(", ");
            await connection.execute(
                `DELETE FROM ubicaciones
                                 WHERE id_ubicacion IN (${placeholders})
                                     AND NOT EXISTS (
                                         SELECT 1
                                         FROM ubicaciones_presentaciones up
                                         WHERE up.id_ubicacion = ubicaciones.id_ubicacion
                                     )`,
                ubicacionIds
            );
        }

        await connection.commit();
        return { message: "Presentacion eliminada" };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// PROVEEDORES
export const getProveedores = async () => {
    const [rows] = await db.execute(
        "SELECT id_proveedor, nombre FROM proveedores WHERE activo = 1 OR activo = true ORDER BY nombre ASC"
    );
    return rows || [];
};