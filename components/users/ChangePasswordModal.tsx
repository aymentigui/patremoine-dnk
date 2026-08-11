"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { User } from "@/types";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { cn } from "../../lib/utils";

const passwordSchema = z.object({
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirm_password: z.string()
}).refine((data) => data.password === data.confirm_password, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirm_password"],
});

type PasswordValues = z.infer<typeof passwordSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export function ChangePasswordModal({ isOpen, onClose, user }: Props) {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (data: PasswordValues) => {
    if (!user) return;
    try {
      setLoading(true);
      await api.patch(`/users/${user.id}/password`, { password: data.password });
      toast.success("Mot de passe modifié avec succès !");
      reset();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur de modification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={cn('flex', 'items-center', 'gap-2')}>
            <Lock className={cn('w-5', 'h-5', 'text-orange-500')} />
            Nouveau mot de passe
          </DialogTitle>
          <DialogDescription>
            Changer le mot de passe pour <b>{user?.name}</b> ({user?.email})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className={cn('space-y-4', 'pt-4')}>
          <div className="space-y-2">
            <Label>Nouveau mot de passe</Label>
            <Input type="password" {...register("password")} placeholder="••••••••" />
            {errors.password && <p className={cn('text-sm', 'text-red-500')}>{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Confirmer le mot de passe</Label>
            <Input type="password" {...register("confirm_password")} placeholder="••••••••" />
            {errors.confirm_password && <p className={cn('text-sm', 'text-red-500')}>{errors.confirm_password.message}</p>}
          </div>

          <div className={cn('flex', 'justify-end', 'gap-3', 'pt-4')}>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={loading} className={cn('bg-orange-600', 'hover:bg-orange-700')}>
              {loading ? "Modification..." : "Confirmer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}