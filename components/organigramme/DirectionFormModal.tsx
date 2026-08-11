"use client";

import { useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/axios";
import toast from "react-hot-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Building2 } from "lucide-react";

// Schema Zod
const formSchema = z.object({
  nom: z.string().min(2, "Le nom est requis"),
  code: z.string().min(1, "Le code est requis"),
  description: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface DirectionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  directionToEdit?: any | null;
  onSuccess: () => void;
}

export function DirectionFormModal({ isOpen, onClose, directionToEdit, onSuccess }: DirectionFormModalProps) {
  const [loading, setLoading] = useState(false);
  const isEdit = !!directionToEdit;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { nom: "", code: "", description: "" }
  });

  useEffect(() => {
    if (isOpen) {
      if (directionToEdit) {
        form.reset({
          nom: directionToEdit.nom,
          code: directionToEdit.code,
          description: directionToEdit.description || "",
        });
      } else {
        form.reset({ nom: "", code: "", description: "" });
      }
    }
  }, [isOpen, directionToEdit, form]);

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);
      if (isEdit) {
        await api.put(`/directions/${directionToEdit.id}`, data);
        toast.success("Direction modifiée avec succès !");
      } else {
        await api.post("/directions", data);
        toast.success("Direction créée avec succès !");
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 ستايل خاص للـ Inputs باش يبانو منفصلين على الخلفية
  const inputClass = "bg-slate-50 border-slate-200 focus-visible:bg-white focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-all rounded-lg";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white shadow-2xl border-0 rounded-2xl">
        
        <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-slate-800">
                {isEdit ? "Modifier la direction" : "Nouvelle Direction"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500">
                Veuillez remplir les informations de la direction.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form id="form-direction" onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-6 space-y-6">
          <FieldGroup className="space-y-5">
            <Controller name="nom" control={form.control} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-slate-700 font-medium">Nom de la direction <span className="text-red-500">*</span></FieldLabel>
                <Input {...field} placeholder="Ex: Direction Générale" aria-invalid={fieldState.invalid} className={inputClass} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />

            <Controller name="code" control={form.control} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-slate-700 font-medium">Code (Abréviation) <span className="text-red-500">*</span></FieldLabel>
                <Input {...field} placeholder="Ex: DG" aria-invalid={fieldState.invalid} className={inputClass} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />

            <Controller name="description" control={form.control} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-slate-700 font-medium">Description</FieldLabel>
                {/* استعملنا Input عادي هنا، وتقدر تبدلها بـ Textarea إذا حبيتها كبيرة */}
                <Input {...field} value={field.value || ""} placeholder="Rôle ou description courte..." aria-invalid={fieldState.invalid} className={inputClass} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />
          </FieldGroup>
        </form>

        <DialogFooter className="px-6 py-8 border-t bg-slate-50/80 sm:justify-between items-center">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="bg-white">
            Annuler
          </Button>
          <Button type="submit" form="form-direction" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px] rounded-lg">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Patientez...</> : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}