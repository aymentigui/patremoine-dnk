"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
// @ts-ignore
import Barcode from "react-barcode";

// UI Components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/useAuthStore";
// Icons
import { Loader2, Search, Download, Upload, FileSpreadsheet, SlidersHorizontal, X, ChevronLeft, ChevronRight, QrCode, Building2, MapPin, Activity, Settings2, ArrowRightLeft, History, Printer, Clock, Bus, ShieldAlert, Plus, Edit, Trash2 } from "lucide-react";

// ==========================================
// 🔐 إدارة الصلاحيات (PERMISSIONS) - مطابقة للباك اند
// ==========================================
const PERMISSIONS = {
  VIEW: "voir_vehicules",
  ADD: "ajouter_vehicules", 
  EDIT: "modifier_vehicules",
  DELETE: "supprimer_vehicules",
  IMPORT: "importer_vehicules",
  EXPORT: "exporter_vehicules",
  CHANGE_STATUS: "modifier_statut_article_items",
  TRANSFER: "ajouter_transfers", // صححناها حسب مسار الباك اند
  HISTORY: "voir_article_items"  // صححناها حسب مسار الباك اند
};

// Format DZD
const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount);
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = { 'en_service': 'bg-emerald-100 text-emerald-700', 'en_panne': 'bg-red-100 text-red-700', 'reforme': 'bg-orange-100 text-orange-700' };
  const labels: any = { 'en_service': 'En Service', 'en_panne': 'En Panne', 'reforme': 'Réformé' };
  return <span className={`px-2.5 py-1 rounded-md text-xs font-bold border border-white/20 ${styles[status] || 'bg-gray-100 text-gray-700'}`}>{labels[status] || status}</span>;
};

export default function VehiclesPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Auxiliary Data
  const [emplacements, setEmplacements] = useState<any[]>([]);
  const [parcs, setParcs] = useState<any[]>([]);
  const [articlesCatalog, setArticlesCatalog] = useState<any[]>([]);

  // 🔹 Search inside Selects States 🔹
  const [searchCatalog, setSearchCatalog] = useState("");
  const [searchEmpForm, setSearchEmpForm] = useState("");
  const [searchEmpTransfer, setSearchEmpTransfer] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Selection & Print
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [labelType, setLabelType] = useState<"qr" | "barcode">("qr");
  const [scanBuffer, setScanBuffer] = useState("");

  // Modals States
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null); 
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // Transfer & Status Modals
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const [newStatus, setNewStatus] = useState("");
  const [remarque, setRemarque] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [transferParcId, setTransferParcId] = useState<string>("all");
  const [newEmplacementId, setNewEmplacementId] = useState<string>("");

  const [itemHistory, setItemHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form State (Add / Edit) 
  const [formData, setFormData] = useState({
    immatriculation: "", numero_chassis: "", marque: "", modele: "", annee: "", 
    date_assurance: "", assurance_end_date: "", 
    numero_facture: "", valeur_unitaire: "", 
    emplacement_id: "", article_id: "" 
  });

  // 🔹 ADVANCED FILTERS STATE 🔹
  const [filters, setFilters] = useState({
    match_type: "contains", immatriculation: "", numero_chassis: "", qr_code_reference: "",
    marque: "", modele: "", status: [] as string[], parc_id: [] as string[], emplacement_id: [] as string[]
  });

  // --- Initial Loads ---
  useEffect(() => {
    api.get("/emplacements?per_page=500").then(res => setEmplacements(res.data.data?.data || res.data.data || []));
    api.get("/organigramme/tree").then(res => setParcs(res.data.data || [])).catch(() => {});
    api.get("/articles?per_page=500").then(res => setArticlesCatalog(res.data.data || [])).catch(() => {});
  }, []);

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, per_page: 15 };
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) { if (value.length > 0) params[key] = value.join(','); } 
        else if (value && value !== "all") { params[key] = value; }
      });
      const res = await api.get("/vehicles", { params });
      setData(res.data.data || []);
      if (res.data.meta) {
        setLastPage(res.data.meta.last_page);
        setTotal(res.data.meta.total);
      }
    } catch (error) { toast.error("Erreur lors du chargement des véhicules."); } 
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => {
    const delay = setTimeout(() => { fetchVehicles(); }, 600);
    return () => clearTimeout(delay);
  }, [fetchVehicles]);

  // --- Handlers ---
  const handleFilterChange = (key: string, value: any) => { setFilters(prev => ({ ...prev, [key]: value })); setPage(1); };
  const toggleMultiSelect = (key: 'status' | 'parc_id' | 'emplacement_id', value: string) => {
    setFilters(prev => {
      const currentList = prev[key];
      const newList = currentList.includes(value) ? currentList.filter(item => item !== value) : [...currentList, value];
      return { ...prev, [key]: newList };
    });
    setPage(1);
  };
  const clearFilters = () => {
    setFilters({ match_type: "contains", immatriculation: "", numero_chassis: "", qr_code_reference: "", marque: "", modele: "", status: [], parc_id: [], emplacement_id: [] });
    setPage(1);
  };

  const handleSelectAll = (checked: boolean) => setSelectedIds(checked ? data.map(item => item.id) : []);
  const handleSelectItem = (id: number, checked: boolean) => setSelectedIds(prev => checked ? [...prev, id] : prev.filter(item => item !== id));

  const handleScanInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (scanBuffer.trim() !== "") {
        const currentQR = filters.qr_code_reference;
        const newValue = currentQR ? `${currentQR},${scanBuffer.trim()}` : scanBuffer.trim();
        handleFilterChange("qr_code_reference", newValue);
        setScanBuffer(""); 
      }
    }
  };

  // --- MODALS OPENERS ---
  const openFormModal = (vehicle: any = null) => {
    setSelectedVehicle(vehicle);
    setSearchCatalog(""); setSearchEmpForm("");
    if (vehicle) {
      setFormData({
        immatriculation: vehicle.immatriculation || "",
        numero_chassis: vehicle.numero_chassis || "",
        marque: vehicle.marque || "",
        modele: vehicle.modele || "",
        annee: vehicle.annee?.toString() || "",
        date_assurance: vehicle.date_assurance ? vehicle.date_assurance.split('T')[0] : "",
        assurance_end_date: vehicle.assurance_end_date ? vehicle.assurance_end_date.split('T')[0] : "",
        numero_facture: vehicle.article_item?.numero_facture || "",
        valeur_unitaire: vehicle.article_item?.valeur_unitaire?.toString() || "",
        emplacement_id: vehicle.article_item?.emplacement_id?.toString() || "", 
        article_id: vehicle.article_id?.toString() || vehicle.article_item?.article_id?.toString() || "" 
      });
    } else {
      setFormData({ immatriculation: "", numero_chassis: "", marque: "", modele: "", annee: "", date_assurance: "", assurance_end_date: "", numero_facture: "", valeur_unitaire: "", emplacement_id: "", article_id: "" });
    }
    setIsFormModalOpen(true);
  };

  const openActionModal = (type: 'status' | 'transfer' | 'history', vehicle: any = null) => {
    setSelectedVehicle(vehicle);
    setRemarque("");
    if (type === 'status') { setNewStatus(vehicle?.article_item?.status || ""); setIsStatusModalOpen(true); }
    if (type === 'transfer') { 
      setTransferParcId("all"); setNewEmplacementId(""); setSearchEmpTransfer(""); 
      setIsTransferModalOpen(true); 
    }
    if (type === 'history') { setIsHistoryModalOpen(true); if (vehicle) fetchItemHistory(vehicle.article_item?.id); }
  };

  // --- CRUD VEHICLE ---
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.article_id) return toast.error("Veuillez choisir le catalogue (Type).");
    try {
      setActionLoading(true);
      if (selectedVehicle) {
        await api.put(`/vehicles/${selectedVehicle.id}`, formData);
        toast.success("Véhicule mis à jour !");
      } else {
        if (!formData.emplacement_id) return toast.error("Veuillez choisir l'emplacement initial.");
        await api.post(`/vehicles`, formData);
        toast.success("Véhicule ajouté et QR Code généré !");
      }
      setIsFormModalOpen(false); fetchVehicles();
    } catch (error: any) { toast.error(error.response?.data?.message || "Erreur de sauvegarde."); } 
    finally { setActionLoading(false); }
  };

  const handleDelete = async (vehicleId: number = 0) => {
    const targetIds = vehicleId ? [vehicleId] : selectedIds;
    if (targetIds.length === 0) return;
    
    if (!confirm(`Voulez-vous vraiment supprimer ${targetIds.length} véhicule(s) ? Cette action est irréversible.`)) return;
    
    try {
      setActionLoading(true);
      await Promise.all(targetIds.map(id => api.delete(`/vehicles/${id}`)));
      toast.success("Suppression réussie !");
      setSelectedIds([]); fetchVehicles();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur lors de la suppression.");
    } finally {
      setActionLoading(false);
    }
  };

  // --- BULK ACTIONS ON ARTICLE ITEMS ---
  const executeActionOnArticleItems = async (endpointMaker: (id: number) => string, payloadMaker: (id: number) => any, successMsg: string, modalSetter: Function) => {
    const targetVehicles = selectedVehicle ? [selectedVehicle] : data.filter(v => selectedIds.includes(v.id));
    const targetArticleItemIds = targetVehicles.map(v => v.article_item?.id).filter(Boolean);

    if (targetArticleItemIds.length === 0) return toast.error("Aucun article lié valide trouvé.");

    try {
      setActionLoading(true);
      await Promise.all(targetArticleItemIds.map(id => api.post(endpointMaker(id), payloadMaker(id))));
      toast.success(successMsg);
      modalSetter(false); setSelectedIds([]); fetchVehicles();
    } catch (error: any) { toast.error(error.response?.data?.message || "Erreur lors de l'opération."); } 
    finally { setActionLoading(false); }
  };

  const handleChangeStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus) return toast.error("Statut requis.");
    executeActionOnArticleItems(
      id => `/article-items/${id}/change-status`, 
      (id) => ({ status: newStatus, remarque }), 
      "Statut(s) mis à jour !", 
      setIsStatusModalOpen
    );
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmplacementId) return toast.error("Destination requise.");
    executeActionOnArticleItems(
      id => `/transfers`, 
      (id) => ({ article_item_id: id, to_emplacement_id: newEmplacementId }), 
      "Transfert(s) effectué(s) !", 
      setIsTransferModalOpen
    );
  };

  const fetchItemHistory = async (articleItemId: number) => {
    if(!articleItemId) return;
    setHistoryLoading(true);
    try {
      const res = await api.get(`/article-items/${articleItemId}/history`);
      setItemHistory(res.data.data || []);
    } catch (error) { toast.error("Erreur historique."); } 
    finally { setHistoryLoading(false); }
  };

  // --- IMPORT / EXPORT ---
  const handleExport = async () => {
    try {
      const toastId = toast.loading("Génération du fichier Excel...");
      const params: any = {};
      if (selectedIds.length > 0) { params.selected_ids = selectedIds.join(','); } 
      else {
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value)) { if (value.length > 0) params[key] = value.join(','); }
          else if (value && value !== "all") { params[key] = value; }
        });
      }
      const res = await api.get("/vehicles/export", { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a'); link.href = url; link.setAttribute('download', `Flotte_Vehicules_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      toast.success("Exportation réussie !", { id: toastId }); setSelectedIds([]);
    } catch (error) { toast.error("Erreur d'exportation."); }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get("/vehicles/template", { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a'); link.href = url; link.setAttribute('download', 'modele_import_vehicles.xlsx');
      document.body.appendChild(link); link.click(); toast.success("Modèle téléchargé !");
    } catch (error) { toast.error("Erreur téléchargement."); }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return toast.error("Veuillez sélectionner un fichier.");
    const formData = new FormData(); formData.append("file", importFile);
    try {
      setImporting(true);
      await api.post("/vehicles/import", formData, { headers: { "Content-Type": "multipart/form-data" }});
      toast.success("Véhicules importés avec succès !");
      setIsImportModalOpen(false); setImportFile(null); fetchVehicles();
    } catch (error: any) { toast.error(error.response?.data?.message || "Erreur d'importation."); } 
    finally { setImporting(false); }
  };

  // --- PRINT QR CODES ---
  const handlePrint = () => {
    if (selectedIds.length === 0) return toast.error("Veuillez sélectionner au moins un véhicule.");
    const printContent = document.getElementById("hidden-print-area")?.innerHTML;
    if (!printContent) return;

    const iframe = document.createElement("iframe"); iframe.style.display = "none"; document.body.appendChild(iframe);
    iframe.contentWindow?.document.open();
    iframe.contentWindow?.document.write(`
      <!DOCTYPE html><html><head><title>Impression</title>
      <style>
        body { margin: 0; padding: 10px; font-family: Arial, sans-serif; background: white; }
        .print-container { display: flex; flex-wrap: wrap; gap: 15px; justify-content: flex-start; }
        .etiquette { border: 1px dashed #ccc; width: 220px; height: 140px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; page-break-inside: avoid; padding: 10px; box-sizing: border-box; }
        .etiquette-title { font-size: 11px; font-weight: bold; margin-bottom: 8px; text-transform: uppercase; color: #000; }
        .etiquette-text { font-size: 12px; margin-top: 5px; font-family: monospace; font-weight: bold; color: #000; }
        .etiquette-sub { font-size: 9px; margin-top: 3px; color: #444; }
        svg { max-width: 100%; height: auto; }
      </style></head><body><div class="print-container">${printContent}</div><script>window.onload=()=>window.print();</script></body></html>
    `);
    iframe.contentWindow?.document.close();
    setTimeout(() => { document.body.removeChild(iframe); }, 2000);
  };

  if (!hasPermission(PERMISSIONS.VIEW)) return <div className="p-8 text-center text-slate-500">🚫 Accès refusé. Vous n'avez pas la permission de voir cette page.</div>;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 lg:p-8 space-y-6">
      
      {/* 🔹 HEADER & SCANNER 🔹 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Bus size={24} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Parc Roulant (Flotte)</h1>
            <p className="text-sm text-slate-500 mt-1">Total : <strong className="text-blue-600">{total} Véhicules</strong></p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
            <Input 
              placeholder="Scanner QR (Entrée)..." 
              value={scanBuffer} onChange={(e) => setScanBuffer(e.target.value)} onKeyDown={handleScanInput}
              className="pl-9 bg-blue-50/50 border-blue-200 focus-visible:ring-blue-600 w-64 shadow-inner"
            />
          </div>

          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className={`bg-white border-slate-200 ${showFilters ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-slate-700'}`}>
            <SlidersHorizontal className="w-4 h-4 mr-2" /> Filtres
          </Button>

          {/* زدت التحقق من صلاحيات التصدير والاستيراد هنا */}
          {(hasPermission(PERMISSIONS.EXPORT) || hasPermission(PERMISSIONS.IMPORT)) && (
            <DropdownMenu>
              <DropdownMenuTrigger >
                <Button variant="outline" className="bg-white border-slate-200 text-slate-700">Options <ChevronRight className="w-4 h-4 ml-2 rotate-90"/></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {hasPermission(PERMISSIONS.EXPORT) && (
                  <DropdownMenuItem onClick={handleExport} className="cursor-pointer text-emerald-600"><FileSpreadsheet className="w-4 h-4 mr-2" /> Exporter Excel</DropdownMenuItem>
                )}
                {hasPermission(PERMISSIONS.IMPORT) && (
                  <DropdownMenuItem onClick={() => setIsImportModalOpen(true)} className="cursor-pointer text-blue-600"><Upload className="w-4 h-4 mr-2" /> Importer</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {hasPermission(PERMISSIONS.ADD) && (
            <Button onClick={() => openFormModal()} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> Ajouter
            </Button>
          )}
        </div>
      </div>

      {/* 🔹 BULK ACTIONS TOOLBAR 🔹 */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-700 text-white p-3 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-top-4 sticky top-4 z-50">
          <div className="flex items-center gap-3 px-2">
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">{selectedIds.length}</span>
            <span className="text-sm font-medium">Véhicules sélectionnés</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {hasPermission(PERMISSIONS.CHANGE_STATUS) && <Button size="sm" variant="secondary" onClick={() => openActionModal('status')} className="bg-white text-blue-700 hover:bg-blue-50 border-0"><Settings2 className="w-4 h-4 mr-2"/> Statut</Button>}
            {hasPermission(PERMISSIONS.TRANSFER) && <Button size="sm" variant="secondary" onClick={() => openActionModal('transfer')} className="bg-white text-blue-700 hover:bg-blue-50 border-0"><ArrowRightLeft className="w-4 h-4 mr-2"/> Transférer (Parc)</Button>}
            {hasPermission(PERMISSIONS.DELETE) && <Button size="sm" variant="destructive" onClick={() => handleDelete()} className="border-0"><Trash2 className="w-4 h-4 mr-2"/> Supprimer</Button>}
            
            <div className="w-px h-6 bg-white/30 mx-1"></div>
            
            <Select value={labelType} onValueChange={(val: any) => setLabelType(val)}>
              <SelectTrigger className="w-[120px] bg-white text-slate-800 border-0 h-9"><SelectValue placeholder="Format..." /></SelectTrigger>
              <SelectContent><SelectItem value="qr">QR Code</SelectItem><SelectItem value="barcode">Code Barre</SelectItem></SelectContent>
            </Select>
            <Button size="sm" onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white border-0"><Printer className="w-4 h-4 mr-2"/> Imprimer</Button>
          </div>
        </div>
      )}

      {/* 🔹 FILTERS PANEL 🔹 */}
      {showFilters && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Search className="w-4 h-4 text-blue-500"/> Recherche Multicritères</h3>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500 hover:text-red-600 h-8"><X className="w-4 h-4 mr-1"/> Réinitialiser</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5 lg:col-span-4 bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center gap-4">
              <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Règle de texte :</label>
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
            </div>

            <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Matricule</label><Input value={filters.immatriculation} onChange={(e) => handleFilterChange("immatriculation", e.target.value)} className="h-9 text-sm" /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">N° Châssis</label><Input value={filters.numero_chassis} onChange={(e) => handleFilterChange("numero_chassis", e.target.value)} className="h-9 text-sm" /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Code QR (Article)</label><Input value={filters.qr_code_reference} onChange={(e) => handleFilterChange("qr_code_reference", e.target.value)} className="h-9 text-sm border-blue-300" /></div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Marque / Modèle</label>
              <div className="flex gap-2">
                <Input placeholder="Marque" value={filters.marque} onChange={(e) => handleFilterChange("marque", e.target.value)} className="h-9 text-sm w-1/2" />
                <Input placeholder="Modèle" value={filters.modele} onChange={(e) => handleFilterChange("modele", e.target.value)} className="h-9 text-sm w-1/2" />
              </div>
            </div>

            {/* 🔹 Filter: Parc (Affiche les noms sélectionnés) 🔹 */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Parc / Structure</label>
              <DropdownMenu>
                <DropdownMenuTrigger >
                  <Button variant="outline" className="w-full justify-between h-9 text-sm font-normal bg-white px-3">
                    <span className="truncate">
                      {filters.parc_id.length > 0 
                        ? filters.parc_id.map(id => parcs.find(p => p.id.toString() === id)?.nom).filter(Boolean).join(", ") 
                        : "Toutes"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto" align="start">
                  {parcs.map((p) => (<DropdownMenuItem key={p.id} onSelect={(e) => e.preventDefault()} onClick={() => toggleMultiSelect('parc_id', p.id.toString())} className="flex items-center gap-2 cursor-pointer"><Checkbox checked={filters.parc_id.includes(p.id.toString())} /><span className="truncate">{p.nom}</span></DropdownMenuItem>))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 🔹 Filter: Status (Affiche les noms sélectionnés) 🔹 */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Statut(s)</label>
              <DropdownMenu>
                <DropdownMenuTrigger >
                  <Button variant="outline" className="w-full justify-between h-9 text-sm font-normal bg-white px-3">
                    <span className="truncate">
                      {filters.status.length > 0 
                        ? filters.status.map(s => s === 'en_service' ? 'En Service' : s === 'en_panne' ? 'En Panne' : 'Réformé').join(", ") 
                        : "Tous"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start">
                  {[{ id: 'en_service', label: 'En Service' }, { id: 'en_panne', label: 'En Panne' }, { id: 'reforme', label: 'Réformé' }].map((opt) => (
                    <DropdownMenuItem key={opt.id} onSelect={(e) => e.preventDefault()} onClick={() => toggleMultiSelect('status', opt.id)} className="flex items-center gap-2 cursor-pointer"><Checkbox checked={filters.status.includes(opt.id)} /><span>{opt.label}</span></DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}

      {/* 🔹 TABLE 🔹 */}
      <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm relative">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 border-b border-slate-100">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 pl-4"><Checkbox checked={data.length > 0 && selectedIds.length === data.length} onCheckedChange={handleSelectAll} className="data-[state=checked]:bg-blue-600" /></TableHead>
                <TableHead className="font-semibold text-slate-600">Véhicule (Matricule)</TableHead>
                <TableHead className="font-semibold text-slate-600">Marque / Modèle</TableHead>
                <TableHead className="font-semibold text-slate-600">Achat (Facture)</TableHead>
                <TableHead className="font-semibold text-slate-600">Localisation (Parc)</TableHead>
                <TableHead className="font-semibold text-slate-600">Assurance</TableHead>
                <TableHead className="text-center font-semibold text-slate-600">Statut</TableHead>
                <TableHead className="text-right font-semibold text-slate-600 pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="h-64 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500" /></TableCell></TableRow>
              ) : data.length > 0 ? (
                data.map((item) => {
                  const ai = item.article_item || {};
                  const isAssuranceExpired = item.assurance_end_date && new Date(item.assurance_end_date) < new Date();
                  return (
                    <TableRow key={item.id} className={`group ${selectedIds.includes(item.id) ? "bg-blue-50/50" : "hover:bg-slate-50/50"}`}>
                      <TableCell className="pl-4"><Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)} className="data-[state=checked]:bg-blue-600" /></TableCell>
                      
                      <TableCell>
                        <div className="font-bold text-slate-900 text-sm tracking-wide">{item.immatriculation}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">CH: {item.numero_chassis || "—"}</div>
                        {ai.qr_code_reference && <div className="text-[10px] text-blue-600 mt-1 font-mono flex items-center gap-1"><QrCode className="w-3 h-3"/> {ai.qr_code_reference}</div>}
                      </TableCell>

                      <TableCell>
                        <div className="font-medium text-slate-800">{item.marque || ai.marque || "—"}</div>
                        <div className="text-xs text-slate-500">{item.modele || ai.modele || "—"} {item.annee && `(${item.annee})`}</div>
                      </TableCell>

                      <TableCell>
                        {ai.numero_facture ? <div className="text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border mb-1 w-max">F: {ai.numero_facture}</div> : <span className="text-xs text-slate-400">—</span>}
                        {ai.valeur_unitaire ? <div className="text-[11px] text-emerald-600 font-semibold mt-1">{formatMoney(ai.valeur_unitaire)}</div> : null}
                      </TableCell>

                      <TableCell>
                        <div className="text-sm font-medium text-slate-700">{ai.emplacement?.parc || "Parc inconnu"}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 text-orange-400"/> {ai.emplacement?.nom || "Emplacement inconnu"}</div>
                      </TableCell>

                      <TableCell>
                        {item.assurance_end_date ? (
                          <div className={`text-xs font-semibold px-2 py-1 rounded w-max border ${isAssuranceExpired ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                            {isAssuranceExpired && <ShieldAlert className="w-3 h-3 inline mr-1" />}
                            Exp: {new Date(item.assurance_end_date).toLocaleDateString('fr-DZ')}
                          </div>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </TableCell>

                      <TableCell className="text-center"><StatusBadge status={ai.status || 'inconnu'} /></TableCell>

                      <TableCell className="text-right pr-6 align-middle">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {hasPermission(PERMISSIONS.EDIT) && <Button variant="ghost" size="icon" onClick={() => openFormModal(item)} className="text-slate-400 hover:text-blue-600"><Edit className="w-4 h-4" /></Button>}
                          {hasPermission(PERMISSIONS.HISTORY) && <Button variant="ghost" size="icon" onClick={() => openActionModal('history', item)} className="text-slate-400 hover:text-purple-600"><History className="w-4 h-4" /></Button>}
                          {hasPermission(PERMISSIONS.CHANGE_STATUS) && <Button variant="ghost" size="icon" onClick={() => openActionModal('status', item)} className="text-slate-400 hover:text-indigo-600"><Settings2 className="w-4 h-4" /></Button>}
                          {hasPermission(PERMISSIONS.TRANSFER) && <Button variant="ghost" size="icon" onClick={() => openActionModal('transfer', item)} className="text-slate-400 hover:text-orange-600"><ArrowRightLeft className="w-4 h-4" /></Button>}
                          {hasPermission(PERMISSIONS.DELETE) && <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (<TableRow><TableCell colSpan={8} className="h-48 text-center text-slate-500">Aucun véhicule trouvé.</TableCell></TableRow>)}
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

      {/* 🖨️ ZONE D'IMPRESSION CACHÉE 🖨️ */}
      <div id="hidden-print-area" className="hidden">
        {data.filter(item => selectedIds.includes(item.id) && item.article_item?.qr_code_reference).map(item => (
          <div key={item.id} className="etiquette">
            <div className="etiquette-title">{item.immatriculation}</div>
            {labelType === "qr" ? <QRCodeSVG value={item.article_item.qr_code_reference} size={60} level="M" /> : <Barcode value={item.article_item.qr_code_reference} width={1.2} height={40} fontSize={10} displayValue={false} margin={0} />}
            <div className="etiquette-text">{item.article_item.qr_code_reference}</div>
            <div className="etiquette-sub">{item.marque} {item.modele}</div>
          </div>
        ))}
      </div>

      {/* ========================================== */}
      {/* 🔹 MODALS (Add/Edit, Import, Actions) 🔹 */}
      {/* ========================================== */}
      
      {/* 1. Modal Ajout / Modification */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
            <DialogTitle className="text-lg font-semibold text-slate-800">{selectedVehicle ? "Modifier Véhicule" : "Nouveau Véhicule"}</DialogTitle>
            {!selectedVehicle && <DialogDescription className="text-xs mt-1">Un QR Code sera généré automatiquement.</DialogDescription>}
          </DialogHeader>
          <form onSubmit={handleSaveVehicle} className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Immatriculation *</label><Input required value={formData.immatriculation} onChange={e => setFormData({...formData, immatriculation: e.target.value})} /></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">N° Châssis</label><Input value={formData.numero_chassis} onChange={e => setFormData({...formData, numero_chassis: e.target.value})} /></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Marque *</label><Input required value={formData.marque} onChange={e => setFormData({...formData, marque: e.target.value})} /></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Modèle</label><Input value={formData.modele} onChange={e => setFormData({...formData, modele: e.target.value})} /></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Année</label><Input type="number" value={formData.annee} onChange={e => setFormData({...formData, annee: e.target.value})} /></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">N° Facture</label><Input value={formData.numero_facture} onChange={e => setFormData({...formData, numero_facture: e.target.value})} placeholder="Fac-..." /></div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Valeur Unitaire (DZD)</label><Input type="number" value={formData.valeur_unitaire} onChange={e => setFormData({...formData, valeur_unitaire: e.target.value})} placeholder="0.00" /></div>
              <div className="space-y-1.5 col-span-2"><label className="text-xs font-semibold text-slate-700">Expiration Assurance</label><Input type="date" value={formData.assurance_end_date} onChange={e => setFormData({...formData, assurance_end_date: e.target.value})} /></div>
              
              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-semibold text-slate-700">Catalogue (Type) *</label>
                <Select value={formData.article_id} onValueChange={(val) => setFormData({...formData, article_id: val})}>
                  <SelectTrigger>
                    {/* 🔹 الإصلاح هنا: نمدّو القيمة المعروضة بالـ find باش ما يعرضش الـ ID 🔹 */}
                    <SelectValue placeholder="Ex: Autobus, Voiture...">
                      {formData.article_id ? articlesCatalog.find(a => a.id.toString() === formData.article_id)?.nom : ""}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2 sticky top-0 bg-white z-10 border-b border-slate-100">
                      <Input placeholder="Rechercher catalogue..." value={searchCatalog} onChange={e => setSearchCatalog(e.target.value)} onKeyDown={e => e.stopPropagation()} className="h-8 text-xs focus-visible:ring-blue-500" />
                    </div>
                    {articlesCatalog
                      .filter(a => a.nom.toLowerCase().includes(searchCatalog.toLowerCase()))
                      .map((a:any) => <SelectItem key={a.id} value={a.id.toString()}>{a.nom}</SelectItem>)
                    }
                  </SelectContent>
                </Select>
              </div>

              {!selectedVehicle && (
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Emplacement Initial (Parc) *</label>
                  <Select value={formData.emplacement_id} onValueChange={(val) => setFormData({...formData, emplacement_id: val})}>
                    <SelectTrigger>
                      {/* 🔹 الإصلاح هنا أيضاً 🔹 */}
                      <SelectValue placeholder="Où est garé ce véhicule ?">
                        {formData.emplacement_id ? emplacements.find(e => e.id.toString() === formData.emplacement_id)?.nom : ""}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2 sticky top-0 bg-white z-10 border-b border-slate-100">
                        <Input placeholder="Rechercher emplacement..." value={searchEmpForm} onChange={e => setSearchEmpForm(e.target.value)} onKeyDown={e => e.stopPropagation()} className="h-8 text-xs focus-visible:ring-blue-500" />
                      </div>
                      {emplacements
                        .filter(e => e.nom.toLowerCase().includes(searchEmpForm.toLowerCase()) || e.parc?.nom?.toLowerCase().includes(searchEmpForm.toLowerCase()))
                        .map((e:any) => <SelectItem key={e.id} value={e.id.toString()}>{e.nom} {e.parc ? `(${e.parc.nom})` : ''}</SelectItem>)
                      }
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter className="pt-4 border-t mt-6 px-0"><Button type="button" variant="outline" onClick={() => setIsFormModalOpen(false)}>Annuler</Button><Button type="submit" disabled={actionLoading} className="bg-blue-600 text-white min-w-[100px]">{actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Enregistrer"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Modal Importation Excel */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white shadow-2xl rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
            <div className="flex items-center gap-3"><div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Upload className="w-5 h-5" /></div><div><DialogTitle className="text-xl font-semibold text-slate-800">Importer Véhicules</DialogTitle><DialogDescription className="mt-1 text-sm text-slate-500">Depuis un fichier Excel (.xlsx)</DialogDescription></div></div>
          </DialogHeader>
          <form onSubmit={handleImportSubmit} className="px-6 py-6 space-y-4">
            <div className="flex justify-end"><Button type="button" variant="link" onClick={handleDownloadTemplate} className="text-blue-600 h-auto p-0"><FileSpreadsheet className="w-4 h-4 mr-1"/> Télécharger le modèle</Button></div>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-500 transition-colors bg-slate-50/50"><input type="file" accept=".xlsx, .xls, .csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 cursor-pointer" /></div>
            <DialogFooter className="px-0 pt-4 border-t bg-transparent"><Button type="button" variant="outline" onClick={() => setIsImportModalOpen(false)} disabled={importing}>Annuler</Button><Button type="submit" disabled={importing || !importFile} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">{importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Importer"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. Modal Statut (Via Article Item) */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
            <DialogTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Settings2 className="w-5 h-5 text-blue-600" /> Modifier l'état</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1">{selectedVehicle ? `Véhicule: ${selectedVehicle.immatriculation}` : `Modification de ${selectedIds.length} véhicules.`}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangeStatus} className="px-6 py-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Nouveau Statut</label>
              <Select value={newStatus} onValueChange={(val) => setNewStatus(val ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un statut">
                    {newStatus === 'en_service' ? '🟢 En Service' : newStatus === 'en_panne' ? '🟠 En Panne' : newStatus === 'reforme' ? '🟣 Réformé' : ''}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_service">🟢 En Service</SelectItem>
                  <SelectItem value="en_panne">🟠 En Panne</SelectItem>
                  <SelectItem value="reforme">🟣 Réformé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium text-slate-700">Remarque</label><Input placeholder="Ex: En réparation..." value={remarque} onChange={e => setRemarque(e.target.value)} /></div>
            <DialogFooter className="pt-4 border-t mt-6 px-0"><Button type="button" variant="outline" onClick={() => setIsStatusModalOpen(false)}>Annuler</Button><Button type="submit" disabled={actionLoading} className="bg-blue-600 text-white min-w-[100px]">{actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Confirmer"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. Modal Transfert (Parc) (Via Article Item) */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
            <DialogTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-orange-600" /> Ordre de Transfert (Parc)</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1">{selectedVehicle ? `Véhicule: ${selectedVehicle.immatriculation}` : `Transfert de ${selectedIds.length} véhicules.`}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTransfer} className="px-6 py-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Parc (Filtre)</label>
              <Select value={transferParcId} onValueChange={(val) => { setTransferParcId(val); setNewEmplacementId(""); }}>
                <SelectTrigger>
                  {/* 🔹 الإصلاح هنا أيضاً 🔹 */}
                  <SelectValue placeholder="Tous">
                    {transferParcId === 'all' ? 'Tous' : parcs.find(p => p.id.toString() === transferParcId)?.nom}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {parcs.map((p:any) => (<SelectItem key={p.id} value={p.id.toString()}>{p.nom}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Emplacement Destination *</label>
              <Select value={newEmplacementId} onValueChange={(val) => setNewEmplacementId(val ?? "")}>
                <SelectTrigger>
                  {/* 🔹 الإصلاح هنا أيضاً 🔹 */}
                  <SelectValue placeholder="Sélectionner...">
                    {newEmplacementId ? emplacements.find(e => e.id.toString() === newEmplacementId)?.nom : ""}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2 sticky top-0 bg-white z-10 border-b border-slate-100">
                    <Input placeholder="Rechercher emplacement..." value={searchEmpTransfer} onChange={e => setSearchEmpTransfer(e.target.value)} onKeyDown={e => e.stopPropagation()} className="h-8 text-xs focus-visible:ring-blue-500" />
                  </div>
                  {emplacements
                    .filter(e => transferParcId === "all" || e.parc_id?.toString() === transferParcId)
                    .filter(e => e.nom.toLowerCase().includes(searchEmpTransfer.toLowerCase()))
                    .map((loc:any) => (<SelectItem key={loc.id} value={loc.id.toString()}>{loc.nom}</SelectItem>))
                  }
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4 border-t mt-6 px-0"><Button type="button" variant="outline" onClick={() => setIsTransferModalOpen(false)}>Annuler</Button><Button type="submit" disabled={actionLoading || !newEmplacementId} className="bg-orange-600 text-white min-w-[100px]">{actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Transférer"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Modal Historique */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-white rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b bg-slate-50/50"><DialogTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2"><History className="w-5 h-5 text-purple-600" /> Historique Véhicule</DialogTitle></DialogHeader>
          <div className="px-6 py-4 max-h-[50vh] overflow-y-auto">
            {historyLoading ? <div className="flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div> : itemHistory.length === 0 ? <div className="text-center text-slate-400">Aucun historique enregistré pour ce véhicule.</div> : (
              <div className="space-y-4">
                {itemHistory.map((hist, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                    <div className="flex justify-between font-bold text-slate-700 mb-1"><span className="uppercase text-purple-600 text-xs">{hist.action.replace(/_/g, ' ')}</span><span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(hist.created_at).toLocaleDateString()}</span></div>
                    <div className="text-xs text-slate-500">Par: {hist.user_name || 'Système'}</div>
                    {(hist.old_value || hist.new_value) && <div className="text-xs font-mono mt-1 text-slate-600"><span className="line-through">{hist.old_value}</span> ➔ <span className="font-bold">{hist.new_value}</span></div>}
                    {hist.remarque && <div className="text-xs italic mt-1 text-slate-500">"{hist.remarque}"</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="px-6 py-4 border-t"><Button variant="outline" onClick={() => setIsHistoryModalOpen(false)}>Fermer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}