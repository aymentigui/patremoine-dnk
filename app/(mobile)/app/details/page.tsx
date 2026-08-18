"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import { 
  ArrowLeft, Package, MapPin, AlertTriangle, Info, Camera, 
  ArrowRightLeft, Activity, ImagePlus, Loader2, CheckCircle2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

function DetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrCode = searchParams.get("qr");

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals State
  const [activeModal, setActiveModal] = useState<"transfer" | "status" | "enrich" | null>(null);

  // Forms State
  const [statusForm, setStatusForm] = useState({ status: "", motif: "" });
  const [transferForm, setTransferForm] = useState({ emplacement_id: "" });
  const [photo, setPhoto] = useState<File | null>(null);
  
  // Data for Selects
  const [emplacements, setEmplacements] = useState<any[]>([]);

  useEffect(() => {
    alert(1)
    if (!qrCode) {
      toast.error("Code QR manquant.");
      router.push("/app/home");
      return;
    }

    const fetchItemDetails = async () => {
      try {
        // نبحثو على العتاد بالـ QR Code (باستعمال مسار البحث أو الفلترة)
        const res = await api.get(`/article-items?search=${qrCode}`);
        const foundItems = res.data.data?.data || res.data.data;
        
        if (foundItems && foundItems.length > 0) {
          setItem(foundItems[0]); // نديو أول نتيجة
        } else {
          toast.error("Aucun article trouvé pour ce code.");
          router.push("/app/home");
        }
      } catch (error) {
        toast.error("Erreur de connexion serveur.");
      } finally {
        setLoading(false);
      }
    };

    fetchItemDetails();
  }, [qrCode, router]);

  // جلب الأماكن كي نفتحو مودال التحويل
  useEffect(() => {
    if (activeModal === "transfer" && emplacements.length === 0) {
      api.get("/emplacements?per_page=500").then(res => {
        setEmplacements(res.data.data?.data || res.data.data || []);
      });
    }
  }, [activeModal, emplacements.length]);

  // 1. تغيير الحالة (En panne, etc.)
  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusForm.status) return toast.error("Sélectionnez un statut.");
    try {
      setActionLoading(true);
      await api.post(`/article-items/${item.id}/change-status`, statusForm);
      toast.success("Statut mis à jour !");
      setItem({ ...item, status: statusForm.status }); // Update local UI
      setActiveModal(null);
    } catch (err) { toast.error("Erreur de mise à jour."); }
    finally { setActionLoading(false); }
  };

  // 2. التحويل السريع للموبايل
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.emplacement_id) return toast.error("Sélectionnez un emplacement.");
    try {
      setActionLoading(true);
      await api.post(`/mobile/quick-transfer`, { 
        qr_code: qrCode, 
        to_emplacement_id: transferForm.emplacement_id 
      });
      toast.success("Demande de transfert envoyée !");
      setActiveModal(null);
    } catch (err) { toast.error("Erreur de transfert."); }
    finally { setActionLoading(false); }
  };

  // 3. التقاط ورفع صورة (إثراء)
  const handleEnrichSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) return toast.error("Veuillez prendre ou choisir une photo.");
    try {
      setActionLoading(true);
      const formData = new FormData();
      formData.append("photo", photo);
      await api.post(`/article-items/qr/${qrCode}/enrich`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Photo ajoutée avec succès !");
      setActiveModal(null);
      setPhoto(null);
    } catch (err) { toast.error("Erreur d'envoi."); }
    finally { setActionLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      
      {/* 🔹 HEADER MOBILE 🔹 */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 bg-slate-100 rounded-full active:scale-95 transition-transform">
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 truncate">Détails de l'article</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* 🔹 CARD: INFO PRINCIPALES 🔹 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Package size={36} strokeWidth={1.5} />
          </div>
          <Badge className="absolute top-4 right-4 bg-slate-100 text-slate-600 font-mono border-0">
            {item.qr_code_reference}
          </Badge>
          <h2 className="text-xl font-bold text-slate-900 mb-1">{item.article?.nom || "Article Inconnu"}</h2>
          <p className="text-sm text-slate-500 mb-4">{item.article?.category?.nom || "Catégorie non définie"}</p>
          
          <div className="flex gap-2 w-full mt-2">
            <div className="flex-1 bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Statut</p>
              <div className="flex justify-center items-center gap-1.5 text-sm font-semibold text-slate-700">
                {item.status === 'en_service' ? <CheckCircle2 size={16} className="text-emerald-500"/> : 
                 item.status === 'en_panne' ? <AlertTriangle size={16} className="text-orange-500"/> : 
                 <Activity size={16} className="text-blue-500"/>}
                <span className="capitalize">{item.status?.replace('_', ' ') || "Inconnu"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 🔹 CARD: LOCALISATION 🔹 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
            <MapPin size={14} /> Emplacement Actuel
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-slate-50">
              <span className="text-sm font-medium text-slate-600">Parc</span>
              <span className="text-sm font-bold text-slate-900">{item.emplacement?.parc?.nom || "—"}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-50">
              <span className="text-sm font-medium text-slate-600">Bureau / Salle</span>
              <span className="text-sm font-bold text-indigo-600">{item.emplacement?.nom || "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Affecté à</span>
              <span className="text-sm font-bold text-slate-900">{item.employee?.nom || "Non affecté"}</span>
            </div>
          </div>
        </div>

        {/* 🔹 ACTIONS GRID 🔹 */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 ml-2">Actions Rapides</h3>
          <div className="grid grid-cols-2 gap-3">
            
            {/* Action: Statut */}
            <button 
              onClick={() => setActiveModal("status")}
              className="bg-orange-50 rounded-2xl p-4 flex flex-col items-center justify-center text-orange-700 active:scale-95 transition-transform border border-orange-100"
            >
              <Activity size={24} className="mb-2" />
              <span className="text-[11px] font-bold text-center">Changer Statut</span>
            </button>

            {/* Action: Transfert */}
            <button 
              onClick={() => setActiveModal("transfer")}
              className="bg-blue-50 rounded-2xl p-4 flex flex-col items-center justify-center text-blue-700 active:scale-95 transition-transform border border-blue-100"
            >
              <ArrowRightLeft size={24} className="mb-2" />
              <span className="text-[11px] font-bold text-center">Déplacer</span>
            </button>

            {/* Action: Enrichir (Caméra) */}
            <button 
              onClick={() => setActiveModal("enrich")}
              className="col-span-2 bg-emerald-50 rounded-2xl p-4 flex flex-row items-center justify-center gap-3 text-emerald-700 active:scale-[0.98] transition-transform border border-emerald-100"
            >
              <div className="bg-emerald-100 p-2 rounded-full"><Camera size={20} /></div>
              <span className="text-sm font-bold">Prendre une photo (Enrichir)</span>
            </button>
            
          </div>
        </div>
      </main>

      {/* ========================================== */}
      {/* 🔹 MODALS (BOTTOM SHEETS STYLE) 🔹 */}
      {/* ========================================== */}

      {/* Modal: Changer Statut */}
      <Dialog open={activeModal === "status"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-md rounded-t-3xl sm:rounded-3xl p-0 overflow-hidden bg-white mt-auto sm:mt-0 mb-0 sm:mb-auto align-bottom">
          <div className="px-6 py-6 space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Signaler un état</h3>
            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Nouveau statut</label>
                <Select value={statusForm.status} onValueChange={(v) => setStatusForm({...statusForm, status: v ?? ""})}>
                  <SelectTrigger className="h-12 rounded-xl text-base bg-slate-50"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_service">En Service (Opérationnel)</SelectItem>
                    <SelectItem value="en_panne">En Panne</SelectItem>
                    <SelectItem value="reforme">A Réformer (Hors service)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Motif (Optionnel)</label>
                <Textarea 
                  value={statusForm.motif} 
                  onChange={(e) => setStatusForm({...statusForm, motif: e.target.value})} 
                  placeholder="Décrivez brièvement le problème..." 
                  className="rounded-xl bg-slate-50 resize-none h-24"
                />
              </div>
              <Button type="submit" disabled={actionLoading} className="w-full h-12 rounded-xl text-base bg-orange-600 hover:bg-orange-700">
                {actionLoading ? <Loader2 className="animate-spin" /> : "Valider le statut"}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Transfert Rapide */}
      <Dialog open={activeModal === "transfer"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-md rounded-t-3xl sm:rounded-3xl p-0 overflow-hidden bg-white mt-auto sm:mt-0 mb-0 sm:mb-auto">
          <div className="px-6 py-6 space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Déplacer l'article</h3>
            <p className="text-sm text-slate-500">Demander le transfert vers un nouveau bureau ou parc.</p>
            <form onSubmit={handleTransferSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Nouvel Emplacement</label>
                <Select value={transferForm.emplacement_id} onValueChange={(v) => setTransferForm({ emplacement_id: v ?? "" })}>
                  <SelectTrigger className="h-12 rounded-xl text-base bg-slate-50"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {emplacements.map(emp => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>{emp.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={actionLoading} className="w-full h-12 rounded-xl text-base bg-blue-600 hover:bg-blue-700">
                {actionLoading ? <Loader2 className="animate-spin" /> : "Envoyer la demande"}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Enrichir (Prendre Photo) */}
      <Dialog open={activeModal === "enrich"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-md rounded-t-3xl sm:rounded-3xl p-0 overflow-hidden bg-white mt-auto sm:mt-0 mb-0 sm:mb-auto">
          <div className="px-6 py-6 space-y-4 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <ImagePlus size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Ajouter une photo</h3>
            <p className="text-sm text-slate-500 pb-4">Prenez une photo de l'équipement pour enrichir la base de données.</p>
            <form onSubmit={handleEnrichSubmit} className="space-y-4">
              <div className="relative border-2 border-dashed border-emerald-200 rounded-2xl bg-emerald-50/50 p-6 flex flex-col items-center justify-center">
                {photo ? (
                  <p className="text-emerald-700 font-bold text-sm">Image sélectionnée : {photo.name}</p>
                ) : (
                  <p className="text-slate-500 text-sm">Touchez pour ouvrir la caméra</p>
                )}
                {/* Input file caché qui ouvre la caméra sur mobile (`capture="environment"`) */}
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
              </div>
              <Button type="submit" disabled={actionLoading || !photo} className="w-full h-12 rounded-xl text-base bg-emerald-600 hover:bg-emerald-700">
                {actionLoading ? <Loader2 className="animate-spin" /> : "Téléverser l'image"}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default function MobileDetailsPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div>}>
      <DetailsContent />
    </Suspense>
  );
}