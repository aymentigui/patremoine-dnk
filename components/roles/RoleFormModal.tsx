"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { Role, Permission } from "@/types";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

const roleSchema = z.object({
  name: z.string().min(2, "Le nom du rôle est requis"),
  permissions: z.array(z.string()),
});

type RoleFormValues = z.infer<typeof roleSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roleToEdit: Role | null;
}

export function RoleFormModal({ isOpen, onClose, onSuccess, roleToEdit }: Props) {
  const [loading, setLoading] = useState(false);
  const [fetchingPerms, setFetchingPerms] = useState(false);
  
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: "", permissions: [] },
  });

  const selectedPerms = watch("permissions") || [];

  // جلب كل الصلاحيات الموجودة في الباكاند
  useEffect(() => {
    if (isOpen) {
      const fetchPermissions = async () => {
        try {
          setFetchingPerms(true);
          // لازم يكون عندك API Endpoint يجبد ڨاع لي permissions
          const res = await api.get("/permissions"); 
          setAllPermissions(res.data.data || res.data); // على حساب الـ structure تاعك
        } catch (error) {
          toast.error("Erreur lors du chargement des permissions.");
        } finally {
          setFetchingPerms(false);
        }
      };
      fetchPermissions();
    }
  }, [isOpen]);

  // تعبئة البيانات في حالة التعديل
  useEffect(() => {
    if (roleToEdit) {
      reset({
        name: roleToEdit.name,
        permissions: roleToEdit.permissions?.map(p => p.name) || [],
      });
    } else {
      reset({ name: "", permissions: [] });
    }
  }, [roleToEdit, reset]);

  const handleCheckboxChange = (permName: string, checked: boolean) => {
    if (checked) {
      setValue("permissions", [...selectedPerms, permName]);
    } else {
      setValue("permissions", selectedPerms.filter(p => p !== permName));
    }
  };

  const onSubmit = async (data: RoleFormValues) => {
    try {
      setLoading(true);
      const payload = {
        name: data.name,
        permissions: data.permissions
      };

      if (roleToEdit) {
        await api.put(`/roles/${roleToEdit.id}`, payload);
        toast.success("Rôle modifié avec succès !");
      } else {
        await api.post("/roles", payload);
        toast.success("Rôle créé avec succès !");
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent style={{width:"600px", maxWidth:"600px"}} className={cn('max-w-3xl', 'max-h-[90vh]', 'flex', 'flex-col')}>
        <DialogHeader>
          <DialogTitle>{roleToEdit ? "Modifier le Rôle" : "Ajouter un Nouveau Rôle"}</DialogTitle>
          <DialogDescription>Définissez le nom du rôle et ses accès au système.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className={cn('space-y-6', 'flex-1', 'overflow-hidden', 'flex', 'flex-col')}>
          <div className={cn('space-y-2', 'flex-shrink-0')}>
            <Label>Nom du Rôle</Label>
            <Input {...register("name")} placeholder="Ex: Chef de Parc" />
            {errors.name && <p className={cn('text-sm', 'text-red-500')}>{errors.name.message}</p>}
          </div>

          <div className={cn('space-y-2', 'flex-1', 'overflow-y-auto', 'border', 'rounded-md', 'p-4', 'bg-gray-50')}>
            <Label className="text-base">Permissions Associées</Label>
            {fetchingPerms ? (
              <div className={cn('flex', 'justify-center', 'py-4')}><Loader2 className={cn('animate-spin', 'text-primary')} /></div>
            ) : (
              <div className={cn('grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-3', 'mt-2')}>
                {allPermissions.map((perm) => (
                  <div key={perm.id} className={cn('flex', 'items-start', 'space-x-3', 'p-2', 'bg-white', 'rounded', 'shadow-sm')}>
                    <Checkbox 
                      id={`perm-${perm.id}`}
                      checked={selectedPerms.includes(perm.name)}
                      onCheckedChange={(checked) => handleCheckboxChange(perm.name, checked as boolean)}
                    />
                    <label htmlFor={`perm-${perm.id}`} className={cn('text-sm', 'leading-none', 'cursor-pointer')}>
                      {perm.name}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={cn('flex', 'justify-end', 'gap-3', 'pt-4', 'border-t', 'flex-shrink-0')}>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}