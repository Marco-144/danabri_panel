"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  Box, Boxes, ChevronRight, LayoutDashboard, LogOut, Map, Package, Settings, ShoppingBag, ArrowRightLeft, Warehouse, FileInput, Building2,
  Truck, UserRound, Users, ChartNoAxesGantt, ChartBarStacked, ScanBarcode, BookMarked, ShelvingUnit, Siren, ReceiptText, CircleDollarSign,
} from "lucide-react";
import { clearAuthToken, getAuthToken, getAuthUserFromToken, isTokenExpired } from "@/services/auth";
import { MapPinCheckInside } from "lucide-react";
/* import path from "node:path"; */

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname() || "";
  const [almacenesOpen, setAlmacenesOpen] = useState(false);
  const [productosOpen, setProductosOpen] = useState(false);
  const [clientesOpen, setClientesOpen] = useState(false);
  const [proveedoresOpen, setProveedoresOpen] = useState(false);
  const [currentUserName] = useState(() => {
    const token = getAuthToken();
    if (!token || isTokenExpired(token)) {
      return "Usuario";
    }

    const authUser = getAuthUserFromToken(token);
    return authUser?.nombre || "Usuario";
  });
  const [, startTransition] = useTransition();

  const handleLogout = () => {
    clearAuthToken();
    router.replace("/login");
  };

  // Colapsar secciones automáticamente cuando salgas de ellas
  useEffect(() => {
    startTransition(() => {
      if (!pathname.startsWith("/clientes")) {
        setClientesOpen(false);
      }
      if (!pathname.startsWith("/productos")) {
        setProductosOpen(false);
      }
      if (!pathname.startsWith("/almacenes")) {
        setAlmacenesOpen(false);
      }
      if (!pathname.startsWith("/proveedores")) {
        setProveedoresOpen(false);
      }
    });
  }, [pathname]);

  // Expandir si está en cualquier subruta o si está abierto manualmente
  const clientesExpanded = clientesOpen || pathname.startsWith("/clientes");
  const productosExpanded = productosOpen || pathname.startsWith("/productos");
  const almacenesExpanded = almacenesOpen || pathname.startsWith("/almacenes");
  const proveedoresExpanded = proveedoresOpen || pathname.startsWith("/proveedores");

  // Seleccionar SOLO si está en la ruta exacta, no en subrutas
  const clientesSelect = pathname === "/clientes";
  const productosSelected = pathname === "/productos";
  const almacenesSelected = pathname === "/almacenes";
  const proveedoresSelected = pathname === "/proveedores";

  const linkBaseClass =
    "w-full px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2";

  const subLinkBaseClass =
    "w-full px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2";

  const collapseBaseClass =
    "grid transition-all duration-300 ease-out overflow-hidden";

  return (
    <aside className="w-64 shrink-0 min-h-screen h-auto bg-primary text-white flex flex-col self-stretch shadow-lg">
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
      <nav className="flex flex-col gap-2 p-4 pb-6 flex-1">
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
                <ChartBarStacked size={16} />
                Categorias
              </Link>
              <Link
                href="/productos/presentaciones"
                className={`${subLinkBaseClass} ${pathname === "/productos/presentaciones" || pathname.startsWith("/productos/presentaciones/")
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-300 hover:bg-slidehover hover:text-white"
                  }`}>
                <ScanBarcode size={16} />
                Presentaciones
              </Link>
              <Link
                href="/productos/marca"
                className={`${subLinkBaseClass} ${pathname === "/productos/marca" || pathname.startsWith("/productos/marca/")
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-300 hover:bg-slidehover hover:text-white"
                  }`}>
                <BookMarked size={16} />
                Marca
              </Link>
              <Link
                href="/productos/familias"
                className={`${subLinkBaseClass} ${pathname === "/productos/familias" || pathname.startsWith("/productos/familias/")
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-300 hover:bg-slidehover hover:text-white"
                  }`}>
                <BookMarked size={16} />
                Familias
              </Link>
              <Link
                href="/productos/lineas"
                className={`${subLinkBaseClass} ${pathname === "/productos/lineas" || pathname.startsWith("/productos/lineas/")
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-300 hover:bg-slidehover hover:text-white"
                  }`}>
                <BookMarked size={16} />
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
                <ShelvingUnit size={16} />
                Inventario
              </Link>
              <Link
                href="/almacenes/movimientos"
                className={`${subLinkBaseClass} ${pathname === "/almacenes/movimientos" || pathname.startsWith("/almacenes/movimientos/")
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-300 hover:bg-slidehover hover:text-white"
                  }`}>
                <ArrowRightLeft size={16} />
                Movimientos
              </Link>
              <Link
                href="/almacenes/alertas"
                className={`${subLinkBaseClass} ${pathname === "/almacenes/alertas" || pathname.startsWith("/almacenes/alertas/")
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-300 hover:bg-slidehover hover:text-white"
                  }`}>
                <Siren size={16} />
                Alertas
              </Link>
              <Link
                href="/almacenes/catalogos"
                className={`${subLinkBaseClass} ${pathname === "/almacenes/catalogos" || pathname.startsWith("/almacenes/catalogos/")
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-300 hover:bg-slidehover hover:text-white"
                  }`}>
                <Warehouse size={16} />
                Almacenes
              </Link>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setClientesOpen((v) => !v)}
          className={`${linkBaseClass} justify-between ${clientesSelect
            ? "bg-accent text-white font-medium"
            : "text-gray-300 hover:bg-slidehover hover:text-white"
            }`}
          aria-expanded={clientesExpanded}
          aria-controls="submenu-clientes">
          <span className="flex items-center gap-2">
            <Users size={16} />
            <span>Gestion de Clientes</span>
          </span>
          <span className={`transition-transform duration-400 ${clientesExpanded ? "rotate-90" : "rotate-0"}`}>
            <ChevronRight size={16} />
          </span>
        </button>

        <div id="submenu-clientes"
          className={`${collapseBaseClass} ${clientesExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="min-h-0">
            <div className="ml-3 mt-1 flex flex-col gap-1 border-l border-white/10 pl-2">
              <Link
                href="/clientes"
                className={`${subLinkBaseClass} ${pathname === "/clientes"
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-300 hover:bg-slidehover hover:text-white"
                  }`}>
                <Users size={16} />
                Lista de Clientes
              </Link>
            </div>
          </div>
        </div>

        <div
          className={`${linkBaseClass} justify-between text-gray-500 cursor-not-allowed opacity-70`}
          role="button"
          aria-disabled="true"
          title="Sección temporalmente deshabilitada">
          <span className="flex items-center gap-2">
            <Building2 size={16} />
            <span>Empresas</span>
          </span>
          <span className="text-[11px] uppercase tracking-wide">Pronto</span>
        </div>

        <button
          type="button"
          onClick={() => setProveedoresOpen((v) => !v)}
          className={`${linkBaseClass} justigy-betwwen ${proveedoresSelected
            ? "bg-accent text-white font-medium"
            : "text-gray-300 hover:bg-slidehover hover:text-white"
            }`}
          aria-expanded={proveedoresExpanded}
          aria-controls="submenu-proveedores">
          <span className="flex items-center gap-2">
            <Box size={16} />
            <span>Compras</span>
          </span>
          <span className={`transition-transform duration-400 ${proveedoresExpanded ? "rotate-90" : "rotate-0"}`}>
            <ChevronRight size={16} />
          </span>
        </button>

        <div id="submenu-proveedores"
          className={`${collapseBaseClass} ${proveedoresExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="min-h-0">
            <div className="ml-3 mt-1 flex flex-col gap-1 border-l border-white/10 pl-2">
              <Link href="/proveedores"
                className={`${subLinkBaseClass} ${pathname === "/proveedores"
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-300 hover:bg-slidehover hover:text-white"
                  }`}>
                <Truck size={16} />
                Lista de Proveedores
              </Link>
              <Link href="/proveedores/ordenes"
                className={`${subLinkBaseClass} ${pathname === "/proveedores/ordenes" || pathname.startsWith("/proveedores/ordenes/")
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-300 hover:bg-slidehover hover:text-white"
                  }`}>
                <FileInput size={16} />
                Órdenes de Compra
              </Link>
              <Link href="/proveedores/facturas"
                className={`${subLinkBaseClass} ${pathname === "/proveedores/facturas" || pathname.startsWith("/proveedores/facturas/")
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-300 hover:bg-slidehover hover:text-white"
                  }`}>
                <ReceiptText size={16} />
                Facturas
              </Link>
              <Link href="/proveedores/pagos-pendientes"
                className={`${subLinkBaseClass} ${pathname === "/proveedores/pagos-pendientes" || pathname.startsWith("/proveedores/pagos-pendientes/")
                  ? "bg-accent text-white font-semibold"
                  : "text-gray-300 hover:bg-slidehover hover:text-white"
                  }`}>
                <CircleDollarSign size={16} />
                Pagos Pendientes
              </Link>
            </div>
          </div>
        </div>

        <Link
          href="/ventas"
          className={`${linkBaseClass} ${pathname === "/ventas" || pathname.startsWith("/ventas/")
            ? "bg-accent text-white font-medium"
            : "text-gray-300 hover:bg-slidehover hover:text-white"
            }`}>
          <ShoppingBag size={16} />
          <span>Ventas</span>
        </Link>

        <div
          className={`${linkBaseClass} justify-between text-gray-500 cursor-not-allowed opacity-70`}
          role="button"
          aria-disabled="true"
          title="Sección temporalmente deshabilitada">
          <span className="flex items-center gap-2">
            <Map size={16} />
            <span>Rutas</span>
          </span>
          <span className="text-[11px] uppercase tracking-wide">Pronto</span>
        </div>

        {/* <Link
          href="/rutas"
          className={`${linkBaseClass} ${pathname === "/rutas" || pathname.startsWith("/rutas/")
            ? "bg-accent text-white font-medium"
            : "text-gray-300 hover:bg-slidehover hover:text-white"
            }`}>
          <Map size={16} />
          <span>Rutas</span>
        </Link> */}

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

      <div className="sticky bottom-0 z-20 border-t border-white/10 p-4 space-y-3 bg-primary/95 backdrop-blur-sm">
        <div className="flex items-center gap-2 rounded-lg bg-slidehover px-3 py-2 text-sm text-white">
          <UserRound size={16} />
          <span className="truncate">{currentUserName}</span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="bg-[#b84129] w-full px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 text-gray-300 hover:bg-[#B82929] hover:text-white">
          <LogOut size={16} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
