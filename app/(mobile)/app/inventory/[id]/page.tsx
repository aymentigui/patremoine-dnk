"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import { ArrowLeft, ScanLine, MapPin, Loader2, AlertTriangle, CheckCircle, Check, ChevronsUpDown, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function InventorySessionPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const commissionId = params.id;
  const qrScanned = searchParams.get("qr"); 
  const savedEmplacement = searchParams.get("emplacement_id") || localStorage.getItem(`inv_emp_${commissionId}`);

  // 🔹 States 🔹
  const [parcs, setParcs] = useState<any[]>([]);
  const [emplacements, setEmplacements] = useState<any[]>([]);
  
  const [parcId, setParcId] = useState<string>("");
  const [emplacementId, setEmplacementId] = useState<string>(savedEmplacement || "");
  const [loading, setLoading] = useState(true);

  // Combobox States
  const [openParc, setOpenParc] = useState(false);
  const [openEmp, setOpenEmp] = useState(false);

  // Preview State
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [etatTrouve, setEtatTrouve] = useState<string>("en_service");
  const [submitLoading, setSubmitLoading] = useState(false);

  // 1. جلب الأماكن والحظائر المتاحة
  useEffect(() => {
    Promise.all([
      api.get("/parcs?per_page=500"),
      api.get("/emplacements?per_page=500")
    ]).then(([parcRes, empRes]) => {
      const fetchedParcs = parcRes.data.data?.data || parcRes.data.data || [];
      const fetchedEmps = empRes.data.data?.data || empRes.data.data || [];
      
      setParcs(fetchedParcs);
      setEmplacements(fetchedEmps);
      
      // إذا كان عندنا emplacement مخبي، نجبدو الـ parc نتاعو أوتوماتيكيا
      if (savedEmplacement) {
        const emp = fetchedEmps.find((e: any) => e.id.toString() === savedEmplacement);
        if (emp && emp.parc_id) setParcId(emp.parc_id.toString());
      }
      
      setLoading(false);
    }).catch(() => {
      toast.error("Erreur lors du chargement des lieux.");
      setLoading(false);
    });
  }, [savedEmplacement]);

  // الفلترة الديناميكية للإمبلاصمون حسب البارك المختار
  const availableEmplacements = useMemo(() => {
    if (!parcId) return [];
    return emplacements.filter(e => e.parc_id?.toString() === parcId);
  }, [parcId, emplacements]);

  // 2. إذا رجعنا من السكانار وفي الـ URL كاين QR Code -> نديرو Preview
  useEffect(() => {
    if (qrScanned && emplacementId) {
      const fetchPreview = async () => {
        try {
          const res = await api.post("/inventory/scan/preview", {
            qr_code: qrScanned,
            commission_id: commissionId,
            emplacement_id: emplacementId
          });
          setPreviewData(res.data.data || res.data);
          setShowPreviewModal(true);
        } catch (error: any) {
          toast.error(error.response?.data?.message || "Article non trouvé ou erreur.");
          router.replace(`/app/inventory/${commissionId}`);
        }
      };
      fetchPreview();
    }
  }, [qrScanned, emplacementId, commissionId, router]);

  // Handlers
  const handleParcChange = (val: string) => {
    setParcId(val);
    setEmplacementId(""); // نفرغو القاعة كي نبدلو البارك
    localStorage.removeItem(`inv_emp_${commissionId}`);
  };

  const handleEmplacementChange = (val: string) => {
    setEmplacementId(val);
    localStorage.setItem(`inv_emp_${commissionId}`, val); // نخبيوها باش كي يحل الكاميرا ويرجع يلقاها
  };

  // فتح السكانار
  const openScanner = () => {
    if (!emplacementId) return toast.error("Veuillez sélectionner un emplacement d'abord.");
    router.push(`/app/scan?action=inventory&commission_id=${commissionId}&emplacement_id=${emplacementId}`);
  };

  // Submit النهائي للـ Scan
  const handleConfirmScan = async () => {
    try {
      setSubmitLoading(true);
      await api.post("/inventory/scan/submit", {
        qr_code: qrScanned,
        commission_id: commissionId,
        emplacement_id: emplacementId,
        etat_trouve: etatTrouve
      });
      toast.success("Article inventorié avec succès !");
      setShowPreviewModal(false);
      setPreviewData(null);
      router.replace(`/app/inventory/${commissionId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur d'enregistrement.");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.push("/app/inventory")} className="p-2 bg-slate-100 rounded-full active:scale-95">
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
        <h1 className="text-lg font-bold text-slate-900">Session d'Inventaire</h1>
      </header>

      <main className="p-5 space-y-6 flex-1">
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-5">
          <h2 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
            <MapPin size={18} className="text-blue-500" /> Où êtes-vous actuellement ?
          </h2>
          
          {/* 🔥 COMBOBOX: PARC 🔥 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 ml-1">1. Parc / Site</label>
            <Popover open={openParc} onOpenChange={setOpenParc}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={openParc} className="w-full h-14 rounded-2xl justify-between bg-slate-50 border-slate-200 text-base font-normal">
                  {parcId ? (
                    <span className="flex items-center gap-2 text-slate-900"><Building2 size={18} className="text-slate-400"/> {parcs.find(p => p.id.toString() === parcId)?.nom}</span>
                  ) : <span className="text-slate-400">Sélectionner un parc...</span>}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-3rem)] sm:w-[400px] p-0" align="center">
                <Command>
                  <CommandInput placeholder="Rechercher un parc..." />
                  <CommandList>
                    <CommandEmpty>Aucun parc trouvé.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-y-auto">
                      {parcs.map(p => (
                        <CommandItem key={p.id} value={p.nom} onSelect={() => {
                          handleParcChange(p.id.toString());
                          setOpenParc(false);
                        }}>
                          <Check className={cn("mr-2 h-4 w-4", parcId === p.id.toString() ? "opacity-100 text-blue-600" : "opacity-0")} />
                          {p.nom}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* 🔥 COMBOBOX: EMPLACEMENT 🔥 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 ml-1">2. Bureau / Salle</label>
            <Popover open={openEmp} onOpenChange={setOpenEmp}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={openEmp} disabled={!parcId} className="w-full h-14 rounded-2xl justify-between bg-slate-50 border-slate-200 text-base font-normal">
                  {emplacementId ? (
                    <span className="flex items-center gap-2 text-slate-900"><MapPin size={18} className="text-blue-500"/> {availableEmplacements.find(e => e.id.toString() === emplacementId)?.nom}</span>
                  ) : <span className="text-slate-400">Sélectionner un emplacement...</span>}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-3rem)] sm:w-[400px] p-0" align="center">
                <Command>
                  <CommandInput placeholder="Rechercher une salle..." />
                  <CommandList>
                    <CommandEmpty>Aucun emplacement trouvé.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-y-auto">
                      {availableEmplacements.map(e => (
                        <CommandItem key={e.id} value={e.nom} onSelect={() => {
                          handleEmplacementChange(e.id.toString());
                          setOpenEmp(false);
                        }}>
                          <Check className={cn("mr-2 h-4 w-4", emplacementId === e.id.toString() ? "opacity-100 text-blue-600" : "opacity-0")} />
                          {e.nom}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <p className="text-[11px] text-slate-400 leading-tight mt-4 text-center">
            Sélectionnez avec précision le lieu où vous vous trouvez physiquement.
          </p>
        </div>

        {/* بوطون السكانار الكبير */}
        <button 
          onClick={openScanner}
          disabled={!emplacementId}
          className={`w-full relative overflow-hidden rounded-3xl p-6 text-white shadow-lg active:scale-95 transition-transform ${emplacementId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300'}`}
        >
          <div className="relative z-10 flex flex-col items-center text-center">
            <ScanLine size={48} className="mb-3 opacity-90" />
            <h2 className="text-xl font-bold mb-1">Démarrer le Scan</h2>
            <p className="text-sm opacity-80 max-w-[80%]">
              Scannez les QR Codes de la salle sélectionnée.
            </p>
          </div>
        </button>
      </main>

      {/* ========================================== */}
      {/* 🔹 MODAL: PREVIEW INVENTAIRE (BOTTOM SHEET) 🔹 */}
      {/* ========================================== */}
      <Dialog open={showPreviewModal} onOpenChange={(open) => !open && setShowPreviewModal(false)}>
        <DialogContent className="sm:max-w-md rounded-t-3xl sm:rounded-3xl p-0 overflow-hidden bg-white mt-auto align-bottom">
          <div className="px-6 py-6 space-y-4">
            
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Article Reconnu</h3>
                <p className="text-sm text-slate-500 font-mono">{qrScanned}</p>
              </div>
            </div>

            {previewData && (
              <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100">
                {previewData.is_moved ? (
                  <div className="flex items-start gap-2 text-orange-700 bg-orange-100 p-3 rounded-xl mb-3">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-bold leading-tight">Cet article était enregistré ailleurs ! Il sera mis à jour dans cette salle.</p>
                  </div>
                ) : null}

                <div className="flex justify-between text-sm items-center">
                  <span className="text-slate-500">Article:</span>
                  <span className="font-bold text-slate-900 text-right">{previewData.article_nom || "—"}</span>
                </div>
              </div>
            )}

            <div className="pt-2">
              <label className="text-xs font-bold text-slate-700 uppercase ml-1 block mb-2">État de l'article constaté :</label>
              <Select value={etatTrouve} onValueChange={(v)=>setEtatTrouve(v??"")}>
                <SelectTrigger className="h-12 rounded-xl text-base bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_service">🟢 En Service (Bon état)</SelectItem>
                  <SelectItem value="en_panne">🟠 En Panne</SelectItem>
                  <SelectItem value="reforme">🔴 A Réformer (Hors d'usage)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4 flex flex-row gap-3 px-0">
              <Button type="button" variant="outline" onClick={() => { setShowPreviewModal(false); router.replace(`/app/inventory/${commissionId}`); }} className="w-full h-12 rounded-xl">Annuler</Button>
              <Button onClick={handleConfirmScan} disabled={submitLoading} className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                {submitLoading ? <Loader2 className="animate-spin" /> : "Valider le Scan"}
              </Button>
            </DialogFooter>

          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}