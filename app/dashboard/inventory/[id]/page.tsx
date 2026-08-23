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

import { Loader2, ArrowLeft, Building2, Users, CalendarRange, Play, CheckCircle2, AlertTriangle, FileSpreadsheet, ShieldAlert, BarChart3, ScanLine, XCircle, MapPin, QrCode, Clock, User, Plus, Check, ChevronsUpDown, Info } from "lucide-react";

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

  const [newComm, setNewComm] = useState({ 
    nom: "", 
    step_level: 2, 
    user_ids: [] as number[],
    parc_id: "",
    emplacement_id: "" 
  });

  const availableEmplacements = useMemo(() => {
    if (!newComm.parc_id) return [];
    return emplacements.filter(e => e.parc_id?.toString() === newComm.parc_id);
  }, [newComm.parc_id, emplacements]);

  const fetchCampaignData = useCallback(async () => {
    if (!hasPermission(PERMISSIONS.VIEW)) return;

    try {
      setLoading(true);
      const campRes = await api.get(`/inventory-campaigns/${campaignId}`);
      setCampaign(campRes.data.data);

      if (campRes.data.data.status !== 'planifiee') {
        const repRes = await api.get(`/inventory-campaigns/${campaignId}/report`);
        setReport(repRes.data);
      }
    } catch (error) {
      toast.error("Erreur de chargement des données.");
    } finally {
      setLoading(false);
    }
  }, [campaignId, hasPermission]);

  useEffect(() => { 
    fetchCampaignData(); 
    if (hasPermission(PERMISSIONS.ADD_COMMISSION)) {
      api.get("/users?per_page=500").then(res => setUsers(res.data.data.data || []));
    }
  }, [fetchCampaignData, hasPermission]);

  useEffect(() => {
    if (isAddCommissionModalOpen && parcs.length === 0) {
      Promise.all([
        api.get("/parcs?per_page=500"),
        api.get("/emplacements?per_page=500")
      ]).then(([parcRes, empRes]) => {
        setParcs(parcRes.data.data?.data || parcRes.data.data || []);
        setEmplacements(empRes.data.data?.data || empRes.data.data || []);
      });
    }
  }, [isAddCommissionModalOpen, parcs.length]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!confirm(`Voulez-vous vraiment passer la campagne au statut : ${newStatus.replace('_', ' ')} ?`)) return;
    try {
      setActionLoading(true);
      await api.patch(`/inventory-campaigns/${campaignId}/status`, { status: newStatus });
      toast.success("Statut mis à jour avec succès.");
      fetchCampaignData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur de mise à jour.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloturer = async () => {
    try {
      setActionLoading(true);
      const res = await api.post(`/inventory-campaigns/${campaignId}/cloturer`);
      toast.success(res.data.message || "Campagne clôturée et mise à jour avec succès.");
      setIsClotureModalOpen(false);
      fetchCampaignData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur lors de la clôture.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComm.nom || newComm.user_ids.length === 0) {
      return toast.error("Veuillez remplir le nom et assigner au moins un membre.");
    }
    try {
      setActionLoading(true);
      await api.post(`/inventory-campaigns/${campaignId}/commissions`, newComm);
      toast.success("Commission ajoutée avec succès !");
      setIsAddCommissionModalOpen(false);
      setNewComm({ nom: "", step_level: 2, user_ids: [], parc_id: "", emplacement_id: "" });
      fetchCampaignData(); 
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur lors de l'ajout de la commission.");
    } finally {
      setActionLoading(false);
    }
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

  const handleExportExcel = async () => {
    try {
      const toastId = toast.loading("Génération du rapport Excel...");
      const res = await api.get(`/inventory-campaigns/${campaignId}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a'); 
      link.href = url; 
      link.setAttribute('download', `Rapport_Ecarts_Campagne_${campaignId}.xlsx`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      toast.success("Rapport téléchargé !", { id: toastId });
    } catch (error) { toast.error("Erreur lors de l'exportation."); }
  };

  const openAddCommissionModal = () => {
    const maxStep = campaign.commissions.reduce((max: number, comm: any) => Math.max(max, comm.step_level), 0);
    setNewComm({ nom: `Ligne ${campaign.commissions.length + 1} (Contre-Inventaire)`, step_level: maxStep + 1, user_ids: [], parc_id: "", emplacement_id: "" });
    setIsAddCommissionModalOpen(true);
  };

  if (!hasPermission(PERMISSIONS.VIEW)) {
    return <div className="p-8 text-center text-slate-500">🚫 Accès refusé. Vous n'avez pas l'autorisation de voir cette page.</div>;
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-violet-600"/></div>;
  if (!campaign) return <div className="p-8 text-center text-slate-500">Campagne introuvable.</div>;

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

        {/* 🔹 ACTIONS 🔹 */}
        <div className="flex flex-wrap gap-2">
          {campaign.status === 'planifiee' && hasPermission(PERMISSIONS.CHANGE_STATUS) && (
            <Button onClick={() => handleUpdateStatus('en_cours')} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Play className="w-4 h-4 mr-2" /> Lancer l'Inventaire
            </Button>
          )}

          {(isEnCours || isCloturee) && (
            <Button variant="outline" onClick={handleExportExcel} className="text-emerald-600 border-slate-200 hover:bg-emerald-50">
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Exporter le Rapport
            </Button>
          )}

          {isEnCours && hasPermission(PERMISSIONS.CHANGE_STATUS) && (
            <Button onClick={() => setIsClotureModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white">
              <ShieldAlert className="w-4 h-4 mr-2" /> Clôturer et Appliquer
            </Button>
          )}
        </div>
      </div>

      {/* 🔹 MAIN CONTENT TABS 🔹 */}
      <Tabs defaultValue={isEnCours || isCloturee ? "rapport" : "commissions"} className="w-full">
        <TabsList className="bg-white border border-slate-100 p-1 rounded-xl h-auto flex flex-wrap">
          <TabsTrigger value="rapport" disabled={campaign.status === 'planifiee'} className="data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 py-2.5 px-4 rounded-lg">
            <BarChart3 className="w-4 h-4 mr-2" /> Rapport & Écarts
          </TabsTrigger>
          <TabsTrigger value="scans" disabled={campaign.status === 'planifiee'} className="data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 py-2.5 px-4 rounded-lg">
            <ScanLine className="w-4 h-4 mr-2" /> Historique des Scans
          </TabsTrigger>
          <TabsTrigger value="commissions" className="data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 py-2.5 px-4 rounded-lg">
            <Users className="w-4 h-4 mr-2" /> Configuration Commissions
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: RAPPORT & ECARTS */}
        <TabsContent value="rapport" className="mt-6 space-y-6">
          {report && (
            <>
              {/* 🔹 STATS CARDS 🔹 */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <div className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider mb-1">Total Attendu</div>
                  <div className="text-2xl font-bold text-slate-800">{report.statistiques.total_attendu}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                  <div className="text-blue-600 text-[10px] font-semibold uppercase tracking-wider mb-1">Total Scanné</div>
                  <div className="text-2xl font-bold text-blue-700 flex items-center gap-2"><ScanLine className="w-5 h-5"/> {report.statistiques.total_scanne}</div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm">
                  <div className="text-emerald-600 text-[10px] font-semibold uppercase tracking-wider mb-1">Conformes</div>
                  <div className="text-2xl font-bold text-emerald-700 flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> {report.statistiques.conformes}</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 shadow-sm">
                  <div className="text-orange-600 text-[10px] font-semibold uppercase tracking-wider mb-1">Déplacés (Écarts)</div>
                  <div className="text-2xl font-bold text-orange-700 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> {report.statistiques.deplaces}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm">
                  <div className="text-red-600 text-[10px] font-semibold uppercase tracking-wider mb-1">Manquants</div>
                  <div className="text-2xl font-bold text-red-700 flex items-center gap-2"><XCircle className="w-5 h-5"/> {report.statistiques.manquants}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 shadow-sm">
                  <div className="text-purple-600 text-[10px] font-semibold uppercase tracking-wider mb-1">Hors Scope</div>
                  <div className="text-2xl font-bold text-purple-700 flex items-center gap-2"><Info className="w-5 h-5"/> {report.statistiques.hors_scope}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* 🔥 Table: Déplacés (Écarts) 🔥 */}
                <div className="bg-white rounded-2xl border border-orange-200 overflow-hidden shadow-sm xl:col-span-2">
                  <div className="bg-orange-50/50 px-4 py-3 border-b border-orange-100 flex items-center justify-between">
                    <h3 className="font-bold text-orange-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Matériel Déplacé ({report.statistiques.deplaces})</h3>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-orange-50/30 sticky top-0">
                        <TableRow>
                          <TableHead className="text-orange-800 text-xs">Article (QR)</TableHead>
                          <TableHead className="text-orange-800 text-xs">Position Prévue</TableHead>
                          <TableHead className="text-orange-800 text-xs">Trouvé à</TableHead>
                          <TableHead className="text-orange-800 text-xs">Par qui ?</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.details.deplaces.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-semibold text-sm">{item.nom}</div>
                              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5"><QrCode className="w-3 h-3"/>{item.qr_code}</div>
                            </TableCell>
                            <TableCell className="text-xs text-slate-500 line-through">{item.emplacement_systeme}</TableCell>
                            <TableCell>
                              <div className="text-xs font-semibold text-orange-600 flex items-center gap-1"><MapPin className="w-3 h-3"/> {item.emplacement_scanne}</div>
                              <div className="text-[10px] text-slate-500 mt-1">Comm: {item.commission}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-slate-700 flex items-center gap-1"><User className="w-3 h-3 text-blue-500"/> {item.scanneur}</div>
                              <div className="text-[10px] text-slate-500">{item.scanned_at}</div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {report.details.deplaces.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-slate-400 py-6 text-sm">Aucun matériel déplacé.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Table: Manquants */}
                <div className="bg-white rounded-2xl border border-red-200 overflow-hidden shadow-sm">
                  <div className="bg-red-50/50 px-4 py-3 border-b border-red-100 flex items-center justify-between">
                    <h3 className="font-bold text-red-800 flex items-center gap-2"><XCircle className="w-4 h-4"/> Matériel Manquant ({report.statistiques.manquants})</h3>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-red-50/30 sticky top-0">
                        <TableRow>
                          <TableHead className="text-red-800 text-xs">Article (QR)</TableHead>
                          <TableHead className="text-red-800 text-xs">Position Prévue</TableHead>
                          <TableHead className="text-red-800 text-xs">Dernier État</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.details.manquants.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-semibold text-sm">{item.nom}</div>
                              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5"><QrCode className="w-3 h-3"/>{item.qr_code}</div>
                            </TableCell>
                            <TableCell className="text-xs font-medium text-slate-700">{item.emplacement_systeme}</TableCell>
                            <TableCell className="text-xs text-slate-500">{item.etat_systeme?.replace('_', ' ')}</TableCell>
                          </TableRow>
                        ))}
                        {report.details.manquants.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-slate-400 py-6 text-sm">Aucun matériel manquant.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* 🔥 Table: Hors Scope (Matériel Étranger) 🔥 */}
                <div className="bg-white rounded-2xl border border-purple-200 overflow-hidden shadow-sm">
                  <div className="bg-purple-50/50 px-4 py-3 border-b border-purple-100 flex items-center justify-between">
                    <h3 className="font-bold text-purple-800 flex items-center gap-2"><ScanLine className="w-4 h-4"/> Étranger (Hors Scope) ({report.statistiques.hors_scope})</h3>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-purple-50/30 sticky top-0">
                        <TableRow>
                          <TableHead className="text-purple-800 text-xs">Article (QR)</TableHead>
                          <TableHead className="text-purple-800 text-xs">Trouvé à</TableHead>
                          <TableHead className="text-purple-800 text-xs">Par qui ?</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.details.hors_scope.map((item: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <div className="font-semibold text-sm">{item.nom}</div>
                              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5"><QrCode className="w-3 h-3"/>{item.qr_code}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs font-semibold text-purple-600 flex items-center gap-1"><MapPin className="w-3 h-3"/> {item.emplacement_scanne}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-slate-700 flex items-center gap-1"><User className="w-3 h-3 text-blue-500"/> {item.scanneur}</div>
                              <div className="text-[10px] text-slate-500">{item.scanned_at}</div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {report.details.hors_scope.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-slate-400 py-6 text-sm">Aucun matériel hors scope.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                </div>

              </div>
            </>
          )}
        </TabsContent>

        {/* TAB 2: HISTORIQUE DES SCANS PAR COMMISSION */}
        <TabsContent value="scans" className="mt-6 space-y-6">
           {report && report.details?.scans_par_commission && (
             Object.entries(report.details.scans_par_commission).length > 0 ? (
               Object.entries(report.details.scans_par_commission).map(([commNom, scans]: [string, any]) => (
                 <div key={commNom} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                   <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                     <h3 className="font-bold text-slate-800 flex items-center gap-2"><ScanLine className="w-4 h-4 text-violet-600"/> Commission : {commNom}</h3>
                     <Badge variant="outline" className="text-slate-500">{scans.length} Scan(s)</Badge>
                   </div>
                   <div className="max-h-[350px] overflow-y-auto">
                     <Table>
                       <TableHeader className="bg-white sticky top-0 shadow-sm">
                         <TableRow>
                           <TableHead className="text-xs">Article scanné</TableHead>
                           <TableHead className="text-xs">Localisation (Où ?)</TableHead>
                           <TableHead className="text-xs">État</TableHead>
                           <TableHead className="text-xs">Opérateur (Qui ?)</TableHead>
                           <TableHead className="text-xs text-right">Date/Heure</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {scans.map((scan: any) => {
                           const isEcart = report.details.deplaces.some((d: any) => d.qr_code === scan.qr_code);

                           return (
                             <TableRow key={scan.id} className={isEcart ? "bg-orange-50/30" : ""}>
                               <TableCell>
                                 <div className="font-semibold text-sm">{scan.nom}</div>
                                 <div className="text-[10px] text-slate-500 font-mono mt-0.5">{scan.qr_code}</div>
                               </TableCell>
                               <TableCell>
                                 <div className="text-xs font-medium flex items-center gap-1">
                                   <MapPin className="w-3 h-3 text-slate-400"/> {scan.emplacement_scanne}
                                 </div>
                                 {isEcart && <span className="text-[10px] text-orange-600 font-bold ml-4">Écart détecté</span>}
                               </TableCell>
                               <TableCell>
                                 <Badge variant="outline" className="text-[10px] bg-white capitalize">
                                   {scan.etat_trouve ? scan.etat_trouve.replace('_', ' ') : 'N/A'}
                                 </Badge>
                               </TableCell>
                               <TableCell>
                                 <div className="text-xs text-slate-700 flex items-center gap-1.5"><User className="w-3 h-3 text-blue-500"/> {scan.scanneur}</div>
                               </TableCell>
                               <TableCell className="text-right text-xs text-slate-500 flex items-center justify-end gap-1">
                                 <Clock className="w-3 h-3"/> {scan.scanned_at}
                               </TableCell>
                             </TableRow>
                           );
                         })}
                       </TableBody>
                     </Table>
                   </div>
                 </div>
               ))
             ) : (
               <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-100">Aucun scan n'a encore été effectué pour cette campagne.</div>
             )
           )}
        </TabsContent>

        {/* TAB 3: CONFIGURATION DES COMMISSIONS */}
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
                  {comm.users.length > 0 ? (
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

      {/* ========================================== */}
      {/* 🔹 MODAL D'AJOUT D'UNE COMMISSION 🔹 */}
      {/* ========================================== */}
      <Dialog open={isAddCommissionModalOpen} onOpenChange={setIsAddCommissionModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-visible bg-white rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b bg-violet-50/50">
            <DialogTitle className="text-xl font-bold text-violet-700">Nouvelle Commission</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">Assignez des membres et un périmètre (optionnel).</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCommission} className="px-6 py-5 space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Nom de la commission *</label>
                <Input value={newComm.nom} onChange={e => setNewComm({...newComm, nom: e.target.value})} placeholder="Ex: Ligne 3" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Niveau (Step) *</label>
                <Input type="number" min={1} value={newComm.step_level} onChange={e => setNewComm({...newComm, step_level: parseInt(e.target.value)})} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Parc ciblé (Optionnel)</label>
              <Popover open={openParc} onOpenChange={setOpenParc}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={openParc} className="w-full justify-between font-normal bg-white">
                    {newComm.parc_id ? parcs.find(p => p.id.toString() === newComm.parc_id)?.nom : "Sélectionner un parc..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[450px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Rechercher un parc..." />
                    <CommandList>
                      <CommandEmpty>Aucun parc trouvé.</CommandEmpty>
                      <CommandGroup className="max-h-48 overflow-y-auto">
                        {parcs.map(p => (
                          <CommandItem key={p.id} value={p.nom} onSelect={() => {
                            setNewComm(prev => ({ ...prev, parc_id: p.id.toString(), emplacement_id: "" }));
                            setOpenParc(false);
                          }}>
                            <Check className={cn("mr-2 h-4 w-4", newComm.parc_id === p.id.toString() ? "opacity-100" : "opacity-0")} />
                            {p.nom}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Emplacement ciblé (Optionnel)</label>
              <Popover open={openEmp} onOpenChange={setOpenEmp}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={openEmp} disabled={!newComm.parc_id} className="w-full justify-between font-normal bg-white">
                    {newComm.emplacement_id ? availableEmplacements.find(e => e.id.toString() === newComm.emplacement_id)?.nom : "Sélectionner un emplacement..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[450px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Rechercher un emplacement..." />
                    <CommandList>
                      <CommandEmpty>Aucun emplacement trouvé.</CommandEmpty>
                      <CommandGroup className="max-h-48 overflow-y-auto">
                        {availableEmplacements.map(e => (
                          <CommandItem key={e.id} value={e.nom} onSelect={() => {
                            setNewComm(prev => ({ ...prev, emplacement_id: e.id.toString() }));
                            setOpenEmp(false);
                          }}>
                            <Check className={cn("mr-2 h-4 w-4", newComm.emplacement_id === e.id.toString() ? "opacity-100" : "opacity-0")} />
                            {e.nom}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Membres (Scanners) *</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal bg-white">
                    {newComm.user_ids.length > 0 ? `${newComm.user_ids.length} membre(s) sélectionné(s)` : "Assigner des membres..."}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[450px] max-h-64 overflow-y-auto" align="start">
                  {users.map((u: any) => (
                    <DropdownMenuCheckboxItem 
                      key={u.id} 
                      checked={newComm.user_ids.includes(u.id)}
                      onCheckedChange={() => toggleUserInNewCommission(u.id)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {u.name} <span className="text-xs text-slate-400 ml-2">({u.email})</span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <DialogFooter className="pt-4 border-t mt-4 px-0">
              <Button type="button" variant="outline" onClick={() => setIsAddCommissionModalOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={actionLoading} className="bg-violet-600 hover:bg-violet-700 text-white min-w-[120px]">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Ajouter la commission"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================== */}
      {/* 🔹 MODAL DE CLÔTURE (DANGER) 🔹 */}
      {/* ========================================== */}
      <Dialog open={isClotureModalOpen} onOpenChange={setIsClotureModalOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white rounded-2xl">
          <DialogHeader className="px-6 py-6 border-b bg-red-50/50">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-3 bg-red-100 text-red-600 rounded-full animate-bounce">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <DialogTitle className="text-xl font-bold text-red-700">Clôturer l'Inventaire ?</DialogTitle>
              <DialogDescription className="text-sm text-slate-600 font-medium px-4">
                Attention ! Cette action est définitive. Le système va appliquer les changements suivants :
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="px-6 py-5 bg-slate-50 space-y-3">
             <ul className="text-sm text-slate-700 space-y-2 font-medium">
               <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0"/> Mettre à jour les positions du <b>matériel déplacé</b>.</li>
               <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0"/> Déclarer le matériel non scanné comme <b>Perdu</b>.</li>
               <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0"/> Fermer les accès aux scanners pour toutes les commissions.</li>
               <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0"/> Historiser toutes ces actions.</li>
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