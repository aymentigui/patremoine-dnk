"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { Loader2, PackagePlus, DoorOpen, ScanLine, Bell, MapPin, Send, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function MobileHomePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/user");
        setUser(res.data);
      } catch (error) {
        console.error("Erreur de chargement de l'utilisateur", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  const handleQuickAction = (actionType: string) => {
    router.push(`/app/scan?action=${actionType}`);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-5 space-y-6">
      
      {/* 🔹 HEADER 🔹 */}
      <header className="flex justify-between items-center pt-2">
        <div>
          <p className="text-sm font-medium text-slate-500">Bonjour,</p>
          <h1 className="text-2xl font-bold text-slate-900 capitalize">
            {user?.name?.replace('.', ' ') || "Utilisateur"}
          </h1>
          {user?.employee?.emplacement && (
            <div className="flex items-center gap-1 mt-1 text-xs text-blue-600 font-medium bg-blue-50 w-fit px-2 py-1 rounded-md">
              <MapPin size={12} />
              {user.employee.emplacement.nom}
            </div>
          )}
        </div>
        <button className="relative p-3 bg-white rounded-full shadow-sm border border-slate-100 active:scale-95 transition-transform">
          <Bell size={20} className="text-slate-600" />
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
      </header>

      {/* 🔹 CALL TO ACTION (SCANNER) 🔹 */}
      <section>
        <div 
          onClick={() => router.push('/app/scan')}
          className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 text-white shadow-lg active:scale-[0.98] transition-transform cursor-pointer"
        >
          <div className="relative z-10">
            <h2 className="text-xl font-bold mb-1">Scanner un article</h2>
            <p className="text-blue-100 text-sm mb-4 max-w-[80%]">
              Identifiez rapidement un équipement ou un véhicule.
            </p>
            <div className="flex items-center gap-2 bg-white/20 w-fit px-4 py-2 rounded-full backdrop-blur-sm">
              <ScanLine size={18} />
              <span className="text-sm font-semibold">Ouvrir la caméra</span>
            </div>
          </div>
          <ScanLine className="absolute -right-6 -bottom-6 w-32 h-32 text-white opacity-10" />
        </div>
      </section>

      {/* 🔹 ACTIONS RAPIDES 🔹 */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Actions Rapides</h3>
        
        <div className="grid grid-cols-2 gap-4">
          
          <Card className="border-none shadow-sm active:scale-95 transition-transform cursor-pointer bg-emerald-50/50" onClick={() => handleQuickAction('initial_placement')}>
            <CardContent className="p-4 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <PackagePlus size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Placement</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Affectation initiale</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm active:scale-95 transition-transform cursor-pointer bg-purple-50/50" onClick={() => handleQuickAction('room_status')}>
            <CardContent className="p-4 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center shrink-0">
                <DoorOpen size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Statut Salle</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Vérifier le contenu</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm active:scale-95 transition-transform cursor-pointer bg-orange-50/50" onClick={() => handleQuickAction('transfer_request')}>
            <CardContent className="p-4 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                <Send size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Envoyer</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Initier un transfert</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm active:scale-95 transition-transform cursor-pointer bg-cyan-50/50" onClick={() => handleQuickAction('transfer_receive')}>
            <CardContent className="p-4 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center">
                <Inbox size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Réceptionner</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Valider l'arrivée</p>
              </div>
            </CardContent>
          </Card>

        </div>
      </section>

    </div>
  );
}