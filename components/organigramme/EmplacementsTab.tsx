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
import { Loader2, Plus, Search, Edit, Trash2, Download, Upload, Bus, FileSpreadsheet } from "lucide-react";
import { EmplacementFormModal } from "./EmplacementFormModal";

const getTypeBadge = (type: string) => {
  const styles: any = {
    bureau: "bg-blue-100 text-blue-700",
    entrepot: "bg-purple-100 text-purple-700",
    garage: "bg-zinc-100 text-zinc-700",
    atelier: "bg-orange-100 text-orange-700",
    autre: "bg-slate-100 text-slate-700",
  };
  return <span className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase ${styles[type] || styles.autre}`}>{type}</span>;
};

export function EmplacementsTab() {
  const [data, setData] = useState<any[]>([]);
  const [parcs, setParcs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  const [parcFilter, setParcFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmplacement, setSelectedEmplacement] = useState<any | null>(null);

  // States لـ Modal الـ Import
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    api.get("/parcs?per_page=100").then(res => setParcs(res.data.data?.data || res.data.data || []));
  }, []);

  const fetchEmplacements = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { search, per_page: 100 };
      if (parcFilter !== "all") params.parc_id = parcFilter;

      const res = await api.get("/emplacements", { params });
      setData(res.data.data.data || res.data.data); 
    } catch (error) {
      toast.error("Erreur de chargement des emplacements.");
    } finally {
      setLoading(false);
    }
  }, [search, parcFilter]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => { fetchEmplacements(); setSelectedIds([]); }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchEmplacements]);

  const handleSelectAll = (checked: boolean) => setSelectedIds(checked ? data.map(item => item.id) : []);
  const handleSelectItem = (id: number, checked: boolean) => setSelectedIds(prev => checked ? [...prev, id] : prev.filter(item => item !== id));

  const handleDelete = async (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer cet emplacement ?")) return;
    try {
      await api.delete(`/emplacements/${id}`);
      toast.success("Emplacement supprimé avec succès.");
      fetchEmplacements();
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
        if (parcFilter !== "all") params.parc_id = parcFilter;
      }
      const res = await api.get("/emplacements/export", { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `emplacements_${new Date().getTime()}.xlsx`);
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
      const res = await api.get("/emplacements/template", { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'modele_emplacements.xlsx');
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
      await api.post("/emplacements/import", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Importation réussie !");
      setIsImportModalOpen(false);
      setImportFile(null);
      fetchEmplacements();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur lors de l'importation.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-slate-50 border-slate-200 focus-visible:bg-white focus-visible:ring-orange-500/30 rounded-lg" />
          </div>
          <div className="w-full sm:w-64">
            <Select value={parcFilter} onValueChange={(val)=> setParcFilter(val??"all")}>
              <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-orange-500/30 rounded-lg text-slate-600">
                <SelectValue placeholder="Tous les parcs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les parcs</SelectItem>
                {parcs.map((parc) => (
                  <SelectItem key={parc.id} value={parc.id.toString()}>{parc.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
          {/* زر تحميل النموذج */}
          <Button variant="outline" onClick={handleDownloadTemplate} className="text-slate-600 bg-white border-slate-200 hover:bg-slate-50">
            <FileSpreadsheet className="w-4 h-4 mr-2 text-orange-600" /> Modèle
          </Button>

          {/* زر الاستيراد */}
          <Button variant="outline" onClick={() => setIsImportModalOpen(true)} className="text-slate-600 bg-white border-slate-200 hover:bg-slate-50">
            <Upload className="w-4 h-4 mr-2 text-orange-600" /> Importer
          </Button>

          <Button variant="outline" onClick={handleExport} className={`text-slate-600 bg-white border-slate-200 ${selectedIds.length > 0 ? "border-orange-300 bg-orange-50 text-orange-700" : "hover:bg-slate-50"}`}>
            <Download className="w-4 h-4 mr-2" /> 
            {selectedIds.length > 0 ? `Exporter (${selectedIds.length})` : search || parcFilter !== "all" ? "Exporter le filtre" : "Tout Exporter"}
          </Button>
          
          <Button onClick={() => { setSelectedEmplacement(null); setIsModalOpen(true); }} className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Ajouter
          </Button>
        </div>
      </div>

      <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50 border-b border-slate-100">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 pl-4"><Checkbox checked={data.length > 0 && selectedIds.length === data.length} onCheckedChange={handleSelectAll} className="data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600" /></TableHead>
              <TableHead className="font-semibold text-slate-600">Nom de l&apos;emplacement</TableHead>
              <TableHead className="font-semibold text-slate-600">Type</TableHead>
              <TableHead className="font-semibold text-slate-600">Parc affilié</TableHead>
              <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="h-48 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" /><p className="mt-2 text-sm text-slate-500">Chargement...</p></TableCell></TableRow>
            ) : data.length > 0 ? (
              data.map((emp) => (
                <TableRow key={emp.id} className={`group ${selectedIds.includes(emp.id) ? "bg-orange-50/50 hover:bg-orange-50" : "hover:bg-slate-50/50"}`}>
                  <TableCell className="pl-4"><Checkbox checked={selectedIds.includes(emp.id)} onCheckedChange={(checked) => handleSelectItem(emp.id, checked as boolean)} className="data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600" /></TableCell>
                  <TableCell className="text-slate-900 font-medium">{emp.nom}</TableCell>
                  <TableCell>{getTypeBadge(emp.type)}</TableCell>
                  <TableCell>
                    {emp.parc ? (
                      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 bg-slate-100/70 px-2 py-1 rounded-md w-max">
                        <Bus className="w-3.5 h-3.5 text-orange-500" /> {emp.parc.nom}
                      </div>
                    ) : (<span className="text-slate-400 text-sm">—</span>)}
                  </TableCell>
                  <TableCell className="text-right align-middle">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedEmplacement(emp); setIsModalOpen(true); }} className="text-slate-400 hover:text-orange-600 hover:bg-orange-50 h-8 w-8"><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (<TableRow><TableCell colSpan={5} className="h-32 text-center text-slate-500">Aucun emplacement trouvé.</TableCell></TableRow>)}
          </TableBody>
        </Table>
      </div>

      {/* Modal الإضافة والتعديل */}
      <EmplacementFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} emplacementToEdit={selectedEmplacement} onSuccess={fetchEmplacements} />

      {/* Modal الاستيراد (Import Modal) */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white shadow-2xl border-0 rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-slate-800">Importer des emplacements</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-slate-500">Sélectionnez un fichier Excel rempli (.xlsx)</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleImportSubmit} className="px-6 py-6 space-y-4">
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-orange-500 transition-colors bg-slate-50/50">
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
              />
              <p className="mt-2 text-xs text-slate-400">Assurez-vous d'utiliser le modèle officiel.</p>
            </div>

            <DialogFooter className="px-0 pt-4 border-t sm:justify-between items-center bg-transparent">
              <Button type="button" variant="outline" onClick={() => setIsImportModalOpen(false)} disabled={importing}>Annuler</Button>
              <Button type="submit" disabled={importing || !importFile} className="bg-orange-600 hover:bg-orange-700 text-white min-w-[120px] rounded-lg">
                {importing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importation...</> : "Importer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}