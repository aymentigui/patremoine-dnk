"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Box, Tag } from "lucide-react";

interface ArticleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const initialFormData = {
  category_id: "",
  nom: "",
  numero_facture: "",
  date_facture: "",
  quantite_globale: 1,
  valeur_globale: 0,
  emplacement_id: "",
  marque: "",
  modele: "",
};

export function ArticleFormModal({ isOpen, onClose, onSuccess }: ArticleFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [emplacements, setEmplacements] = useState<any[]>([]);
  const [existingNames, setExistingNames] = useState<string[]>([]); // 🔹 خبينا فيها الأسماء القديمة باش نقترحوهم

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    if (!isOpen) return;

    // نجيبو التصنيفات والمواقع
    api.get("/categories?per_page=500").then(res => setCategories(res.data?.data?.data || res.data?.data || []));
    api.get("/emplacements?per_page=500").then(res => setEmplacements(res.data?.data?.data || res.data?.data || []));
    
    // 🔹 نجيبو أسماء الكتالوج باش نقترحوهم في الـ Input
    api.get("/articles?per_page=500").then(res => {
      const articles = res.data?.data || [];
      // نخرجو غير الأسماء وبدون تكرار (Unique)
      const names = Array.from(new Set(articles.map((a: any) => a.nom)));
      setExistingNames(names as string[]);
    });
  }, [isOpen]);

  const handleClose = () => {
    setFormData(initialFormData);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category_id || !formData.nom || !formData.emplacement_id) {
      return toast.error("Veuillez remplir les champs obligatoires.");
    }

    try {
      setLoading(true);
      await api.post("/articles", {
        ...formData,
        date_facture: formData.date_facture || null,
      });
      toast.success("Enregistrement réussi avec génération des QR Codes !");
      setFormData(initialFormData);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white shadow-2xl border-0 rounded-2xl">
        <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-slate-800">Nouvelle Entrée</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500">
                Ajouter une facture et générer les articles
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. Catégorie */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Catégorie <span className="text-red-500">*</span></label>
              <Select value={formData.category_id} onValueChange={(val) => setFormData({ ...formData, category_id: val || "" })}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (<SelectItem key={cat.id} value={cat.id.toString()}>{cat.nom}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Nom avec Datalist (Select or Type) */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Désignation (Nom) <span className="text-red-500">*</span></label>
              <Input 
                list="existing-articles" // 🔹 نربطوه مع الـ datalist لتحت
                placeholder="Ex: Micro Ordinateur HP..." 
                value={formData.nom} 
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })} 
                className="bg-white"
              />
              {/* 🔹 هادي هي اللي تخرجلو الاقتراحات كيبدا يكتب */}
              <datalist id="existing-articles">
                {existingNames.map((name, idx) => (
                  <option key={idx} value={name} />
                ))}
              </datalist>
            </div>

            {/* 3. Marque (Nouveau) */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Marque <span className="text-slate-400 font-normal">(Optionnel)</span></label>
              <Input 
                placeholder="Ex: HP, Canon, Michelin..." 
                value={formData.marque} 
                onChange={(e) => setFormData({ ...formData, marque: e.target.value })} 
              />
            </div>

            {/* 4. Modèle (Nouveau) */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Modèle <span className="text-slate-400 font-normal">(Optionnel)</span></label>
              <Input 
                placeholder="Ex: ProBook 450 G8..." 
                value={formData.modele} 
                onChange={(e) => setFormData({ ...formData, modele: e.target.value })} 
              />
            </div>

            {/* 5. Numéro Facture */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">N° Facture <span className="text-slate-400 font-normal">(Optionnel)</span></label>
              <Input 
                placeholder="Ex: FACT-2026-105" 
                value={formData.numero_facture} 
                onChange={(e) => setFormData({ ...formData, numero_facture: e.target.value })} 
              />
            </div>

            {/* 5. Date Facture (Nouveau) */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Date Achat</label>
              <Input 
                type="date" // يخرجلك التقويم مباشرة
                value={formData.date_facture} 
                onChange={(e) => setFormData({ ...formData, date_facture: e.target.value || "" })} 
              />
            </div>

            {/* 6. Emplacement Initiale */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Stockage Initial <span className="text-red-500">*</span></label>
              <Select value={formData.emplacement_id} onValueChange={(val) => setFormData({ ...formData, emplacement_id: val || "" })}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Bureau / Magasin" /></SelectTrigger>
                <SelectContent>
                  {emplacements.map((emp) => (<SelectItem key={emp.id} value={emp.id.toString()}>{emp.nom}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* 7. Quantité Globale */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Quantité (Pièces) <span className="text-red-500">*</span></label>
              <Input 
                type="number" min="1" 
                value={formData.quantite_globale} 
                onChange={(e) => setFormData({ ...formData, quantite_globale: parseInt(e.target.value) || 1 })} 
              />
            </div>

            {/* 8. Valeur Globale */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Valeur Globale (DA) <span className="text-red-500">*</span></label>
              <Input 
                type="number" min="0" step="0.01" 
                value={formData.valeur_globale} 
                onChange={(e) => setFormData({ ...formData, valeur_globale: parseFloat(e.target.value) || 0 })} 
              />
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Tag className="w-3 h-3"/> Coût Unitaire: {formData.quantite_globale > 0 ? (formData.valeur_globale / formData.quantite_globale).toFixed(2) : 0} DA
              </p>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t mt-6 bg-transparent px-0">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>Annuler</Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Création...</> : "Enregistrer et Générer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}