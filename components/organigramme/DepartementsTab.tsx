"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import toast from "react-hot-toast";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Search, Edit, Trash2, Download, Upload, Building2, Bus, FileSpreadsheet } from "lucide-react";
import { DepartementFormModal } from "./DepartementFormModal";

export function DepartementsTab() {
  const [data, setData] = useState<any[]>([]);
  const [directions, setDirections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // الفلاتر
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDepartement, setSelectedDepartement] = useState<any | null>(null);

  // States لـ Modal الـ Import
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // جلب المديريات للفلتر الفوقاني
  useEffect(() => {
    api.get("/organigramme/directions").then(res => setDirections(res.data.data || []));
  }, []);

  const fetchDepartements = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { search, per_page: 100 };
      if (directionFilter !== "all") params.direction_id = directionFilter;

      const res = await api.get("/departements", { params });
      setData(res.data.data.data || res.data.data); 
    } catch (error) {
      toast.error("Erreur lors du chargement des départements.");
    } finally {
      setLoading(false);
    }
  }, [search, directionFilter]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchDepartements();
      setSelectedIds([]);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchDepartements]);

  // دوال الـ Checkboxes
  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? data.map(item => item.id) : []);
  };
  const handleSelectItem = (id: number, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(item => item !== id));
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer ce département ?")) return;
    try {
      await api.delete(`/departements/${id}`);
      toast.success("Département supprimé avec succès.");
      fetchDepartements();
      setSelectedIds(prev => prev.filter(item => item !== id));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur de suppression.");
    }
  };

  const handleExport = async () => {
    try {
      const params: any = {};
      if (selectedIds.length > 0) params.selected_ids = selectedIds;
      else {
        if (search) params.search = search;
        if (directionFilter !== "all") params.direction_id = directionFilter;
      }

      const res = await api.get("/departements/export", { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `departements_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      toast.success("Exportation réussie !");
      setSelectedIds([]);
    } catch (error) {
      toast.error("Erreur d'exportation.");
    }
  };

  // تحميل نموذج الإكسيل (Template)
  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get("/departements/template", { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'modele_departements.xlsx');
      document.body.appendChild(link);
      link.click();
      toast.success("Modèle téléchargé avec succès !");
    } catch (error) {
      toast.error("Erreur lors du téléchargement du modèle.");
    }
  };

  // إرسال ملف الإكسيل للباكاند
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      toast.error("Veuillez sélectionner un fichier Excel.");
      return;
    }

    const formData = new FormData();
    formData.append("file", importFile);

    try {
      setImporting(true);
      await api.post("/departements/import", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Importation réussie !");
      setIsImportModalOpen(false);
      setImportFile(null);
      fetchDepartements();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur lors de l'importation.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Toolbar: Search + Filter + Actions */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Rechercher..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200 focus-visible:bg-white focus-visible:ring-indigo-500/30 rounded-lg transition-all"
            />
          </div>
          
          {/* Filter Direction */}
          <div className="w-full sm:w-56">
            <Select value={directionFilter} onValueChange={(val) => setDirectionFilter(val ?? "all")}>
              <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-indigo-500/30 rounded-lg text-slate-600">
                <SelectValue placeholder="Toutes les directions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les directions</SelectItem>
                {directions.map((dir) => (
                  <SelectItem key={dir.id} value={dir.id.toString()}>{dir.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
          {/* زر تحميل النموذج */}
          <Button variant="outline" onClick={handleDownloadTemplate} className="text-slate-600 bg-white border-slate-200 hover:bg-slate-50">
            <FileSpreadsheet className="w-4 h-4 mr-2 text-indigo-600" /> Modèle
          </Button>

          {/* زر الاستيراد */}
          <Button variant="outline" onClick={() => setIsImportModalOpen(true)} className="text-slate-600 bg-white border-slate-200 hover:bg-slate-50">
            <Upload className="w-4 h-4 mr-2 text-indigo-600" /> Importer
          </Button>

          <Button 
            variant="outline" 
            onClick={handleExport} 
            className={`text-slate-600 bg-white border-slate-200 transition-all ${selectedIds.length > 0 ? "border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100" : "hover:bg-slate-50"}`}
          >
            <Download className="w-4 h-4 mr-2" /> 
            {selectedIds.length > 0 ? `Exporter (${selectedIds.length})` : search || directionFilter !== "all" ? "Exporter le filtre" : "Tout Exporter"}
          </Button>
          
          <Button onClick={() => { setSelectedDepartement(null); setIsModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Ajouter
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50 border-b border-slate-100">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 pl-4">
                <Checkbox 
                  checked={data.length > 0 && selectedIds.length === data.length}
                  onCheckedChange={handleSelectAll}
                  className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                />
              </TableHead>
              <TableHead className="font-semibold text-slate-600">Code</TableHead>
              <TableHead className="font-semibold text-slate-600">Département</TableHead>
              <TableHead className="font-semibold text-slate-600">Direction affiliée</TableHead>
              <TableHead className="font-semibold text-slate-600">Parc affilié</TableHead> 
              <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-500" />
                  <p className="mt-2 text-sm text-slate-500">Chargement...</p>
                </TableCell>
              </TableRow>
            ) : data.length > 0 ? (
              data.map((dep) => (
                <TableRow 
                  key={dep.id} 
                  className={`group transition-colors ${selectedIds.includes(dep.id) ? "bg-indigo-50/50 hover:bg-indigo-50" : "hover:bg-slate-50/50"}`}
                >
                  <TableCell className="pl-4">
                    <Checkbox 
                      checked={selectedIds.includes(dep.id)}
                      onCheckedChange={(checked) => handleSelectItem(dep.id, checked as boolean)}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                    />
                  </TableCell>
                  <TableCell>
                    <span className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-md text-xs font-bold tracking-wider">
                      {dep.code}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-900 font-medium">{dep.nom}</TableCell>
                  <TableCell>
                    {dep.direction ? (
                      <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100/70 px-2 py-1 rounded-md w-max">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" /> {dep.direction.nom}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {dep.parc ? (
                      <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100/70 px-2 py-1 rounded-md w-max">
                        <Bus className="w-3.5 h-3.5 text-slate-400" /> {dep.parc.nom}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedDepartement(dep); setIsModalOpen(true); }} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 h-8 w-8">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(dep.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                  Aucun département trouvé.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal الإضافة والتعديل */}
      <DepartementFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        departementToEdit={selectedDepartement} 
        onSuccess={fetchDepartements}
      />

      {/* Modal الاستيراد (Import Modal) */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white shadow-2xl border-0 rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-slate-800">Importer des départements</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-slate-500">Sélectionnez un fichier Excel rempli (.xlsx)</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleImportSubmit} className="px-6 py-6 space-y-4">
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-500 transition-colors bg-slate-50/50">
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
              <p className="mt-2 text-xs text-slate-400">Assurez-vous d'utiliser le modèle officiel.</p>
            </div>

            <DialogFooter className="px-0 pt-4 border-t sm:justify-between items-center bg-transparent">
              <Button type="button" variant="outline" onClick={() => setIsImportModalOpen(false)} disabled={importing}>Annuler</Button>
              <Button type="submit" disabled={importing || !importFile} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px] rounded-lg">
                {importing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importation...</> : "Importer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}