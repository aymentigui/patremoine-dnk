"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import { 
  ArrowLeft, Inbox, Package, MapPin, 
  Loader2, CheckCircle2, AlertTriangle, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";

function ReceiveTransferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrCode = searchParams.get("qr");

  const [user, setUser] = useState<any>(null);
  const [transfer, setTransfer] = useState<any>(null);
  const [item, setItem] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    if (!qrCode) {
      toast.error("Code QR manquant.");
      router.push("/app/home");
      return;
    }

    const fetchData = async () => {
      try {
        // نجبدو البروفايل نتاع اليوزر + معلومات التحويل في ضربة وحدة
        const [userRes, transferRes] = await Promise.all([
          api.get("/user"),
          api.get(`/mobile/transfer/check/${qrCode}`)
        ]);

        setUser(userRes.data);
        setItem(transferRes.data.item);
        setTransfer(transferRes.data.transfer);

      } catch (error: any) {
        toast.error(error.response?.data?.message || "Article non trouvé ou pas en transit.");
        router.push("/app/home");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [qrCode, router]);

  const handleReceive = async () => {
    try {
      setSubmitLoading(true);
      await api.post("/mobile/transfer/receive", { qr_code: qrCode });
      
      toast.success("Article réceptionné avec succès !");
      router.push("/app/home");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur de réception.");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;
  }

  if (!item || !transfer || !user) return null;

  // 🔥 اللوجيك البصري (Verification UI) 🔥
  const userEmplacementId = user.employee?.emplacement_id;
  const isCorrectLocation = userEmplacementId === transfer.to_emplacement_id;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      
      {/* 🔹 HEADER 🔹 */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <button onClick={() => router.back()} className="p-2 bg-slate-100 rounded-full active:scale-95 transition-transform">
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Inbox className="text-cyan-600" size={20}/> Réception
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        
        {/* 🔹 ALERT: CONDITION DE LIEU 🔹 */}
        {!userEmplacementId ? (
          <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex gap-3 text-red-800">
            <AlertTriangle className="shrink-0 mt-0.5 text-red-600" size={20} />
            <p className="text-xs leading-relaxed font-medium">
              Votre compte n'est lié à aucun bureau. Vous ne pouvez pas réceptionner d'articles. Contactez l'administrateur.
            </p>
          </div>
        ) : !isCorrectLocation ? (
          <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex gap-3 text-red-800">
            <AlertTriangle className="shrink-0 mt-0.5 text-red-600" size={20} />
            <div className="text-xs leading-relaxed font-medium space-y-1">
              <p>Attention ! Cet article est destiné à : <strong>{transfer.to_emplacement?.nom}</strong>.</p>
              <p>Vous êtes affecté à : <strong>{user.employee?.emplacement?.nom}</strong>.</p>
              <p className="text-red-600 font-bold mt-2">Réception impossible.</p>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3 text-emerald-800">
            <CheckCircle2 className="shrink-0 text-emerald-600" size={24} />
            <p className="text-sm font-bold">
              Vous êtes bien dans la salle de destination.
            </p>
          </div>
        )}

        {/* 🔹 ARTICLE INFO 🔹 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center shrink-0">
            <Package size={28} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">{item.article?.nom || "Article"}</h2>
            <Badge className="bg-slate-100 text-slate-600 font-mono text-[10px] mt-1 border-0">{item.qr_code_reference}</Badge>
          </div>
        </div>

        {/* 🔹 DETAILS DU TRANSFERT 🔹 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-50 pb-3">Détails de l'expédition</h3>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500 flex items-center gap-1.5"><MapPin size={14}/> Depuis</span>
            <span className="text-sm font-bold text-slate-700">{transfer.from_emplacement?.nom}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500 flex items-center gap-1.5"><MapPin size={14} className="text-cyan-500"/> Vers (Destination)</span>
            <span className="text-sm font-bold text-cyan-700">{transfer.to_emplacement?.nom}</span>
          </div>
          
        </div>

        {/* 🔹 ACTION BUTTON 🔹 */}
        <div className="pt-2">
          <Button 
            onClick={handleReceive}
            disabled={submitLoading || !isCorrectLocation || !userEmplacementId} 
            className="w-full h-14 rounded-2xl text-base font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-md shadow-cyan-200"
          >
            {submitLoading ? <Loader2 className="animate-spin mr-2" /> : <Inbox className="mr-2 w-5 h-5"/>}
            Confirmer la réception
          </Button>
        </div>

      </main>
    </div>
  );
}

export default function ReceiveTransferPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-cyan-600"/></div>}>
      <ReceiveTransferContent />
    </Suspense>
  );
}