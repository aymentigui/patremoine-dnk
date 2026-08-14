"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Box, Tag, QrCode } from "lucide-react";

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

  // 🔹 States pour la gestion des QR Codes 🔹
  const [qrGenerationMode, setQrGenerationMode] = useState<"auto" | "manual">("auto");
  const [manualQRCodesText, setManualQRCodesText] = useState("");

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
    setQrGenerationMode("auto");
    setManualQRCodesText("");
    onClose();
  };

  // 🔹 الدالة اللي تفلتر وتحسب شحال كاين من كود QR
  const getParsedQRCodes = () => {
    return manualQRCodesText
      .split(/[\n,]+/) // نقسمو بالسطر الجديد أو الفاصلة
      .map(code => code.trim()) // نحو الفراغات
      .filter(code => code !== ""); // نحو الأسطر الفارغة
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category_id || !formData.nom || !formData.emplacement_id) {
      return toast.error("Veuillez remplir les champs obligatoires.");
    }

    const parsedQRCodes = getParsedQRCodes();

    // 🔥 التحقق من عدد أكواد الـ QR إذا كان الإدخال يدويا
    if (qrGenerationMode === "manual") {
      if (parsedQRCodes.length !== formData.quantite_globale) {
        return toast.error(`Erreur: Vous avez saisi ${parsedQRCodes.length} codes QR, mais la quantité globale est de ${formData.quantite_globale}. Les deux doivent correspondre.`);
      }
    }

    try {
      setLoading(true);
      
      // تحضير البيانات للإرسال
      const payload: any = {
        ...formData,
        date_facture: formData.date_facture || null,
      };

      // إذا خير المانيال، نبعثو الأكواد في الـ payload (الباك اند راح يقرأهم كيما سقمناه مقبل)
      if (qrGenerationMode === "manual") {
        payload.qr_codes = parsedQRCodes;
      }

      await api.post("/articles", payload);
      
      toast.success(
        qrGenerationMode === "manual" 
          ? "Enregistrement réussi avec vos propres QR Codes !" 
          : "Enregistrement réussi avec génération automatique des QR Codes !"
      );
      
      handleClose();
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  const parsedLength = getParsedQRCodes().length;

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

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
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

            {/* 6. Date Facture */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Date Achat</label>
              <Input 
                type="date" 
                value={formData.date_facture} 
                onChange={(e) => setFormData({ ...formData, date_facture: e.target.value || "" })} 
              />
            </div>

            {/* 7. Emplacement Initiale */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Stockage Initial <span className="text-red-500">*</span></label>
              <Select value={formData.emplacement_id} onValueChange={(val) => setFormData({ ...formData, emplacement_id: val || "" })}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Bureau / Magasin" /></SelectTrigger>
                <SelectContent>
                  {emplacements.map((emp) => (<SelectItem key={emp.id} value={emp.id.toString()}>{emp.nom}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* 8. Quantité Globale */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Quantité (Pièces) <span className="text-red-500">*</span></label>
              <Input 
                type="number" min="1" 
                value={formData.quantite_globale} 
                onChange={(e) => setFormData({ ...formData, quantite_globale: parseInt(e.target.value) || 1 })} 
              />
            </div>

            {/* 9. Valeur Globale */}
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

            {/* 🔥 قسم أكواد الـ QR الجديد 🔥 */}
            <div className="col-span-1 md:col-span-2 pt-4 border-t border-slate-100 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-indigo-600" /> Options des Codes QR
                </label>
                <div className="flex flex-col sm:flex-row gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      value="auto" 
                      checked={qrGenerationMode === "auto"} 
                      onChange={() => setQrGenerationMode("auto")} 
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-sm font-medium text-slate-700">Génération Automatique</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      value="manual" 
                      checked={qrGenerationMode === "manual"} 
                      onChange={() => setQrGenerationMode("manual")} 
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-sm font-medium text-slate-700">Saisie Manuelle (Existants)</span>
                  </label>
                </div>
              </div>

              {/* Textarea تظهر فقط في حالة الـ Manuel */}
              {qrGenerationMode === "manual" && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                  <label className="text-sm font-semibold text-slate-700 flex justify-between items-center">
                    <span>Codes QR <span className="text-xs text-slate-400 font-normal">(1 par ligne ou séparés par virgule)</span> <span className="text-red-500">*</span></span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${parsedLength === formData.quantite_globale ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {parsedLength} / {formData.quantite_globale} codes
                    </span>
                  </label>
                  <textarea
                    value={manualQRCodesText}
                    onChange={(e) => setManualQRCodesText(e.target.value)}
                    className="w-full min-h-[120px] p-3 text-sm font-mono border border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-inner"
                    placeholder="QR-12345&#10;QR-12346&#10;QR-12347..."
                  />
                  {parsedLength !== formData.quantite_globale && manualQRCodesText.trim() !== "" && (
                    <p className="text-xs text-red-500 mt-1">
                      ⚠️ Le nombre de codes scannés ne correspond pas à la quantité globale.
                    </p>
                  )}
                </div>
              )}
            </div>

          </div>

          <DialogFooter className="pt-4 border-t mt-6 bg-transparent px-0">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>Annuler</Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Création...</> : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}