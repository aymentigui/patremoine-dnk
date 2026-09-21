"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, Edit } from "lucide-react";

export default function SubCategoriesTabContent() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [nom, setNom] = useState("");
  const [code, setCode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get("/categories");
      setCategories(res.data?.data || []);
    } catch (error) { toast.error("Erreur de chargement."); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom || !categoryId) return toast.error("Nom et catégorie mère obligatoires.");
    setSubmitting(true);
    try {
      if (editId) {
        await api.put(`/sub-categories/${editId}`, { nom, code, category_id: categoryId });
        toast.success("Sous-catégorie modifiée !");
      } else {
        await api.post(`/categories/${categoryId}/sub-categories`, { nom, code });
        toast.success("Sous-catégorie ajoutée !");
      }
      setNom(""); setCode(""); setCategoryId(""); setEditId(null);
      fetchCategories(); // Refresh tree
    } catch (error) { toast.error("Erreur."); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Voulez-vous supprimer cette sous-catégorie ?")) return;
    try {
      await api.delete(`/sub-categories/${id}`);
      toast.success("Supprimée !");
      fetchCategories();
    } catch (error) { toast.error("Impossible de supprimer."); }
  };

  // Flatten the tree for the table
  const flattenedData = categories.flatMap(cat => 
    (cat.sub_categories || []).map((sub: any) => ({ ...sub, category_nom: cat.nom }))
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-max">
        <h2 className="text-lg font-bold text-slate-800 mb-4">{editId ? "Modifier Sous-Catégorie" : "Nouvelle Sous-Catégorie"}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700">Catégorie Mère *</label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nom}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><label className="text-sm font-semibold text-slate-700">Nom *</label><Input value={nom} onChange={e => setNom(e.target.value)} /></div>
          <div><label className="text-sm font-semibold text-slate-700">Code (Optionnel)</label><Input value={code} onChange={e => setCode(e.target.value)} /></div>
          <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? "Mettre à jour" : "Ajouter"}
          </Button>
          {editId && <Button type="button" variant="outline" className="w-full mt-2" onClick={() => { setEditId(null); setNom(""); setCode(""); setCategoryId(""); }}>Annuler</Button>}
        </form>
      </div>

      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden max-h-[600px] overflow-y-auto">
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0"><TableRow><TableHead>Sous-catégorie</TableHead><TableHead>Catégorie Mère</TableHead><TableHead>Code</TableHead><TableHead className="text-right pr-4">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500"/></TableCell></TableRow> 
            : flattenedData.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-500">Aucune sous-catégorie.</TableCell></TableRow> 
            : flattenedData.map(sub => (
              <TableRow key={sub.id}>
                <TableCell className="font-semibold">{sub.nom}</TableCell>
                <TableCell className="text-slate-500 text-sm">{sub.category_nom}</TableCell>
                <TableCell className="font-mono text-xs text-slate-500">{sub.code || "—"}</TableCell>
                <TableCell className="text-right pr-4">
                  <Button variant="ghost" size="icon" onClick={() => { setEditId(sub.id); setNom(sub.nom); setCode(sub.code || ""); setCategoryId(sub.category_id.toString()); }} className="text-blue-500"><Edit className="w-4 h-4"/></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(sub.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}