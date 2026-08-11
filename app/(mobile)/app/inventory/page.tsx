"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { ClipboardList, ChevronRight, Loader2, Calendar, CheckCircle2, Clock } from "lucide-react";
import toast from "react-hot-toast";

export default function MyCommissionsPage() {
  const router = useRouter();
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommissions = async () => {
      try {
        const res = await api.get("/inventory/my-commissions");
        // نفترضو الـ API يرجع data فيها اللجان
        setCommissions(res.data.data || []);
      } catch (error) {
        toast.error("Erreur lors du chargement de vos commissions.");
      } finally {
        setLoading(false);
      }
    };
    fetchCommissions();
  }, []);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-5 py-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <ClipboardList className="text-blue-600" /> Mes Inventaires
        </h1>
        <p className="text-xs text-slate-500 mt-1">Commissions auxquelles vous êtes assigné.</p>
      </header>

      <main className="p-4 space-y-4">
        {commissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <ClipboardList className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Aucune commission active.</p>
          </div>
        ) : (
          commissions.map((comm) => (
            <div 
              key={comm.id}
              onClick={() => router.push(`/app/inventory/${comm.id}`)}
              className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
              <div className="flex justify-between items-start mb-3 pl-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Campagne {comm.campaign?.annee}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-medium">
                    <Calendar size={14} /> Démarrée le: {new Date(comm.created_at).toLocaleDateString()}
                  </div>
                </div>
                {comm.status === 'terminee' ? (
                  <CheckCircle2 className="text-emerald-500 w-6 h-6" />
                ) : (
                  <Clock className="text-orange-500 w-6 h-6" />
                )}
              </div>
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50 pl-2">
                <span className="text-sm font-semibold text-blue-600">Accéder au Scan</span>
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <ChevronRight size={18} />
                </div>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}