"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LayoutDashboard } from 'lucide-react';
import PageTitle from '@/components/ui/PageTitle';
import { getAlertasPagos } from '@/services/alertasPagosService';

export default function DashboardPage() {
  const [alertas, setAlertas] = useState({ vencidas: [], proximas: [], resumen: null });
  const [errorAlertas, setErrorAlertas] = useState("");

  useEffect(() => {
    getAlertasPagos()
      .then((data) => setAlertas(data || { vencidas: [], proximas: [], resumen: null }))
      .catch((e) => setErrorAlertas(e.message || "No se pudieron cargar alertas de pagos"));
  }, []);

  return (
    <div>
      <PageTitle icon={<LayoutDashboard />} title="Dashboard" />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 mt-6">
        <Card title="Ventas hoy" value="$1,200" />
        <Card title="Productos vendidos" value="320" />
        <Card title="Clientes nuevos" value="2" />
        <Card title="Stock bajo" value="5" />
      </div>

      {/* Contenido */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Box title="Ventas del mes" />
        <Box title="Top productos" />
      </div>

      <div className="mt-6 bg-white p-5 rounded-2xl shadow-sm]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-primary">Alertas de Pagos</h2>
          <Link href="/proveedores/pagos-pendientes" className="text-sm text-accent hover:underline">
            Ver todos
          </Link>
        </div>

        {errorAlertas ? <p className="text-sm text-red-700">{errorAlertas}</p> : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-red-200 rounded-xl p-3 bg-red-50">
            <p className="text-sm font-semibold text-red-700 mb-2">Vencidas</p>
            {(alertas.vencidas || []).length === 0 ? (
              <p className="text-sm text-muted">Sin facturas vencidas</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {(alertas.vencidas || []).slice(0, 5).map((a) => (
                  <li key={a.id_factura} className="flex justify-between gap-3">
                    <span className="truncate">{a.folio_factura} - {a.proveedor_nombre}</span>
                    <span className="font-medium">${Number(a.saldo_pendiente || 0).toLocaleString("es-MX")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border border-yellow-200 rounded-xl p-3 bg-yellow-50">
            <p className="text-sm font-semibold text-yellow-800 mb-2">Próximos 5 días</p>
            {(alertas.proximas || []).length === 0 ? (
              <p className="text-sm text-muted">Sin pagos próximos</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {(alertas.proximas || []).slice(0, 5).map((a) => (
                  <li key={a.id_factura} className="flex justify-between gap-3">
                    <span className="truncate">{a.folio_factura} - {a.proveedor_nombre}</span>
                    <span className="font-medium">${Number(a.saldo_pendiente || 0).toLocaleString("es-MX")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm ]">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function Box({ title }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow h-40">
      <h2 className="font-semibold mb-2">{title}</h2>
      <p className="text-gray-400">Contenido proximamente</p>
    </div>
  );
}
