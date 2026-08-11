"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { Loader2, LayoutDashboard, SmartphoneNfc, LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";

export default function GatewayPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canViewDashboard = hasPermission("voir_dashboard")

  useEffect(() => {
    // نجيبو معلومات اليوزر والصلاحيات نتاعو
    const fetchUser = async () => {
      try {
        const res = await api.get("/user");
        setUser(res.data);
      } catch (error) {
        // إذا ماش مكونيكتي نرجعوه للـ Login
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      await api.post("/logout");
      localStorage.removeItem("token");
      router.push("/login");
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      
      {/* Header Profile */}
      <div className="absolute top-6 right-6 flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-slate-800">{user?.name}</p>
          <p className="text-xs text-slate-500">{user?.employee?.fonction || "Utilisateur"}</p>
        </div>
        <Button variant="outline" size="icon" onClick={handleLogout} className="rounded-full text-red-600 hover:bg-red-50 hover:border-red-200">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>

      <div className="max-w-2xl w-full text-center space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Bienvenue sur le Système</h1>
          <p className="text-slate-500 mt-2 text-sm md:text-base">Sélectionnez votre espace de travail pour continuer.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card: Mobile App (Terrain) */}
          <button
            onClick={() => router.push("/app/home")}
            className="group relative flex flex-col items-center p-8 bg-white rounded-3xl border-2 border-transparent shadow-sm hover:shadow-xl hover:border-blue-500 transition-all duration-300 text-center"
          >
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <SmartphoneNfc size={40} strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Espace Terrain (Mobile)</h2>
            <p className="text-sm text-slate-500">Scanner les articles, gérer l'inventaire et les transferts sur le terrain.</p>
          </button>

          {/* Card: Dashboard (Admin) */}
          {canViewDashboard ? (
            <button
              onClick={() => router.push("/dashboard")}
              className="group relative flex flex-col items-center p-8 bg-white rounded-3xl border-2 border-transparent shadow-sm hover:shadow-xl hover:border-indigo-500 transition-all duration-300 text-center"
            >
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <LayoutDashboard size={40} strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Espace Administration</h2>
              <p className="text-sm text-slate-500">Tableaux de bord, gestion des ressources, RH et statistiques globales.</p>
            </button>
          ) : (
            <div className="flex flex-col items-center p-8 bg-slate-50/50 rounded-3xl border-2 border-slate-100 text-center opacity-70">
              <div className="w-20 h-20 bg-slate-200 text-slate-400 rounded-2xl flex items-center justify-center mb-6">
                <ShieldAlert size={40} strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold text-slate-500 mb-2">Espace Administration</h2>
              <p className="text-sm text-slate-400">Vous n'avez pas les droits d'accès à l'interface d'administration.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}