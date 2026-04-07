import db from "@/lib/db";

export async function getCompras({ search = "" } = {}) {
    let sql = `
    SELECT
      c.id_compra,
      c.total,
      c.estado,
      c.tipo,
      c.created_at,
      p.nombre AS proveedor_nombre,
      u.nombre AS usuario_nombre
    FROM compras c
    INNER JOIN proveedores p ON p.id_proveedor = c.id_proveedor
    INNER JOIN usuarios u ON u.id_usuario = c.id_usuario
    WHERE 1=1
  `;

    const params = [];

    if (search) {
        sql += " AND (p.nombre LIKE ? OR u.nombre LIKE ? OR c.estado LIKE ?)";
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += " ORDER BY c.id_compra DESC";
    const [rows] = await db.execute(sql, params);
    return rows;
}
