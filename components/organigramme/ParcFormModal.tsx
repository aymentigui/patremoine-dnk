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
import { Loader2, Bus, MapPinned } from "lucide-react";

// 🔥 نحينا direction_id و departement_id
const formSchema = z.object({
  nom: z.string().min(2, "Le nom est requis"),
  code: z.string().min(1, "Le code est requis"),
  wilaya: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  parcToEdit?: any | null;
  onSuccess: () => void;
}

export function ParcFormModal({ isOpen, onClose, parcToEdit, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const isEdit = !!parcToEdit;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { nom: "", code: "", wilaya: "" }
  });

  useEffect(() => {
    if (isOpen) {
      if (parcToEdit) {
        form.reset({
          nom: parcToEdit.nom,
          code: parcToEdit.code,
          wilaya: parcToEdit.wilaya || "",
        });
      } else {
        form.reset({ nom: "", code: "", wilaya: "" });
      }
    }
  }, [isOpen, parcToEdit, form]);

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);
      if (isEdit) {
        await api.put(`/parcs/${parcToEdit.id}`, data);
        toast.success("Parc modifié avec succès !");
      } else {
        await api.post("/parcs", data);
        toast.success("Parc créé avec succès !");
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "bg-slate-50 border-slate-200 focus-visible:bg-white focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500 transition-all rounded-lg";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white shadow-2xl border-0 rounded-2xl">
        
        <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-slate-800">
                {isEdit ? "Modifier le parc" : "Nouveau Parc"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500">
                Configurez les informations du parc.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form id="form-parc" onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-6 space-y-6">
          <FieldGroup className="space-y-5">
            <Controller name="nom" control={form.control} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-slate-700 font-medium">Nom du parc <span className="text-red-500">*</span></FieldLabel>
                <Input {...field} placeholder="Ex: Parc Principal Ouest" className={inputClass} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />

            <Controller name="code" control={form.control} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-slate-700 font-medium">Code <span className="text-red-500">*</span></FieldLabel>
                <Input {...field} placeholder="Ex: PR-01" className={inputClass} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />

            <Controller name="wilaya" control={form.control} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-slate-700 font-medium">Wilaya</FieldLabel>
                <div className="relative">
                  <MapPinned className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input {...field} placeholder="Ex: Alger" className={`pl-9 ${inputClass}`} aria-invalid={fieldState.invalid} value={field.value || ""} />
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />
          </FieldGroup>
        </form>

        <DialogFooter className="px-6 py-4 border-t bg-slate-50/80 sm:justify-between items-center">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="bg-white">Annuler</Button>
          <Button type="submit" form="form-parc" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px] rounded-lg">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Patientez...</> : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}