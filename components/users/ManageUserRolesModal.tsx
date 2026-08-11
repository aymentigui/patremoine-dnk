"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { User, Role } from "@/types";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: User | null;
}

export function ManageUserRolesModal({ isOpen, onClose, onSuccess, user }: Props) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  // جلب كل الأدوار الموجودة في النظام من الباكاند
  useEffect(() => {
    if (isOpen && user) {
      const fetchRoles = async () => {
        try {
          setFetching(true);
          const res = await api.get("/roles");
          setAllRoles(res.data.data.roles);
          // نعلمو الأدوار اللي عند اليوزر حالياً
          setSelectedRoles(user.roles.map(r => r.name));
        } catch (error) {
          toast.error("Erreur lors du chargement des rôles.");
        } finally {
          setFetching(false);
        }
      };
      fetchRoles();
    }
  }, [isOpen, user]);

  const handleCheckboxChange = (roleName: string, checked: boolean) => {
    if (checked) {
      setSelectedRoles(prev => [...prev, roleName]);
    } else {
      setSelectedRoles(prev => prev.filter(r => r !== roleName));
    }
  };

  const onSubmit = async () => {
    if (!user) return;
    try {
      setLoading(true);
      await api.post(`/users/${user.id}/roles-permissions`, {
        roles: selectedRoles,
        permissions: [] // رانا نخدمو بالـ roles كافية مؤقتاً
      });
      toast.success("Rôles mis à jour avec succès !");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur de mise à jour.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={cn('flex', 'items-center', 'gap-2')}>
            <Shield className={cn('w-5', 'h-5', 'text-purple-600')} />
            Gérer les Rôles
          </DialogTitle>
          <DialogDescription>
            Attribuez des rôles pour <b>{user?.name}</b>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {fetching ? (
            <div className={cn('flex', 'justify-center', 'py-8')}>
              <Loader2 className={cn('w-6', 'h-6', 'animate-spin', 'text-primary')} />
            </div>
          ) : (
            <div className={cn('space-y-3', 'max-h-60', 'overflow-y-auto', 'pr-2')}>
              {allRoles.length === 0 ? (
                <p className={cn('text-sm', 'text-gray-500', 'text-center')}>Aucun rôle trouvé.</p>
              ) : (
                allRoles.map((role) => (
                  <div key={role.id} className={cn('flex', 'items-center', 'space-x-3', 'p-2', 'rounded', 'hover:bg-slate-50', 'border', 'border-transparent', 'hover:border-slate-200', 'transition-colors')}>
                    <Checkbox 
                      id={`role-${role.id}`}
                      checked={selectedRoles.includes(role.name)}
                      onCheckedChange={(checked:any) => handleCheckboxChange(role.name, checked as boolean)}
                    />
                    <label 
                      htmlFor={`role-${role.id}`}
                      className={cn('text-sm', 'font-medium', 'leading-none', 'cursor-pointer', 'flex-1')}
                    >
                      {role.name}
                    </label>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className={cn('flex', 'justify-end', 'gap-3', 'pt-4', 'border-t')}>
          <Button variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
          <Button onClick={onSubmit} disabled={loading || fetching} className={cn('bg-purple-600', 'hover:bg-purple-700')}>
            {loading ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}