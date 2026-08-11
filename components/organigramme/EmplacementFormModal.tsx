"use client";

import { useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/axios";
import toast from "react-hot-toast";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin } from "lucide-react";

// 🔥 Schema مبسط: نحتاجو غير parc_id
const formSchema = z.object({
  parc_id: z.string().min(1, "Le parc est requis"),
  nom: z.string().min(2, "Le nom est requis"),
  type: z.enum(['bureau', 'entrepot', 'garage', 'atelier', 'autre'], { message: "Le type est requis" }),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  emplacementToEdit?: any | null;
  onSuccess: () => void;
}

export function EmplacementFormModal({ isOpen, onClose, emplacementToEdit, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [parcs, setParcs] = useState<any[]>([]);
  const isEdit = !!emplacementToEdit;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { parc_id: "", nom: "", type: "bureau" }
  });

  useEffect(() => {
    if (isOpen) {
      // 🔥 نجبدو غير الباركات لأنو البارك راهو مستقل
      api.get("/parcs?per_page=100")
        .then(res => setParcs(res.data.data?.data || res.data.data || []))
        .catch(() => toast.error("Erreur de chargement des parcs"));

      if (emplacementToEdit) {
        form.reset({
          parc_id: emplacementToEdit.parc_id?.toString() || "",
          nom: emplacementToEdit.nom,
          type: emplacementToEdit.type,
        });
      } else {
        form.reset({ parc_id: "", nom: "", type: "bureau" });
      }
    }
  }, [isOpen, emplacementToEdit, form]);

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);
      const payload = {
        parc_id: parseInt(data.parc_id),
        nom: data.nom,
        type: data.type,
      };

      if (isEdit) {
        await api.put(`/emplacements/${emplacementToEdit.id}`, payload);
        toast.success("Emplacement modifié avec succès !");
      } else {
        await api.post("/emplacements", payload);
        toast.success("Emplacement créé avec succès !");
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "bg-slate-50 border-slate-200 focus-visible:bg-white focus-visible:ring-orange-500/30 focus-visible:border-orange-500 transition-all rounded-lg";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white shadow-2xl border-0 rounded-2xl">
        
        <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-slate-800">
                {isEdit ? "Modifier l'emplacement" : "Nouvel Emplacement"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500">
                Définissez la localisation exacte.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form id="form-emplacement" onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-6 space-y-6">
          <FieldGroup className="space-y-4">
            
            <Controller name="parc_id" control={form.control} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-slate-700 font-medium">Parc affilié <span className="text-red-500">*</span></FieldLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className={inputClass}><SelectValue placeholder="Choisir un parc..." /></SelectTrigger>
                  <SelectContent>
                    {parcs.map((parc: any) => (<SelectItem key={parc.id} value={parc.id.toString()}>{parc.nom}</SelectItem>))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />

            <Controller name="nom" control={form.control} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-slate-700 font-medium">Nom de l&apos;emplacement <span className="text-red-500">*</span></FieldLabel>
                <Input {...field} placeholder="Ex: Bureau 204 / Atelier Mécanique" className={inputClass} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />

            <Controller name="type" control={form.control} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-slate-700 font-medium">Type <span className="text-red-500">*</span></FieldLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className={inputClass}><SelectValue placeholder="Type..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bureau">Bureau</SelectItem>
                    <SelectItem value="entrepot">Entrepôt</SelectItem>
                    <SelectItem value="garage">Garage</SelectItem>
                    <SelectItem value="atelier">Atelier</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />
          </FieldGroup>
        </form>

        <DialogFooter className="px-6 py-4 border-t bg-slate-50/80 sm:justify-between items-center">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="bg-white">Annuler</Button>
          <Button type="submit" form="form-emplacement" disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white min-w-[120px] rounded-lg">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Patientez...</> : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}