"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Box, Boxes, ChevronRight, LayoutDashboard, Map, Package, Settings, ShoppingBag, Truck, Users, ChartNoAxesGantt } from "lucide-react";
/* import path from "node:path"; */

export default function Sidebar() {
  const pathname = usePathname() || "";
  const [almacenesOpen, setAlmacenesOpen] = useState(false);
  const [productosOpen, setProductosOpen] = useState(false);
  const [, startTransition] = useTransition();

  // Colapsar secciones automáticamente cuando salgas de ellas
  useEffect(() => {
    startTransition(() => {
      if (!pathname.startsWith("/productos")) {
        setProductosOpen(false);
      }
      if (!pathname.startsWith("/almacenes")) {
        setAlmacenesOpen(false);
      }
    });
  }, [pathname]);

  // Expandir si está en cualquier subruta o si está abierto manualmente
  const productosExpanded = productosOpen || pathname.startsWith("/productos");
  const almacenesExpanded = almacenesOpen || pathname.startsWith("/almacenes");

  // Seleccionar SOLO si está en la ruta exacta, no en subrutaas
  const productosSelected = pathname === "/productos";
  const almacenesSelected = pathname === "/almacenes";

  const linkBaseClass =
    "w-full px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2";

  const subLinkBaseClass =
    "w-full px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2";

  const collapseBaseClass =
    "grid transition-all duration-300 ease-out overflow-hidden";

  return (
    <aside className="w-64 shrink-0 min-h-screen h-auto bg-primary text-white flex flex-col self-stretch">
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
      <nav className="flex flex-col gap-2 p-4 pb-6">
        <Link
          href="/dashboard"
          className={`${linkBaseClass} ${pathname === "/dashboard" || pathname.startsWith("/dashboard/")
            ? "bg-accent text-white font-medium"
            : "text-gray-300 hover:bg-slidehover hover:text-white"
            }`} >
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </Link>

        <button
          type="button"
          onClick={() => setProductosOpen((v) => !v)}
          className={`${linkBaseClass} justify-between ${productosSelected
            ? "bg-accent text-white font-medium"
            : "text-gray-300 hover:bg-slidehover hover:text-white"
            }`}
          aria-expanded={productosExpanded}
          aria-controls="submenu-productos">
          <span className="flex items-center gap-2">
            <Package size={16} />
            <span>Gestion de Productos</span>
          </span>
          <span className={`transition-transform duration-400 ${productosExpanded ? "rotate-90" : "rotate-0"}`}>
            <ChevronRight size={16} />
          </span>
        </button>

        <div
          id="submenu-productos"
          className={`${collapseBaseClass} ${productosExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="min-h-0">
            <div className="ml-3 mt-1 flex flex-col gap-1 border-l border-white/10 pl-2">
              <Link
                href="/productos"
                className={`${subLinkBaseClass} ${pathname === "/productos"
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-300 hover:bg-slidehover hover:text-white"
                  }`}>
                <ChartNoAxesGantt size={16} />
                <span>Productos</span>
              </Link>
              <Link
                href="/productos/categorias"
                className={`${subLinkBaseClass} ${pathname === "/productos/categorias" || pathname.startsWith("/productos/categorias/")
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-300 hover:bg-slidehover hover:text-white"
                  }`}>
                Categorias
              </Link>
              <Link
                href="/productos/presentaciones"
                className={`${subLinkBaseClass} ${pathname === "/productos/presentaciones" || pathname.startsWith("/productos/presentaciones/")
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-300 hover:bg-slidehover hover:text-white"
                  }`}>
                Presentaciones
              </Link>
              <Link
                href="/productos/marca"
                className={`${subLinkBaseClass} ${pathname === "/productos/marca" || pathname.startsWith("/productos/marca/")
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-300 hover:bg-slidehover hover:text-white"
                  }`}>
                Marca
              </Link>
              <Link
                href="/productos/familias"
                className={`${subLinkBaseClass} ${pathname === "/productos/familias" || pathname.startsWith("/productos/familias/")
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-300 hover:bg-slidehover hover:text-white"
                  }`}>
                Familias
              </Link>
              <Link
                href="/productos/lineas"
                className={`${subLinkBaseClass} ${pathname === "/productos/lineas" || pathname.startsWith("/productos/lineas/")
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-300 hover:bg-slidehover hover:text-white"
                  }`}>
                Lineas
              </Link>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAlmacenesOpen((v) => !v)}
          className={`${linkBaseClass} justify-between ${almacenesSelected
            ? "bg-accent text-white font-medium"
            : "text-gray-300 hover:bg-slidehover hover:text-white"
            }`}
          aria-expanded={almacenesExpanded}
          aria-controls="submenu-almacenes">
          <span className="flex items-center gap-2">
            <Boxes size={16} />
            <span>Gestion de Inventario</span>
          </span>
          <span className={`transition-transform duration-400 ${almacenesExpanded ? "rotate-90" : "rotate-0"}`}>
            <ChevronRight size={16} />
          </span>
        </button>

        <div
          id="submenu-almacenes"
          className={`${collapseBaseClass} ${almacenesExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="min-h-0">
            <div className="ml-3 mt-1 flex flex-col gap-1 border-l border-white/10 pl-2">
              <Link
                href="/almacenes/inventario"
                className={`${subLinkBaseClass} ${pathname === "/almacenes/inventario" || pathname.startsWith("/almacenes/inventario/")
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-300 hover:bg-slidehover hover:text-white"
                  }`}>
                Inventario
              </Link>
              <Link
                href="/almacenes/movimientos"
                className={`${subLinkBaseClass} ${pathname === "/almacenes/movimientos" || pathname.startsWith("/almacenes/movimientos/")
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-300 hover:bg-slidehover hover:text-white"
                  }`}>
                Movimientos
              </Link>
              <Link
                href="/almacenes/alertas"
                className={`${subLinkBaseClass} ${pathname === "/almacenes/alertas" || pathname.startsWith("/almacenes/alertas/")
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-300 hover:bg-slidehover hover:text-white"
                  }`}>
                Alertas
              </Link>
              <Link
                href="/almacenes/catalogos"
                className={`${subLinkBaseClass} ${pathname === "/almacenes/catalogos" || pathname.startsWith("/almacenes/catalogos/")
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-300 hover:bg-slidehover hover:text-white"
                  }`}>
                Almacenes
              </Link>
            </div>
          </div>
        </div>

        <Link
          href="/clientes"
          className={`${linkBaseClass} ${pathname === "/clientes" || pathname.startsWith("/clientes/")
            ? "bg-accent text-white font-medium"
            : "text-gray-300 hover:bg-slidehover hover:text-white"
            }`}>
          <Users size={16} />
          <span>Clientes</span>
        </Link>

        <div
          className={`${linkBaseClass} cursor-not-allowed opacity-50 text-gray-400`}>
          <Truck size={16} />
          <span>Proveedores</span>
        </div>

        {/* <Link
          href="/proveedores"
          className={` ${linkBaseClass} ${pathname === "/proveedores" || pathname.startsWith("/proveedores/")
            ? "bg-accent text-white font-medium"
            : "text-gray-300 hover:bg-slidehover hover:text-white"
            }`}>
          <Truck size={16} />
          <span>Proveedores</span>
        </Link> */}

        <Link
          href="/ventas"
          className={`${linkBaseClass} ${pathname === "/ventas" || pathname.startsWith("/ventas/")
            ? "bg-accent text-white font-medium"
            : "text-gray-300 hover:bg-slidehover hover:text-white"
            }`}>
          <ShoppingBag size={16} />
          <span>Ventas</span>
        </Link>

        <Link
          href="/compras"
          className={`${linkBaseClass} ${pathname === "/compras" || pathname.startsWith("/compras/")
            ? "bg-accent text-white font-medium"
            : "text-gray-300 hover:bg-slidehover hover:text-white"
            }`}>
          <Box size={16} />
          <span>Compras</span>
        </Link>

        <Link
          href="/rutas"
          className={`${linkBaseClass} ${pathname === "/rutas" || pathname.startsWith("/rutas/")
            ? "bg-accent text-white font-medium"
            : "text-gray-300 hover:bg-slidehover hover:text-white"
            }`}>
          <Map size={16} />
          <span>Rutas</span>
        </Link>

        <Link
          href="/configuracion"
          className={`${linkBaseClass} ${pathname === "/configuracion" || pathname.startsWith("/configuracion/")
            ? "bg-accent text-white font-medium"
            : "text-gray-300 hover:bg-slidehover hover:text-white"
            }`}>
          <Settings size={16} />
          <span>Configuracion</span>
        </Link>
      </nav>
    </aside>
  );
}
