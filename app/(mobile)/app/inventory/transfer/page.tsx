"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import { 
  ArrowLeft, Send, Package, MapPin, 
  Loader2, Building2, Check, ChevronsUpDown, Info, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

function TransferRequestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrCode = searchParams.get("qr");

  // 🔹 States 🔹
  const [user, setUser] = useState<any>(null);
  const [item, setItem] = useState<any>(null);
  const [parcs, setParcs] = useState<any[]>([]);
  const [emplacements, setEmplacements] = useState<any[]>([]);
  
  const [parcId, setParcId] = useState<string>("");
  const [emplacementId, setEmplacementId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Combobox States
  const [openParc, setOpenParc] = useState(false);
  const [openEmp, setOpenEmp] = useState(false);

  // 1. Fetch Data (User + Item + Locations)
  useEffect(() => {
    if (!qrCode) {
      toast.error("Code QR manquant.");
      router.push("/app/home");
      return;
    }

    const fetchData = async () => {
      try {
        const [userRes, itemRes, parcRes, empRes] = await Promise.all([
          api.get("/user"), // نجبدو الخدام باش نعرفو البارك نتاعو
          api.get(`/article-items/qr/${qrCode}`),
          api.get("/parcs?per_page=500"),
          api.get("/emplacements?per_page=500")
        ]);

        setUser(userRes.data);
        setItem(itemRes.data.data);
        setParcs(parcRes.data.data?.data || parcRes.data.data || []);
        setEmplacements(empRes.data.data?.data || empRes.data.data || []);
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Erreur de chargement.");
        router.push("/app/home");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [qrCode, router]);

  // الفلترة الديناميكية
  const availableEmplacements = useMemo(() => {
    if (!parcId) return [];
    return emplacements.filter(e => e.parc_id?.toString() === parcId);
  }, [parcId, emplacements]);

  const handleParcChange = (val: string) => {
    setParcId(val);
    setEmplacementId(""); 
  };

  // 🔥 اللوجيك الحقيقي نتاع الميدان (Validation States) 🔥
  const userParcId = user?.employee?.emplacement?.parc_id?.toString();
  const itemParcId = item?.emplacement?.parc_id?.toString();
  const currentEmpId = item?.emplacement_id?.toString();
  
  // هل البياسة تنتمي لبارك خاطي البارك نتاع الخدام؟
  const isForeignItem = userParcId && itemParcId && userParcId !== itemParcId;
  
  // هل خير يبعثها لنفس البيرو اللي راهي فيه دكا؟
  const isSameEmplacement = emplacementId && currentEmpId && emplacementId === currentEmpId;

  // 2. إرسال طلب التحويل (Phase 1)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emplacementId) return toast.error("Veuillez sélectionner le nouvel emplacement.");
    
    if (isForeignItem) {
      return toast.error("Vous ne pouvez pas transférer un article d'un autre parc !");
    }

    if (isSameEmplacement) {
      return toast.error("L'article est déjà affecté à cet emplacement !");
    }

    try {
      setSubmitLoading(true);
      await api.post("/mobile/quick-transfer", {
        qr_code: qrCode,
        current_emplacement_id: emplacementId
      });
      
      toast.success("Demande envoyée ! En attente d'approbation.");
      router.push("/app/home"); 
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur lors de l'envoi de la demande.");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;
  }

  if (!item || !user) return null;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      
      {/* 🔹 HEADER 🔹 */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <button onClick={() => router.back()} className="p-2 bg-slate-100 rounded-full active:scale-95 transition-transform">
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Send className="text-blue-600" size={20}/> Demande de Transfert
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        
        {/* 🔥 ALERTS VISUELLES DU LOGIC METIER 🔥 */}
        {isForeignItem ? (
          <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex gap-3 text-red-800 animate-in fade-in zoom-in">
            <AlertTriangle className="shrink-0 mt-0.5" size={20} />
            <div className="text-xs leading-relaxed font-medium space-y-1">
              <p>Impossible d'initier le transfert.</p>
              <p>Cet article appartient au parc : <strong className="text-red-900">{item.emplacement?.parc?.nom}</strong>.</p>
              <p>Vous êtes rattaché au parc : <strong className="text-red-900">{user.employee?.emplacement?.parc?.nom}</strong>.</p>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex gap-3 text-blue-800 animate-in fade-in zoom-in">
            <Info className="shrink-0 mt-0.5" size={20} />
            <p className="text-xs leading-relaxed font-medium">
              Cet article appartient bien à votre parc (<strong>{item.emplacement?.parc?.nom}</strong>). Vous pouvez demander son transfert vers n'importe quel autre site.
            </p>
          </div>
        )}

        {/* 🔹 ARTICLE INFO 🔹 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-800"></div>
          <div className="w-16 h-16 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden">
            {item.image_url ? (
              <img src={item.image_url} alt="Article" className="w-full h-full object-cover" />
            ) : (
              <Package size={28} />
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">{item.article?.nom || "Article"}</h2>
            <Badge className="bg-slate-100 text-slate-600 font-mono text-[10px] mt-1 hover:bg-slate-100 border-0">{item.qr_code_reference}</Badge>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 font-medium">
              <MapPin size={12} className="text-orange-500"/> Origine: <span className="text-slate-700">{item.emplacement?.nom || "Inconnu"}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
              <Building2 size={10} /> Parc: {item.emplacement?.parc?.nom || "Inconnu"}
            </div>
          </div>
        </div>

        {/* 🔹 TRANSFER FORM 🔹 */}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-5">
          <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
            <MapPin size={16} className="text-blue-500"/> Emplacement de destination
          </h3>

          {/* COMBOBOX: PARC */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 ml-1">1. Parc / Site</label>
            <Popover open={openParc} onOpenChange={setOpenParc}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" role="combobox" aria-expanded={openParc} 
                  disabled={isForeignItem} // نديزاكتيفيو البوطون إذا البياسة خاطياتو
                  className="w-full h-14 rounded-2xl justify-between bg-slate-50 border-slate-200 text-base font-normal disabled:opacity-50"
                >
                  {parcId ? (
                    <span className="flex items-center gap-2 text-slate-900"><Building2 size={18} className="text-slate-400"/> {parcs.find(p => p.id.toString() === parcId)?.nom}</span>
                  ) : <span className="text-slate-400">Où va l'article ?</span>}
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

          {/* COMBOBOX: EMPLACEMENT */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 ml-1">2. Bureau / Salle *</label>
            <Popover open={openEmp} onOpenChange={setOpenEmp}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" role="combobox" aria-expanded={openEmp} 
                  disabled={!parcId || isForeignItem} 
                  className={cn("w-full h-14 rounded-2xl justify-between bg-slate-50 text-base font-normal disabled:opacity-50", isSameEmplacement ? "border-orange-300 ring-1 ring-orange-100" : "border-slate-200")}
                >
                  {emplacementId ? (
                    <span className="flex items-center gap-2 text-slate-900"><MapPin size={18} className="text-blue-500"/> {availableEmplacements.find(e => e.id.toString() === emplacementId)?.nom}</span>
                  ) : <span className="text-slate-400">Sélectionner la salle...</span>}
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
                          setEmplacementId(e.id.toString());
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

          {/* إذا خير نفس البيرو اللي راه فيه العتاد */}
          {isSameEmplacement && (
            <div className="bg-orange-50 p-3 rounded-xl border border-orange-200 flex gap-2 text-orange-700 animate-in fade-in zoom-in duration-300">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <p className="text-xs font-semibold leading-relaxed">
                L'équipement se trouve déjà dans ce bureau.
              </p>
            </div>
          )}

          <div className="pt-4">
            <Button 
              type="submit" 
              disabled={submitLoading || !emplacementId || isForeignItem || isSameEmplacement} 
              className="w-full h-14 rounded-2xl text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 disabled:opacity-50 disabled:shadow-none"
            >
              {submitLoading ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 w-5 h-5"/>}
              Envoyer la demande
            </Button>
          </div>
        </form>

      </main>
    </div>
  );
}

export default function QuickTransferPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600"/></div>}>
      <TransferRequestContent />
    </Suspense>
  );
}