"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, Upload, FileSpreadsheet, Trash2 } from "lucide-react";

export default function NomenclaturesTabContent() {
  const [data, setData] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [nom, setNom] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [nomRes, catRes] = await Promise.all([
        api.get("/articles/nomenclatures"),
        api.get("/categories")
      ]);
      setData(nomRes.data?.data || []);
      setCategories(catRes.data?.data || []);
      console.log(catRes.data?.data)
    } catch (error) { toast.error("Erreur de chargement."); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom || !categoryId || !subCategoryId) return toast.error("Le nom et la catégorie sont obligatoires.");
    setSubmitting(true);
    try {
      await api.post("/articles/nomenclature", { nom, category_id: categoryId, sous_categorie_id: subCategoryId  });
      toast.success("Nomenclature ajoutée au catalogue !");
      setNom(""); setCategoryId(""); setSubCategoryId("");
      fetchData();
    } catch (error) { toast.error("Erreur lors de l'ajout."); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Voulez-vous supprimer ce nom ? Attention, ça supprimera le stock lié s'il existe !")) return;
    try {
      await api.delete(`/articles/${id}`);
      toast.success("Nomenclature supprimée !");
      fetchData();
    } catch (error) { toast.error("Impossible de supprimer."); }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get("/articles/nomenclatures/template", { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', 'modele_nomenclatures.xlsx');
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
      await api.post("/articles/nomenclatures/import", formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Importation réussie !");
      fetchData();
    } catch (error) { toast.error("Erreur lors de l'importation."); }
    finally { setImporting(false); e.target.value = ''; }
  };

  const selectedCatObj = categories.find(c => c.id.toString() === categoryId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-max">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Définir un nom (Nomenclature)</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700">Catégorie *</label>
            <Select value={categoryId} onValueChange={(val) => { setCategoryId(val); setSubCategoryId(""); }}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nom}</SelectItem>)}</SelectContent>
            </Select>
          </div>
         <div>
            <label className="text-sm font-semibold text-slate-700">Sous-catégorie *</label>
            <Select value={subCategoryId} onValueChange={setSubCategoryId}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="Sélectionner la sous-catégorie..." /></SelectTrigger>
              <SelectContent>
                {selectedCatObj?.sub_categories?.map((sub: any) => (
                  <SelectItem key={sub.id} value={sub.id.toString()}>{sub.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(!selectedCatObj?.sub_categories || selectedCatObj.sub_categories.length === 0) && categoryId !== "" && (
               <p className="text-xs text-red-500 mt-1">⚠️ Cette catégorie n'a pas de sous-catégories. Créez-en une d'abord.</p>
            )}
          </div>
          <div><label className="text-sm font-semibold text-slate-700">Désignation Officielle *</label><Input value={nom} onChange={e => setNom(e.target.value.toUpperCase())} placeholder="Ex: MICRO ORDINATEUR HP..." /></div>
          
          <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ajouter au Catalogue"}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
          <h3 className="text-sm font-bold text-slate-800">Importer des Nomenclatures</h3>
          <Button variant="outline" onClick={handleDownloadTemplate} className="w-full justify-start text-blue-600 border-blue-200 bg-blue-50"><FileSpreadsheet className="w-4 h-4 mr-2"/> Télécharger le modèle</Button>
          <label className="flex items-center justify-center w-full px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md cursor-pointer hover:bg-indigo-100 transition-colors text-sm font-medium">
            {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Upload className="w-4 h-4 mr-2"/>} {importing ? "Importation..." : "Importer Excel"}
            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
        </div>
      </div>

      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden max-h-[600px] overflow-y-auto">
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0"><TableRow><TableHead>Désignation (Nom)</TableHead><TableHead>Catégorie</TableHead><TableHead>Sous-catégorie</TableHead><TableHead className="text-right pr-4">Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500"/></TableCell></TableRow> 
            : data.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-500">Aucune nomenclature définie.</TableCell></TableRow> 
            : data.map(nom => (
              <TableRow key={nom.id}>
                <TableCell className="font-bold text-slate-800">{nom.nom}</TableCell>
                <TableCell className="text-slate-500 text-sm">{nom.category?.nom || "—"}</TableCell>
                <TableCell className="text-slate-500 text-sm">{nom.subCategory?.nom || nom.sub_category?.nom || "—"}</TableCell>
                <TableCell className="text-right pr-4">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(nom.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}