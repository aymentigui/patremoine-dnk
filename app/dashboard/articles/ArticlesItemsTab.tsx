"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
// @ts-ignore
import Barcode from "react-barcode";
import * as XLSX from "xlsx";

// 🔹 استدعاء الـ Store 🔹
import { useAuthStore } from "@/store/useAuthStore";

// UI Components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Icons
import { Loader2, Search, FileSpreadsheet, List, SlidersHorizontal, X, ChevronLeft, ChevronRight, QrCode, Building2, MapPin, Activity, Settings2, User, ArrowRightLeft, History, Printer, Clock, CheckCircle2, XCircle } from "lucide-react";

// ==========================================
// 🔐 إدارة الصلاحيات (PERMISSIONS) - مطابقة للباك اند
// ==========================================
const PERMISSIONS = {
  VIEW: "voir_article_items",
  CHANGE_STATUS: "modifier_statut_article_items",
  ASSIGN: "affecter_employe_article_items",
  TRANSFER: "ajouter_transfers", // 🔹 تم التصحيح حسب الباك اند 🔹
  HISTORY: "voir_article_items", // History داخل في نفس صلاحية الـ View
  EXPORT: "exporter_article_items"
};

// Format DZD
const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount);
};

// Status Badge Helper
const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = {
    'en_service': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'en_panne': 'bg-red-100 text-red-700 border-red-200',
    'perdu': 'bg-slate-100 text-slate-700 border-slate-200',
    'reforme': 'bg-orange-100 text-orange-700 border-orange-200',
    'vendu': 'bg-blue-100 text-blue-700 border-blue-200',
  };
  const labels: any = {
    'en_service': 'En Service',
    'en_panne': 'En Panne',
    'perdu': 'Perdu',
    'reforme': 'Réformé',
    'vendu': 'Vendu',
  };
  
  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {labels[status] || status}
    </span>
  );
};

export default function ArticleItemsTab() {
  // 🔹 جلب دالة التحقق من الصلاحيات من الـ Store 🔹
  const hasPermission = useAuthStore((state) => state.hasPermission);

  // Data States
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Auxiliary Data for Selects
  const [emplacements, setEmplacements] = useState<any[]>([]);
  const [parcs, setParcs] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Selection & Print
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [labelType, setLabelType] = useState<"qr" | "barcode">("qr");

  // Scanner Fast Input
  const [scanBuffer, setScanBuffer] = useState("");

  // Modals States
  const [selectedItem, setSelectedItem] = useState<any>(null); // إذا كان null، رانا في الـ Bulk Action
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Form States
  const [newStatus, setNewStatus] = useState("");
  const [newEmployeeId, setNewEmployeeId] = useState("");
  const [remarque, setRemarque] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [transferParcId, setTransferParcId] = useState<string>("all");
  const [newEmplacementId, setNewEmplacementId] = useState<string>("");

  // History States
  const [itemHistory, setItemHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  // 🔹 ADVANCED FILTERS STATE 🔹
  const [filters, setFilters] = useState({
    match_type: "contains",
    nom_article: "",
    qr_code_reference: "",
    numero_facture: "",
    numero_serie_fabricant: "",
    marque: "",
    modele: "",
    is_labeled: "",
    status: [] as string[],
    parc_id: [] as string[],
    emplacement_id: [] as string[],
    valeur_min: "",
    valeur_max: "",
    date_debut: "",
    date_fin: "",
  });

  // Fetch Auxiliary Data
  useEffect(() => {
    if (!hasPermission(PERMISSIONS.VIEW)) return; // حماية إضافية للطلبات
    
    api.get("/emplacements?per_page=500").then(res => setEmplacements(res.data.data?.data || res.data.data || []));
    api.get("/organigramme/tree").then(res => setParcs(res.data.data || [])).catch(() => {});
    api.get("/users?per_page=500").then(res => {
      const usersList = res.data?.data?.data || res.data?.data || [];
      setEmployees(usersList.filter((u: any) => u.employee).map((u: any) => u.employee));
    }).catch(() => {});
  }, [hasPermission]);

  // Fetch Article Items
  const fetchItems = useCallback(async () => {
    if (!hasPermission(PERMISSIONS.VIEW)) return;

    try {
      setLoading(true);
      const params: any = { page, per_page: 15 };
      
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          if (value.length > 0) params[key] = value.join(',');
        } else if (value && value !== "all") {
          params[key] = value;
        }
      });

      const res = await api.get("/article-items", { params });
      setData(res.data.data?.data || res.data.data || []);
      
      if (res.data.data?.last_page) {
        setLastPage(res.data.data.last_page);
        setTotal(res.data.data.total);
      }
    } catch (error) {
      toast.error("Erreur lors du chargement des détails.");
    } finally {
      setLoading(false);
    }
  }, [page, filters, hasPermission]);

  // Debounce API calls for typing
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => { fetchItems(); }, 600);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchItems]);

  // Handlers
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const toggleMultiSelect = (key: 'status' | 'parc_id' | 'emplacement_id', value: string) => {
    setFilters(prev => {
      const currentList = prev[key];
      const isSelected = currentList.includes(value);
      const newList = isSelected ? currentList.filter(item => item !== value) : [...currentList, value];
      return { ...prev, [key]: newList };
    });
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      match_type: "contains", nom_article: "", qr_code_reference: "", numero_facture: "", numero_serie_fabricant: "",
      marque: "", modele: "", status: [], parc_id: [], emplacement_id: [], valeur_min: "", valeur_max: "", date_debut: "", date_fin: "", is_labeled: ""
    });
    setPage(1);
  };

  const handleSelectAll = (checked: boolean) => setSelectedIds(checked ? data.map(item => item.id) : []);
  const handleSelectItem = (id: number, checked: boolean) => setSelectedIds(prev => checked ? [...prev, id] : prev.filter(item => item !== id));

  // 🚀 ميزة السكانير الأوتوماتيكي 🚀
  const handleScanInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (scanBuffer.trim() !== "") {
        const currentQR = filters.qr_code_reference;
        const newValue = currentQR ? `${currentQR},${scanBuffer.trim()}` : scanBuffer.trim();
        handleFilterChange("qr_code_reference", newValue);
        setScanBuffer(""); // نفارغو الخانة للسكان الجاي
      }
    }
  };

  // --- ACTIONS GLOBALES (BULK) & INDIVIDUELLES ---
  const openModal = (type: 'status' | 'assign' | 'transfer' | 'history', item: any = null) => {
    setSelectedItem(item);
    setRemarque("");
    if (type === 'status') { setNewStatus(item ? item.status : ""); setIsStatusModalOpen(true); }
    if (type === 'assign') { setNewEmployeeId(item?.employee_id?.toString() || ""); setIsAssignModalOpen(true); }
    if (type === 'transfer') { setTransferParcId("all"); setNewEmplacementId(""); setIsTransferModalOpen(true); }
    if (type === 'history') { setIsHistoryModalOpen(true); if (item) fetchItemHistory(item.id); }
  };

  // ⚙️ تنفيذ العمليات على عنصر واحد أو مجموعة عناصر
  const handleChangeStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus) return toast.error("Veuillez sélectionner un statut.");
    const targetIds = selectedItem ? [selectedItem.id] : selectedIds;
    
    try {
      setActionLoading(true);
      await Promise.all(targetIds.map(id => api.post(`/article-items/${id}/change-status`, { status: newStatus, remarque })));
      toast.success("Statut(s) mis à jour avec succès !");
      setIsStatusModalOpen(false);
      setSelectedIds([]); fetchItems();
    } catch (error: any) { toast.error("Erreur de mise à jour."); } 
    finally { setActionLoading(false); }
  };

  const handleAssignEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeId) return toast.error("Veuillez sélectionner un employé.");
    const targetIds = selectedItem ? [selectedItem.id] : selectedIds;

    try {
      setActionLoading(true);
      await Promise.all(targetIds.map(id => api.post(`/article-items/${id}/assign-employee`, { employee_id: newEmployeeId, remarque })));
      toast.success("Affectation(s) réussie(s) !");
      setIsAssignModalOpen(false);
      setSelectedIds([]); fetchItems();
    } catch (error: any) { toast.error("Erreur d'affectation."); } 
    finally { setActionLoading(false); }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmplacementId) return toast.error("Veuillez sélectionner une destination.");
    const targetIds = selectedItem ? [selectedItem.id] : selectedIds;

    try {
      setActionLoading(true);
      await Promise.all(targetIds.map(id => api.post(`/transfers`, { article_item_id: id, to_emplacement_id: newEmplacementId })));
      toast.success("Ordre(s) de transfert créé(s) !");
      setIsTransferModalOpen(false);
      setSelectedIds([]); fetchItems();
    } catch (error: any) { toast.error("Erreur de transfert."); } 
    finally { setActionLoading(false); }
  };

  const fetchItemHistory = async (itemId: number) => {
    setHistoryLoading(true); setHistorySearch("");
    try {
      const res = await api.get(`/article-items/${itemId}/history`);
      setItemHistory(res.data.data || []);
    } catch (error) { toast.error("Erreur de chargement."); } 
    finally { setHistoryLoading(false); }
  };

  const filteredHistory = itemHistory.filter(h => 
    h.action.toLowerCase().includes(historySearch.toLowerCase()) || 
    h.user_name?.toLowerCase().includes(historySearch.toLowerCase()) || 
    h.remarque?.toLowerCase().includes(historySearch.toLowerCase())
  );

  // EXPORT LOGIC
  const handleExport = async () => {
    try {
      const toastId = toast.loading("Génération du fichier Excel...");
      const params: any = {};
      if (selectedIds.length > 0) {
        params.selected_ids = selectedIds.join(',');
      } else {
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value)) { if (value.length > 0) params[key] = value.join(','); } 
          else if (value && value !== "all") { params[key] = value; }
        });
      }

      const res = await api.get("/article-items/export", { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Details_Articles_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      
      toast.success("Exportation réussie !", { id: toastId });
      setSelectedIds([]);
    } catch (error) { toast.error("Erreur lors de l'exportation Excel."); }
  };

  const handlePrint = () => {
    if (selectedIds.length === 0) return toast.error("Veuillez sélectionner au moins un article.");
    const printContent = document.getElementById("hidden-print-area")?.innerHTML;
    if (!printContent) return;

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    iframe.contentWindow?.document.open();
    iframe.contentWindow?.document.write(`
      <!DOCTYPE html><html><head><title>Impression Étiquettes</title>
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

  // 🛡️ حماية الصفحة كاملة
  if (!hasPermission(PERMISSIONS.VIEW)) return <div className="p-8 text-center text-slate-500">🚫 Accès refusé. Vous n'avez pas la permission de voir cette page.</div>;

  return (
    <div className="space-y-6">
      
      {/* 🔹 HEADER & SCANNER 🔹 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <List size={24} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pièces Détaillées</h1>
            <p className="text-sm text-slate-500 mt-1">Total trouvé : <strong className="text-indigo-600">{total} Pièces</strong></p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* 🚀 السكاني السريع 🚀 */}
          <div className="relative">
            <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500" />
            <Input 
              placeholder="Scanner ici (puis Entrée)..." 
              value={scanBuffer}
              onChange={(e) => setScanBuffer(e.target.value)}
              onKeyDown={handleScanInput}
              className="pl-9 bg-indigo-50/50 border-indigo-200 focus-visible:ring-indigo-600 w-64 shadow-inner"
            />
          </div>

          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className={`bg-white border-slate-200 ${showFilters ? 'text-indigo-600 border-indigo-200 bg-indigo-50' : 'text-slate-700'}`}>
            <SlidersHorizontal className="w-4 h-4 mr-2" /> Filtres Avancés
          </Button>
          
          {/* 🔹 تعويض الـ Can بـ hasPermission للتوحيد 🔹 */}
          {hasPermission(PERMISSIONS.EXPORT) && (
            <Button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm">
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Exporter Excel
            </Button>
          )}
        </div>
      </div>

      {/* 🔹 TOOLBAR DES ACTIONS GROUPÉES (BULK) 🔹 */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-600 text-white p-3 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-top-4 sticky top-4 z-50">
          <div className="flex items-center gap-3 px-2">
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">{selectedIds.length}</span>
            <span className="text-sm font-medium">Articles sélectionnés</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            
            {hasPermission(PERMISSIONS.CHANGE_STATUS) && (
              <Button size="sm" variant="secondary" onClick={() => openModal('status')} className="bg-white text-indigo-700 hover:bg-indigo-50 border-0">
                <Settings2 className="w-4 h-4 mr-2"/> Statut
              </Button>
            )}

            {hasPermission(PERMISSIONS.ASSIGN) && (
              <Button size="sm" variant="secondary" onClick={() => openModal('assign')} className="bg-white text-indigo-700 hover:bg-indigo-50 border-0">
                <User className="w-4 h-4 mr-2"/> Affecter
              </Button>
            )}

            {hasPermission(PERMISSIONS.TRANSFER) && (
              <Button size="sm" variant="secondary" onClick={() => openModal('transfer')} className="bg-white text-indigo-700 hover:bg-indigo-50 border-0">
                <ArrowRightLeft className="w-4 h-4 mr-2"/> Transférer
              </Button>
            )}

            <div className="w-px h-6 bg-white/30 mx-1"></div>

            <Select value={labelType} onValueChange={(val: any) => setLabelType(val)}>
              <SelectTrigger className="w-[120px] bg-white text-slate-800 border-0 h-9">
                <SelectValue placeholder="Format..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="qr">QR Code</SelectItem>
                <SelectItem value="barcode">Code Barre</SelectItem>
              </SelectContent>
            </Select>

            <Button size="sm" onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white border-0">
              <Printer className="w-4 h-4 mr-2"/> Imprimer
            </Button>
          </div>
        </div>
      )}

      {/* 🔹 ADVANCED FILTERS PANEL 🔹 */}
      {showFilters && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Search className="w-4 h-4 text-indigo-500"/> Recherche Multicritères</h3>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500 hover:text-red-600 h-8">
              <X className="w-4 h-4 mr-1"/> Réinitialiser
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Match Type */}
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
              <p className="text-xs text-slate-400 italic flex-1 text-right">💡 Astuce : Utilisez la virgule (,) pour chercher plusieurs termes en même temps.</p>
            </div>

            {/* Text Inputs */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Nom de l'article</label>
              <Input placeholder="Ex: Pneu, PC..." value={filters.nom_article} onChange={(e) => handleFilterChange("nom_article", e.target.value)} className="h-9 text-sm" />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Code QR (Liste)</label>
              <Input placeholder="Ex: QR1, QR2..." value={filters.qr_code_reference} onChange={(e) => handleFilterChange("qr_code_reference", e.target.value)} className="h-9 text-sm border-indigo-300" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">N° Facture / N° Série</label>
              <div className="flex gap-2">
                <Input placeholder="Facture" value={filters.numero_facture} onChange={(e) => handleFilterChange("numero_facture", e.target.value)} className="h-9 text-sm w-1/2" />
                <Input placeholder="Série" value={filters.numero_serie_fabricant} onChange={(e) => handleFilterChange("numero_serie_fabricant", e.target.value)} className="h-9 text-sm w-1/2" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Marque / Modèle</label>
              <div className="flex gap-2">
                <Input placeholder="Marque" value={filters.marque} onChange={(e) => handleFilterChange("marque", e.target.value)} className="h-9 text-sm w-1/2" />
                <Input placeholder="Modèle" value={filters.modele} onChange={(e) => handleFilterChange("modele", e.target.value)} className="h-9 text-sm w-1/2" />
              </div>
            </div>

            {/* 🔥 MULTI-SELECTS (Statut, Parc, Emplacement) 🔥 */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Statut(s)</label>
              <DropdownMenu>
                <DropdownMenuTrigger >
                  <Button variant="outline" className="w-full justify-between h-9 text-sm font-normal bg-white px-3 text-slate-600">
                    <span className="flex items-center gap-2 truncate">
                      <Activity className="w-4 h-4 text-slate-400" />
                      {filters.status.length > 0 ? `${filters.status.length} sélectionné(s)` : "Tous les statuts"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start">
                  {[
                    { id: 'en_service', label: 'En Service' },
                    { id: 'en_panne', label: 'En Panne' },
                    { id: 'reforme', label: 'Réformé' },
                    { id: 'perdu', label: 'Perdu' },
                    { id: 'vendu', label: 'Vendu' }
                  ].map((opt) => (
                    <DropdownMenuItem key={opt.id} onSelect={(e) => e.preventDefault()} onClick={() => toggleMultiSelect('status', opt.id)} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={filters.status.includes(opt.id)} />
                      <span>{opt.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Parc / Structure</label>
              <DropdownMenu>
                <DropdownMenuTrigger >
                  <Button variant="outline" className="w-full justify-between h-9 text-sm font-normal bg-white px-3 text-slate-600">
                    <span className="flex items-center gap-2 truncate">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      {filters.parc_id.length > 0 ? `${filters.parc_id.length} sélectionné(s)` : "Toutes les structures"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto" align="start">
                  {parcs.map((p) => (
                    <DropdownMenuItem key={p.id} onSelect={(e) => e.preventDefault()} onClick={() => toggleMultiSelect('parc_id', p.id.toString())} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={filters.parc_id.includes(p.id.toString())} />
                      <span className="truncate">{p.nom}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Emplacement (Bureau)</label>
              <DropdownMenu>
                <DropdownMenuTrigger >
                  <Button variant="outline" className="w-full justify-between h-9 text-sm font-normal bg-white px-3 text-slate-600">
                    <span className="flex items-center gap-2 truncate">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {filters.emplacement_id.length > 0 ? `${filters.emplacement_id.length} sélectionné(s)` : "Tous les emplacements"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 max-h-60 overflow-y-auto" align="start">
                  {emplacements.map((emp) => (
                    <DropdownMenuItem key={emp.id} onSelect={(e) => e.preventDefault()} onClick={() => toggleMultiSelect('emplacement_id', emp.id.toString())} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={filters.emplacement_id.includes(emp.id.toString())} />
                      <span className="truncate">{emp.nom}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Numeric & Dates */}
            <div className="space-y-1.5 lg:col-span-4">
              <div className="flex gap-4 w-full">
                <div className="space-y-1.5 w-1/2 max-w-[300px]">
                  <label className="text-xs font-semibold text-slate-600">Valeur (Min - Max)</label>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="Min" value={filters.valeur_min} onChange={(e) => handleFilterChange("valeur_min", e.target.value)} className="h-9 text-sm w-1/2" />
                    <Input type="number" placeholder="Max" value={filters.valeur_max} onChange={(e) => handleFilterChange("valeur_max", e.target.value)} className="h-9 text-sm w-1/2" />
                  </div>
                </div>
                <div className="space-y-1.5 w-1/2 max-w-[300px]">
                  <label className="text-xs font-semibold text-slate-600">Période d'ajout</label>
                  <div className="flex gap-2">
                    <Input type="date" value={filters.date_debut} onChange={(e) => handleFilterChange("date_debut", e.target.value)} className="h-9 text-sm w-1/2 text-slate-500" />
                    <Input type="date" value={filters.date_fin} onChange={(e) => handleFilterChange("date_fin", e.target.value)} className="h-9 text-sm w-1/2 text-slate-500" />
                  </div>
                </div>
              </div>
            </div>

            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Article étiqueté ?</label>
              <Select value={filters.is_labeled} onValueChange={(val) => handleFilterChange("is_labeled", val)}>
                <SelectTrigger className="w-full h-9 text-sm font-normal bg-white px-3 text-slate-600">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous</SelectItem>
                  <SelectItem value="1">Oui</SelectItem>
                  <SelectItem value="0">Non</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm relative">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 border-b border-slate-100">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 pl-4"><Checkbox checked={data.length > 0 && selectedIds.length === data.length} onCheckedChange={handleSelectAll} className="data-[state=checked]:bg-indigo-600" /></TableHead>
                <TableHead className="font-semibold text-slate-600 min-w-[200px]">Article & QR</TableHead>
                <TableHead className="font-semibold text-slate-600">N° Facture / Série</TableHead>
                <TableHead className="font-semibold text-slate-600">Marque & Modèle</TableHead>
                <TableHead className="font-semibold text-slate-600">Emplacement</TableHead>
                <TableHead className="text-center font-semibold text-slate-600">Statut</TableHead>
                <TableHead className="text-center font-semibold text-slate-600">Étiquette</TableHead>
                <TableHead className="text-right font-semibold text-slate-600 pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="h-64 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-500" /></TableCell></TableRow>
              ) : data.length > 0 ? (
                data.map((item) => (
                  <TableRow key={item.id} className={`group ${selectedIds.includes(item.id) ? "bg-indigo-50/50" : "hover:bg-slate-50/50"}`}>
                    <TableCell className="pl-4"><Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)} className="data-[state=checked]:bg-indigo-600" /></TableCell>
                    
                    <TableCell>
                      <div className="font-medium text-slate-900">{item.article?.nom || "N/A"}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono"><QrCode className="w-3 h-3"/> {item.qr_code_reference}</div>
                    </TableCell>

                    <TableCell>
                      {item.numero_facture ? <div className="text-xs font-semibold text-slate-700 bg-slate-100 inline-block px-1.5 py-0.5 rounded border mb-1">F: {item.numero_facture}</div> : null}
                      <div className="text-[11px] text-slate-500">SN: {item.numero_serie_fabricant || "—"}</div>
                    </TableCell>

                    <TableCell>
                      <div className="text-sm text-slate-800">{item.marque || "—"}</div>
                      <div className="text-xs text-slate-500">{item.modele || "—"}</div>
                    </TableCell>

                    <TableCell>
                      <div className="text-sm font-medium text-slate-700">{item.emplacement?.nom || "Non placé"}</div>
                      <div className="text-[10px] text-slate-400">{item.emplacement?.parc?.nom}</div>
                      {item.employee && <div className="text-[11px] text-indigo-600 mt-0.5 flex items-center gap-1"><User className="w-3 h-3"/> {item.employee.nom} {item.employee.prenom}</div>}
                    </TableCell>

                    <TableCell className="text-center">
                      <StatusBadge status={item.status} />
                    </TableCell>

                    <TableCell className="text-center">
                      {item.is_labeled ? <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" /> : <XCircle className="w-5 h-5 text-red-500 mx-auto" />}
                    </TableCell>

                    {/* 🔹 الأزرار الفردية محمية بالصلاحيات 🔹 */}
                    <TableCell className="text-right pr-6 align-middle">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {hasPermission(PERMISSIONS.HISTORY) && <Button variant="ghost" size="icon" onClick={() => openModal('history', item)} className="text-slate-400 hover:text-purple-600"><History className="w-4 h-4" /></Button>}
                        {hasPermission(PERMISSIONS.CHANGE_STATUS) && <Button variant="ghost" size="icon" onClick={() => openModal('status', item)} className="text-slate-400 hover:text-indigo-600"><Settings2 className="w-4 h-4" /></Button>}
                        {hasPermission(PERMISSIONS.ASSIGN) && <Button variant="ghost" size="icon" onClick={() => openModal('assign', item)} className="text-slate-400 hover:text-blue-600"><User className="w-4 h-4" /></Button>}
                        {hasPermission(PERMISSIONS.TRANSFER) && <Button variant="ghost" size="icon" onClick={() => openModal('transfer', item)} className="text-slate-400 hover:text-orange-600"><ArrowRightLeft className="w-4 h-4" /></Button>}
                      </div>
                    </TableCell>

                  </TableRow>
                ))
              ) : (<TableRow><TableCell colSpan={7} className="h-48 text-center text-slate-500">Aucune pièce trouvée avec ces filtres.</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </div>

        {/* PAGINATION */}
        {total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <p className="text-sm text-slate-500">Page <strong className="text-slate-900">{page}</strong> sur <strong className="text-slate-900">{lastPage}</strong></p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="bg-white"><ChevronLeft className="w-4 h-4 mr-1"/> Précédent</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page === lastPage || loading} className="bg-white">Suivant <ChevronRight className="w-4 h-4 ml-1"/></Button>
            </div>
          </div>
        )}
      </div>

      {/* 🖨️ منطقة الطباعة المخفية 🖨️ */}
      <div id="hidden-print-area" className="hidden">
        {data.filter(item => selectedIds.includes(item.id)).map(item => (
          <div key={item.id} className="etiquette">
            <div className="etiquette-title">{item.article?.nom?.substring(0, 25)}</div>
            {labelType === "qr" ? <QRCodeSVG value={item.qr_code_reference} size={60} level="M" /> : <Barcode value={item.qr_code_reference} width={1.2} height={40} fontSize={10} displayValue={false} margin={0} />}
            <div className="etiquette-text">{item.qr_code_reference}</div>
            {item.marque && <div className="etiquette-sub">{item.marque} {item.modele}</div>}
          </div>
        ))}
      </div>

      {/* 🔹 MODALS 🔹 */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
            <DialogTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Settings2 className="w-5 h-5 text-indigo-600" /> Modifier l'état</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1">
              {selectedItem ? `Article: ${selectedItem.qr_code_reference}` : `Vous allez modifier ${selectedIds.length} articles sélectionnés.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangeStatus} className="px-6 py-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Nouveau Statut</label>
              <Select value={newStatus} onValueChange={(val) => setNewStatus(val ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_service">🟢 En Service</SelectItem>
                  <SelectItem value="en_panne">🟠 En Panne</SelectItem>
                  <SelectItem value="perdu">⚫ Perdu</SelectItem>
                  <SelectItem value="reforme">🟣 Réformé</SelectItem>
                  <SelectItem value="vendu">🔵 Vendu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium text-slate-700">Remarque</label><Input placeholder="Ex: Panne..." value={remarque} onChange={e => setRemarque(e.target.value)} /></div>
            <DialogFooter className="pt-4 border-t mt-6 px-0"><Button type="button" variant="outline" onClick={() => setIsStatusModalOpen(false)}>Annuler</Button><Button type="submit" disabled={actionLoading} className="bg-indigo-600 text-white min-w-[100px]">{actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Confirmer"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
            <DialogTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2"><User className="w-5 h-5 text-blue-600" /> Affecter à un employé</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1">
              {selectedItem ? `Article: ${selectedItem.qr_code_reference}` : `Vous allez affecter ${selectedIds.length} articles.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignEmployee} className="px-6 py-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Employé</label>
              <Select value={newEmployeeId} onValueChange={(val) => setNewEmployeeId(val ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner...">
                    {newEmployeeId ? `${employees.find(e => e.id.toString() === newEmployeeId)?.nom} ${employees.find(e => e.id.toString() === newEmployeeId)?.prenom}` : ""}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2 sticky top-0 bg-white z-10"><Input placeholder="Chercher un nom..." className="h-8 text-sm" onKeyDown={(e) => e.stopPropagation()} /></div>
                  {employees.map(emp => (<SelectItem key={emp.id} value={emp.id.toString()}>{emp.nom} {emp.prenom}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium text-slate-700">Remarque</label><Input placeholder="N° PV..." value={remarque} onChange={e => setRemarque(e.target.value)} /></div>
            <DialogFooter className="pt-4 border-t mt-6 px-0"><Button type="button" variant="outline" onClick={() => setIsAssignModalOpen(false)}>Annuler</Button><Button type="submit" disabled={actionLoading} className="bg-blue-600 text-white min-w-[100px]">{actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Affecter"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
            <DialogTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-orange-600" /> Ordre de Transfert</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1">
              {selectedItem ? `Article: ${selectedItem.qr_code_reference}` : `Transfert de ${selectedIds.length} articles.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTransfer} className="px-6 py-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Parc (Filtre)</label>
              <Select value={transferParcId} onValueChange={(val) => { setTransferParcId(val??""); setNewEmplacementId(""); }}>
                <SelectTrigger>
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
              <label className="text-sm font-medium text-slate-700">Destination *</label>
              <Select value={newEmplacementId} onValueChange={(val) => setNewEmplacementId(val ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner...">
                    {newEmplacementId ? emplacements.find(e => e.id.toString() === newEmplacementId)?.nom : ""}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {emplacements.filter(e => transferParcId === "all" || e.parc_id?.toString() === transferParcId).map((loc:any) => (
                    <SelectItem key={loc.id} value={loc.id.toString()}>{loc.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4 border-t mt-6 px-0"><Button type="button" variant="outline" onClick={() => setIsTransferModalOpen(false)}>Annuler</Button><Button type="submit" disabled={actionLoading || !newEmplacementId} className="bg-orange-600 text-white min-w-[100px]">{actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Transférer"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-white rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b bg-slate-50/50"><DialogTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2"><History className="w-5 h-5 text-purple-600" /> Historique</DialogTitle></DialogHeader>
          <div className="px-6 py-4 max-h-[50vh] overflow-y-auto">
            {historyLoading ? <div className="flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div> : filteredHistory.length === 0 ? <div className="text-center text-slate-400">Aucun historique.</div> : (
              <div className="space-y-4">
                {filteredHistory.map((hist, idx) => (
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