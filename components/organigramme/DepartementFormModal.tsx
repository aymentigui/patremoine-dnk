"use client";

import { useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/axios";
import toast from "react-hot-toast";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Briefcase } from "lucide-react";

// 1. في الـ Schema الفوق زيدي هاد السطر:
const formSchema = z.object({
  direction_id: z.string().min(1, "La direction est requise"),
  parc_id: z.string().min(1, "Le parc est requis"), // 🔥 هادي تزادت
  nom: z.string().min(2, "Le nom est requis"),
  code: z.string().min(1, "Le code est requis"),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  departementToEdit?: any | null;
  onSuccess: () => void;  
}

export function DepartementFormModal({ isOpen, onClose, departementToEdit, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [directions, setDirections] = useState<any[]>([]);
  const isEdit = !!departementToEdit;
  const [parcs, setParcs] = useState<any[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { direction_id: "", nom: "", code: "" }
  });

  // جلب قائمة المديريات باش نعمرو الـ Select
  useEffect(() => {
    if (isOpen) {
      Promise.all([
        api.get("/organigramme/directions"),
        api.get("/parcs?per_page=100") // نجبدو الباركات ثاني
      ]).then(([dirRes, parcRes]) => {
        setDirections(dirRes.data.data || []);
        // الباركات يجو داخل data.data لأن فيهم pagination
        setParcs(parcRes.data.data?.data || parcRes.data.data || []);
      }).catch(() => toast.error("Erreur de chargement des données"));

      if (departementToEdit) {
        form.reset({
          direction_id: departementToEdit.direction_id?.toString(),
          parc_id: departementToEdit.parc_id?.toString(), // 🔥 هادي تزادت
          nom: departementToEdit.nom,
          code: departementToEdit.code,
        });
      } else {
        form.reset({ direction_id: "", parc_id: "", nom: "", code: "" });
      }
    }
  }, [isOpen, departementToEdit, form]);

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);
      const payload = { ...data, direction_id: parseInt(data.direction_id), parc_id: parseInt(data.parc_id) };

      if (isEdit) {
        await api.put(`/departements/${departementToEdit.id}`, payload);
        toast.success("Département modifié avec succès !");
      } else {
        await api.post("/departements", payload);
        toast.success("Département créé avec succès !");
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "bg-slate-50 border-slate-200 focus-visible:bg-white focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500 transition-all rounded-lg";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white shadow-2xl border-0 rounded-2xl">
        
        <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-slate-800">
                {isEdit ? "Modifier le département" : "Nouveau Département"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500">
                Liez ce département à sa direction mère.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form id="form-departement" onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-6 space-y-6">
          <FieldGroup className="space-y-5">
            <Controller name="direction_id" control={form.control} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-slate-700 font-medium">Direction affiliée <span className="text-red-500">*</span></FieldLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className={inputClass} aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Sélectionner une direction..." />
                  </SelectTrigger>
                  <SelectContent>
                    {directions.map((dir) => (
                      <SelectItem key={dir.id} value={dir.id.toString()}>{dir.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />
            <Controller name="parc_id" control={form.control} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-slate-700 font-medium">Parc affilié <span className="text-red-500">*</span></FieldLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className={inputClass} aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Sélectionner un parc..." />
                  </SelectTrigger>
                  <SelectContent>
                    {parcs.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
)} />

            <Controller name="nom" control={form.control} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-slate-700 font-medium">Nom du département <span className="text-red-500">*</span></FieldLabel>
                <Input {...field} placeholder="Ex: Département Exploitation" className={inputClass} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />

            <Controller name="code" control={form.control} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-slate-700 font-medium">Code (Abréviation) <span className="text-red-500">*</span></FieldLabel>
                <Input {...field} placeholder="Ex: DEP-EXP" className={inputClass} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />
          </FieldGroup>
        </form>

        <DialogFooter className="px-6 py-4 border-t bg-slate-50/80 sm:justify-between items-center">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="bg-white">
            Annuler
          </Button>
          <Button type="submit" form="form-departement" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px] rounded-lg">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Patientez...</> : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}