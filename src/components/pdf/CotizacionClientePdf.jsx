import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { numberToWords } from "@/utils/numberToWords";

const styles = StyleSheet.create({
    page: {
        paddingTop: 28,
        paddingHorizontal: 28,
        paddingBottom: 36,
        fontFamily: "Helvetica",
        fontSize: 9,
        color: "#293a42",
        display: "flex",
        flexDirection: "column",
    },
    header: {
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    logo: { width: 200, height: 55 },
    titleBlock: { flex: 1, paddingLeft: 12, paddingRight: 12 },
    title: { fontSize: 20, fontWeight: 700, color: "#293a42", textAlign: "right" },
    folio: { fontSize: 10, color: "#6B7280", textAlign: "right" },
    papeleria: { fontSize: 9, color: "#6B7280", textAlign: "left" },

    content: { flexGrow: 1, display: "flex", flexDirection: "column" },

    table: { marginTop: 8, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 6, overflow: "hidden" },
    tableHead: { flexDirection: "row", backgroundColor: "#293a42", color: "#fff" },
    headCell: { paddingVertical: 8, paddingHorizontal: 8, fontSize: 9, fontWeight: 700, color: "#fff" },
    row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
    cell: { paddingVertical: 6, paddingHorizontal: 8, justifyContent: "center" },
    colNum: { width: "6%" },
    colDesc: { width: "54%" },
    colQty: { width: "10%", textAlign: "center" },
    colUnit: { width: "15%", textAlign: "right" },
    colTotal: { width: "15%", textAlign: "right" },

    productName: { fontSize: 9, fontWeight: 700, color: "#293a42" },
    productMeta: { fontSize: 8, color: "#6B7280" },

    totalsWrap: { marginTop: "auto", alignItems: "flex-end", width: "100%" },
    totalsCard: { width: 220, padding: 10 },
    totalLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
    totalEmph: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#E5E7EB", fontSize: 10, fontWeight: 700 },
    footerNote: { marginTop: 10, fontSize: 8, color: "#6B7280" },
    totalLetter: { marginTop: 8, fontSize: 7.5, color: "#4B5563", borderTopWidth: 0.5, borderTopColor: "#D1D5DB", paddingTop: 6, letterSpacing: 0.2, width: 420, textAlign: "right" },
    infoRow: { flexDirection: "row", marginBottom: 4, },
    infoLabel: { fontWeight: 700, width: 110, fontSize: 9 },
    infoValue: { color: "#293a42", fontSize: 11 },
    infoBlock: { marginBottom: 24, },

    ivaLegend: { marginTop: 8, marginBottom: 6, fontSize: 9, color: "#6B7280", fontStyle: "italic", },
});

function fmtMoney(v) {
    return Number(v || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function fmtDate(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CotizacionClientePdf({ cotizacion, includeIva = true, papeleria = {}, logoPath = null }) {
    const detalles = Array.isArray(cotizacion?.detalles) ? cotizacion.detalles : [];

    const subtotalSinIva = detalles.reduce((sum, line) => {
        const priceWithoutIva =
            line.precio_manual_sin_iva ??
            line.precio_sin_iva ??
            line.precio ??
            0;

        return sum + (Number(line.cantidad || 0) * Number(priceWithoutIva || 0));
    }, 0);

    const ivaAmount = subtotalSinIva * 0.16;

    const totalFinal = includeIva
        ? subtotalSinIva + ivaAmount
        : subtotalSinIva;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        {logoPath ? <Image src={logoPath} alt="" style={styles.logo} /> : null}
                        <View style={styles.titleBlock}>
                            <Text style={styles.papeleria}>{papeleria?.nombre || ""}</Text>
                            <Text style={styles.papeleria}>{papeleria?.direccion || ""}</Text>
                            <Text style={styles.papeleria}>{papeleria?.telefono || ""} {papeleria?.rfc ? ` - RFC: ${papeleria.rfc}` : ""}</Text>
                        </View>
                    </View>

                    <View style={{ width: 220 }}>
                        <Text style={styles.title}>COTIZACIÓN</Text>
                        <Text style={styles.folio}>N° {cotizacion?.folio || cotizacion?.id_cotizacion || "-"}</Text>
                        <Text style={styles.folio}>{fmtDate(cotizacion?.fecha_emision || cotizacion?.created_at)}</Text>
                    </View>
                </View>

                <View style={styles.content}>
                    <View style={styles.infoBlock}>
                        <Text style={{ fontSize: 12, marginBottom: 4 }}>
                            Cliente
                        </Text>

                        <Text style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
                            {cotizacion?.cliente_nombre || "-"}
                        </Text>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Fecha emisión:</Text>
                            <Text style={styles.infoValue}>
                                {fmtDate(cotizacion?.fecha_emision || cotizacion?.created_at)}
                            </Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Vigencia:</Text>
                            <Text style={styles.infoValue}>
                                {cotizacion?.vigencia_dias || 5} días
                            </Text>
                        </View>

                        <Text style={styles.ivaLegend}>
                            {includeIva
                                ? "Los precios y totales están expresados con IVA."
                                : "Los precios y totales están expresados sin IVA."}
                        </Text>
                    </View>

                    <View style={styles.table}>
                        <View style={styles.tableHead}>
                            <Text style={[styles.headCell, styles.colNum]}>#</Text>
                            <Text style={[styles.headCell, styles.colDesc]}>Descripción</Text>
                            <Text style={[styles.headCell, styles.colQty]}>Cantidad</Text>
                            <Text style={[styles.headCell, styles.colUnit]}>P. Unitario</Text>
                            <Text style={[styles.headCell, styles.colTotal]}>Importe</Text>
                        </View>

                        {detalles.length === 0 ? (
                            <View style={styles.row}><Text style={[styles.cell, styles.colDesc]}>Sin partidas</Text></View>
                        ) : (
                            detalles.map((line, idx) => {
                                // SIEMPRE usar precio sin IVA en la tabla, independiente de includeIva
                                const priceWithoutIva = line.precio_manual_sin_iva ?? line.precio_sin_iva ?? line.precio ?? 0;
                                const importe = (Number(line.cantidad || 0) * Number(priceWithoutIva || 0));
                                return (
                                    <View key={line.id_detalle || idx} style={[styles.row, idx === detalles.length - 1 ? { borderBottomWidth: 0 } : null]}>
                                        <Text style={[styles.cell, styles.colNum]}>{idx + 1}</Text>
                                        <View style={[styles.cell, styles.colDesc]}>
                                            <Text style={styles.productName}>{line.presentacion_nombre || line.presentacion_nombre_default || line.producto_nombre || line.descripcion || "-"}</Text>
                                            {line.producto_nombre ? <Text style={styles.productMeta}>{line.producto_nombre}</Text> : null}
                                        </View>
                                        <Text style={[styles.cell, styles.colQty]}>{Number(line.cantidad || 0)}</Text>
                                        <Text style={[styles.cell, styles.colUnit]}>{fmtMoney(priceWithoutIva)}</Text>
                                        <Text style={[styles.cell, styles.colTotal]}>{fmtMoney(importe)}</Text>
                                    </View>
                                );
                            })
                        )}
                    </View>
                </View>

                <View style={styles.totalsWrap}>
                    <View style={styles.totalsCard}>
                        <View style={styles.totalLine}>
                            <Text>Subtotal</Text>
                            <Text>{fmtMoney(subtotalSinIva)}</Text>
                        </View>

                        {includeIva ? (
                            <View style={styles.totalLine}>
                                <Text>IVA (16%)</Text>
                                <Text>{fmtMoney(ivaAmount)}</Text>
                            </View>
                        ) : null}

                        <View style={styles.totalEmph}>
                            <Text>Total</Text>
                            <Text>{fmtMoney(totalFinal)}</Text>
                        </View>
                    </View>

                    <Text style={styles.totalLetter}>
                        <Text style={{ fontWeight: 700 }}>
                            Total en letra:
                        </Text>{" "}
                        {numberToWords(totalFinal).toUpperCase()}{" "}
                        {totalFinal.toFixed(2).split(".")[1]}/100 M.N.
                    </Text>
                </View>

                {papeleria?.nota ? <Text style={styles.footerNote}>{papeleria.nota}</Text> : null}
            </Page>
        </Document>
    );
}
