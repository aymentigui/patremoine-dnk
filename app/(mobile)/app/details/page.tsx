"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import { Can } from "@/components/auth/Can";

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
  
  // 🔥 Enrichissement Form State 🔥
  const [enrichForm, setEnrichForm] = useState({
    marque: "",
    modele: "",
    numero_serie_fabricant: ""
  });
  const [photo, setPhoto] = useState<File | null>(null);
  
  // Data for Selects
  const [emplacements, setEmplacements] = useState<any[]>([]);

  // 1. Fetch Item Details
  useEffect(() => {
    if (!qrCode) {
      toast.error("Code QR manquant.");
      router.push("/app/home");
      return;
    }

    const fetchItemDetails = async () => {
      try {
        const res = await api.get(`/article-items/qr/${qrCode}`);
        const fetchedItem = res.data.data;
        setItem(fetchedItem);
        
        // 🔥 تعبئة بيانات فورم الإثراء أوتوماتيكيا إذا كانت موجودة مسبقاً 🔥
        setEnrichForm({
          marque: fetchedItem.marque || "",
          modele: fetchedItem.modele || "",
          numero_serie_fabricant: fetchedItem.numero_serie_fabricant || ""
        });
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Erreur de connexion serveur.");
        router.push("/app/home");
      } finally {
        setLoading(false);
      }
    };

    fetchItemDetails();
  }, [qrCode, router]);

  // Fetch Emplacements for Transfer Modal
  useEffect(() => {
    if (activeModal === "transfer" && emplacements.length === 0) {
      api.get("/emplacements?per_page=500").then(res => {
        setEmplacements(res.data.data?.data || res.data.data || []);
      });
    }
  }, [activeModal, emplacements.length]);

  // 1. Changer Statut
  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusForm.status) return toast.error("Sélectionnez un statut.");
    try {
      setActionLoading(true);
      await api.post(`/article-items/${item.id}/change-status`, statusForm);
      toast.success("Statut mis à jour !");
      setItem({ ...item, status: statusForm.status });
      setActiveModal(null);
    } catch (err) { toast.error("Erreur de mise à jour."); }
    finally { setActionLoading(false); }
  };

  // 2. Déplacer (Transfert Rapide)
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

  // 3. 🔥 Enrichissement (Marque, Modèle, SN + Photo) 🔥
  const handleEnrichSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // تأكد إذا ماكان كاين حتى معلومة جديدة والصورة مكانش (Formule فارغ)
    if (!photo && !enrichForm.marque && !enrichForm.modele && !enrichForm.numero_serie_fabricant) {
      return toast.error("Veuillez remplir au moins une information ou ajouter une photo.");
    }

    try {
      setActionLoading(true);
      const formData = new FormData();
      
      // إضافة البيانات النصية إذا كانت متوفرة
      if (enrichForm.marque) formData.append("marque", enrichForm.marque);
      if (enrichForm.modele) formData.append("modele", enrichForm.modele);
      if (enrichForm.numero_serie_fabricant) formData.append("numero_serie_fabricant", enrichForm.numero_serie_fabricant);
      
      // الباكاند نتاعك يستنى 'image' ماشي 'photo'
      if (photo) formData.append("image", photo);

      const res = await api.post(`/article-items/qr/${qrCode}/enrich`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      toast.success("Article enrichi avec succès !");
      
      // 🔥 تحديث الواجهة بالبيانات الجديدة المرجعة من الباكاند 🔥
      if (res.data && res.data.data) {
        setItem(res.data.data);
      }
      
      setActiveModal(null);
      setPhoto(null);
    } catch (error: any) { 
      toast.error(error.response?.data?.message || "Erreur lors de l'enrichissement."); 
    } finally { 
      setActionLoading(false); 
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!item) return null;

  // استخراج الصورة إذا كانت موجودة عبر Spatie MediaLibrary
  // الباكاند نتاعك يرجع Resource، عادة تكون الصورة في مصفوفة media ولا property معينة
  const imageUrl = item.image_url || (item.media && item.media.length > 0 ? item.media[0].original_url : null);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      
      {/* 🔹 HEADER MOBILE 🔹 */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <button onClick={() => router.back()} className="p-2 bg-slate-100 rounded-full active:scale-95 transition-transform">
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 truncate">Détails de l'article</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-5">
        
        {/* 🔹 CARD: INFO PRINCIPALES 🔹 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
          <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 overflow-hidden border-4 border-blue-50">
            {imageUrl ? (
              <img src={imageUrl} alt="Article" className="w-full h-full object-cover" />
            ) : (
              <Package size={36} strokeWidth={1.5} />
            )}
          </div>
          <Badge className="absolute top-4 right-4 bg-slate-100 text-slate-600 font-mono border-0 text-xs py-1">
            {item.qr_code_reference}
          </Badge>
          <h2 className="text-xl font-bold text-slate-900 mb-1">{item.article?.nom || "Article Inconnu"}</h2>
          <p className="text-sm font-medium text-slate-500 mb-4">{item.article?.category?.nom || "Catégorie non définie"}</p>
          
          <div className="flex gap-2 w-full mt-2">
            <div className="flex-1 bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col items-center justify-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Statut Actuel</p>
              <div className="flex justify-center items-center gap-1.5 text-sm font-semibold text-slate-700">
                {item.status === 'en_service' ? <CheckCircle2 size={16} className="text-emerald-500"/> : 
                 item.status === 'en_panne' ? <AlertTriangle size={16} className="text-orange-500"/> : 
                 <Activity size={16} className="text-blue-500"/>}
                <span className="capitalize">{item.status?.replace('_', ' ') || "Inconnu"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 🔹 CARD: CARACTÉRISTIQUES (NOUVEAU) 🔹 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
            <Info size={14} /> Caractéristiques
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-slate-50">
              <span className="text-sm font-medium text-slate-600">Marque</span>
              <span className="text-sm font-bold text-slate-900">{item.marque || "—"}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-50">
              <span className="text-sm font-medium text-slate-600">Modèle</span>
              <span className="text-sm font-bold text-slate-900">{item.modele || "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">N° Série (SN)</span>
              <span className="text-sm font-bold font-mono text-slate-900">{item.numero_serie_fabricant || "—"}</span>
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
              <span className="text-sm font-medium text-slate-600">Parc / Site</span>
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

        {/* 🔹 ACTIONS GRID (Protected by Permissions) 🔹 */}
        <div className="pb-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 ml-2">Actions Rapides</h3>
          <div className="grid grid-cols-2 gap-3">
            
            <Can permission="modifier_statut_article_items">
              <button 
                onClick={() => setActiveModal("status")}
                className="bg-orange-50 rounded-2xl p-4 flex flex-col items-center justify-center text-orange-700 active:scale-95 transition-transform border border-orange-100"
              >
                <Activity size={24} className="mb-2" />
                <span className="text-[11px] font-bold text-center">Changer Statut</span>
              </button>
            </Can>

            <Can permission="transfert_rapide_mobile">
              <button 
                onClick={() => setActiveModal("transfer")}
                className="bg-blue-50 rounded-2xl p-4 flex flex-col items-center justify-center text-blue-700 active:scale-95 transition-transform border border-blue-100"
              >
                <ArrowRightLeft size={24} className="mb-2" />
                <span className="text-[11px] font-bold text-center">Déplacer</span>
              </button>
            </Can>

            <Can permission="enrichir_article_items">
              <button 
                onClick={() => setActiveModal("enrich")}
                className="col-span-2 bg-emerald-50 rounded-2xl p-4 flex flex-row items-center justify-center gap-3 text-emerald-700 active:scale-[0.98] transition-transform border border-emerald-100"
              >
                <div className="bg-emerald-100 p-2.5 rounded-full"><Camera size={20} /></div>
                <div className="text-left">
                  <span className="text-sm font-bold block">Enrichir les données</span>
                  <span className="text-[10px] opacity-80 font-medium">Ajouter marque, SN, photo...</span>
                </div>
              </button>
            </Can>
            
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
                  <SelectTrigger className="h-14 rounded-2xl text-base bg-slate-50 border-slate-200"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
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
                  className="rounded-2xl bg-slate-50 border-slate-200 resize-none h-24"
                />
              </div>
              <Button type="submit" disabled={actionLoading} className="w-full h-14 rounded-2xl text-base font-bold bg-orange-600 hover:bg-orange-700">
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
                  <SelectTrigger className="h-14 rounded-2xl text-base bg-slate-50 border-slate-200"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {emplacements.map(emp => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>{emp.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={actionLoading} className="w-full h-14 rounded-2xl text-base font-bold bg-blue-600 hover:bg-blue-700">
                {actionLoading ? <Loader2 className="animate-spin" /> : "Envoyer la demande"}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🔥 Modal: Enrichir (Données + Photo) 🔥 */}
      <Dialog open={activeModal === "enrich"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-md rounded-t-3xl sm:rounded-3xl p-0 overflow-hidden bg-white mt-auto sm:mt-0 mb-0 sm:mb-auto h-[85vh] sm:h-auto flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <ImagePlus size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">Enrichir l'article</h3>
              <p className="text-xs text-slate-500">Complétez les infos manquantes.</p>
            </div>
          </div>
          
          <div className="px-6 py-4 overflow-y-auto flex-1">
            <form id="enrichForm" onSubmit={handleEnrichSubmit} className="space-y-4">
              
              {/* Photo Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Photo de l'équipement (Optionnel)</label>
                <div className="relative border-2 border-dashed border-emerald-200 rounded-2xl bg-emerald-50 p-4 flex flex-col items-center justify-center overflow-hidden h-28">
                  {photo ? (
                    <p className="text-emerald-700 font-bold text-sm z-10 text-center line-clamp-2 px-2">📷 {photo.name}</p>
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-emerald-400 mb-1" />
                      <p className="text-slate-500 text-xs z-10">Touchez pour ouvrir la caméra</p>
                    </>
                  )}
                  {/* الباكاند نتاعك يتوقع "image" */}
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                  />
                </div>
              </div>

              {/* Data Inputs */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Marque</label>
                <Input 
                  value={enrichForm.marque}
                  onChange={e => setEnrichForm({...enrichForm, marque: e.target.value})}
                  placeholder="Ex: HP, Dell, Toyota..." 
                  className="h-12 rounded-xl bg-slate-50 border-slate-200" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Modèle</label>
                <Input 
                  value={enrichForm.modele}
                  onChange={e => setEnrichForm({...enrichForm, modele: e.target.value})}
                  placeholder="Ex: ProDesk 400" 
                  className="h-12 rounded-xl bg-slate-50 border-slate-200" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Numéro de Série (S/N)</label>
                <Input 
                  value={enrichForm.numero_serie_fabricant}
                  onChange={e => setEnrichForm({...enrichForm, numero_serie_fabricant: e.target.value})}
                  placeholder="Ex: SN-987654321" 
                  className="h-12 rounded-xl bg-slate-50 border-slate-200 font-mono" 
                />
              </div>
            </form>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 shrink-0">
            <Button form="enrichForm" type="submit" disabled={actionLoading} className="w-full h-14 rounded-2xl text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
              {actionLoading ? <Loader2 className="animate-spin" /> : "Sauvegarder les données"}
            </Button>
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