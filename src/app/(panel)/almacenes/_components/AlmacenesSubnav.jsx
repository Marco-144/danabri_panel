"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Warehouse, ListChecks, BellRing, Building2 } from "lucide-react";
import Button from "@/components/ui/Button";

const ITEMS = [
    { href: "/almacenes/inventario", label: "Inventario", icon: Warehouse },
    { href: "/almacenes/movimientos", label: "Movimientos", icon: ListChecks },
    { href: "/almacenes/alertas", label: "Alertas", icon: BellRing },
    { href: "/almacenes/catalogos", label: "Almacenes", icon: Building2 },
];

export default function AlmacenesSubnav() {
    const pathname = usePathname();

    return (
        <div className="flex flex-wrap gap-2">
            {ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                    <Link key={item.href} href={item.href}>
                        <Button variant={isActive ? "tabActive" : "tabIdle"} className="border rounded-xl">
                            <Icon size={16} /> {item.label}
                        </Button>
                    </Link>
                );
            })}
        </div>
    );
}
