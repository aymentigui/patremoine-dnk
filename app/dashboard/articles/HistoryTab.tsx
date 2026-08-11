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
import { Loader2, Search, FileSpreadsheet, SlidersHorizontal, X, ChevronLeft, ChevronRight, QrCode, History, Clock, User, Activity, FileText } from "lucide-react";

// ==========================================
// 🔐 إدارة الصلاحيات (PERMISSIONS)
// ==========================================
const PERMISSIONS = {
  VIEW: "gerer_articles", // بناءً على الباك-اند، هذي الصلاحية تتحكم في العرض والتصدير تاع الأرشيف
};

// ==========================================
// 🎨 تصميم الأكشن (Action Badges)
// ==========================================
const formatActionBadge = (action: string) => {
  const formatted = action.replace(/_/g, ' ');
  return (
    <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
      {formatted}
    </span>
  );
};

export default function HistoryTab() {
  // 🔹 جلب دالة التحقق من الصلاحيات من الـ Store 🔹
  const hasPermission = useAuthStore((state) => state.hasPermission);

  // Data States
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Auxiliary Data
  const [users, setUsers] = useState<any[]>([]);

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
    old_value: "",
    new_value: "",
    remarque: "",
    action: [] as string[],
    user_id: [] as string[],
    date_debut: "",
    date_fin: "",
  });

  // قائمة الـ Actions الممكنة في السيستام
  const AVAILABLE_ACTIONS = [
    { id: 'creation_article', label: 'Création' },
    { id: 'statut_modifie', label: 'Changement de Statut' },
    { id: 'affectation_employee', label: 'Affectation Employé' },
    { id: 'transfert_emplacement', label: 'Transfert Emplacement' },
    { id: 'enrichissement_mobile', label: 'Enrichissement Mobile' }
  ];

  // Fetch Users for Filter
  useEffect(() => {
    // 🔹 حماية الـ API من الطلبات غير المصرح بها
    if (!hasPermission(PERMISSIONS.VIEW)) return;

    api.get("/users?per_page=500").then(res => {
      setUsers(res.data.data?.data || res.data.data || []);
    }).catch(() => {});
  }, [hasPermission]);

  // Fetch History
  const fetchHistory = useCallback(async () => {
    // 🔹 حماية الـ API من الطلبات غير المصرح بها
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

      const res = await api.get("/article-item-histories", { params });
      
      setData(res.data.data?.data || res.data.data || []);
      
      if (res.data.data?.last_page) {
        setLastPage(res.data.data.last_page);
        setTotal(res.data.data.total);
      }
    } catch (error) {
      toast.error("Erreur lors du chargement de l'historique.");
    } finally {
      setLoading(false);
    }
  }, [page, filters, hasPermission]);

  // Debounce API calls
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => { fetchHistory(); }, 600);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchHistory]);

  // Handlers
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const toggleMultiSelect = (key: 'action' | 'user_id', value: string) => {
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
      old_value: "", new_value: "", remarque: "", action: [], user_id: [], date_debut: "", date_fin: ""
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

      const res = await api.get("/article-item-histories/export", { params, responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Historique_Tracabilite_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Exportation réussie !", { id: toastId });
      setSelectedIds([]);
    } catch (error) {
      toast.error("Erreur lors de l'exportation.");
    }
  };

  // 🛡️ حماية الصفحة كاملة (بعد الـ Hooks)
  if (!hasPermission(PERMISSIONS.VIEW)) {
    return <div className="p-8 text-center text-slate-500">🚫 Vous n'avez pas l'autorisation de voir cette page.</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <History size={24} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Historique & Traçabilité</h1>
            <p className="text-sm text-slate-500 mt-1">Total enregistré : <strong className="text-purple-600">{total} Opérations</strong></p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className={`bg-white border-slate-200 ${showFilters ? 'text-purple-600 border-purple-200 bg-purple-50' : 'text-slate-700'}`}>
            <SlidersHorizontal className="w-4 h-4 mr-2" /> Filtres Avancés
          </Button>

          <Button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Exporter Excel
          </Button>
        </div>
      </div>

      {/* 🔹 ADVANCED FILTERS PANEL 🔹 */}
      {showFilters && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Search className="w-4 h-4 text-purple-500"/> Recherche dans l'archive</h3>
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

            {/* Target Article Inputs */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Article visé</label>
              <Input placeholder="Nom, Pneu, Bureau..." value={filters.nom_article} onChange={(e) => handleFilterChange("nom_article", e.target.value)} className="h-9 text-sm" />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Identifiants de l'article</label>
              <div className="flex gap-2">
                <Input placeholder="QR Code" value={filters.qr_code_reference} onChange={(e) => handleFilterChange("qr_code_reference", e.target.value)} className="h-9 text-sm w-1/2" />
                <Input placeholder="SN" value={filters.numero_serie_fabricant} onChange={(e) => handleFilterChange("numero_serie_fabricant", e.target.value)} className="h-9 text-sm w-1/2" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">N° Facture</label>
              <Input placeholder="Ex: F-01, FACT-..." value={filters.numero_facture} onChange={(e) => handleFilterChange("numero_facture", e.target.value)} className="h-9 text-sm" />
            </div>

            {/* History specific Inputs */}
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Valeurs (Avant / Après)</label>
              <div className="flex gap-2">
                <Input placeholder="Ancienne Valeur" value={filters.old_value} onChange={(e) => handleFilterChange("old_value", e.target.value)} className="h-9 text-sm w-1/2" />
                <Input placeholder="Nouvelle Valeur" value={filters.new_value} onChange={(e) => handleFilterChange("new_value", e.target.value)} className="h-9 text-sm w-1/2" />
              </div>
            </div>

            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Remarque / Justification</label>
              <Input placeholder="Mot clé dans la remarque..." value={filters.remarque} onChange={(e) => handleFilterChange("remarque", e.target.value)} className="h-9 text-sm" />
            </div>

            {/* MULTI-SELECTS (User & Action) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Type d'Action</label>
              <DropdownMenu>
                <DropdownMenuTrigger >
                  <Button variant="outline" className="w-full justify-between h-9 text-sm font-normal bg-white px-3 text-slate-600">
                    <span className="flex items-center gap-2 truncate">
                      <Activity className="w-4 h-4 text-slate-400" />
                      {filters.action.length > 0 ? `${filters.action.length} sélectionné(s)` : "Toutes les actions"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start">
                  {AVAILABLE_ACTIONS.map((opt) => (
                    <DropdownMenuItem key={opt.id} onSelect={(e) => e.preventDefault()} onClick={() => toggleMultiSelect('action', opt.id)} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={filters.action.includes(opt.id)} />
                      <span>{opt.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Effectué par (Utilisateur)</label>
              <DropdownMenu>
                <DropdownMenuTrigger >
                  <Button variant="outline" className="w-full justify-between h-9 text-sm font-normal bg-white px-3 text-slate-600">
                    <span className="flex items-center gap-2 truncate">
                      <User className="w-4 h-4 text-slate-400" />
                      {filters.user_id.length > 0 ? `${filters.user_id.length} sélectionné(s)` : "Tous les utilisateurs"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 max-h-60 overflow-y-auto" align="start">
                  {users.map((u) => (
                    <DropdownMenuItem key={u.id} onSelect={(e) => e.preventDefault()} onClick={() => toggleMultiSelect('user_id', u.id.toString())} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={filters.user_id.includes(u.id.toString())} />
                      <span className="truncate">{u.nom} {u.prenom}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Dates */}
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Période d'opération</label>
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
                <TableHead className="w-12 pl-4"><Checkbox checked={data.length > 0 && selectedIds.length === data.length} onCheckedChange={handleSelectAll} className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600" /></TableHead>
                <TableHead className="font-semibold text-slate-600 min-w-[140px]">Date & Opérateur</TableHead>
                <TableHead className="font-semibold text-slate-600">Action & Article</TableHead>
                <TableHead className="font-semibold text-slate-600 min-w-[250px]">Changements (De ➔ À)</TableHead>
                <TableHead className="font-semibold text-slate-600 w-[200px]">Remarque / Détails</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="h-64 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-500" /></TableCell></TableRow>
              ) : data.length > 0 ? (
                data.map((item) => (
                  <TableRow key={item.id} className={`group ${selectedIds.includes(item.id) ? "bg-purple-50/50" : "hover:bg-slate-50/50"}`}>
                    <TableCell className="pl-4"><Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)} className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600" /></TableCell>
                    
                    {/* Date & User */}
                    <TableCell>
                      <div className="text-[12px] font-bold text-slate-700 flex items-center gap-1.5"><Clock className="w-3 h-3 text-purple-500"/> {new Date(item.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' })}</div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                        <User className="w-3 h-3" /> {item.user ? `${item.user.nom} ${item.user.prenom}` : 'Système'}
                      </div>
                    </TableCell>

                    {/* Action & Article */}
                    <TableCell>
                      <div className="mb-1.5">{formatActionBadge(item.action)}</div>
                      <div className="font-medium text-sm text-slate-900 truncate max-w-[200px]">{item.article_item?.article?.nom || "Article Supprimé"}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5"><QrCode className="w-3 h-3 inline mr-1" />{item.article_item?.qr_code_reference} {item.article_item?.numero_facture ? `| F: ${item.article_item.numero_facture}` : ''}</div>
                    </TableCell>

                    {/* Changements (De -> À) */}
                    <TableCell>
                      {(!item.old_value && !item.new_value) ? (
                        <span className="text-slate-400 text-xs italic">— Pas de changements de valeur</span>
                      ) : (
                        <div className="flex flex-col gap-1 bg-slate-50 p-2 rounded-lg border border-slate-100 font-mono text-[11px]">
                          {item.old_value && <div className="text-slate-500 line-through truncate max-w-[280px]" title={item.old_value}>{item.old_value}</div>}
                          {item.new_value && <div className="text-purple-700 font-semibold truncate max-w-[280px]" title={item.new_value}>➔ {item.new_value}</div>}
                        </div>
                      )}
                    </TableCell>

                    {/* Remarque */}
                    <TableCell>
                      {item.remarque ? (
                        <div className="text-xs text-slate-600 flex items-start gap-2 bg-purple-50/50 p-2 rounded border border-purple-100">
                          <FileText className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-3 leading-tight" title={item.remarque}>{item.remarque}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </TableCell>

                  </TableRow>
                ))
              ) : (<TableRow><TableCell colSpan={5} className="h-48 text-center text-slate-500">Aucun historique trouvé avec ces filtres.</TableCell></TableRow>)}
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