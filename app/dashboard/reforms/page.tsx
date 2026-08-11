"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import toast from "react-hot-toast";

// Auth Components
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { Can } from "@/components/auth/Can";

// UI Components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import { Loader2, Search, Trash2, CheckCircle, XCircle, Play, ArchiveX, ChevronLeft, ChevronRight, Filter, X, FileText, UploadCloud, Gavel, FileSpreadsheet, Download, QrCode, Tag, CheckCircle2 } from "lucide-react";

// ==========================================
// 🔐 PERMISSIONS & UTILS
// ==========================================
const PERMISSIONS = {
  VIEW: "voir_reforme",
  PROPOSE: "proposer_reforme",
  APPROVE: "approuver_reforme",
  EXECUTE: "executer_reforme",
};

const StatusBadge = ({ status, isExecuted }: { status: string, isExecuted: boolean }) => {
  if (isExecuted) return <Badge className="bg-slate-100 text-slate-700 border-slate-300 shadow-sm">✅ Exécuté</Badge>;
  if (status === 'approuve') return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm">✔️ Approuvé</Badge>;
  if (status === 'rejete') return <Badge className="bg-red-100 text-red-700 border-red-200 shadow-sm">❌ Rejeté</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-amber-200 shadow-sm">⏳ Proposé</Badge>;
};

const MethodBadge = ({ methode }: { methode: string | null }) => {
  if (!methode) return <span className="text-slate-400">—</span>;
  const styles: any = { 'vente': 'text-emerald-600', 'cession': 'text-blue-600', 'destruction': 'text-red-600' };
  const labels: any = { 'vente': '💰 Vente', 'cession': '🤝 Cession', 'destruction': '🔥 Destruction' };
  return <span className={`text-xs font-semibold ${styles[methode]}`}>{labels[methode] || methode}</span>;
};

export default function ReformsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Pagination & Selection (Cross-page)
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState("15");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Advanced Filters
  const [filters, setFilters] = useState({
    match_type: "contains",
    nom_article: "", marque: "", modele: "", qr_code_reference: "", numero_facture: "",
    status: "all", is_executed: "all", methode: "all"
  });

  // --- Modals State ---
  const [actionLoading, setActionLoading] = useState(false);
  
  // 1. Propose Single
  const [isProposeModalOpen, setIsProposeModalOpen] = useState(false);
  const [searchEligible, setSearchEligible] = useState("");
  const [eligibleItems, setEligibleItems] = useState<any[]>([]);
  const [proposeForm, setProposeForm] = useState({ article_item_id: "", motif: "" });
  const [selectedEligibleItem, setSelectedEligibleItem] = useState<any>(null);

  // 2. Propose Bulk (Text & Excel)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({ references: "", motif: "" });
  const [bulkExcelFile, setBulkExcelFile] = useState<File | null>(null);
  const [bulkTab, setBulkTab] = useState("texte"); // "texte" ou "excel"

  // 3. Approve / Reject (Single & Bulk)
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approveForm, setApproveForm] = useState({ status: "approuve", remarques_commission: "" });

  // 4. Execute (Single & Bulk)
  const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
  const [executeForm, setExecuteForm] = useState({ methode: "", numero_pv: "", beneficiaire: "", montant: "", date_execution: new Date().toISOString().split('T')[0] });

  // Mode (Single ou Bulk) pour les actions d'Approbation et Exécution
  const [actionMode, setActionMode] = useState<"single" | "bulk">("single");
  const [singleTargetId, setSingleTargetId] = useState<number | null>(null);

  // --- Data Fetching ---
  const fetchReforms = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, per_page: perPage };
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") params[key] = value;
      });

      const res = await api.get("/reforms", { params });
      
      if (perPage === "all") {
        setData(res.data.data || []);
        setLastPage(1);
        setTotal(res.data.data?.length || 0);
      } else {
        setData(res.data.data || []);
        setLastPage(res.data.last_page || 1);
        setTotal(res.data.total || 0);
      }
    } catch (error) { toast.error("Erreur de chargement."); } 
    finally { setLoading(false); }
  }, [page, perPage, filters]);

  useEffect(() => { fetchReforms(); }, [fetchReforms]);

  // --- Smart Search (Debounced) ---
  useEffect(() => {
    if (!searchEligible.trim()) { setEligibleItems([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/reforms/eligible-items?search=${searchEligible}`);
        setEligibleItems(res.data);
      } catch (e) {}
    }, 500);
    return () => clearTimeout(timer);
  }, [searchEligible]);

  // --- Selection Logic (Cross-page) ---
  const handleSelectAll = () => {
    const pageIds = data.map(d => d.id);
    const allSelectedOnPage = pageIds.every(id => selectedIds.includes(id));
    if (allSelectedOnPage) {
      // Retirer les IDs de cette page
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      // Ajouter les IDs manquants
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };
  const handleSelectItem = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // --- Filter Handlers ---
  const handleFilterChange = (key: string, value: any) => { setFilters(prev => ({ ...prev, [key]: value })); setPage(1); };
  const clearFilters = () => { 
    setFilters({ match_type: "contains", nom_article: "", marque: "", modele: "", qr_code_reference: "", numero_facture: "", status: "all", is_executed: "all", methode: "all" }); 
    setPage(1); 
  };

  // --- API Actions: Propose ---
  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposeForm.article_item_id || !proposeForm.motif) return toast.error("Veuillez remplir les champs.");
    try {
      setActionLoading(true);
      await api.post("/reforms", proposeForm);
      toast.success("Demande de réforme soumise.");
      setIsProposeModalOpen(false); setProposeForm({ article_item_id: "", motif: "" }); setSelectedEligibleItem(null); setSearchEligible("");
      fetchReforms();
    } catch (err: any) { toast.error(err.response?.data?.message || "Erreur de soumission."); }
    finally { setActionLoading(false); }
  };

  const handleBulkPropose = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      let res;
      if (bulkTab === "texte") {
        const refs = bulkForm.references.split('\n').map(r => r.trim()).filter(r => r !== "");
        if (refs.length === 0 || !bulkForm.motif) return toast.error("Veuillez remplir les références et le motif.");
        res = await api.post("/reforms/bulk", { references: refs, motif: bulkForm.motif });
      } else {
        if (!bulkExcelFile || !bulkForm.motif) return toast.error("Fichier Excel et motif requis.");
        const payload = new FormData();
        payload.append("fichier_excel", bulkExcelFile);
        payload.append("motif", bulkForm.motif);
        res = await api.post("/reforms/bulk-excel", payload, { headers: { "Content-Type": "multipart/form-data" } });
      }

      toast.success(res.data.message);
      if (res.data.pieces_non_trouvees > 0) toast.error(`${res.data.pieces_non_trouvees} références ignorées ou introuvables.`, { duration: 6000 });
      
      setIsBulkModalOpen(false); setBulkForm({ references: "", motif: "" }); setBulkExcelFile(null);
      fetchReforms();
    } catch (err: any) { toast.error(err.response?.data?.error || err.response?.data?.message || "Erreur Bulk."); }
    finally { setActionLoading(false); }
  };

  // --- API Actions: Approve ---
  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      if (actionMode === "single" && singleTargetId) {
        await api.patch(`/reforms/${singleTargetId}/approve`, approveForm);
        toast.success("Décision enregistrée.");
      } else if (actionMode === "bulk" && selectedIds.length > 0) {
        const res = await api.patch(`/reforms/bulk-approve`, { ...approveForm, reform_ids: selectedIds });
        toast.success(res.data.message);
        setSelectedIds([]); // Clear selection after success
      }
      setIsApproveModalOpen(false); fetchReforms();
    } catch (err: any) { toast.error(err.response?.data?.message || "Erreur d'approbation."); }
    finally { setActionLoading(false); }
  };

  // --- API Actions: Execute ---
  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!executeForm.methode || !executeForm.numero_pv || !executeForm.date_execution) return toast.error("Informations requises manquantes.");
    try {
      setActionLoading(true);
      if (actionMode === "single" && singleTargetId) {
        await api.post(`/reforms/${singleTargetId}/execute`, executeForm);
        toast.success("Exécution terminée.");
      } else if (actionMode === "bulk" && selectedIds.length > 0) {
        const res = await api.post(`/reforms/bulk-execute`, { ...executeForm, reform_ids: selectedIds });
        toast.success(res.data.message);
        setSelectedIds([]); 
      }
      setIsExecuteModalOpen(false); fetchReforms();
    } catch (err: any) { toast.error(err.response?.data?.message || err.response?.data?.error || "Erreur d'exécution."); }
    finally { setActionLoading(false); }
  };

  // --- Export Excel ---
  const executeExport = async () => {
    try {
      const toastId = toast.loading("Génération de l'Excel...");
      const params: any = {};
      if (selectedIds.length > 0) {
        params.selected_ids = selectedIds; 
      } else {
        Object.entries(filters).forEach(([k, v]) => { if (v && v !== "all") params[k] = v; });
      }

      const res = await api.get("/reforms/export", { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a'); link.href = url; 
      link.setAttribute('download', `Rapport_Reformes_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      
      toast.success("Exportation réussie !", { id: toastId });
      setSelectedIds([]);
    } catch (error) { toast.error("Erreur d'exportation."); }
  };

  // --- Helper to open Modals in Single Mode ---
  const openApproveModalSingle = (id: number) => { setActionMode("single"); setSingleTargetId(id); setIsApproveModalOpen(true); };
  const openExecuteModalSingle = (id: number) => { setActionMode("single"); setSingleTargetId(id); setIsExecuteModalOpen(true); };
  
  // --- Helper to open Modals in Bulk Mode ---
  const openApproveModalBulk = () => { setActionMode("bulk"); setIsApproveModalOpen(true); };
  const openExecuteModalBulk = () => { setActionMode("bulk"); setIsExecuteModalOpen(true); };

  const allPageSelected = data.length > 0 && data.every(d => selectedIds.includes(d.id));

  return (
    <PermissionGuard permission={PERMISSIONS.VIEW}>
      <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 lg:p-8 space-y-6">
        
        {/* 🔹 HEADER 🔹 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArchiveX size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Réformes</h1>
              <p className="text-sm text-slate-500 mt-1">Total : <strong className="text-rose-600">{total} Demandes</strong></p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className={`bg-white border-slate-200 ${showFilters ? 'text-rose-600 border-rose-200 bg-rose-50' : 'text-slate-700'}`}>
              <Filter className="w-4 h-4 mr-2" /> Filtres
            </Button>

            <Can permission={PERMISSIONS.VIEW}>
              <Button variant="outline" onClick={executeExport} className="text-emerald-600 border-slate-200 hover:bg-emerald-50">
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Exporter
              </Button>
            </Can>

            <Can permission={PERMISSIONS.PROPOSE}>
              <DropdownMenu>
                <DropdownMenuTrigger >
                  <Button className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm">
                    Proposer Réforme <ChevronRight className="w-4 h-4 ml-2 rotate-90"/>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {/* <DropdownMenuLabel className="text-xs text-slate-500">MÉTHODE D'AJOUT</DropdownMenuLabel> */}
                  <DropdownMenuItem onClick={() => setIsProposeModalOpen(true)} className="cursor-pointer font-medium"><FileText className="w-4 h-4 mr-2 text-rose-600" /> Saisie Individuelle (1 Article)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsBulkModalOpen(true)} className="cursor-pointer font-medium"><UploadCloud className="w-4 h-4 mr-2 text-blue-600" /> Saisie Multiple (Bulk / Excel)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Can>
          </div>
        </div>

        {/* 🔹 BULK ACTIONS TOOLBAR (Sélection Persistante) 🔹 */}
        {selectedIds.length > 0 && (
          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-top-4 sticky top-4 z-50">
            <div className="flex items-center gap-3 px-2">
              <span className="bg-rose-500 text-white px-3 py-1 rounded-full text-sm font-bold">{selectedIds.length}</span>
              <span className="text-sm font-medium">Demandes sélectionnées</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              <Button size="sm" variant="secondary" onClick={executeExport} className="bg-white/10 text-white hover:bg-white/20 border-0"><FileSpreadsheet className="w-4 h-4 mr-2"/> Excel</Button>
              <Can permission={PERMISSIONS.APPROVE}>
                <div className="w-px h-6 bg-white/20 mx-1"></div>
                <Button size="sm" onClick={openApproveModalBulk} className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"><Gavel className="w-4 h-4 mr-2"/> Décider</Button>
              </Can>
              <Can permission={PERMISSIONS.EXECUTE}>
                <Button size="sm" onClick={openExecuteModalBulk} className="bg-rose-600 hover:bg-rose-700 text-white border-0"><Play className="w-4 h-4 mr-2"/> Exécuter</Button>
              </Can>
              <div className="w-px h-6 bg-white/20 mx-1"></div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])} className="text-slate-300 hover:text-white"><X className="w-4 h-4"/></Button>
            </div>
          </div>
        )}

        {/* 🔹 FILTERS PANEL 🔹 */}
        {showFilters && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Search className="w-4 h-4 text-rose-500"/> Recherche Avancée</h3>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500 hover:text-red-600 h-8"><X className="w-4 h-4 mr-1"/> Réinitialiser</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <div className="space-y-1.5 lg:col-span-5 bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-wrap items-center gap-4">
                <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Méthode de recherche texte :</label>
                <div className="w-64">
                  <Select value={filters.match_type} onValueChange={(val) => handleFilterChange("match_type", val)}>
                    <SelectTrigger className="bg-white h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">Contient (Floue)</SelectItem>
                      <SelectItem value="exact">Exactement</SelectItem>
                      <SelectItem value="starts_with">Commence par</SelectItem>
                      <SelectItem value="ends_with">Se termine par</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-xs text-slate-400 italic">Multiples valeurs ? Séparez par virgule (ex: QR-1, QR-2)</span>
              </div>

              {/* Text Filters */}
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Nom d'article</label><Input value={filters.nom_article} onChange={e => handleFilterChange('nom_article', e.target.value)} className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">QR Code / Série</label><Input value={filters.qr_code_reference} onChange={e => handleFilterChange('qr_code_reference', e.target.value)} className="h-9 text-sm font-mono" /></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Marque</label><Input value={filters.marque} onChange={e => handleFilterChange('marque', e.target.value)} className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">N° Facture</label><Input value={filters.numero_facture} onChange={e => handleFilterChange('numero_facture', e.target.value)} className="h-9 text-sm" /></div>

              {/* Status Filters */}
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Statut de la demande</label>
                <Select value={filters.status} onValueChange={v => handleFilterChange('status', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Tous" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="propose">Proposé</SelectItem><SelectItem value="approuve">Approuvé</SelectItem><SelectItem value="rejete">Rejeté</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">État d'Exécution</label>
                <Select value={filters.is_executed} onValueChange={v => handleFilterChange('is_executed', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Tous" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="true">Exécuté (Sorti)</SelectItem><SelectItem value="false">En attente (Non Exécuté)</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Méthode d'exécution</label>
                <Select value={filters.methode} onValueChange={v => handleFilterChange('methode', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Toutes" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Toutes</SelectItem><SelectItem value="vente">Vente</SelectItem><SelectItem value="cession">Cession</SelectItem><SelectItem value="destruction">Destruction</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* 🔹 TABLE 🔹 */}
        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto min-h-[400px]">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-100 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-12 pl-4"><Checkbox checked={allPageSelected} onCheckedChange={handleSelectAll} className="data-[state=checked]:bg-rose-600" /></TableHead>
                  <TableHead className="font-semibold text-slate-600">Article & Localisation</TableHead>
                  <TableHead className="font-semibold text-slate-600 w-1/4">Motif de Réforme</TableHead>
                  <TableHead className="font-semibold text-slate-600">Acteurs</TableHead>
                  <TableHead className="font-semibold text-slate-600">Statut</TableHead>
                  <TableHead className="font-semibold text-slate-600">Exécution</TableHead>
                  <TableHead className="text-right font-semibold text-slate-600 pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="h-64 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-rose-500" /></TableCell></TableRow>
                ) : data.length > 0 ? (
                  data.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <TableRow key={item.id} className={`group ${isSelected ? "bg-rose-50/40" : "hover:bg-slate-50/50"}`}>
                        <TableCell className="pl-4"><Checkbox checked={isSelected} onCheckedChange={() => handleSelectItem(item.id)} className="data-[state=checked]:bg-rose-600" /></TableCell>
                        <TableCell>
                          <div className="font-bold text-slate-900 text-sm">{item.articleItem?.article?.nom || 'Inconnu'}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5"><QrCode className="w-3 h-3 inline mr-1"/>{item.articleItem?.qr_code_reference}</div>
                          {item.articleItem?.emplacement?.parc?.nom && <div className="text-[10px] text-indigo-600 font-medium mt-1">{item.articleItem.emplacement.parc.nom}</div>}
                        </TableCell>
                        <TableCell><p className="text-xs text-slate-600 line-clamp-2" title={item.motif}>{item.motif}</p><div className="text-[9px] text-slate-400 mt-1">Le: {new Date(item.created_at).toLocaleDateString()}</div></TableCell>
                        <TableCell>
                          <div className="text-[11px] text-slate-600">Par: <span className="font-semibold">{item.proposer?.name || 'Inconnu'}</span></div>
                          {item.approver && <div className="text-[10px] text-emerald-600 mt-1">Validé: {item.approver.name}</div>}
                        </TableCell>
                        <TableCell><StatusBadge status={item.status} isExecuted={item.is_executed} /></TableCell>
                        <TableCell>
                          {item.is_executed ? (
                            <><MethodBadge methode={item.methode} /><div className="text-[10px] text-slate-500 mt-1">PV: {item.numero_pv}</div></>
                          ) : <span className="text-xs text-slate-400">—</span>}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {!item.is_executed && (
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Can permission={PERMISSIONS.APPROVE}>
                                {item.status === 'propose' && <Button size="sm" variant="outline" onClick={() => openApproveModalSingle(item.id)} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-8 px-2"><Gavel className="w-4 h-4" /></Button>}
                              </Can>
                              <Can permission={PERMISSIONS.EXECUTE}>
                                {item.status === 'approuve' && <Button size="sm" onClick={() => openExecuteModalSingle(item.id)} className="bg-slate-900 hover:bg-slate-800 text-white h-8 px-2"><Play className="w-4 h-4" /></Button>}
                              </Can>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (<TableRow><TableCell colSpan={7} className="h-48 text-center text-slate-500">Aucune demande trouvée.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Afficher</span>
              <Select value={perPage} onValueChange={(val) => { setPerPage(val); setPage(1); }}>
                <SelectTrigger className="w-[80px] h-8 bg-white"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="15">15</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem><SelectItem value="all">Tout</SelectItem></SelectContent>
              </Select>
              <span>par page</span>
            </div>
            
            {perPage !== "all" && total > 0 && (
              <div className="flex items-center gap-4">
                <p className="text-sm text-slate-500">Page <strong className="text-slate-900">{page}</strong> sur <strong className="text-slate-900">{lastPage}</strong></p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="bg-white"><ChevronLeft className="w-4 h-4"/></Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page === lastPage || loading} className="bg-white"><ChevronRight className="w-4 h-4"/></Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================== */}
        {/* 🔹 MODALS 🔹 */}
        {/* ========================================== */}

        {/* 1. Modal: Propose (Individuel) */}
        <Dialog open={isProposeModalOpen} onOpenChange={setIsProposeModalOpen}>
          {/* ... (نفس Modal Individual السابق) ... */}
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white rounded-2xl">
            <DialogHeader className="px-6 py-5 border-b bg-rose-50/50">
              <DialogTitle className="text-xl font-bold text-rose-700">Demande de Réforme</DialogTitle>
              <DialogDescription className="text-sm text-slate-600">Proposez un article pour déclassement.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePropose} className="px-6 py-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Rechercher l'article (QR Code ou Nom) *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input value={searchEligible} onChange={e => setSearchEligible(e.target.value)} placeholder="Ex: Bureau, 112233..." className="pl-9" />
                </div>
                {eligibleItems.length > 0 && !selectedEligibleItem && (
                  <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto bg-white shadow-sm">
                    {eligibleItems.map(item => (
                      <div key={item.id} onClick={() => { setSelectedEligibleItem(item); setProposeForm({...proposeForm, article_item_id: item.id.toString()}); setEligibleItems([]); }} className="p-2 border-b last:border-0 hover:bg-rose-50 cursor-pointer text-sm">
                        <div className="font-semibold text-slate-800">{item.article_nom}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{item.reference}</div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedEligibleItem && (
                  <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex justify-between items-center">
                    <div>
                      <div className="text-sm font-bold text-emerald-800">{selectedEligibleItem.article_nom}</div>
                      <div className="text-[11px] text-emerald-600 font-mono">{selectedEligibleItem.reference}</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedEligibleItem(null); setProposeForm({...proposeForm, article_item_id: ""}); }} className="h-6 w-6 text-emerald-600 hover:text-red-600"><X className="w-4 h-4"/></Button>
                  </div>
                )}
              </div>
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-slate-700">Motif de la demande *</label>
                <Textarea required rows={4} value={proposeForm.motif} onChange={e => setProposeForm({...proposeForm, motif: e.target.value})} placeholder="Pourquoi cet article doit-il être réformé ?" />
              </div>
              <DialogFooter className="pt-4 mt-6 border-t px-0">
                <Button type="button" variant="outline" onClick={() => setIsProposeModalOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={actionLoading || !proposeForm.article_item_id} className="bg-rose-600 hover:bg-rose-700 text-white min-w-[120px]">{actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Soumettre"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 2. Modal: Propose Bulk (Tabs: Texte & Excel) */}
        <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
          <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-white rounded-2xl">
            <DialogHeader className="px-6 py-5 border-b bg-blue-50/50">
              <div className="flex items-center gap-3"><div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><UploadCloud className="w-5 h-5" /></div><div><DialogTitle className="text-xl font-bold text-blue-800">Demande Multiple (Bulk)</DialogTitle><DialogDescription className="text-sm text-slate-600 mt-1">Soumettez des centaines d'articles en une fois.</DialogDescription></div></div>
            </DialogHeader>
            <form onSubmit={handleBulkPropose} className="px-6 py-5 space-y-4">
              <Tabs value={bulkTab} onValueChange={setBulkTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="texte">Coller Texte</TabsTrigger>
                  <TabsTrigger value="excel">Importer Excel</TabsTrigger>
                </TabsList>
                <TabsContent value="texte" className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">Références / QR Codes (1 par ligne) *</label>
                  <Textarea rows={6} value={bulkForm.references} onChange={e => setBulkForm({...bulkForm, references: e.target.value})} placeholder="QR-12345&#10;QR-67890" className="font-mono text-sm leading-relaxed bg-slate-50" />
                  <p className="text-[10px] text-slate-500 text-right">{bulkForm.references.split('\n').filter(r => r.trim()).length} ligne(s) détectée(s)</p>
                </TabsContent>
                <TabsContent value="excel" className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">Fichier Excel (La colonne A doit contenir les QR Codes) *</label>
                  <div className="border-2 border-dashed border-blue-200 rounded-xl p-8 text-center hover:border-blue-500 bg-blue-50/30">
                    <input type="file" accept=".xlsx, .xls, .csv" onChange={e => setBulkExcelFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer" />
                  </div>
                </TabsContent>
              </Tabs>
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-slate-700">Motif commun *</label>
                <Textarea required rows={3} value={bulkForm.motif} onChange={e => setBulkForm({...bulkForm, motif: e.target.value})} placeholder="Motif justifiant la réforme de ce lot..." />
              </div>
              <DialogFooter className="pt-4 mt-6 border-t px-0">
                <Button type="button" variant="outline" onClick={() => setIsBulkModalOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={actionLoading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">{actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Soumettre le lot"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 3. Modal: Approve/Reject Commission (Single & Bulk) */}
        <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
          <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white rounded-2xl">
            <DialogHeader className="px-6 py-5 border-b bg-emerald-50/50">
              <DialogTitle className="text-xl font-bold text-emerald-800">Décision de la Commission</DialogTitle>
              <DialogDescription className="text-sm text-slate-600 font-semibold mt-1">
                {actionMode === "bulk" ? `Action groupée sur ${selectedIds.length} demande(s).` : "Prise de décision individuelle."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleApprove} className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Décision *</label>
                <Select value={approveForm.status} onValueChange={v => setApproveForm({...approveForm, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approuve"><span className="text-emerald-600 font-bold">✔️ Approuver (Avis favorable)</span></SelectItem>
                    <SelectItem value="rejete"><span className="text-red-600 font-bold">❌ Rejeter la demande</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-slate-700">Remarques de la commission</label>
                <Textarea rows={3} value={approveForm.remarques_commission} onChange={e => setApproveForm({...approveForm, remarques_commission: e.target.value})} placeholder="Conditions, observations..." />
              </div>
              <DialogFooter className="pt-4 mt-6 border-t px-0">
                <Button type="button" variant="outline" onClick={() => setIsApproveModalOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]">{actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Valider Décision"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 4. Modal: Exécution Finale (Single & Bulk) */}
        <Dialog open={isExecuteModalOpen} onOpenChange={setIsExecuteModalOpen}>
          <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white rounded-2xl">
            <DialogHeader className="px-6 py-5 border-b bg-slate-900">
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2"><Trash2 className="w-5 h-5"/> Exécution de la Réforme</DialogTitle>
              <DialogDescription className="text-sm text-slate-300 mt-1">
                {actionMode === "bulk" ? `⚠️ Sortie de ${selectedIds.length} article(s) du système.` : "L'article sera retiré définitivement du système."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleExecute} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Méthode d'exécution *</label>
                  <Select value={executeForm.methode} onValueChange={v => setExecuteForm({...executeForm, methode: v, beneficiaire: "", montant: ""})}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vente">💰 Vente aux enchères</SelectItem>
                      <SelectItem value="cession">🤝 Cession / Don</SelectItem>
                      <SelectItem value="destruction">🔥 Destruction / Rebut</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">N° du PV *</label>
                  <Input required value={executeForm.numero_pv} onChange={e => setExecuteForm({...executeForm, numero_pv: e.target.value})} placeholder="PV-..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Date Exécution *</label>
                  <Input type="date" required value={executeForm.date_execution} onChange={e => setExecuteForm({...executeForm, date_execution: e.target.value})} />
                </div>

                {(executeForm.methode === 'vente' || executeForm.methode === 'cession') && (
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-semibold text-slate-700">Bénéficiaire / Acheteur *</label>
                    <Input required value={executeForm.beneficiaire} onChange={e => setExecuteForm({...executeForm, beneficiaire: e.target.value})} placeholder="Nom de l'entité ou personne..." />
                  </div>
                )}

                {executeForm.methode === 'vente' && (
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-semibold text-slate-700">Montant (DZD) *</label>
                    <Input required type="number" step="0.01" value={executeForm.montant} onChange={e => setExecuteForm({...executeForm, montant: e.target.value})} placeholder="0.00" />
                  </div>
                )}
              </div>

              <DialogFooter className="pt-4 mt-6 border-t px-0">
                <Button type="button" variant="outline" onClick={() => setIsExecuteModalOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={actionLoading || !executeForm.methode} className="bg-slate-900 hover:bg-slate-800 text-white min-w-[120px]">{actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Exécuter & Clôturer"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </PermissionGuard>
  );
}