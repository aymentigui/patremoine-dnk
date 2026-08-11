"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, Users, Building2, Bus, 
  Settings, Package, FileText, ClipboardList, 
  Droplet, Home, Trash2, 
  Shield
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const hasPermission = useAuthStore((state) => state.hasPermission);

  // القائمة مربوطة 100% بصلاحيات الباكاند
  const navItems = [
    {
      title: "Tableau de bord",
      href: "/dashboard",
      icon: LayoutDashboard,
      show: hasPermission("voir_dashboard"), // أحياناً الموظف العادي ما يشوفش الداشبورد
    },
   {
      title: "Utilisateurs",
      href: "/dashboard/users",
      icon: Users,
      show: hasPermission("voir_utilisateurs"),
    },
    {
      title: "Employés",
      href: "/dashboard/employees",
      icon: Users,
      show: hasPermission("voir_employes")
    },
    {
      title: "Rôles & Permissions",
      href: "/dashboard/roles",
      icon: Shield,
      show: hasPermission("gerer_roles"),
    },
    {
      title: "Organigramme",
      href: "/dashboard/organigramme",
      icon: Building2,
      show: hasPermission("gerer_organigramme"),
    },
    {
      title: "Articles & Équipements",
      href: "/dashboard/articles",
      icon: Package,
      show: hasPermission("voir_articles") || hasPermission("gerer_articles"),
    },
    {
      title: "Inventaire",
      href: "/dashboard/inventory",
      icon: ClipboardList,
      show: hasPermission("gerer_inventaire") || hasPermission("effectuer_inventaire"),
    },
    {
      title: "Parc Roulant",
      href: "/dashboard/vehicles",
      icon: Bus,
      show: hasPermission("voir_vehicles"),
    },
    {
      title: "Documents Véhicules",
      href: "/dashboard/documents",
      icon: FileText,
      show: hasPermission("voir_documents_vehicules"),
    },
    {
      title: "Gestion Gasoil",
      href: "/dashboard/gasoil",
      icon: Droplet,
      show: hasPermission("gerer_gasoil"),
    },
    {
      title: "Immobilier",
      href: "/dashboard/real-estates",
      icon: Home,
      show: hasPermission("voir_immobilier"),
    },
    {
      title: "Réformes",
      href: "/dashboard/reforms",
      icon: Trash2,
      show: hasPermission("voir_reforme") || hasPermission("proposer_reforme"),
    },
  ];

  return (
    <div className={cn('flex', 'h-screen', 'w-64', 'flex-col', 'bg-white', 'border-r', 'shadow-sm')}>
      <div className={cn('flex', 'h-16', 'items-center', 'gap-2', 'px-6', 'border-b')}>
        <div className={cn('flex', 'h-8', 'w-8', 'items-center', 'justify-center', 'rounded', 'bg-primary', 'text-white')}>
          <Bus size={18} />
        </div>
        <span className={cn('font-bold', 'text-lg', 'text-gray-900', 'tracking-tight')}>Djamiaya</span>
      </div>

      <nav className={cn('flex-1', 'overflow-y-auto', 'py-4')}>
        <ul className={cn('space-y-1', 'px-3')}>
          {navItems.filter(item => item.show).map((item,index) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={index}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary font-semibold" 
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <item.icon size={18} className={isActive ? "text-primary" : "text-gray-500"} />
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={cn('border-t', 'p-4')}>
        <Link
          href="/dashboard/profile"
          className={cn('flex', 'items-center', 'gap-3', 'rounded-md', 'px-3', 'py-2', 'text-sm', 'font-medium', 'text-gray-600', 'hover:bg-gray-100', 'transition-colors')}
        >
          <Settings size={18} />
          Paramètres
        </Link>
      </div>
    </div>
  );
}