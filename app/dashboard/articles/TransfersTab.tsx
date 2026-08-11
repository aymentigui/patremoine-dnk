"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import toast from "react-hot-toast";

// 🔹 استدعاء الـ Store 🔹
import { useAuthStore } from "@/store/useAuthStore";

// UI Components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Icons
import { Loader2, Search, FileSpreadsheet, ArrowRightLeft, SlidersHorizontal, X, ChevronLeft, ChevronRight, QrCode, MapPin, Activity, CheckCircle, XCircle, ArrowRight } from "lucide-react";

// ==========================================
// 🔐 إدارة الصلاحيات (PERMISSIONS) - مطابقة للباك اند
// ==========================================
const PERMISSIONS = {
  VIEW: "voir_transfers", 
  APPROVE: "approuver_transfers", 
  COMPLETE: "completer_transfers", 
  REJECT: "rejeter_transfers",
  EXPORT: "exporter_transfers"
};

// ==========================================
// 🎨 تصميم حالات التحويل (Status Badges)
// ==========================================
const TransferStatusBadge = ({ status }: { status: string }) => {
  const styles: any = {
    'pending': 'bg-amber-100 text-amber-700 border-amber-200',
    'in_transit': 'bg-blue-100 text-blue-700 border-blue-200',
    'completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'rejected': 'bg-red-100 text-red-700 border-red-200',
  };
  const labels: any = {
    'pending': '⏳ En Attente',
    'in_transit': '🚚 En Transit',
    'completed': '✅ Complété',
    'rejected': '❌ Rejeté',
  };
  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-bold border whitespace-nowrap ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {labels[status] || status}
    </span>
  );
};

export default function TransfersTab() {
  // 🔹 جلب دالة التحقق من الصلاحيات من الـ Store 🔹
  const hasPermission = useAuthStore((state) => state.hasPermission);

  // Data States
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null); // To show spinner on specific button
  
  // Auxiliary Data for Selects
  const [emplacements, setEmplacements] = useState<any[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // 🔹 ADVANCED FILTERS STATE 🔹
  const [filters, setFilters] = useState({
    match_type: "contains",
    nom_article: "",
    qr_code_reference: "",
    numero_facture: "",
    numero_serie_fabricant: "",
    status: [] as string[],
    from_emplacement_id: [] as string[],
    to_emplacement_id: [] as string[],
    date_debut: "",
    date_fin: "",
  });

  // Fetch Emplacements
  useEffect(() => {
    // 🔹 حماية الـ API 🔹
    if (!hasPermission(PERMISSIONS.VIEW)) return;

    api.get("/emplacements?per_page=500").then(res => setEmplacements(res.data.data?.data || res.data.data || []));
  }, [hasPermission]);

  // Fetch Transfers
  const fetchTransfers = useCallback(async () => {
    // 🔹 حماية الـ API 🔹
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

      const res = await api.get("/transfers", { params });
      setData(res.data.data || []);
      
      if (res.data.meta) {
        setLastPage(res.data.meta.last_page);
        setTotal(res.data.meta.total);
      }
    } catch (error) {
      toast.error("Erreur lors du chargement des transferts.");
    } finally {
      setLoading(false);
    }
  }, [page, filters, hasPermission]);

  // Debounce API calls
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => { fetchTransfers(); }, 600);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchTransfers]);

  // Handlers
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const toggleMultiSelect = (key: 'status' | 'from_emplacement_id' | 'to_emplacement_id', value: string) => {
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
      status: [], from_emplacement_id: [], to_emplacement_id: [], date_debut: "", date_fin: ""
    });
    setPage(1);
  };

  const handleSelectAll = (checked: boolean) => setSelectedIds(checked ? data.map(item => item.id) : []);
  const handleSelectItem = (id: number, checked: boolean) => setSelectedIds(prev => checked ? [...prev, id] : prev.filter(item => item !== id));

  // 🔹 EXPORT LOGIC 🔹
  const handleExport = async () => {
    try {
      const toastId = toast.loading("Génération du fichier Excel...");
      const params: any = {};
      
      if (selectedIds.length > 0) {
        params.selected_ids = selectedIds.join(',');
      } else {
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            if (value.length > 0) params[key] = value.join(',');
          } else if (value && value !== "all") {
            params[key] = value;
          }
        });
      }

      const res = await api.get("/transfers/export", { params, responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Registre_Transferts_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Exportation réussie !", { id: toastId });
      setSelectedIds([]);
    } catch (error) {
      toast.error("Erreur lors de l'exportation.");
    }
  };

  // 🔹 ACTIONS LOGIC (Approve, Complete, Reject) 🔹
  const handleTransferAction = async (id: number, action: 'approve' | 'complete' | 'reject') => {
    try {
      setActionLoading(id);
      await api.post(`/transfers/${id}/${action}`);
      toast.success("Opération effectuée avec succès.");
      fetchTransfers(); // Refresh
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur lors de l'opération.");
    } finally {
      setActionLoading(null);
    }
  };

  // 🛡️ حماية الصفحة كاملة إذا لم يمتلك الصلاحية (بعد الـ Hooks)
  if (!hasPermission(PERMISSIONS.VIEW)) {
    return <div className="p-8 text-center text-slate-500">🚫 Vous n'avez pas l'autorisation de voir cette page.</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <ArrowRightLeft size={24} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mouvements & Transferts</h1>
            <p className="text-sm text-slate-500 mt-1">Total trouvé : <strong className="text-orange-600">{total} Opérations</strong></p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className={`bg-white border-slate-200 ${showFilters ? 'text-orange-600 border-orange-200 bg-orange-50' : 'text-slate-700'}`}>
            <SlidersHorizontal className="w-4 h-4 mr-2" /> Filtres Avancés
          </Button>

          {/* 🔹 حماية زر التصدير 🔹 */}
          {hasPermission(PERMISSIONS.EXPORT) && (
            <Button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm">
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Exporter Excel
            </Button>
          )}
        </div>
      </div>

      {/* 🔹 ADVANCED FILTERS PANEL 🔹 */}
      {showFilters && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Search className="w-4 h-4 text-orange-500"/> Filtres de Transfert</h3>
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
              <p className="text-xs text-slate-400 italic flex-1 text-right">💡 Virgule (,) supportée pour recherches multiples.</p>
            </div>

            {/* Text Inputs */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Nom de l'article</label>
              <Input placeholder="Ex: Bureau, PC..." value={filters.nom_article} onChange={(e) => handleFilterChange("nom_article", e.target.value)} className="h-9 text-sm" />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Code QR / N° Série</label>
              <div className="flex gap-2">
                <Input placeholder="QR Code" value={filters.qr_code_reference} onChange={(e) => handleFilterChange("qr_code_reference", e.target.value)} className="h-9 text-sm w-1/2" />
                <Input placeholder="SN" value={filters.numero_serie_fabricant} onChange={(e) => handleFilterChange("numero_serie_fabricant", e.target.value)} className="h-9 text-sm w-1/2" />
              </div>
            </div>

            {/* 🔥 MULTI-SELECTS 🔥 */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Statut du Transfert</label>
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
                    { id: 'pending', label: 'En Attente' },
                    { id: 'in_transit', label: 'En Transit' },
                    { id: 'completed', label: 'Complété' },
                    { id: 'rejected', label: 'Rejeté' }
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
              <label className="text-xs font-semibold text-slate-600">De (Source)</label>
              <DropdownMenu>
                <DropdownMenuTrigger >
                  <Button variant="outline" className="w-full justify-between h-9 text-sm font-normal bg-white px-3 text-slate-600">
                    <span className="flex items-center gap-2 truncate">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {filters.from_emplacement_id.length > 0 ? `${filters.from_emplacement_id.length} sél.` : "Tous"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 max-h-60 overflow-y-auto" align="start">
                  {emplacements.map((emp) => (
                    <DropdownMenuItem key={emp.id} onSelect={(e) => e.preventDefault()} onClick={() => toggleMultiSelect('from_emplacement_id', emp.id.toString())} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={filters.from_emplacement_id.includes(emp.id.toString())} />
                      <span className="truncate">{emp.nom}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Vers (Destination)</label>
              <DropdownMenu>
                <DropdownMenuTrigger >
                  <Button variant="outline" className="w-full justify-between h-9 text-sm font-normal bg-white px-3 text-slate-600">
                    <span className="flex items-center gap-2 truncate">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {filters.to_emplacement_id.length > 0 ? `${filters.to_emplacement_id.length} sél.` : "Tous"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 max-h-60 overflow-y-auto" align="start">
                  {emplacements.map((emp) => (
                    <DropdownMenuItem key={emp.id} onSelect={(e) => e.preventDefault()} onClick={() => toggleMultiSelect('to_emplacement_id', emp.id.toString())} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={filters.to_emplacement_id.includes(emp.id.toString())} />
                      <span className="truncate">{emp.nom}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Période du transfert</label>
              <div className="flex gap-2 w-full">
                <Input type="date" value={filters.date_debut} onChange={(e) => handleFilterChange("date_debut", e.target.value)} className="h-9 text-sm w-1/2 text-slate-500" />
                <Input type="date" value={filters.date_fin} onChange={(e) => handleFilterChange("date_fin", e.target.value)} className="h-9 text-sm w-1/2 text-slate-500" />
              </div>
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
                <TableHead className="w-12 pl-4"><Checkbox checked={data.length > 0 && selectedIds.length === data.length} onCheckedChange={handleSelectAll} className="data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600" /></TableHead>
                <TableHead className="font-semibold text-slate-600">ID & Date</TableHead>
                <TableHead className="font-semibold text-slate-600">Article (QR / SN)</TableHead>
                <TableHead className="font-semibold text-slate-600">Trajet (De ➔ Vers)</TableHead>
                <TableHead className="text-center font-semibold text-slate-600">Statut</TableHead>
                <TableHead className="text-right font-semibold text-slate-600 pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="h-64 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" /></TableCell></TableRow>
              ) : data.length > 0 ? (
                data.map((item) => (
                  <TableRow key={item.id} className={`group ${selectedIds.includes(item.id) ? "bg-orange-50/50" : "hover:bg-slate-50/50"}`}>
                    <TableCell className="pl-4"><Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)} className="data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600" /></TableCell>
                    
                    {/* ID & Date */}
                    <TableCell>
                      <div className="font-bold text-slate-800">TR-{item.id.toString().padStart(5, '0')}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{new Date(item.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' })}</div>
                    </TableCell>

                    {/* Article Details */}
                    <TableCell>
                      <div className="font-medium text-slate-900">{item.article_item?.nom || "N/A"}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex gap-2">
                        <span className="font-mono text-indigo-600">{item.article_item?.qr_code}</span>
                        {item.article_item?.numero_serie_fabricant && <span>| SN: {item.article_item.numero_serie_fabricant}</span>}
                      </div>
                    </TableCell>

                    {/* Trajet */}
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-600 font-medium truncate max-w-[150px]">{item.from_emplacement || "Inconnu"}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                        <span className="text-orange-700 font-bold truncate max-w-[150px]">{item.to_emplacement || "Inconnu"}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Demandé par: {item.sender}</div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">
                      <TransferStatusBadge status={item.status} />
                    </TableCell>

                    {/* Actions Dynamiques (avec الصلاحيات) */}
                    <TableCell className="text-right pr-6 align-middle">
                      <div className="flex items-center justify-end gap-2">
                        
                        {/* زر الموافقة (يظهر إذا كان معلق + يملك صلاحية الموافقة) */}
                        {item.status === 'pending' && hasPermission(PERMISSIONS.APPROVE) && (
                          <Button size="sm" variant="outline" onClick={() => handleTransferAction(item.id, 'approve')} disabled={actionLoading === item.id} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                            {actionLoading === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approuver"}
                          </Button>
                        )}

                        {/* زر الاستلام (يظهر إذا كان في الطريق + يملك صلاحية الاستلام) */}
                        {item.status === 'in_transit' && hasPermission(PERMISSIONS.COMPLETE) && (
                          <Button size="sm" onClick={() => handleTransferAction(item.id, 'complete')} disabled={actionLoading === item.id} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {actionLoading === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1.5"/> Réceptionner</>}
                          </Button>
                        )}

                        {/* زر الرفض (يظهر إذا كان معلق أو في الطريق + يملك صلاحية الرفض) */}
                        {['pending', 'in_transit'].includes(item.status) && hasPermission(PERMISSIONS.REJECT) && (
                          <Button size="icon" variant="ghost" onClick={() => handleTransferAction(item.id, 'reject')} disabled={actionLoading === item.id} className="text-red-500 hover:text-red-700 hover:bg-red-50" title="Rejeter">
                            <XCircle className="w-5 h-5" />
                          </Button>
                        )}
                        
                      </div>
                    </TableCell>

                  </TableRow>
                ))
              ) : (<TableRow><TableCell colSpan={6} className="h-48 text-center text-slate-500">Aucun transfert trouvé.</TableCell></TableRow>)}
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

    </div>
  );
}