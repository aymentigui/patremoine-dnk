"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ScanLine, ClipboardList, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Accueil", href: "/app/home", icon: Home },
    { name: "Inventaire", href: "/app/inventory", icon: ClipboardList },
    // زر السكانار نديروه سبيسيال في النص
    { name: "Scan", href: "/app/scan", icon: ScanLine, isPrimary: true },
    { name: "Profil", href: "/app/profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 z-50 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          if (item.isPrimary) {
            return (
              <Link key={item.href} href={item.href} className="relative -top-5 flex flex-col items-center group">
                <div className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95",
                  isActive ? "bg-blue-700 shadow-blue-500/40" : "bg-blue-600 shadow-blue-500/30"
                )}>
                  <Icon size={28} strokeWidth={2} />
                </div>
                <span className={cn(
                  "text-[10px] font-bold mt-1 transition-colors",
                  isActive ? "text-blue-700" : "text-slate-500"
                )}>
                  {item.name}
                </span>
              </Link>
            );
          }

          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center w-16 h-full active:scale-95 transition-transform">
              <Icon 
                size={24} 
                strokeWidth={isActive ? 2.5 : 2} 
                className={cn(
                  "mb-1 transition-colors",
                  isActive ? "text-blue-600" : "text-slate-400"
                )} 
              />
              <span className={cn(
                "text-[10px] transition-colors",
                isActive ? "font-bold text-blue-600" : "font-medium text-slate-500"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}