"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

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
import { Loader2, Plus, Search, Eye, Download, Upload, FileSpreadsheet, Box, ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import { ArticleFormModal } from "@/components/articles/ArticleFormModal";

// ==========================================
// 🔐 إدارة الصلاحيات (PERMISSIONS)
// ==========================================
const PERMISSIONS = {
  MANAGE_ARTICLES: "gerer_articles", // في الباك-اند هذه الصلاحية تجمع (العرض، الإضافة، الاستيراد، التصدير)
};

// Format DZD
const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount);
};

export default function ArticlesTab() {
  const router = useRouter();
  
  // 🔹 جلب دالة التحقق من الصلاحيات من الـ Store 🔹
  const hasPermission = useAuthStore((state) => state.hasPermission);
  
  // Data States
  const [data, setData] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Filters States
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // 1. Fetch Categories for Filter
  useEffect(() => {
    if (!hasPermission(PERMISSIONS.MANAGE_ARTICLES)) return;
    api.get("/categories?per_page=100").then(res => setCategories(res.data.data?.data || res.data.data || []));
  }, [hasPermission]);

  // 2. Fetch Articles (With Pagination & Filters)
  const fetchArticles = useCallback(async () => {
    if (!hasPermission(PERMISSIONS.MANAGE_ARTICLES)) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params: any = { search, page, per_page: 12 };
      if (categoryFilter !== "all") params.category_id = categoryFilter;

      const res = await api.get("/articles", { params });
      
      setData(res.data.data || []);
      
      if (res.data.meta) {
        setLastPage(res.data.meta.last_page || 1);
        setTotal(res.data.meta.total || 0);
      } else {
        setLastPage(1);
        setTotal(res.data.data?.length || 0);
      }
      
    } catch (error) {
      toast.error("Erreur lors du chargement des articles.");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, page, hasPermission]);

  // Trigger fetch with Debounce for search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchArticles();
      setSelectedIds([]);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchArticles]);

  // Checkbox Handlers
  const handleSelectAll = (checked: boolean) => setSelectedIds(checked ? data.map(item => item.id) : []);
  const handleSelectItem = (id: number, checked: boolean) => setSelectedIds(prev => checked ? [...prev, id] : prev.filter(item => item !== id));

  // Export Logic
  const handleExport = async (type: 'normal' | 'detailed') => {
    try {
      const params: any = { type };
      if (selectedIds.length > 0) params.selected_ids = selectedIds;
      else {
        if (search) params.search = search;
        if (categoryFilter !== "all") params.category_id = categoryFilter;
      }

      const res = await api.get("/articles/export", { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Export_Inventaire_${type}_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      toast.success("Exportation réussie !");
      setSelectedIds([]);
    } catch (error) {
      toast.error("Erreur d'exportation.");
    }
  };

  // Download Template
  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get("/articles/template", { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'modele_import_articles.xlsx');
      document.body.appendChild(link);
      link.click();
      toast.success("Modèle téléchargé !");
    } catch (error) {
      toast.error("Erreur lors du téléchargement.");
    }
  };

  // Import Submit
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return toast.error("Veuillez sélectionner un fichier.");
    const formData = new FormData();
    formData.append("file", importFile);

    try {
      setImporting(true);
      await api.post("/articles/import", formData, { headers: { "Content-Type": "multipart/form-data" }});
      toast.success("Importation et génération des QR Codes réussies !");
      setIsImportModalOpen(false);
      setImportFile(null);
      fetchArticles();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur lors de l'importation.");
    } finally {
      setImporting(false);
    }
  };

  // 🛡️ حماية المحتوى كامل
  if (!hasPermission(PERMISSIONS.MANAGE_ARTICLES)) {
    return <div className="p-8 text-center text-slate-500">🚫 Accès refusé. Vous n'avez pas la permission de voir le catalogue.</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Box size={24} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Registre du Catalogue</h1>
            <p className="text-sm text-slate-500 mt-1">Total articles : <strong className="text-indigo-600">{total} Catégories/Lots</strong></p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {hasPermission(PERMISSIONS.MANAGE_ARTICLES) && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
                      <Download className="w-4 h-4 mr-2" /> Exporter {selectedIds.length > 0 && `(${selectedIds.length})`}
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleExport('normal')} className="cursor-pointer">
                    <FileDown className="w-4 h-4 mr-2 text-slate-500" /> Registre Global
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('detailed')} className="cursor-pointer">
                    <FileSpreadsheet className="w-4 h-4 mr-2 text-indigo-500" /> Détaillé (Avec QR Codes)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" onClick={() => setIsImportModalOpen(true)} className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
                <Upload className="w-4 h-4 mr-2 text-indigo-600" /> Importer
              </Button>

              <Button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Nouvelle Entrée
              </Button>
            </>
          )}
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Rechercher par nom de l'article..." 
              value={search} 
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }} 
              className="pl-9 bg-white border-slate-200 focus-visible:ring-indigo-500/30 rounded-lg shadow-sm" 
            />
          </div>
          <div className="w-full sm:w-64">
            <Select 
              value={categoryFilter} 
              onValueChange={(val) => {
                setCategoryFilter(val ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="bg-white border-slate-200 focus:ring-indigo-500/30 rounded-lg text-slate-600 shadow-sm">
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map((cat) => (<SelectItem key={cat.id} value={cat.id.toString()}>{cat.nom}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/80 border-b border-slate-100">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 pl-4"><Checkbox checked={data.length > 0 && selectedIds.length === data.length} onCheckedChange={handleSelectAll} className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" /></TableHead>
              <TableHead className="font-semibold text-slate-600">Désignation (Nom de l'Article)</TableHead>
              <TableHead className="font-semibold text-slate-600">Catégorie</TableHead>
              <TableHead className="text-center font-semibold text-slate-600">Quantité Globale</TableHead>
              <TableHead className="text-right font-semibold text-slate-600">Valeur Globale</TableHead>
              <TableHead className="text-right font-semibold text-slate-600 pr-6">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="h-64 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-500" /><p className="mt-2 text-sm text-slate-500">Chargement des données...</p></TableCell></TableRow>
            ) : data.length > 0 ? (
              data.map((art) => (
                <TableRow key={art.id} className={`group ${selectedIds.includes(art.id) ? "bg-indigo-50/50" : "hover:bg-slate-50/50"}`}>
                  <TableCell className="pl-4"><Checkbox checked={selectedIds.includes(art.id)} onCheckedChange={(checked) => handleSelectItem(art.id, checked as boolean)} className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" /></TableCell>
                  <TableCell className="font-medium text-slate-900">{art.nom}</TableCell>
                  <TableCell><span className="text-sm text-slate-600">{art.category_nom || "—"}</span></TableCell>
                  <TableCell className="text-center">
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-bold">{art.quantite_globale}</span>
                  </TableCell>
                  <TableCell className="text-right font-medium text-slate-800">{formatMoney(art.valeur_globale)}</TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/articles/${art.id}`)} className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-medium">
                      <Eye className="w-4 h-4 mr-2" /> Gérer les items
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (<TableRow><TableCell colSpan={6} className="h-48 text-center text-slate-500">Aucun enregistrement trouvé.</TableCell></TableRow>)}
          </TableBody>
        </Table>

        {/* PAGINATION SERVER-SIDE */}
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

      {/* MODALS */}
      {hasPermission(PERMISSIONS.MANAGE_ARTICLES) && (
        <>
          <ArticleFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchArticles} />

          <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white shadow-2xl border-0 rounded-2xl">
              <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Upload className="w-5 h-5" /></div>
                    <div>
                      <DialogTitle className="text-xl font-semibold text-slate-800">Importation Massive</DialogTitle>
                      <DialogDescription className="mt-1 text-sm text-slate-500">Importer depuis un fichier Excel (.xlsx)</DialogDescription>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <form onSubmit={handleImportSubmit} className="px-6 py-6 space-y-4">
                <div className="flex justify-end">
                  <Button type="button" variant="link" onClick={handleDownloadTemplate} className="text-indigo-600 h-auto p-0"><FileSpreadsheet className="w-4 h-4 mr-1"/> Télécharger le modèle officiel</Button>
                </div>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-500 transition-colors bg-slate-50/50">
                  <input 
                    type="file" accept=".xlsx, .xls, .csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                </div>
                <DialogFooter className="px-0 pt-4 border-t sm:justify-between items-center bg-transparent">
                  <Button type="button" variant="outline" onClick={() => setIsImportModalOpen(false)} disabled={importing}>Annuler</Button>
                  <Button type="submit" disabled={importing || !importFile} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px] rounded-lg">
                    {importing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Génération...</> : "Lancer l'importation"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}