"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

import { Loader2, ArrowLeft, Building2, Users, CalendarRange, Play, CheckCircle2, AlertTriangle, FileSpreadsheet, ShieldAlert, BarChart3, ScanLine, XCircle, MapPin, QrCode, Clock, User, Plus, Check, ChevronsUpDown, Filter, X, Search } from "lucide-react";

const PERMISSIONS = {
  VIEW: "voir_campagnes_inventaire",
  CHANGE_STATUS: "modifier_statut_campagnes", 
  ADD_COMMISSION: "gerer_commissions_inventaire", 
};

export default function CampaignDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id;
  const hasPermission = useAuthStore((state) => state.hasPermission);

  const [campaign, setCampaign] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]); 
  const [parcs, setParcs] = useState<any[]>([]);
  const [emplacements, setEmplacements] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [isClotureModalOpen, setIsClotureModalOpen] = useState(false);
  const [isAddCommissionModalOpen, setIsAddCommissionModalOpen] = useState(false);
  const [openParc, setOpenParc] = useState(false);
  const [openEmp, setOpenEmp] = useState(false);

  // 🔹 Pagination & Filters States 🔹
  const [scansData, setScansData] = useState<any[]>([]);
  const [scansPagination, setScansPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [scansLoading, setScansLoading] = useState(false);
  const [filters, setFilters] = useState({
    qr_code: "",
    nom: "",
    has_ecart_place: "", // "true" or "false"
    ecart_commission: "", // "true" or "false"
  });

  const [newComm, setNewComm] = useState({ 
    nom: "", step_level: 2, user_ids: [] as number[], parc_id: "", emplacement_id: "" 
  });

  const availableEmplacements = useMemo(() => {
    if (!newComm.parc_id) return [];
    return emplacements.filter(e => e.parc_id?.toString() === newComm.parc_id);
  }, [newComm.parc_id, emplacements]);

  // 🔥 Fetch Report Data (Avec option pour ne pas bloquer l'écran à chaque refresh) 🔥
  const fetchCampaignData = useCallback(async (showFullLoader = true) => {
    if (!hasPermission(PERMISSIONS.VIEW)) return;
    try {
      if (showFullLoader) setLoading(true);
      const campRes = await api.get(`/inventory-campaigns/${campaignId}`);
      setCampaign(campRes.data.data);
      if (campRes.data.data.status !== 'planifiee') {
        const repRes = await api.get(`/inventory-campaigns/${campaignId}/report`);
        setReport(repRes.data);
      }
    } catch (error) { 
      toast.error("Erreur de chargement."); 
    } finally { 
      if (showFullLoader) setLoading(false); 
    }
  }, [campaignId, hasPermission]);

  // 🔥 Fetch Paginated Scans (Indépendant, ne recharge que le tableau) 🔥
  const fetchScans = useCallback(async (page = 1) => {
    try {
      setScansLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        per_page: "15",
        ...(filters.qr_code && { qr_code: filters.qr_code }),
        ...(filters.nom && { nom: filters.nom }),
        ...(filters.has_ecart_place && { has_ecart_place: filters.has_ecart_place }),
        ...(filters.ecart_commission && { ecart_commission: filters.ecart_commission }),
      }).toString();

      const res = await api.get(`/inventory-campaigns/${campaignId}/scans?${queryParams}`);
      setScansData(res.data.data);
      setScansPagination({ current_page: res.data.current_page, last_page: res.data.last_page, total: res.data.total });
    } catch (error) {
      toast.error("Erreur de chargement des scans.");
    } finally {
      setScansLoading(false);
    }
  }, [campaignId, filters]);

  // 1️⃣ Initialisation au montage de la page (Une seule fois)
  useEffect(() => { 
    if (hasPermission(PERMISSIONS.VIEW)) {
      fetchCampaignData(true); 
      fetchScans(1); 
    }
    if (hasPermission(PERMISSIONS.ADD_COMMISSION)) {
      api.get("/users?per_page=500").then(res => setUsers(res.data.data.data || []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  // 2️⃣ Charger les parcs et emplacements pour le Modal
  useEffect(() => {
    if (isAddCommissionModalOpen && parcs.length === 0) {
      Promise.all([
        api.get("/parcs?per_page=500"), api.get("/emplacements?per_page=500")
      ]).then(([parcRes, empRes]) => {
        setParcs(parcRes.data.data?.data || parcRes.data.data || []);
        setEmplacements(empRes.data.data?.data || empRes.data.data || []);
      });
    }
  }, [isAddCommissionModalOpen, parcs.length]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!confirm(`Voulez-vous vraiment passer au statut : ${newStatus.replace('_', ' ')} ?`)) return;
    try {
      setActionLoading(true);
      await api.patch(`/inventory-campaigns/${campaignId}/status`, { status: newStatus });
      toast.success("Statut mis à jour.");
      fetchCampaignData(false); // Recharge les données en arrière-plan
    } catch (error: any) { toast.error("Erreur de mise à jour."); } 
    finally { setActionLoading(false); }
  };

  const handleCloturer = async () => {
    try {
      setActionLoading(true);
      const res = await api.post(`/inventory-campaigns/${campaignId}/cloturer`);
      toast.success(res.data.message || "Campagne clôturée.");
      setIsClotureModalOpen(false);
      fetchCampaignData(true);
    } catch (error: any) { toast.error("Erreur lors de la clôture."); } 
    finally { setActionLoading(false); }
  };

  const handleExportExcel = async () => {
    try {
      const toastId = toast.loading("Génération du rapport...");
      const res = await api.get(`/inventory-campaigns/${campaignId}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a'); 
      link.href = url; link.setAttribute('download', `Rapport_${campaignId}.xlsx`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      toast.success("Téléchargé !", { id: toastId });
    } catch (error) { toast.error("Erreur d'exportation."); }
  };

  const handleAddCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.post(`/inventory-campaigns/${campaignId}/commissions`, newComm);
      toast.success("Commission ajoutée !");
      setIsAddCommissionModalOpen(false);
      setNewComm({ nom: "", step_level: 2, user_ids: [], parc_id: "", emplacement_id: "" });
      fetchCampaignData(false); // Recharge les données en arrière-plan sans flash
    } catch (error: any) { toast.error("Erreur lors de l'ajout."); } 
    finally { setActionLoading(false); }
  };

  const toggleUserInNewCommission = (userId: number) => {
    setNewComm(prev => {
      const isSelected = prev.user_ids.includes(userId);
      return {
        ...prev,
        user_ids: isSelected ? prev.user_ids.filter(id => id !== userId) : [...prev.user_ids, userId]
      };
    });
  };

  const openAddCommissionModal = () => {
    const maxStep = campaign.commissions.reduce((max: number, comm: any) => Math.max(max, comm.step_level), 0);
    setNewComm({ nom: `Ligne ${campaign.commissions.length + 1} (Contre-Inventaire)`, step_level: maxStep + 1, user_ids: [], parc_id: "", emplacement_id: "" });
    setIsAddCommissionModalOpen(true);
  };

  if (!hasPermission(PERMISSIONS.VIEW)) return <div className="p-8 text-center text-slate-500">🚫 Accès refusé.</div>;
  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-violet-600"/></div>;
  if (!campaign) return <div className="p-8 text-center text-slate-500">Introuvable.</div>;

  const isEnCours = campaign.status === 'en_cours';
  const isCloturee = campaign.status === 'cloturee';

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 lg:p-8 space-y-6">
      
      {/* 🔹 HEADER 🔹 */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <Button variant="ghost" onClick={() => router.push('/dashboard/inventory')} className="mb-2 text-slate-500 hover:text-slate-900 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour aux campagnes
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{campaign.titre}</h1>
            {campaign.status === 'planifiee' && <Badge className="bg-amber-100 text-amber-700">⏳ Planifiée</Badge>}
            {campaign.status === 'en_cours' && <Badge className="bg-emerald-100 text-emerald-700 animate-pulse">▶ En Cours</Badge>}
            {campaign.status === 'cloturee' && <Badge className="bg-slate-100 text-slate-700">🛑 Clôturée</Badge>}
          </div>
          
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-600">
            <div className="flex items-center gap-1.5"><CalendarRange className="w-4 h-4 text-violet-500"/> Année: {campaign.annee}</div>
            <div className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-indigo-500"/> Périmètre: {campaign.parc?.nom || 'Global'}</div>
            <div className="flex items-center gap-1.5"><Users className="w-4 h-4 text-blue-500"/> {campaign.commissions?.length || 0} Commissions</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {campaign.status === 'planifiee' && hasPermission(PERMISSIONS.CHANGE_STATUS) && (
            <Button onClick={() => handleUpdateStatus('en_cours')} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Play className="w-4 h-4 mr-2" /> Lancer l'Inventaire
            </Button>
          )}
          {(isEnCours || isCloturee) && (
            <Button variant="outline" onClick={handleExportExcel} className="text-emerald-600 border-slate-200 hover:bg-emerald-50">
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Exporter Excel
            </Button>
          )}
          {isEnCours && hasPermission(PERMISSIONS.CHANGE_STATUS) && (
            <Button onClick={() => setIsClotureModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white">
              <ShieldAlert className="w-4 h-4 mr-2" /> Clôturer l'Inventaire
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue={isEnCours || isCloturee ? "rapport" : "commissions"} className="w-full">
        <TabsList className="bg-white border border-slate-100 p-1 rounded-xl h-auto flex flex-wrap">
          <TabsTrigger value="rapport" disabled={campaign.status === 'planifiee'} className="data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 py-2.5 px-4 rounded-lg">
            <BarChart3 className="w-4 h-4 mr-2" /> Synthèse & Écarts
          </TabsTrigger>
          <TabsTrigger value="scans" disabled={campaign.status === 'planifiee'} className="data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 py-2.5 px-4 rounded-lg">
            <ScanLine className="w-4 h-4 mr-2" /> Tous les Scans
          </TabsTrigger>
          <TabsTrigger value="commissions" className="data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 py-2.5 px-4 rounded-lg">
            <Users className="w-4 h-4 mr-2" /> Commissions
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: SYNTHESE & ECARTS */}
        <TabsContent value="rapport" className="mt-6 space-y-6">
          {report && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><div className="text-slate-500 text-[10px] font-semibold uppercase mb-1">Attendu</div><div className="text-2xl font-bold">{report.statistiques.total_attendu}</div></div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm"><div className="text-blue-600 text-[10px] font-semibold uppercase mb-1">Scanné</div><div className="text-2xl font-bold text-blue-700 flex items-center gap-2"><ScanLine className="w-5 h-5"/> {report.statistiques.total_scanne}</div></div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm"><div className="text-emerald-600 text-[10px] font-semibold uppercase mb-1">Conformes</div><div className="text-2xl font-bold text-emerald-700 flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> {report.statistiques.conformes}</div></div>
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 shadow-sm"><div className="text-orange-600 text-[10px] font-semibold uppercase mb-1">Déplacés</div><div className="text-2xl font-bold text-orange-700 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> {report.statistiques.deplaces}</div></div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm"><div className="text-red-600 text-[10px] font-semibold uppercase mb-1">Manquants</div><div className="text-2xl font-bold text-red-700 flex items-center gap-2"><XCircle className="w-5 h-5"/> {report.statistiques.manquants}</div></div>
              </div>

              {/* Table Manquants */}
              <div className="bg-white rounded-2xl border border-red-200 overflow-hidden shadow-sm">
                <div className="bg-red-50/50 px-4 py-3 border-b border-red-100 flex items-center justify-between">
                  <h3 className="font-bold text-red-800 flex items-center gap-2"><XCircle className="w-4 h-4"/> Matériel Manquant ({report.statistiques.manquants})</h3>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-red-50/30 sticky top-0"><TableRow><TableHead className="text-red-800 text-xs">Article (QR)</TableHead><TableHead className="text-red-800 text-xs">Position Prévue</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {report.details.manquants.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell><div className="font-semibold text-sm">{item.nom}</div><div className="text-[10px] text-slate-500 font-mono mt-0.5"><QrCode className="w-3 h-3 inline mr-1"/>{item.qr_code}</div></TableCell>
                          <TableCell className="text-xs font-medium text-slate-700">{item.emplacement_systeme}</TableCell>
                        </TableRow>
                      ))}
                      {report.details.manquants.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-slate-400 py-6 text-sm">Aucun matériel manquant.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* TAB 2: TOUS LES SCANS AVEC FILTRES */}
        <TabsContent value="scans" className="mt-6 space-y-4">
           {/* 🔹 FILTRES 🔹 */}
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
             <div className="flex items-center gap-2 font-bold text-slate-700 mr-2"><Filter className="w-4 h-4"/> Filtres</div>
             <Input placeholder="Chercher par Nom..." value={filters.nom} onChange={e => setFilters({...filters, nom: e.target.value})} className="w-40 h-9" />
             <Input placeholder="Chercher par QR Code..." value={filters.qr_code} onChange={e => setFilters({...filters, qr_code: e.target.value})} className="w-44 h-9" />
             
             <select className="h-9 rounded-md border border-input px-3 text-sm focus:ring-1 focus:ring-violet-500" value={filters.has_ecart_place} onChange={e => setFilters({...filters, has_ecart_place: e.target.value})}>
               <option value="">Tous les emplacements</option>
               <option value="true">⚠️ Mauvais emplacement (Déplacé)</option>
               <option value="false">✅ Bon emplacement</option>
             </select>

             <select className="h-9 rounded-md border border-input px-3 text-sm focus:ring-1 focus:ring-violet-500" value={filters.ecart_commission} onChange={e => setFilters({...filters, ecart_commission: e.target.value})}>
               <option value="">Toutes les commissions</option>
               <option value="true">🚨 Ecart Commission (Oubli)</option>
               <option value="false">✅ Scanné par tous</option>
             </select>

             <Button variant="outline" size="sm" onClick={() => { setFilters({ qr_code:"", nom:"", has_ecart_place:"", ecart_commission:""}); fetchScans(1); }} className="ml-auto h-9"><X className="w-4 h-4 mr-1"/> Effacer</Button>
             <Button size="sm" onClick={() => fetchScans(1)} className="bg-violet-600 hover:bg-violet-700 h-9"><Search className="w-4 h-4 mr-1"/> Filtrer</Button>
           </div>

           {/* 🔹 TABLEAU DES SCANS 🔹 */}
           <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs">Article</TableHead>
                    <TableHead className="text-xs">Emplacement Trouvé</TableHead>
                    <TableHead className="text-xs">Commission</TableHead>
                    <TableHead className="text-xs text-right">Date/Scanneur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scansLoading ? (
                    <TableRow><TableCell colSpan={4} className="h-40 text-center"><Loader2 className="w-6 h-6 animate-spin text-violet-500 mx-auto"/></TableCell></TableRow>
                  ) : scansData.length > 0 ? (
                    scansData.map((scan) => (
                      <TableRow key={scan.id} className={cn(scan.has_ecart_place && "bg-orange-50/50", scan.ecart_commission && "bg-red-50/50")}>
                        <TableCell>
                          <div className="font-semibold text-sm">{scan.nom}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{scan.qr_code}</div>
                          {scan.ecart_commission && (
                            <Badge variant="destructive" className="mt-1 text-[9px] bg-red-100 text-red-700 border-red-200"><AlertTriangle className="w-3 h-3 mr-1"/> Oublié par: {scan.missed_by}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-medium flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400"/> {scan.emplacement_scanne}</div>
                          {scan.has_ecart_place && <span className="text-[10px] text-orange-600 font-bold ml-4">Déplacé</span>}
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="bg-slate-100">{scan.commission}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="text-xs text-slate-700">{scan.scanneur}</div>
                          <div className="text-[10px] text-slate-500">{scan.scanned_at}</div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-400">Aucun résultat.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {scansPagination.last_page > 1 && (
                <div className="p-4 border-t bg-slate-50 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Total : {scansPagination.total} scans</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={scansPagination.current_page === 1} onClick={() => fetchScans(scansPagination.current_page - 1)}>Précédent</Button>
                    <span className="flex items-center px-2 font-medium">Page {scansPagination.current_page} / {scansPagination.last_page}</span>
                    <Button variant="outline" size="sm" disabled={scansPagination.current_page === scansPagination.last_page} onClick={() => fetchScans(scansPagination.current_page + 1)}>Suivant</Button>
                  </div>
                </div>
              )}
           </div>
        </TabsContent>

        {/* TAB 3: COMMISSIONS */}
        <TabsContent value="commissions" className="mt-6">
          {!isCloturee && hasPermission(PERMISSIONS.ADD_COMMISSION) && (
            <div className="flex justify-end mb-4">
              <Button onClick={openAddCommissionModal} className="bg-violet-600 hover:bg-violet-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Ajouter une commission
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaign.commissions.map((comm: any) => (
              <div key={comm.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-violet-500"></div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800">{comm.nom}</h3>
                    <span className="text-xs text-slate-500 font-medium">Niveau: {comm.step_level}</span>
                  </div>
                  {comm.status === 'en_cours' ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Actif</Badge> : <Badge variant="outline" className="text-[10px]">{comm.status}</Badge>}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Membres assignés :</p>
                  {comm.users && comm.users.length > 0 ? (
                    <ul className="space-y-1.5">
                      {comm.users.map((u: any) => (
                        <li key={u.id} className="text-sm text-slate-700 flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                          <div className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-[10px] font-bold">{u.name.charAt(0)}</div>
                          <span className="truncate">{u.name}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-slate-400 italic">Aucun membre.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* CLOTURE MODAL */}
      <Dialog open={isClotureModalOpen} onOpenChange={setIsClotureModalOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white rounded-2xl">
          <DialogHeader className="px-6 py-6 border-b bg-red-50/50">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-3 bg-red-100 text-red-600 rounded-full animate-bounce"><ShieldAlert className="w-8 h-8" /></div>
              <DialogTitle className="text-xl font-bold text-red-700">Clôturer l'Inventaire ?</DialogTitle>
            </div>
          </DialogHeader>
          <div className="px-6 py-5 bg-slate-50 space-y-3">
             <ul className="text-sm text-slate-700 space-y-2 font-medium">
               <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0"/> Déclarer le matériel non scanné comme <b>Perdu</b>.</li>
               <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0"/> Fermer les accès aux scanners.</li>
               <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0"/> Historiser toutes ces actions.</li>
               <li className="flex items-start gap-2 text-red-600"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0"/> (Le matériel déplacé attendra validation via les demandes de transfert).</li>
             </ul>
          </div>
          <DialogFooter className="px-6 py-4 bg-white border-t">
            <Button type="button" variant="outline" onClick={() => setIsClotureModalOpen(false)}>Annuler</Button>
            <Button type="button" onClick={handleCloturer} disabled={actionLoading} className="bg-red-600 hover:bg-red-700 text-white min-w-[120px]">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Confirmer la Clôture"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}