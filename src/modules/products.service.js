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
        `SELECT f.*, l.nombre AS nombre_linea
         FROM familias f
         INNER JOIN lineas l ON l.id_linea = f.id_linea
         ORDER BY f.nombre ASC`
    );
    return rows;
};

export const createFamilia = async (data) => {
    const nombre = data.nombre ? String(data.nombre).trim() : "";
    const id_linea = Number(data.id_linea);
    const activo = data.activo === undefined ? true : Boolean(data.activo);

    if (!nombre) throw new Error("El nombre de la familia es requerido");
    if (!id_linea || Number.isNaN(id_linea)) throw new Error("id_linea invalido");

    const [result] = await db.execute(
        `INSERT INTO familias (id_linea, nombre, descuento_1, descuento_2, descuento_3, descuento_4, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            id_linea,
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

    if (data.id_linea !== undefined) {
        const idLinea = Number(data.id_linea);
        if (!idLinea || Number.isNaN(idLinea)) throw new Error("id_linea invalido");
        fields.push("id_linea = ?");
        params.push(idLinea);
    }

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
        "SELECT id_presentacion, id_producto, nombre, codigo_barras, piezas_por_presentacion, " +
        "precio_menudeo, precio_mayoreo, activo " +
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
            const precioMenudeo = Number(p.precio_menudeo);
            const precioMayoreo = Number(p.precio_mayoreo);
            const activoPresentacion = p.activo === undefined ? true : Boolean(p.activo);

            if (!nombrePresentacion || !codigoBarras) {
                throw new Error("Cada presentacion requiere nombre y codigo_barras");
            }

            if (
                Number.isNaN(piezas) ||
                Number.isNaN(precioMenudeo) ||
                Number.isNaN(precioMayoreo)
            ) {
                throw new Error("Valores numericos invalidos en presentaciones");
            }

            await conn.execute(
                "INSERT INTO producto_presentaciones (" +
                "id_producto, nombre, codigo_barras, piezas_por_presentacion, " +
                "precio_menudeo, precio_mayoreo, activo" +
                ") VALUES (?, ?, ?, ?, ?, ?, ?)",
                [
                    idProducto,
                    nombrePresentacion,
                    codigoBarras,
                    piezas,
                    precioMenudeo,
                    precioMayoreo,
                    activoPresentacion
                ]
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
    const hasCodigoUbicacion = await hasPresentacionColumn("codigo_ubicacion");
    const hasIdRack = await hasPresentacionColumn("id_rack");
    const hasIdNivel = await hasPresentacionColumn("id_nivel");
    const hasIdSeccion = await hasPresentacionColumn("id_seccion");
    const hasIdMarca = await hasPresentacionColumn("id_marca");
    const hasIdLinea = await hasPresentacionColumn("id_linea");
    const hasIdFamilia = await hasPresentacionColumn("id_familia");

    const selectColumns = [
        "pp.id_presentacion",
        "pp.id_producto",
        "pp.nombre",
        "pp.codigo_barras",
        "pp.piezas_por_presentacion",
        "pp.precio_menudeo",
        "pp.precio_mayoreo",
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
        (await hasTableColumn("ubicaciones", "id_ubicacion")) &&
        (await hasTableColumn("ubicaciones", "codigo_alfanumerico"));

    if (hasUbicacionesJoin) {
        selectColumns.push("u.codigo_alfanumerico AS codigo_ubicacion_db");
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
        codigo_ubicacion: row.codigo_ubicacion_db || row.codigo_ubicacion || null,
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
    const precio_menudeo = Number(data.precio_menudeo);
    const precio_mayoreo = Number(data.precio_mayoreo);
    const activo = data.activo === undefined ? true : Boolean(data.activo);
    const tipo_presentacion = normalizeOptionalText(data.tipo_presentacion);
    const id_marca = normalizeOptionalId(data.id_marca);
    const id_linea = normalizeOptionalId(data.id_linea);
    const id_familia = normalizeOptionalId(data.id_familia);
    const ubicacion = normalizeOptionalText(data.ubicacion);
    const id_rack = normalizeOptionalId(data.id_rack);
    const id_nivel = normalizeOptionalId(data.id_nivel);
    const id_seccion = normalizeOptionalId(data.id_seccion);

    if (!nombre || !codigo_barras) {
        throw new Error("Nombre y codigo_barras son obligatorios");
    }

    if (
        Number.isNaN(piezas_por_presentacion) ||
        Number.isNaN(precio_menudeo) ||
        Number.isNaN(precio_mayoreo)
    ) {
        throw new Error("Valores numericos invalidos");
    }

    const columns = [
        "id_producto",
        "nombre",
        "codigo_barras",
        "piezas_por_presentacion",
        "precio_menudeo",
        "precio_mayoreo",
        "activo",
    ];
    const values = [
        idProducto,
        nombre,
        codigo_barras,
        piezas_por_presentacion,
        precio_menudeo,
        precio_mayoreo,
        activo,
    ];

    const extraFields = {
        tipo_presentacion,
        id_marca,
        id_linea,
        id_familia,
        ubicacion,
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

    if (data.precio_menudeo !== undefined) {
        const n = Number(data.precio_menudeo);
        if (Number.isNaN(n)) throw new Error("precio_menudeo invalido");
        fields.push("precio_menudeo = ?");
        params.push(n);
    }

    if (data.precio_mayoreo !== undefined) {
        const n = Number(data.precio_mayoreo);
        if (Number.isNaN(n)) throw new Error("precio_mayoreo invalido");
        fields.push("precio_mayoreo = ?");
        params.push(n);
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

    return { message: "Presentacion actualizada" };
};

export const deletePresentacion = async (idPresentacion) => {
    const [result] = await db.execute(
        "DELETE FROM producto_presentaciones WHERE id_presentacion = ?",
        [idPresentacion]
    );

    if (result.affectedRows === 0) {
        throw new Error("Presentacion no encontrada");
    }

    return { message: "Presentacion eliminada" };
};