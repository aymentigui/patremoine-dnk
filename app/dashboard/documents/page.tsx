"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import toast from "react-hot-toast";

// Auth Components (اللي فكرتني فيهم)
import { Can } from "@/components/auth/Can";
import { PermissionGuard } from "@/components/auth/PermissionGuard";

// UI Components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

// Icons
import { Loader2, Search, Upload, FileSpreadsheet, SlidersHorizontal, X, ChevronLeft, ChevronRight, FileText, Plus, Trash2, Download, Eye, UploadCloud, Files, CalendarClock, Building2, Archive } from "lucide-react";

// ==========================================
// 🔐 PERMISSIONS CONSTANTS
// ==========================================
const PERMISSIONS = {
  VIEW: "voir_documents_vehicules",
  ADD: "ajouter_document_vehicule",
  IMPORT: "importer_documents_vehicules",
  EXPORT: "exporter_documents_vehicules",
  DELETE: "supprimer_document_vehicule",
};

// ==========================================
// 🎨 UTILS
// ==========================================
const formatMoney = (amount: number) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount);

const StatusDocBadge = ({ status }: { status: string }) => {
  if (status === 'valide') return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold border border-emerald-200">✅ Valide</span>;
  if (status === 'archive') return <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold border border-slate-200">🗄️ Archivé</span>;
  if (status === 'expiree') return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold border border-red-200">❌ Expiré</span>;
  return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">{status}</span>;
};

const DOC_TYPES = [
  { id: "assurance", label: "Assurance" },
  { id: "controle_technique", label: "Contrôle Technique" },
  { id: "carte_grise", label: "Carte Grise" },
  { id: "vignette", label: "Vignette" },
  { id: "autorisation_circulation", label: "Autorisation Circulation" }
];

export default function VehicleDocumentsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Aux Data
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [parcs, setParcs] = useState<any[]>([]);
  const [searchVehicle, setSearchVehicle] = useState("");

  // Pagination & Selection
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Forms
  const [addForm, setAddForm] = useState({
    vehicle_id: "", type_document: "", reference: "", date_delivrance: "", date_expiration: "", cout: "", remarques: ""
  });
  const [addFile, setAddFile] = useState<File | null>(null);
  
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    match_type: "contains",
    immatriculation: "", numero_chassis: "", annee: "", 
    marque: "", modele: "", qr_code_reference: "", date_facture: "", parc_id: "all",
    type_document: "all", status: "valide", reference: "", 
    expiration_start: "", expiration_end: ""
  });

  // --- Initial Loads ---
  useEffect(() => {
    api.get("/vehicles?per_page=1000").then(res => setVehicles(res.data.data || []));
    api.get("/organigramme/tree").then(res => setParcs(res.data.data || []));
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, per_page: 15 };
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") params[key] = value;
      });
      const res = await api.get("/vehicles/documents", { params });
      setData(res.data.data || []);
      if (res.data.last_page) {
        setLastPage(res.data.last_page);
        setTotal(res.data.total);
      }
    } catch (error) { toast.error("Erreur de chargement."); } 
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => {
    const delay = setTimeout(() => { fetchDocuments(); }, 600);
    return () => clearTimeout(delay);
  }, [fetchDocuments]);

  // --- Handlers ---
  const handleFilterChange = (key: string, value: any) => { setFilters(prev => ({ ...prev, [key]: value })); setPage(1); };
  const clearFilters = () => { 
    setFilters({ 
      match_type: "contains", immatriculation: "", numero_chassis: "", annee: "", marque: "", modele: "", 
      qr_code_reference: "", date_facture: "", parc_id: "all", type_document: "all", status: "all", 
      reference: "", expiration_start: "", expiration_end: "" 
    }); 
    setPage(1); 
  };

  const handleSelectAll = (checked: boolean) => setSelectedIds(checked ? data.map(item => item.id) : []);
  const handleSelectItem = (id: number, checked: boolean) => setSelectedIds(prev => checked ? [...prev, id] : prev.filter(item => item !== id));

  // --- API Actions ---
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.vehicle_id || !addForm.type_document || !addForm.date_expiration) return toast.error("Veuillez remplir les champs obligatoires.");
    
    const formData = new FormData();
    Object.entries(addForm).forEach(([k, v]) => formData.append(k, v));
    if (addFile) formData.append("fichier", addFile);

    try {
      setActionLoading(true);
      await api.post("/vehicles/documents", formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Document ajouté avec succès !");
      setIsAddModalOpen(false); setAddForm({ vehicle_id: "", type_document: "", reference: "", date_delivrance: "", date_expiration: "", cout: "", remarques: "" }); setAddFile(null);
      fetchDocuments();
    } catch (err: any) { toast.error(err.response?.data?.error || "Erreur d'ajout."); }
    finally { setActionLoading(false); }
  };

  const handleBulkImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkFiles.length === 0) return toast.error("Veuillez sélectionner des fichiers.");
    
    const formData = new FormData();
    bulkFiles.forEach(file => formData.append("fichiers[]", file));

    try {
      setActionLoading(true);
      const res = await api.post("/vehicles/documents/bulk-import", formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(res.data.message || "Importation terminée.");
      if (res.data.details?.erreurs?.length > 0) {
        res.data.details.erreurs.forEach((err: string) => toast.error(err, { duration: 6000 }));
      }
      setIsBulkImportModalOpen(false); setBulkFiles([]); fetchDocuments();
    } catch (err: any) { toast.error("Erreur lors de l'importation."); }
    finally { setActionLoading(false); }
  };

  const handleExcelImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excelFile) return toast.error("Fichier Excel requis.");
    const formData = new FormData(); formData.append("fichier_excel", excelFile);
    try {
      setActionLoading(true);
      await api.post("/vehicles/documents/import-excel-data", formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Données Excel importées !");
      setIsExcelImportModalOpen(false); setExcelFile(null); fetchDocuments();
    } catch (err: any) { toast.error("Erreur d'importation Excel."); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer ce document ?")) return;
    try {
      await api.delete(`/vehicles/documents/${id}`);
      toast.success("Document supprimé."); 
      setSelectedIds(prev => prev.filter(i => i !== id));
      fetchDocuments();
    } catch (err) { toast.error("Erreur de suppression."); }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Voulez-vous vraiment supprimer ${selectedIds.length} document(s) ?`)) return;
    try {
      await Promise.all(selectedIds.map(id => api.delete(`/vehicles/documents/${id}`)));
      toast.success("Documents supprimés.");
      setSelectedIds([]); fetchDocuments();
    } catch (err) { toast.error("Erreur de suppression."); }
  };

  // --- Exports ---
  const executeExport = async (type: 'excel' | 'zip') => {
    try {
      const toastId = toast.loading(`Génération du ${type.toUpperCase()}...`);
      const params: any = {};
      
      if (selectedIds.length > 0) {
        params.selected_ids = selectedIds; 
      } else {
        Object.entries(filters).forEach(([k, v]) => { if (v && v !== "all") params[k] = v; });
      }

      const endpoint = type === 'excel' ? "/vehicles/documents/export" : "/vehicles/documents/export-zip";
      const res = await api.get(endpoint, { params, responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a'); link.href = url; 
      link.setAttribute('download', `Documents_Vehicules_${new Date().getTime()}.${type}`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      
      toast.success("Exportation réussie !", { id: toastId });
      setSelectedIds([]);
    } catch (error: any) { 
      if (error.response?.data instanceof Blob) {
        const text = await error.response.data.text();
        try { const errObj = JSON.parse(text); toast.error(errObj.error || "Erreur d'exportation."); return; } catch (e) {}
      }
      toast.error("Erreur d'exportation."); 
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get("/vehicles/documents/import-template", { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a'); link.href = url; link.setAttribute('download', 'template_documents.xlsx');
      document.body.appendChild(link); link.click();
    } catch (error) { toast.error("Erreur téléchargement."); }
  };

  return (
    <PermissionGuard permission={PERMISSIONS.VIEW}>
      <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 lg:p-8 space-y-6">
        
        {/* 🔹 HEADER 🔹 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Documents Véhicules</h1>
              <p className="text-sm text-slate-500 mt-1">Total : <strong className="text-indigo-600">{total} Documents</strong></p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className={`bg-white border-slate-200 ${showFilters ? 'text-indigo-600 border-indigo-200 bg-indigo-50' : 'text-slate-700'}`}>
              <SlidersHorizontal className="w-4 h-4 mr-2" /> Filtres
            </Button>

            <Can permission={PERMISSIONS.EXPORT}>
              <DropdownMenu>
                <DropdownMenuTrigger >
                  <Button variant="outline" className="text-emerald-600 border-slate-200 hover:bg-emerald-50">
                    <Download className="w-4 h-4 mr-2" /> Exporter <ChevronRight className="w-4 h-4 ml-2 rotate-90"/>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => executeExport('excel')} className="cursor-pointer font-medium"><FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" /> Données (Excel)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => executeExport('zip')} className="cursor-pointer font-medium"><Archive className="w-4 h-4 mr-2 text-indigo-600" /> Fichiers joints (Archive ZIP)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Can>

            <Can permission={PERMISSIONS.IMPORT}>
              <DropdownMenu>
                <DropdownMenuTrigger >
                  <Button variant="outline" className="text-blue-600 border-slate-200 hover:bg-blue-50">Import <ChevronRight className="w-4 h-4 ml-2 rotate-90"/></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsExcelImportModalOpen(true)} className="cursor-pointer"><FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" /> Données Excel</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsBulkImportModalOpen(true)} className="cursor-pointer"><Files className="w-4 h-4 mr-2 text-indigo-600" /> Fichiers joints (PDF/JPG)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Can>

            <Can permission={PERMISSIONS.ADD}>
              <Button onClick={() => setIsAddModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Ajouter
              </Button>
            </Can>
          </div>
        </div>

        {/* 🔹 BULK ACTIONS TOOLBAR 🔹 */}
        {selectedIds.length > 0 && (
          <div className="bg-indigo-700 text-white p-3 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-top-4 sticky top-4 z-50">
            <div className="flex items-center gap-3 px-2">
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">{selectedIds.length}</span>
              <span className="text-sm font-medium">Documents sélectionnés</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              <Can permission={PERMISSIONS.EXPORT}>
                <Button size="sm" variant="secondary" onClick={() => executeExport('excel')} className="bg-white text-indigo-700 hover:bg-indigo-50 border-0"><FileSpreadsheet className="w-4 h-4 mr-2"/> Excel</Button>
                <Button size="sm" variant="secondary" onClick={() => executeExport('zip')} className="bg-white text-indigo-700 hover:bg-indigo-50 border-0"><Archive className="w-4 h-4 mr-2"/> Fichiers ZIP</Button>
              </Can>
              
              <Can permission={PERMISSIONS.DELETE}>
                <div className="w-px h-6 bg-white/30 mx-1"></div>
                <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="border-0"><Trash2 className="w-4 h-4 mr-2"/> Supprimer</Button>
              </Can>
            </div>
          </div>
        )}

        {/* 🔹 FILTERS PANEL 🔹 */}
        {showFilters && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Search className="w-4 h-4 text-indigo-500"/> Recherche Avancée</h3>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500 hover:text-red-600 h-8"><X className="w-4 h-4 mr-1"/> Réinitialiser</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <div className="space-y-1.5 lg:col-span-5 bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center gap-4">
                <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Méthode de recherche :</label>
                <div className="w-64">
                  <Select value={filters.match_type} onValueChange={(val) => handleFilterChange("match_type", val)}>
                    <SelectTrigger className="bg-white h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">Contient (Recherche floue)</SelectItem>
                      <SelectItem value="exact">Exactement (Mot précis)</SelectItem>
                      <SelectItem value="starts_with">Commence par</SelectItem>
                      <SelectItem value="ends_with">Se termine par</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-xs text-slate-400 italic">Astuce: Vous pouvez séparer plusieurs valeurs par une virgule (ex: 11223, 44556)</span>
              </div>

              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Matricule</label><Input value={filters.immatriculation} onChange={e => handleFilterChange('immatriculation', e.target.value)} className="h-9 text-sm" placeholder="Ex: 112233..." /></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">N° Châssis</label><Input value={filters.numero_chassis} onChange={e => handleFilterChange('numero_chassis', e.target.value)} className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Marque</label><Input value={filters.marque} onChange={e => handleFilterChange('marque', e.target.value)} className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Modèle</label><Input value={filters.modele} onChange={e => handleFilterChange('modele', e.target.value)} className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Année</label><Input type="number" value={filters.annee} onChange={e => handleFilterChange('annee', e.target.value)} className="h-9 text-sm" /></div>

              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Type Document</label>
                <Select value={filters.type_document} onValueChange={v => handleFilterChange('type_document', v)}><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Tous les types</SelectItem>{DOC_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Référence (Police)</label><Input value={filters.reference} onChange={e => handleFilterChange('reference', e.target.value)} className="h-9 text-sm" /></div>
              
              {/* <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Statut</label>
                <Select value={filters.status} onValueChange={v => handleFilterChange('status', v)}><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="valide">✅ Valide</SelectItem><SelectItem value="archive">🗄️ Archivé</SelectItem><SelectItem value="expiree">❌ Expiré</SelectItem></SelectContent></Select>
              </div> */}

              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Parc (Structure)</label>
                <Select value={filters.parc_id} onValueChange={v => handleFilterChange('parc_id', v)}><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem>{parcs.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.nom}</SelectItem>)}</SelectContent></Select>
              </div>

              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">QR Code (Article)</label><Input value={filters.qr_code_reference} onChange={e => handleFilterChange('qr_code_reference', e.target.value)} className="h-9 text-sm font-mono" /></div>

              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Date Achat (Article)</label><Input type="date" value={filters.date_facture} onChange={e => handleFilterChange('date_facture', e.target.value)} className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Expiration Doc (De)</label><Input type="date" value={filters.expiration_start} onChange={e => handleFilterChange('expiration_start', e.target.value)} className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Expiration Doc (À)</label><Input type="date" value={filters.expiration_end} onChange={e => handleFilterChange('expiration_end', e.target.value)} className="h-9 text-sm" /></div>
            </div>
          </div>
        )}

        {/* 🔹 TABLE 🔹 */}
        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm relative">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 pl-4"><Checkbox checked={data.length > 0 && selectedIds.length === data.length} onCheckedChange={handleSelectAll} className="data-[state=checked]:bg-indigo-600" /></TableHead>
                  <TableHead className="font-semibold text-slate-600">Véhicule & Parc</TableHead>
                  <TableHead className="font-semibold text-slate-600">Type Document</TableHead>
                  <TableHead className="font-semibold text-slate-600">Dates</TableHead>
                  <TableHead className="font-semibold text-slate-600">Coût (DZD)</TableHead>
                  <TableHead className="text-center font-semibold text-slate-600">Statut</TableHead>
                  <TableHead className="text-center font-semibold text-slate-600">Fichier</TableHead>
                  <TableHead className="text-right font-semibold text-slate-600 pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="h-64 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-500" /></TableCell></TableRow>
                ) : data.length > 0 ? (
                  data.map((item) => {
                    const veh = item.vehicle || {};
                    const parc = veh.articleItem?.emplacement?.parc?.nom || "Inconnu";
                    const fileUrl = item.media && item.media.length > 0 ? item.media[0].original_url : null;
                    const isSelected = selectedIds.includes(item.id);
                    
                    return (
                      <TableRow key={item.id} className={`group ${isSelected ? "bg-indigo-50/50" : "hover:bg-slate-50/50"}`}>
                        <TableCell className="pl-4"><Checkbox checked={isSelected} onCheckedChange={(c) => handleSelectItem(item.id, c as boolean)} className="data-[state=checked]:bg-indigo-600" /></TableCell>
                        
                        <TableCell>
                          <div className="font-bold text-slate-900 text-sm tracking-wide">{veh.immatriculation}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">CH: {veh.numero_chassis || "—"} | {veh.annee || "—"}</div>
                          <div className="text-[11px] text-indigo-600 flex items-center gap-1 mt-1"><Building2 className="w-3 h-3"/> {parc}</div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="font-medium text-slate-800 capitalize">{item.type_document.replace(/_/g, ' ')}</div>
                          <div className="text-xs text-slate-500 mt-0.5">Réf: {item.reference || "—"}</div>
                        </TableCell>

                        <TableCell>
                          <div className="text-[11px] text-slate-500 mb-0.5">Délivré: {item.date_delivrance ? new Date(item.date_delivrance).toLocaleDateString() : "—"}</div>
                          <div className="text-xs font-semibold flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5 text-orange-500"/> Exp: {item.date_expiration ? new Date(item.date_expiration).toLocaleDateString() : "—"}</div>
                        </TableCell>

                        <TableCell>
                          {item.cout ? <span className="font-semibold text-emerald-600 text-sm">{formatMoney(item.cout)}</span> : <span className="text-slate-400 text-xs">—</span>}
                        </TableCell>

                        <TableCell className="text-center"><StatusDocBadge status={item.status} /></TableCell>

                        <TableCell className="text-center">
                          {fileUrl ? (
                            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex p-2 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors">
                              <Eye className="w-4 h-4" />
                            </a>
                          ) : <span className="text-xs text-slate-300 border border-slate-100 px-2 py-1 rounded">Aucun</span>}
                        </TableCell>

                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Can permission={PERMISSIONS.DELETE}>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                            </Can>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (<TableRow><TableCell colSpan={8} className="h-48 text-center text-slate-500">Aucun document trouvé.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>

          {total > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <p className="text-sm text-slate-500">Page <strong className="text-slate-900">{page}</strong> sur <strong className="text-slate-900">{lastPage}</strong></p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="bg-white"><ChevronLeft className="w-4 h-4 mr-1"/> Préc.</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page === lastPage || loading} className="bg-white">Suiv. <ChevronRight className="w-4 h-4 ml-1"/></Button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* 🔹 MODALS 🔹 */}
        {/* ========================================== */}

        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white rounded-2xl">
            <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
              <DialogTitle className="text-lg font-semibold text-slate-800">Ajouter un document</DialogTitle>
              <DialogDescription className="text-xs mt-1">L'ancien document valide de même type sera archivé automatiquement.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Véhicule *</label>
                <Select value={addForm.vehicle_id} onValueChange={v => setAddForm({...addForm, vehicle_id: v??""})}>
                  <SelectTrigger><SelectValue placeholder="Choisir un véhicule" /></SelectTrigger>
                  <SelectContent>
                    <div className="p-2 sticky top-0 bg-white z-10 border-b border-slate-100">
                      <Input placeholder="Rechercher matricule..." value={searchVehicle} onChange={e => setSearchVehicle(e.target.value)} onKeyDown={e => e.stopPropagation()} className="h-8 text-xs" />
                    </div>
                    {vehicles.filter(v => v.immatriculation.includes(searchVehicle)).slice(0, 50).map(v => (
                      <SelectItem key={v.id} value={v.id.toString()}>{v.immatriculation}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Type *</label>
                  <Select value={addForm.type_document} onValueChange={v => setAddForm({...addForm, type_document: v??""})}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Référence</label><Input value={addForm.reference} onChange={e => setAddForm({...addForm, reference: e.target.value})} /></div>
                <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Délivrance</label><Input type="date" value={addForm.date_delivrance} onChange={e => setAddForm({...addForm, date_delivrance: e.target.value})} /></div>
                <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Expiration *</label><Input required type="date" value={addForm.date_expiration} onChange={e => setAddForm({...addForm, date_expiration: e.target.value})} /></div>
                <div className="space-y-1.5 col-span-2"><label className="text-xs font-semibold text-slate-700">Coût (DZD)</label><Input type="number" value={addForm.cout} onChange={e => setAddForm({...addForm, cout: e.target.value})} /></div>
                <div className="space-y-1.5 col-span-2"><label className="text-xs font-semibold text-slate-700">Fichier (PDF/JPG/DOC)</label><Input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => setAddFile(e.target.files?.[0] || null)} /></div>
              </div>
              <DialogFooter className="pt-4 border-t mt-6 px-0"><Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Annuler</Button><Button type="submit" disabled={actionLoading} className="bg-indigo-600 text-white min-w-[100px]">{actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Sauvegarder"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isBulkImportModalOpen} onOpenChange={setIsBulkImportModalOpen}>
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white shadow-2xl rounded-2xl">
            <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
              <div className="flex items-center gap-3"><div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Files className="w-5 h-5" /></div><div><DialogTitle className="text-xl font-semibold text-slate-800">Importation Intelligente</DialogTitle><DialogDescription className="mt-1 text-sm text-slate-500">Nommez vos fichiers : IMMATRICULATION_TYPE.ext<br/>(Ex: 11223-115-16_assurance.pdf)</DialogDescription></div></div>
            </DialogHeader>
            <form onSubmit={handleBulkImportSubmit} className="px-6 py-6 space-y-4">
              <div className="border-2 border-dashed border-indigo-200 rounded-xl p-8 text-center hover:border-indigo-500 transition-colors bg-indigo-50/30">
                <UploadCloud className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => setBulkFiles(Array.from(e.target.files || []))} className="hidden" id="bulk-files" />
                <label htmlFor="bulk-files" className="cursor-pointer text-sm font-semibold text-indigo-600 hover:text-indigo-800">Cliquez pour sélectionner plusieurs fichiers</label>
                <p className="text-xs text-slate-500 mt-2">{bulkFiles.length > 0 ? `${bulkFiles.length} fichier(s) sélectionné(s)` : "Aucun fichier"}</p>
              </div>
              <DialogFooter className="px-0 pt-4 border-t bg-transparent"><Button type="button" variant="outline" onClick={() => setIsBulkImportModalOpen(false)}>Annuler</Button><Button type="submit" disabled={actionLoading || bulkFiles.length === 0} className="bg-indigo-600 text-white min-w-[120px]">{actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Lancer l'import"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isExcelImportModalOpen} onOpenChange={setIsExcelImportModalOpen}>
          <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white shadow-2xl rounded-2xl">
            <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
              <div className="flex items-center gap-3"><div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><FileSpreadsheet className="w-5 h-5" /></div><div><DialogTitle className="text-xl font-semibold text-slate-800">Importer Données Excel</DialogTitle><DialogDescription className="mt-1 text-sm text-slate-500">Importer l'historique des documents sans fichiers joints.</DialogDescription></div></div>
            </DialogHeader>
            <form onSubmit={handleExcelImportSubmit} className="px-6 py-6 space-y-4">
              <div className="flex justify-end"><Button type="button" variant="link" onClick={handleDownloadTemplate} className="text-emerald-600 h-auto p-0"><Download className="w-4 h-4 mr-1"/> Télécharger le modèle</Button></div>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50/50"><input type="file" accept=".xlsx, .xls, .csv" onChange={(e) => setExcelFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-emerald-50 file:text-emerald-700 cursor-pointer" /></div>
              <DialogFooter className="px-0 pt-4 border-t bg-transparent"><Button type="button" variant="outline" onClick={() => setIsExcelImportModalOpen(false)}>Annuler</Button><Button type="submit" disabled={actionLoading || !excelFile} className="bg-emerald-600 text-white min-w-[120px]">{actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Importer"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </PermissionGuard>
  );
}