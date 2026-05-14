import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const STATUS_LABELS = {
    pendiente: "Pendiente",
    recibida: "Recibida",
    parcial: "Parcial",
    cancelada: "Cancelada",
};

const styles = StyleSheet.create({
    page: {
        paddingTop: 28,
        paddingHorizontal: 28,
        paddingBottom: 36,
        fontFamily: "Helvetica",
        fontSize: 9,
        color: "#1f2937",
    },
    header: {
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#d1d5db",
    },
    titleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    titleBlock: {
        width: "70%",
    },
    title: {
        fontSize: 18,
        fontWeight: 700,
        color: "#0f172a",
        marginBottom: 3,
    },
    subtitle: {
        fontSize: 9,
        color: "#6b7280",
    },
    badge: {
        minWidth: 92,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        textAlign: "center",
        fontSize: 9,
        fontWeight: 700,
        color: "#0f172a",
        backgroundColor: "#e5e7eb",
    },
    metaGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    metaItem: {
        width: "24.5%",
        paddingVertical: 7,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 8,
        backgroundColor: "#fafafa",
        marginBottom: 8,
    },
    label: {
        fontSize: 7,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        color: "#6b7280",
        marginBottom: 3,
    },
    value: {
        fontSize: 9,
        color: "#111827",
        fontWeight: 500,
    },
    section: {
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 700,
        color: "#0f172a",
        marginBottom: 8,
    },
    table: {
        borderWidth: 1,
        borderColor: "#d1d5db",
        borderRadius: 8,
        overflow: "hidden",
    },
    tableHead: {
        flexDirection: "row",
        backgroundColor: "#f3f4f6",
        borderBottomWidth: 1,
        borderBottomColor: "#d1d5db",
    },
    row: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    rowLast: {
        borderBottomWidth: 0,
    },
    cell: {
        paddingVertical: 7,
        paddingHorizontal: 8,
        justifyContent: "center",
    },
    headCell: {
        paddingVertical: 8,
        paddingHorizontal: 8,
        fontSize: 8,
        fontWeight: 700,
        color: "#374151",
    },
    colProduct: { width: "26%" },
    colCode: { width: "26%" },
    colQty: { width: "10%", textAlign: "center" },
    colUnit: { width: "18%", textAlign: "right" },
    colSubtotal: { width: "20%", textAlign: "right" },
    productName: {
        fontSize: 9,
        fontWeight: 700,
        color: "#111827",
        marginBottom: 2,
    },
    productMeta: {
        fontSize: 7.5,
        color: "#6b7280",
    },
    totalsWrap: {
        marginTop: 12,
        alignItems: "flex-end",
    },
    totalsCard: {
        width: 170,
        padding: 10,
        borderWidth: 1,
        borderColor: "#d1d5db",
        borderRadius: 8,
        backgroundColor: "#fafafa",
    },
    totalLine: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
        fontSize: 9,
    },
    totalLineEmphasis: {
        marginTop: 4,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: "#d1d5db",
        fontSize: 10,
        fontWeight: 700,
    },
    notes: {
        marginTop: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 8,
        backgroundColor: "#fafafa",
    },
    footer: {
        position: "absolute",
        bottom: 18,
        left: 28,
        right: 28,
        flexDirection: "row",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: "#d1d5db",
        paddingTop: 8,
        fontSize: 8,
        color: "#6b7280",
    },
});

function formatCurrency(value) {
    return Number(value || 0).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
    });
}

function formatDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

export default function OrdenCompraPdf({ orden }) {
    const status = STATUS_LABELS[orden?.status] || "Pendiente";
    const detalles = Array.isArray(orden?.detalles) ? orden.detalles : [];

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View style={styles.titleRow}>
                        <View style={styles.titleBlock}>
                            <Text style={styles.title}>Orden de Compra {orden?.folio || ""}</Text>
                        </View>
                        <Text style={styles.badge}>{status}</Text>
                    </View>

                    <View style={styles.metaGrid}>
                        <View style={styles.metaItem}>
                            <Text style={styles.label}>Proveedor</Text>
                            <Text style={styles.value}>{orden?.proveedor_nombre || "-"}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.label}>Giro</Text>
                            <Text style={styles.value}>{orden?.proveedor_giro || "-"}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.label}>Fecha</Text>
                            <Text style={styles.value}>{formatDate(orden?.fecha)}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.label}>Partidas</Text>
                            <Text style={styles.value}>{detalles.length}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Productos</Text>
                    <View style={styles.table}>
                        <View style={styles.tableHead}>
                            <Text style={[styles.headCell, styles.colProduct]}>Producto</Text>
                            <Text style={[styles.headCell, styles.colCode]}>Codigo Barras</Text>
                            <Text style={[styles.headCell, styles.colQty]}>Cantidad</Text>
                            <Text style={[styles.headCell, styles.colUnit]}>Costo Unit.</Text>
                            <Text style={[styles.headCell, styles.colSubtotal]}>Importe</Text>
                        </View>

                        {detalles.length === 0 ? (
                            <View style={styles.row}>
                                <Text style={[styles.cell, styles.colProduct]}>Sin productos.</Text>
                                <Text style={[styles.cell, styles.colCode]}>-</Text>
                                <Text style={[styles.cell, styles.colQty]}>-</Text>
                                <Text style={[styles.cell, styles.colUnit]}>-</Text>
                                <Text style={[styles.cell, styles.colSubtotal]}>-</Text>
                            </View>
                        ) : (
                            detalles.map((item, index) => (
                                <View key={item.id_detalle || `${item.id_presentacion}-${index}`} style={[styles.row, index === detalles.length - 1 ? styles.rowLast : null]}>
                                    <View style={[styles.cell, styles.colProduct]}>
                                        <Text style={styles.productName}>{item.presentacion_nombre || item.descripcion_manual || "-"}</Text>
                                        <Text style={styles.productMeta}>{item.producto_nombre || item.descripcion_manual || "-"}</Text>
                                    </View>
                                    <Text style={[styles.cell, styles.colCode]}>{item.codigo_barras || item.codigo_manual || "-"}</Text>
                                    <Text style={[styles.cell, styles.colQty]}>{item.cantidad ?? 0}</Text>
                                    <Text style={[styles.cell, styles.colUnit]}>{formatCurrency(item.costo_unitario)}</Text>
                                    <Text style={[styles.cell, styles.colSubtotal]}>{formatCurrency(item.subtotal)}</Text>
                                </View>
                            ))
                        )}
                    </View>
                </View>

                {orden?.notas ? (
                    <View style={styles.notes}>
                        <Text style={styles.sectionTitle}>Notas</Text>
                        <Text>{orden.notas}</Text>
                    </View>
                ) : null}

                <View style={styles.totalsWrap}>
                    <View style={styles.totalsCard}>
                        <View style={styles.totalLine}>
                            <Text>Subtotal</Text>
                            <Text>{formatCurrency(orden?.subtotal)}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.footer} fixed>
                    <Text>Generado por el sistema</Text>
                    <Text
                        render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} de ${totalPages}`}
                    />
                </View>
            </Page>
        </Document>
    );
}