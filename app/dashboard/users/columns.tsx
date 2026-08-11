"use client";

import { ColumnDef } from "@tanstack/react-table";
import { User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/Can";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Shield, Lock, Ban, CheckCircle } from "lucide-react";
import { cn } from "../../../lib/utils";

interface ActionProps {
  onEdit: (user: User) => void;
  onToggleBlock: (user: User) => void;
  onDelete: (user: User) => void;
  onChangePassword: (user: User) => void;
  onManageRoles: (user: User) => void;
}

export const getColumns = ({
  onEdit,
  onToggleBlock,
  onDelete,
  onChangePassword,
  onManageRoles
}: ActionProps): ColumnDef<User>[] => [
  {
    accessorKey: "employee",
    header: "Employé",
    cell: ({ row }) => {
      const employee = row.original.employee;
      if (!employee) return <span className="text-gray-400">Non assigné</span>;
      return (
        <div className={cn('flex', 'flex-col')}>
          <span className={cn('font-medium', 'text-gray-900')}>{employee.nom} {employee.prenom}</span>
          <span className={cn('text-xs', 'text-gray-500')}>Mat: {employee.matricule}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "roles",
    header: "Rôles",
    cell: ({ row }) => {
      const roles = row.original.roles;
      return (
        <div className={cn('flex', 'flex-wrap', 'gap-1')}>
          {roles.map((role) => (
            <Badge key={role.id} variant="secondary" className={cn('bg-blue-50', 'text-blue-700', 'hover:bg-blue-100')}>
              {role.name}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "is_active",
    header: "Statut",
    cell: ({ row }) => {
      const isActive = row.original.is_active;
      return (
        <Badge variant={isActive ? "default" : "destructive"} className={isActive ? "bg-green-500" : ""}>
          {isActive ? "Actif" : "Bloqué"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className={cn('h-8', 'w-8', 'p-0')}>
                <span className="sr-only">Ouvrir le menu</span>
                <MoreHorizontal className={cn('h-4', 'w-4')} />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            
            {/* 👇 غلفناهم هنا */}
            <DropdownMenuGroup>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <Can permission="modifier_utilisateur">
                <DropdownMenuItem onClick={() => onEdit(user)}>
                  <Edit className={cn('mr-2', 'h-4', 'w-4', 'text-blue-600')} />
                  Modifier
                </DropdownMenuItem>
              </Can>

              <Can permission="gerer_roles_permissions">
                <DropdownMenuItem onClick={() => onManageRoles(user)}>
                  <Shield className={cn('mr-2', 'h-4', 'w-4', 'text-purple-600')} />
                  Rôles & Permissions
                </DropdownMenuItem>
              </Can>

              <Can permission="modifier_mot_de_passe">
                <DropdownMenuItem onClick={() => onChangePassword(user)}>
                  <Lock className={cn('mr-2', 'h-4', 'w-4', 'text-orange-600')} />
                  Mot de passe
                </DropdownMenuItem>
              </Can>

              <Can permission="bloquer_utilisateur">
                <DropdownMenuItem onClick={() => onToggleBlock(user)}>
                  {user.is_active ? (
                    <><Ban className={cn('mr-2', 'h-4', 'w-4', 'text-red-600')} /> Bloquer laccès</>
                  ) : (
                    <><CheckCircle className={cn('mr-2', 'h-4', 'w-4', 'text-green-600')} /> Débloquer</>
                  )}
                </DropdownMenuItem>
              </Can>
            </DropdownMenuGroup>
            {/* 👆 غلقنا الغلاف هنا */}

            <Can permission="supprimer_utilisateur">
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(user)} className={cn('text-red-600', 'focus:text-red-600')}>
                <Trash2 className={cn('mr-2', 'h-4', 'w-4')} />
                Supprimer
              </DropdownMenuItem>
            </Can>
            
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];