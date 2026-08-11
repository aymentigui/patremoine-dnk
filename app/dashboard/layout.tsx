"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "../../lib/utils";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, employeeProfile, logout } = useAuthStore();

    const handleLogout = async () => {
        try {
            await api.post("/logout");
        } catch (error) {
            console.error("Erreur lors de la déconnexion sur le serveur");
        } finally {
            logout(); // نفرغو الستور
            toast.success("Déconnexion réussie");
            window.location.href = "/login"; // نرجعوه بقوة للـ login باش يتنحى الكاش
        }
    };

    return (
        <div className={cn('flex', 'h-screen', 'bg-slate-50', 'overflow-hidden')}>
            {/* Sidebar - Fixe à gauche */}
            <Sidebar />

            {/* Contenu principal */}
            <div className={cn('flex-1', 'flex', 'flex-col', 'overflow-hidden')}>

                {/* Top Navbar */}
                <header className={cn('h-16', 'border-b', 'bg-white', 'flex', 'items-center', 'justify-between', 'px-6', 'shadow-sm', 'z-10')}>
                    <div>
                        <h2 className={cn('text-xl', 'font-semibold', 'text-gray-800')}>
                            {/* نقدروا نديرو عنوان الصفحة يتغير ديناميكيا من بعد */}
                            Espace de Gestion
                        </h2>
                    </div>

                    <div className={cn('flex', 'items-center', 'gap-4')}>
                        <div className={cn('flex', 'flex-col', 'items-end', 'mr-2')}>
                            <span className={cn('text-sm', 'font-medium', 'text-gray-900')}>{user?.name}</span>
                            <span className={cn('text-xs', 'text-gray-500')}>{employeeProfile?.fonction || user?.roles?.[0]}</span>
                        </div>

                        <div className={cn('h-9', 'w-9', 'rounded-full', 'bg-primary/20', 'flex', 'items-center', 'justify-center', 'text-primary', 'font-bold')}>
                            <UserIcon size={18} />
                        </div>

                        <div className={cn('h-6', 'w-px', 'bg-gray-200', 'mx-1')}></div>

                        <Button variant="ghost" size="icon" onClick={handleLogout} className={cn('text-gray-500', 'hover:text-red-600', 'hover:bg-red-50')}>
                            <LogOut size={18} />
                        </Button>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className={cn('flex-1', 'overflow-y-auto', 'p-6')}>
                    {children}
                </main>
            </div>
        </div>
    );
}