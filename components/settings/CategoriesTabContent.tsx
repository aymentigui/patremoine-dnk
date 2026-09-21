"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Download, Upload, FileSpreadsheet, Trash2, Edit } from "lucide-react";

export default function CategoriesTabContent() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States pour ajouter/modifier
  const [nom, setNom] = useState("");
  const [code, setCode] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get("/categories");
      setData(res.data?.data || []);
    } catch (error) {
      toast.error("Erreur de chargement des catégories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom) return toast.error("Le nom est obligatoire.");
    setSubmitting(true);
    try {
      if (editId) {
        await api.put(`/categories/${editId}`, { nom, code });
        toast.success("Catégorie modifiée !");
      } else {
        await api.post("/categories", { nom, code });
        toast.success("Catégorie ajoutée !");
      }
      setNom(""); setCode(""); setEditId(null);
      fetchCategories();
    } catch (error) { toast.error("Erreur lors de l'enregistrement."); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer cette catégorie ?")) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success("Catégorie supprimée !");
      fetchCategories();
    } catch (error) { toast.error("Impossible de supprimer cette catégorie."); }
  };

  // --- IMPORT / EXPORT EXCEL ---
  const handleExport = async () => {
    try {
      const res = await api.get("/categories/export/excel", { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', `Categories_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link); link.click();
      toast.success("Exportation réussie !");
    } catch (error) { toast.error("Erreur d'exportation."); }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get("/categories/template/download", { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', 'modele_categories.xlsx');
      document.body.appendChild(link); link.click();
    } catch (error) { toast.error("Erreur de téléchargement du modèle."); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setImporting(true);
    try {
      await api.post("/categories/import", formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Importation réussie !");
      fetchCategories();
    } catch (error) { toast.error("Erreur lors de l'importation."); }
    finally { setImporting(false); e.target.value = ''; }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-max">
        <h2 className="text-lg font-bold text-slate-800 mb-4">{editId ? "Modifier la Catégorie" : "Nouvelle Catégorie"}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="text-sm font-semibold text-slate-700">Nom de la catégorie *</label><Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: Informatique..." /></div>
          <div><label className="text-sm font-semibold text-slate-700">Code (Optionnel)</label><Input value={code} onChange={e => setCode(e.target.value)} placeholder="Ex: INFO" /></div>
          <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? "Mettre à jour" : "Ajouter"}
          </Button>
          {editId && <Button type="button" variant="outline" className="w-full mt-2" onClick={() => { setEditId(null); setNom(""); setCode(""); }}>Annuler</Button>}
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
          <h3 className="text-sm font-bold text-slate-800">Actions Excel (Catégories & Sous-Catégories)</h3>
          <Button variant="outline" onClick={handleExport} className="w-full justify-start text-emerald-600 border-emerald-200 bg-emerald-50"><Download className="w-4 h-4 mr-2"/> Exporter la liste</Button>
          <Button variant="outline" onClick={handleDownloadTemplate} className="w-full justify-start text-blue-600 border-blue-200 bg-blue-50"><FileSpreadsheet className="w-4 h-4 mr-2"/> Télécharger le modèle</Button>
          <label className="flex items-center justify-center w-full px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md cursor-pointer hover:bg-indigo-100 transition-colors text-sm font-medium">
            {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Upload className="w-4 h-4 mr-2"/>} {importing ? "Importation..." : "Importer le fichier rempli"}
            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
        </div>
      </div>

      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50"><TableRow><TableHead>Nom</TableHead><TableHead>Code</TableHead><TableHead className="text-center">Sous-Catégories</TableHead><TableHead className="text-right pr-4">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500"/></TableCell></TableRow> : data.map(cat => (
              <TableRow key={cat.id}>
                <TableCell className="font-semibold">{cat.nom}</TableCell>
                <TableCell className="font-mono text-xs text-slate-500">{cat.code || "—"}</TableCell>
                <TableCell className="text-center"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{cat.sub_categories?.length || 0}</span></TableCell>
                <TableCell className="text-right pr-4">
                  <Button variant="ghost" size="icon" onClick={() => { setEditId(cat.id); setNom(cat.nom); setCode(cat.code || ""); }} className="text-blue-500"><Edit className="w-4 h-4"/></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}