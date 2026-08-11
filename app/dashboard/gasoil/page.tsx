"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import toast from "react-hot-toast";

// Auth Components
import { PermissionGuard } from "@/components/auth/PermissionGuard";

// UI Components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// Icons
import { Loader2, Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, Droplet, Building2, Plus, Edit, AlertCircle, CheckCircle2, TrendingDown, Download } from "lucide-react";
import { Can } from "@/components/auth/Can";

// ==========================================
// 🔐 PERMISSIONS & UTILS
// ==========================================
const PERMISSIONS = {
  MANAGE: "gerer_gasoil",
};

const formatMoney = (amount: number) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount);
const formatVolume = (amount: number) => new Intl.NumberFormat('fr-DZ', { maximumFractionDigits: 2 }).format(amount) + ' L';

const MOIS = [
  { id: 1, label: "Janvier" }, { id: 2, label: "Février" }, { id: 3, label: "Mars" },
  { id: 4, label: "Avril" }, { id: 5, label: "Mai" }, { id: 6, label: "Juin" },
  { id: 7, label: "Juillet" }, { id: 8, label: "Août" }, { id: 9, label: "Septembre" },
  { id: 10, label: "Octobre" }, { id: 11, label: "Novembre" }, { id: 12, label: "Décembre" }
];

export default function GasoilTrackingPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Aux Data
  const [parcs, setParcs] = useState<any[]>([]);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState({
    parc_id: "all",
    annee: currentYear.toString(),
    mois: "all"
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    parc_id: "",
    annee: currentYear,
    mois: new Date().getMonth() + 1,
    initial_stock: "",
    added_qty: "",
    consumed_qty: "",
    physical_stock: "",
    unit_price: ""
  });

  // --- Initial Loads ---
  useEffect(() => {
    api.get("/organigramme/tree").then(res => setParcs(res.data.data || []));
  }, []);

  const fetchTrackings = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, per_page: 12 };
      if (filters.parc_id !== "all") params.parc_id = filters.parc_id;
      if (filters.annee !== "all") params.annee = filters.annee;
      if (filters.mois !== "all") params.mois = filters.mois;

      const res = await api.get("/gasoil-trackings", { params });
      setData(res.data.data || []);
      if (res.data.meta) {
        setLastPage(res.data.meta.last_page);
        setTotal(res.data.meta.total);
      }
    } catch (error) { toast.error("Erreur lors du chargement des données."); } 
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => {
    fetchTrackings();
  }, [fetchTrackings]);

  // --- Handlers ---
  const handleFilterChange = (key: string, value: any) => { setFilters(prev => ({ ...prev, [key]: value })); setPage(1); };
  const clearFilters = () => { setFilters({ parc_id: "all", annee: currentYear.toString(), mois: "all" }); setPage(1); };

  const openModal = (item: any = null) => {
    if (item) {
      setFormData({
        parc_id: item.parc_id?.toString() || "",
        annee: item.annee,
        mois: item.mois,
        initial_stock: item.initial_stock?.toString() || "",
        added_qty: item.added_qty?.toString() || "",
        consumed_qty: item.consumed_qty?.toString() || "",
        physical_stock: item.physical_stock?.toString() || "",
        unit_price: item.unit_price?.toString() || ""
      });
    } else {
      setFormData({
        parc_id: "", annee: currentYear, mois: new Date().getMonth() + 1,
        initial_stock: "", added_qty: "", consumed_qty: "", physical_stock: "", unit_price: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.parc_id || !formData.annee || !formData.mois || formData.initial_stock === "" || !formData.unit_price) {
      return toast.error("Veuillez remplir les champs obligatoires (*).");
    }

    try {
      setActionLoading(true);
      await api.post("/gasoil-trackings", formData);
      toast.success("Enregistrement sauvegardé avec succès !");
      setIsModalOpen(false);
      fetchTrackings();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur de sauvegarde.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const toastId = toast.loading("Génération du fichier Excel...");
      const params: any = {};
      if (filters.parc_id !== "all") params.parc_id = filters.parc_id;
      if (filters.annee !== "all") params.annee = filters.annee;
      if (filters.mois !== "all") params.mois = filters.mois;

      const res = await api.get("/gasoil-trackings/export", { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a'); 
      link.href = url; 
      link.setAttribute('download', `Suivi_Gasoil_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      
      toast.success("Exportation réussie !", { id: toastId });
    } catch (error) { toast.error("Erreur d'exportation."); }
  };

  return (
    <PermissionGuard permission={PERMISSIONS.MANAGE}>
      <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 lg:p-8 space-y-6">
        
        {/* 🔹 HEADER 🔹 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Droplet size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Suivi du Gasoil</h1>
              <p className="text-sm text-slate-500 mt-1">Gestion des stocks et écarts de carburant par parc</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className={`bg-white border-slate-200 ${showFilters ? 'text-orange-600 border-orange-200 bg-orange-50' : 'text-slate-700'}`}>
              <SlidersHorizontal className="w-4 h-4 mr-2" /> Filtres
            </Button>

            <Can permission={PERMISSIONS.MANAGE}>
              <Button onClick={() => openModal()} className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Ajouter / Modifier
              </Button>
            </Can>
            <Can permission={PERMISSIONS.MANAGE}>
              <Button variant="outline" onClick={handleExport} className="text-emerald-600 border-slate-200 hover:bg-emerald-50">
                <Download className="w-4 h-4 mr-2" /> Exporter Excel
              </Button>
            </Can>
          </div>
        </div>

        {/* 🔹 FILTERS PANEL 🔹 */}
        {showFilters && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Search className="w-4 h-4 text-orange-500"/> Filtres de recherche</h3>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500 hover:text-red-600 h-8"><X className="w-4 h-4 mr-1"/> Réinitialiser</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Parc / Structure</label>
                <Select value={filters.parc_id} onValueChange={v => handleFilterChange('parc_id', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Tous les parcs" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Tous les parcs</SelectItem>{parcs.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.nom}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Année</label>
                <Select value={filters.annee} onValueChange={v => handleFilterChange('annee', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Année" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {[...Array(5)].map((_, i) => { const y = currentYear - i; return <SelectItem key={y} value={y.toString()}>{y}</SelectItem>; })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Mois</label>
                <Select value={filters.mois} onValueChange={v => handleFilterChange('mois', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Tous les mois" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les mois</SelectItem>
                    {MOIS.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
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
                  <TableHead className="font-semibold text-slate-600 pl-6">Période & Parc</TableHead>
                  <TableHead className="font-semibold text-slate-600">Mouvements (L)</TableHead>
                  <TableHead className="font-semibold text-slate-600">Stock Théorique</TableHead>
                  <TableHead className="font-semibold text-slate-600">Stock Jaugé (Physique)</TableHead>
                  <TableHead className="font-semibold text-slate-600">Écart</TableHead>
                  <TableHead className="font-semibold text-slate-600">Valorisation Écart</TableHead>
                  <TableHead className="text-right font-semibold text-slate-600 pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="h-64 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" /></TableCell></TableRow>
                ) : data.length > 0 ? (
                  data.map((item) => {
                    const monthName = MOIS.find(m => m.id === item.mois)?.label || item.mois;
                    const ecart = item.ecart || 0;
                    
                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50/50 group">
                        <TableCell className="pl-6">
                          <div className="font-bold text-slate-900 text-sm">{monthName} {item.annee}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"><Building2 className="w-3 h-3 text-indigo-400"/> {item.parc?.nom || 'Inconnu'}</div>
                        </TableCell>

                        <TableCell>
                          <div className="text-xs text-slate-500 mb-0.5">Initial : <span className="font-semibold text-slate-700">{formatVolume(item.initial_stock)}</span></div>
                          <div className="text-xs text-blue-600 mb-0.5">+ Ajouts : {formatVolume(item.added_qty || 0)}</div>
                          <div className="text-xs text-orange-600">- Conso : {formatVolume(item.consumed_qty || 0)}</div>
                        </TableCell>

                        <TableCell>
                          <div className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border inline-block">
                            {formatVolume(item.theoretical_stock || 0)}
                          </div>
                        </TableCell>

                        <TableCell>
                          {item.physical_stock !== null ? (
                            <div className="font-bold text-slate-800 bg-white border border-slate-200 px-2 py-1 rounded inline-block shadow-sm">
                              {formatVolume(item.physical_stock)}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Non jaugé</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {item.physical_stock !== null ? (
                            <div className={`flex items-center gap-1.5 font-bold text-sm ${ecart < 0 ? 'text-red-600' : ecart > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                              {ecart < 0 ? <TrendingDown className="w-4 h-4"/> : ecart === 0 ? <CheckCircle2 className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
                              {formatVolume(ecart)}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {item.physical_stock !== null ? (
                            <div className={`text-xs font-semibold px-2 py-1 rounded w-max border ${ecart < 0 ? 'bg-red-50 border-red-100 text-red-700' : ecart > 0 ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                              {formatMoney(Math.abs(ecart * (item.unit_price || 0)))}
                            </div>
                          ) : <span className="text-xs text-slate-400">—</span>}
                          <div className="text-[10px] text-slate-400 mt-1">PU: {item.unit_price} DZD/L</div>
                        </TableCell>

                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <Can permission={PERMISSIONS.MANAGE}>
                              <Button variant="ghost" size="sm" onClick={() => openModal(item)} className="text-orange-600 hover:text-orange-700 hover:bg-orange-50">
                                <Edit className="w-4 h-4 mr-2" /> Éditer
                              </Button>
                            </Can>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (<TableRow><TableCell colSpan={7} className="h-48 text-center text-slate-500">Aucun suivi trouvé.</TableCell></TableRow>)}
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
        {/* 🔹 MODAL: ADD / UPDATE 🔹 */}
        {/* ========================================== */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white rounded-2xl">
            <DialogHeader className="px-6 py-5 border-b bg-orange-50/50">
              <DialogTitle className="text-xl font-bold text-orange-700">Saisie des données Gasoil</DialogTitle>
              <DialogDescription className="text-sm text-slate-600">Renseignez les mouvements du mois. Le stock théorique sera calculé automatiquement.</DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Parc / Structure *</label>
                <Select value={formData.parc_id} onValueChange={v => setFormData({...formData, parc_id: v??""})}>
                  <SelectTrigger><SelectValue placeholder="Choisir un parc" /></SelectTrigger>
                  <SelectContent>
                    {parcs.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.nom}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Année *</label>
                  <Input type="number" required value={formData.annee} onChange={e => setFormData({...formData, annee: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Mois *</label>
                  <Select value={formData.mois.toString()} onValueChange={v => setFormData({...formData, mois: parseInt(v??"0")})}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      {MOIS.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Stock Initial (L) *</label>
                  <Input type="number" step="0.01" required placeholder="0.00" value={formData.initial_stock} onChange={e => setFormData({...formData, initial_stock: e.target.value})} />
                </div>
                <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Prix Unitaire (DZD/L) *</label>
                  <Input type="number" step="0.01" required placeholder="0.00" value={formData.unit_price} onChange={e => setFormData({...formData, unit_price: e.target.value})} />
                </div>
                <div className="space-y-1.5"><label className="text-xs font-semibold text-blue-600">Quantité Ajoutée (L)</label>
                  <Input type="number" step="0.01" placeholder="0.00" value={formData.added_qty} onChange={e => setFormData({...formData, added_qty: e.target.value})} className="border-blue-200 bg-blue-50/30" />
                </div>
                <div className="space-y-1.5"><label className="text-xs font-semibold text-orange-600">Quantité Consommée (L)</label>
                  <Input type="number" step="0.01" placeholder="0.00" value={formData.consumed_qty} onChange={e => setFormData({...formData, consumed_qty: e.target.value})} className="border-orange-200 bg-orange-50/30" />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="space-y-1.5"><label className="text-xs font-bold text-emerald-700 flex items-center gap-2">Stock Jaugé (Physique) à la fin du mois <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Optionnel</span></label>
                  <Input type="number" step="0.01" placeholder="Valeur relevée sur le terrain..." value={formData.physical_stock} onChange={e => setFormData({...formData, physical_stock: e.target.value})} className="border-emerald-300 focus-visible:ring-emerald-500 shadow-inner" />
                  <p className="text-[10px] text-slate-500">Laissez vide si le jaugeage n'a pas encore été effectué.</p>
                </div>
              </div>

              <DialogFooter className="pt-4 mt-6 px-0">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={actionLoading} className="bg-orange-600 hover:bg-orange-700 text-white min-w-[120px]">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Enregistrer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </PermissionGuard>
  );
}