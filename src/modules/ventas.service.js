import db from "@/lib/db";

export async function getVentas({ search = "" } = {}) {
    let sql = `
    SELECT
      v.id_venta,
      v.folio,
      v.total,
      v.metodo_pago,
      v.estado,
      v.created_at,
      u.nombre AS usuario_nombre
    FROM ventas v
    INNER JOIN usuarios u ON u.id_usuario = v.id_usuario
    WHERE 1=1
  `;

    const params = [];

    if (search) {
        sql += " AND (v.folio LIKE ? OR u.nombre LIKE ? OR v.metodo_pago LIKE ?)";
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += " ORDER BY v.id_venta DESC";
    const [rows] = await db.execute(sql, params);
    return rows;
}
