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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

// Icons
import { Loader2, Search, FileSpreadsheet, SlidersHorizontal, X, ChevronLeft, ChevronRight, Plus, Download, UploadCloud, MapPin, Building2, Landmark, Home, Map, ScrollText } from "lucide-react";
import { Can } from "@/components/auth/Can";

// ==========================================
// 🔐 PERMISSIONS & UTILS
// ==========================================
const PERMISSIONS = {
  VIEW: "voir_immobilier",
  ADD: "ajouter_immobilier",
  IMPORT: "importer_immobilier",
  EXPORT: "exporter_immobilier",
};

const formatMoney = (amount: number) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount);
const formatArea = (amount: number) => new Intl.NumberFormat('fr-DZ').format(amount) + ' m²';

// --- Badges Helpers ---
const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = { 
    'exploite': 'bg-emerald-100 text-emerald-700 border-emerald-200', 
    'en_construction': 'bg-blue-100 text-blue-700 border-blue-200', 
    'loue': 'bg-purple-100 text-purple-700 border-purple-200',
    'inutilise': 'bg-slate-100 text-slate-700 border-slate-200'
  };
  const labels: any = { 'exploite': 'Exploité', 'en_construction': 'En Construction', 'loue': 'Loué', 'inutilise': 'Inutilisé' };
  return <Badge className={`${styles[status]} font-bold`}>{labels[status] || status}</Badge>;
};

const NatureBadge = ({ nature }: { nature: string }) => {
  const styles: any = { 
    'propriete': 'text-emerald-600', 
    'affectation_etat': 'text-orange-600', 
    'location': 'text-blue-600'
  };
  const labels: any = { 'propriete': 'Propriété', 'affectation_etat': 'Affectation État', 'location': 'Location' };
  return <span className={`text-xs font-semibold ${styles[nature]}`}>{labels[nature] || nature}</span>;
};

const TypeIcon = ({ type }: { type: string }) => {
  if (type === 'terrain') return <Map className="w-4 h-4 text-emerald-600" />;
  if (type === 'batiment') return <Building2 className="w-4 h-4 text-blue-600" />;
  if (type === 'garage' || type === 'parking') return <Home className="w-4 h-4 text-orange-600" />;
  return <Landmark className="w-4 h-4 text-slate-600" />;
};

export default function RealEstatesPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Aux Data
  const [parcs, setParcs] = useState<any[]>([]);

  // Pagination & Selection
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Forms
  const [formData, setFormData] = useState({
    nom: "", parc_id: "all", type: "", nature_propriete: "", superficie: "", adresse: "",
    coordonnees_gps: "", numero_acte: "", livret_foncier: "", date_acquisition: "", valeur_acquisition: "", status: ""
  });
  const [documents, setDocuments] = useState<File[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    search: "", type: "all", nature_propriete: "all", status: "all", parc_id: "all", min_superficie: "", max_superficie: ""
  });

  // --- Initial Loads ---
  useEffect(() => {
    api.get("/organigramme/tree").then(res => setParcs(res.data.data || []));
  }, []);

  const fetchRealEstates = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, per_page: 15 };
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") params[key] = value;
      });

      const res = await api.get("/real-estates", { params });
      setData(res.data.data || []);
      if (res.data.last_page) {
        setLastPage(res.data.last_page);
        setTotal(res.data.total);
      }
    } catch (error) { toast.error("Erreur lors du chargement des biens immobiliers."); } 
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => {
    const delay = setTimeout(() => { fetchRealEstates(); }, 500);
    return () => clearTimeout(delay);
  }, [fetchRealEstates]);

  // --- Handlers ---
  const handleFilterChange = (key: string, value: any) => { setFilters(prev => ({ ...prev, [key]: value })); setPage(1); };
  const clearFilters = () => { 
    setFilters({ search: "", type: "all", nature_propriete: "all", status: "all", parc_id: "all", min_superficie: "", max_superficie: "" }); 
    setPage(1); 
  };

  const handleSelectAll = (checked: boolean) => setSelectedIds(checked ? data.map(item => item.id) : []);
  const handleSelectItem = (id: number, checked: boolean) => setSelectedIds(prev => checked ? [...prev, id] : prev.filter(item => item !== id));

  // --- API Actions ---
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom || !formData.type || !formData.nature_propriete || !formData.status) {
      return toast.error("Veuillez remplir les champs obligatoires (*).");
    }

    const payload = new FormData();
    Object.entries(formData).forEach(([k, v]) => {
      if (v && v !== "all") payload.append(k, v);
    });
    
    documents.forEach(file => payload.append('documents[]', file));

    try {
      setActionLoading(true);
      await api.post("/real-estates", payload, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Bien immobilier ajouté avec succès !");
      setIsAddModalOpen(false);
      setFormData({ nom: "", parc_id: "all", type: "", nature_propriete: "", superficie: "", adresse: "", coordonnees_gps: "", numero_acte: "", livret_foncier: "", date_acquisition: "", valeur_acquisition: "", status: "" });
      setDocuments([]);
      fetchRealEstates();
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || "Erreur de sauvegarde.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excelFile) return toast.error("Fichier Excel requis.");
    const payload = new FormData(); payload.append("fichier_excel", excelFile);
    
    try {
      setActionLoading(true);
      await api.post("/real-estates/import-excel", payload, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Données importées avec succès !");
      setIsImportModalOpen(false); setExcelFile(null); fetchRealEstates();
    } catch (err: any) { toast.error("Erreur lors de l'importation."); }
    finally { setActionLoading(false); }
  };

  const executeExport = async () => {
    try {
      const toastId = toast.loading("Génération de l'Excel...");
      const params: any = {};
      if (selectedIds.length > 0) {
        params.selected_ids = selectedIds; 
      } else {
        Object.entries(filters).forEach(([k, v]) => { if (v && v !== "all") params[k] = v; });
      }

      const res = await api.get("/real-estates/export", { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a'); link.href = url; 
      link.setAttribute('download', `Patrimoine_Immobilier_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      
      toast.success("Exportation réussie !", { id: toastId });
      setSelectedIds([]);
    } catch (error) { toast.error("Erreur d'exportation."); }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get("/real-estates/import-template", { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a'); link.href = url; link.setAttribute('download', 'template_immobilier.xlsx');
      document.body.appendChild(link); link.click();
    } catch (error) { toast.error("Erreur téléchargement."); }
  };

  return (
    <PermissionGuard permission={PERMISSIONS.VIEW}>
      <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 lg:p-8 space-y-6">
        
        {/* 🔹 HEADER 🔹 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Landmark size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Patrimoine Immobilier</h1>
              <p className="text-sm text-slate-500 mt-1">Total : <strong className="text-teal-600">{total} Biens</strong></p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Rechercher (Nom, Acte...)" value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} className="pl-9 w-64 bg-slate-50 border-slate-200" />
            </div>

            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className={`bg-white border-slate-200 ${showFilters ? 'text-teal-600 border-teal-200 bg-teal-50' : 'text-slate-700'}`}>
              <SlidersHorizontal className="w-4 h-4 mr-2" /> Filtres
            </Button>

            <Can permission={PERMISSIONS.EXPORT}>
              <Button variant="outline" onClick={executeExport} className="text-emerald-600 border-slate-200 hover:bg-emerald-50">
                <Download className="w-4 h-4 mr-2" /> Exporter
              </Button>
            </Can>

            <Can permission={PERMISSIONS.IMPORT}>
              <DropdownMenu>
                <DropdownMenuTrigger >
                  <Button variant="outline" className="text-blue-600 border-slate-200 hover:bg-blue-50">Import <ChevronRight className="w-4 h-4 ml-2 rotate-90"/></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDownloadTemplate} className="cursor-pointer font-medium"><Download className="w-4 h-4 mr-2 text-slate-500" /> Modèle Excel</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsImportModalOpen(true)} className="cursor-pointer font-medium"><UploadCloud className="w-4 h-4 mr-2 text-blue-600" /> Uploader Fichier</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Can>

            <Can permission={PERMISSIONS.ADD}>
              <Button onClick={() => setIsAddModalOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Ajouter un bien
              </Button>
            </Can>
          </div>
        </div>

        {/* 🔹 BULK ACTIONS TOOLBAR 🔹 */}
        {selectedIds.length > 0 && (
          <div className="bg-teal-700 text-white p-3 rounded-xl shadow-lg flex items-center justify-between gap-4 animate-in slide-in-from-top-4 sticky top-4 z-50">
            <div className="flex items-center gap-3 px-2">
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">{selectedIds.length}</span>
              <span className="text-sm font-medium">Biens sélectionnés</span>
            </div>
            <Can permission={PERMISSIONS.EXPORT}>
              <Button size="sm" variant="secondary" onClick={executeExport} className="bg-white text-teal-700 hover:bg-teal-50 border-0"><FileSpreadsheet className="w-4 h-4 mr-2"/> Exporter la sélection</Button>
            </Can>
          </div>
        )}

        {/* 🔹 FILTERS PANEL 🔹 */}
        {showFilters && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Search className="w-4 h-4 text-teal-500"/> Recherche Avancée</h3>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500 hover:text-red-600 h-8"><X className="w-4 h-4 mr-1"/> Réinitialiser</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Type de bien</label>
                <Select value={filters.type} onValueChange={v => handleFilterChange('type', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Tous" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="terrain">Terrain</SelectItem><SelectItem value="batiment">Bâtiment</SelectItem>
                    <SelectItem value="garage">Garage</SelectItem><SelectItem value="parking">Parking</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Nature Juridique</label>
                <Select value={filters.nature_propriete} onValueChange={v => handleFilterChange('nature_propriete', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Toutes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="propriete">Propriété (Acte)</SelectItem>
                    <SelectItem value="affectation_etat">Affectation de l'État</SelectItem>
                    <SelectItem value="location">Location</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Statut (État)</label>
                <Select value={filters.status} onValueChange={v => handleFilterChange('status', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Tous" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="exploite">Exploité</SelectItem><SelectItem value="en_construction">En Construction</SelectItem>
                    <SelectItem value="loue">Loué</SelectItem><SelectItem value="inutilise">Inutilisé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Affectation (Parc)</label>
                <Select value={filters.parc_id} onValueChange={v => handleFilterChange('parc_id', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Tous" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {parcs.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.nom}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Superficie (m²)</label>
                <div className="flex gap-2">
                  <Input type="number" placeholder="Min" value={filters.min_superficie} onChange={e => handleFilterChange('min_superficie', e.target.value)} className="h-9 text-sm" />
                  <Input type="number" placeholder="Max" value={filters.max_superficie} onChange={e => handleFilterChange('max_superficie', e.target.value)} className="h-9 text-sm" />
                </div>
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
                  <TableHead className="w-12 pl-4"><Checkbox checked={data.length > 0 && selectedIds.length === data.length} onCheckedChange={handleSelectAll} className="data-[state=checked]:bg-teal-600" /></TableHead>
                  <TableHead className="font-semibold text-slate-600">Bien & Type</TableHead>
                  <TableHead className="font-semibold text-slate-600">Nature & Superficie</TableHead>
                  <TableHead className="font-semibold text-slate-600">Localisation (Parc)</TableHead>
                  <TableHead className="font-semibold text-slate-600">Valeur & Acquisition</TableHead>
                  <TableHead className="text-center font-semibold text-slate-600">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="h-64 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-500" /></TableCell></TableRow>
                ) : data.length > 0 ? (
                  data.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <TableRow key={item.id} className={`group ${isSelected ? "bg-teal-50/50" : "hover:bg-slate-50/50"}`}>
                        <TableCell className="pl-4"><Checkbox checked={isSelected} onCheckedChange={(c) => handleSelectItem(item.id, c as boolean)} className="data-[state=checked]:bg-teal-600" /></TableCell>
                        
                        <TableCell>
                          <div className="font-bold text-slate-900 text-sm">{item.nom}</div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5"><TypeIcon type={item.type}/> {item.type.charAt(0).toUpperCase() + item.type.slice(1)}</div>
                          {item.numero_acte && <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-1"><ScrollText className="w-3 h-3"/> Acte: {item.numero_acte}</div>}
                        </TableCell>

                        <TableCell>
                          <NatureBadge nature={item.nature_propriete} />
                          <div className="text-xs font-semibold text-slate-700 mt-1">{item.superficie ? formatArea(item.superficie) : '— m²'}</div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm font-medium text-slate-800">{item.parc?.nom || 'Structure Centrale'}</div>
                          {item.adresse && <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 max-w-[200px] truncate" title={item.adresse}><MapPin className="w-3 h-3 shrink-0"/> {item.adresse}</div>}
                        </TableCell>

                        <TableCell>
                          <div className="font-semibold text-teal-700 text-sm">{item.valeur_acquisition ? formatMoney(item.valeur_acquisition) : '—'}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">Acquis le: {item.date_acquisition ? new Date(item.date_acquisition).toLocaleDateString() : '—'}</div>
                        </TableCell>

                        <TableCell className="text-center"><StatusBadge status={item.status} /></TableCell>
                      </TableRow>
                    );
                  })
                ) : (<TableRow><TableCell colSpan={6} className="h-48 text-center text-slate-500">Aucun bien immobilier trouvé.</TableCell></TableRow>)}
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

        {/* Modal: Ajout */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-white rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="px-6 py-5 border-b bg-teal-50/50 sticky top-0 z-10 backdrop-blur-md">
              <DialogTitle className="text-xl font-bold text-teal-800">Ajouter un bien immobilier</DialogTitle>
              <DialogDescription className="text-sm text-slate-600">Renseignez les informations physiques et juridiques du bien.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="px-6 py-5 space-y-6">
              
              {/* Section 1: Infos Générales */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2">Informations Générales</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2"><label className="text-xs font-semibold text-slate-700">Nom / Désignation *</label><Input required value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} placeholder="Ex: Terrain Siège Dely Brahim..." /></div>
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Type de bien *</label>
                    <Select required value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                      <SelectContent><SelectItem value="terrain">Terrain</SelectItem><SelectItem value="batiment">Bâtiment</SelectItem><SelectItem value="garage">Garage</SelectItem><SelectItem value="parking">Parking</SelectItem><SelectItem value="autre">Autre</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Nature Juridique *</label>
                    <Select required value={formData.nature_propriete} onValueChange={v => setFormData({...formData, nature_propriete: v})}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                      <SelectContent><SelectItem value="propriete">Propriété (Acte)</SelectItem><SelectItem value="affectation_etat">Affectation de l'État</SelectItem><SelectItem value="location">Location</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Statut Actuel *</label>
                    <Select required value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                      <SelectContent><SelectItem value="exploite">Exploité</SelectItem><SelectItem value="en_construction">En Construction</SelectItem><SelectItem value="loue">Loué à des tiers</SelectItem><SelectItem value="inutilise">Inutilisé</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Affecté au Parc</label>
                    <Select value={formData.parc_id} onValueChange={v => setFormData({...formData, parc_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Structure Centrale" /></SelectTrigger>
                      <SelectContent><SelectItem value="all">Structure Centrale</SelectItem>{parcs.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.nom}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section 2: Localisation & Physique */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2">Localisation & Dimensions</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2"><label className="text-xs font-semibold text-slate-700">Adresse Complète</label><Input value={formData.adresse} onChange={e => setFormData({...formData, adresse: e.target.value})} placeholder="Rue, Commune, Wilaya..." /></div>
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Coordonnées GPS</label><Input value={formData.coordonnees_gps} onChange={e => setFormData({...formData, coordonnees_gps: e.target.value})} placeholder="Lat, Lng" /></div>
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Superficie (m²)</label><Input type="number" step="0.01" value={formData.superficie} onChange={e => setFormData({...formData, superficie: e.target.value})} placeholder="0.00" /></div>
                </div>
              </div>

              {/* Section 3: Juridique & Financier */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2">Informations Juridiques & Financières</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">N° d'Acte Notarié</label><Input value={formData.numero_acte} onChange={e => setFormData({...formData, numero_acte: e.target.value})} /></div>
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">N° Livret Foncier</label><Input value={formData.livret_foncier} onChange={e => setFormData({...formData, livret_foncier: e.target.value})} /></div>
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Date d'Acquisition</label><Input type="date" value={formData.date_acquisition} onChange={e => setFormData({...formData, date_acquisition: e.target.value})} /></div>
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Valeur d'Acquisition (DZD)</label><Input type="number" step="0.01" value={formData.valeur_acquisition} onChange={e => setFormData({...formData, valeur_acquisition: e.target.value})} placeholder="0.00" /></div>
                </div>
              </div>

              {/* Fichiers */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="text-xs font-semibold text-slate-700">Documents Mappés (Actes, Plans...) - PDF/JPG</label>
                <Input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={e => setDocuments(Array.from(e.target.files || []))} className="file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:text-xs file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
                {documents.length > 0 && <p className="text-xs text-teal-600 mt-1">{documents.length} fichier(s) sélectionné(s).</p>}
              </div>

              <DialogFooter className="pt-4 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={actionLoading} className="bg-teal-600 hover:bg-teal-700 text-white min-w-[120px]">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Sauvegarder le Bien"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Import Excel */}
        <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
          <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white rounded-2xl shadow-xl">
            <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
              <div className="flex items-center gap-3"><div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FileSpreadsheet className="w-5 h-5" /></div><div><DialogTitle className="text-xl font-semibold text-slate-800">Importer Patrimoine (Excel)</DialogTitle></div></div>
            </DialogHeader>
            <form onSubmit={handleImportSubmit} className="px-6 py-6 space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-500 transition-colors bg-slate-50/50">
                <input type="file" accept=".xlsx, .xls, .csv" onChange={(e) => setExcelFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 cursor-pointer" />
              </div>
              <DialogFooter className="px-0 pt-4 border-t bg-transparent">
                <Button type="button" variant="outline" onClick={() => setIsImportModalOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={actionLoading || !excelFile} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">{actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Importer"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </PermissionGuard>
  );
}