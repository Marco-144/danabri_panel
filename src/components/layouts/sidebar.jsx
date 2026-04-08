"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
/* import path from "node:path"; */

export default function Sidebar() {
  const pathname = usePathname() || "";
  const [almacenesOpen, setAlmacenesOpen] = useState(pathname.startsWith("/almacenes"));
  const [productosOpen, setProductosOpen] = useState(pathname.startsWith("/productos"));

  useEffect(() => {
    if (pathname.startsWith("/almacenes")) setAlmacenesOpen(true);
    if (pathname.startsWith("/productos")) setProductosOpen(true);
  }, [pathname]);

  const menu = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Clientes", path: "/clientes" },
    { name: "Proveedores", path: "/proveedores" },
    { name: "Ventas", path: "/ventas" },
    { name: "Compras", path: "/compras" },
    { name: "Configuracion", path: "/configuracion" },
    { name: "Rutas", path: "/rutas" },
  ];

  const productosItems = [
    { name: "Productos", path: "/productos" },
    { name: "Categorias", path: "/productos/categorias" },
    { name: "Presentaciones", path: "/productos/presentaciones" },
    { name: "Marca", path: "/productos/marca" },
    { name: "Familias", path: "/productos/familias" },
    { name: "Lineas", path: "/productos/lineas" },
  ];

  const almacenesItems = [
    { name: "Inventario", path: "/almacenes/inventario" },
    { name: "Movimientos", path: "/almacenes/movimientos" },
    { name: "Alertas", path: "/almacenes/alertas" },
    { name: "Almacenes", path: "/almacenes/catalogos" },
  ];

  return (
    <div className="w-64 shrink-0 h-screen bg-primary text-white flex flex-col">
      {/* Logo */}
      <div className="bg-secondary px-4 py-5 flex justify-center">
        <Image
          src="/DanabriLogoRecortado.png"
          alt="Company Logo"
          width={180}
          height={45}
          className="w-full h-auto max-w-[180px] object-contain"
          priority
        />
      </div>

      {/* Menu */}
      <nav className="flex flex-col gap-2 p-4">
        {menu.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`px-3 py-2 rounded-lg text-sm transition-all 
              ${isActive
                  ? "bg-accent text-white font-medium"
                  : "text-gray-300 hover:bg-slidehover hover:text-white"
                }`}>
              {item.name}
            </Link>
          );
        })}

        <button type="button"
          onClick={() => setProductosOpen((v) => !v)}
          className={`px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${pathname.startsWith("/productos")
            ? "bg-accent text-white font-medium"
            : "text-gray-300 hover:bg-slidehover hover:text-white"
            }`}>
          <span>Gestion de Productos</span>
          {productosOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {productosOpen && (
          <div className="ml-3 flex flex-col gap-1">
            {productosItems.map((item) => {
              const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-3 py-2 rounded-lg text-sm transition-all ${isActive
                    ? "bg-accent text-white font-semibold"
                    : "text-gray-300 hover:bg-slidehover hover:text-white"
                    }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => setAlmacenesOpen((v) => !v)}
          className={`px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${pathname.startsWith("/almacenes")
            ? "bg-accent text-white font-medium"
            : "text-gray-300 hover:bg-slidehover hover:text-white"
            }`}>
          <span>Gestion de Inventario</span>
          {almacenesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {almacenesOpen && (
          <div className="ml-3 flex flex-col gap-1">
            {almacenesItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-3 py-2 rounded-lg text-sm transition-all ${isActive
                    ? "bg-accent text-white font-semibold"
                    : "text-gray-300 hover:bg-slidehover hover:text-white"
                    }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </div>
  );
}
