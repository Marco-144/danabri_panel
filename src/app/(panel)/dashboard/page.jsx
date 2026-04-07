"use client";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-[var(--primary)]">
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
