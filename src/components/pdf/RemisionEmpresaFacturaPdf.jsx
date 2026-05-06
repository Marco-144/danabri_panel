import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

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
    title: {
        fontSize: 18,
        fontWeight: 700,
        color: "#0f172a",
        marginBottom: 3,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 9,
        color: "#6b7280",
        textAlign: "center",
    },
    metaGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        marginTop: 8,
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
    colDesc: { width: "38%" },
    colQty: { width: "12%", textAlign: "center" },
    colUnit: { width: "20%", textAlign: "right" },
    colTotal: { width: "30%", textAlign: "right" },
    totalsWrap: {
        marginTop: 12,
        alignItems: "flex-end",
    },
    totalsCard: {
        width: 190,
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

export default function RemisionEmpresaFacturaPdf({ remision }) {
    const detalles = Array.isArray(remision?.detalles) ? remision.detalles : [];

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.title}>Factura de Remision</Text>
                    <Text style={styles.subtitle}>{remision?.folio_factura || remision?.folio_remision || "Sin folio"}</Text>

                    <View style={styles.metaGrid}>
                        <View style={styles.metaItem}>
                            <Text style={styles.label}>Empresa</Text>
                            <Text style={styles.value}>{remision?.empresa_nombre_fiscal || remision?.empresa_nombre || "-"}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.label}>RFC</Text>
                            <Text style={styles.value}>{remision?.empresa_rfc || "-"}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.label}>Fecha remision</Text>
                            <Text style={styles.value}>{formatDate(remision?.fecha_remision)}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.label}>Fecha factura</Text>
                            <Text style={styles.value}>{formatDate(remision?.fecha_factura)}</Text>
                        </View>
                    </View>
                </View>

                <View>
                    <Text style={styles.sectionTitle}>Partidas</Text>
                    <View style={styles.table}>
                        <View style={styles.tableHead}>
                            <Text style={[styles.headCell, styles.colDesc]}>Descripcion</Text>
                            <Text style={[styles.headCell, styles.colQty]}>Cantidad</Text>
                            <Text style={[styles.headCell, styles.colUnit]}>Precio</Text>
                            <Text style={[styles.headCell, styles.colTotal]}>Total</Text>
                        </View>

                        {detalles.length === 0 ? (
                            <View style={styles.row}>
                                <Text style={[styles.cell, styles.colDesc]}>Sin partidas</Text>
                                <Text style={[styles.cell, styles.colQty]}>-</Text>
                                <Text style={[styles.cell, styles.colUnit]}>-</Text>
                                <Text style={[styles.cell, styles.colTotal]}>-</Text>
                            </View>
                        ) : (
                            detalles.map((line, index) => (
                                <View key={line.id_detalle_remision_empresa || `${index}`} style={[styles.row, index === detalles.length - 1 ? styles.rowLast : null]}>
                                    <Text style={[styles.cell, styles.colDesc]}>{String(line.descripcion || "-")}</Text>
                                    <Text style={[styles.cell, styles.colQty]}>{Number(line.cantidad_factura || 0)}</Text>
                                    <Text style={[styles.cell, styles.colUnit]}>{formatCurrency(line.precio_con_iva)}</Text>
                                    <Text style={[styles.cell, styles.colTotal]}>{formatCurrency(line.total_con_iva)}</Text>
                                </View>
                            ))
                        )}
                    </View>
                </View>

                <View style={styles.totalsWrap}>
                    <View style={styles.totalsCard}>
                        <View style={styles.totalLine}>
                            <Text>Subtotal</Text>
                            <Text>{formatCurrency(remision?.total_sin_iva)}</Text>
                        </View>
                        <View style={styles.totalLine}>
                            <Text>IVA</Text>
                            <Text>{formatCurrency(Number(remision?.total_con_iva || 0) - Number(remision?.total_sin_iva || 0))}</Text>
                        </View>
                        <View style={styles.totalLineEmphasis}>
                            <Text>Total</Text>
                            <Text>{formatCurrency(remision?.total_con_iva)}</Text>
                        </View>
                    </View>
                </View>
            </Page>
        </Document>
    );
}