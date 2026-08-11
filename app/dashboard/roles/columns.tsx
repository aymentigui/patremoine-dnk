"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Role } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Can } from "@/components/auth/Can";
import { MoreHorizontal, Edit, Trash2, ShieldAlert } from "lucide-react";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuGroup 
} from "@/components/ui/dropdown-menu";

interface ActionProps {
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}

export const getColumns = ({ onEdit, onDelete }: ActionProps): ColumnDef<Role>[] => [
  {
    accessorKey: "name",
    header: "Nom du Rôle",
    cell: ({ row }) => (
      <div className="font-semibold text-gray-900 flex items-center gap-2">
        {row.original.name === 'Super Admin' && <ShieldAlert className="w-4 h-4 text-red-500" />}
        {row.original.name}
      </div>
    ),
  },
  {
    id: "permissions_count",
    header: "Permissions Assignées",
    cell: ({ row }) => {
      const permsCount = row.original.permissions?.length || 0;
      if (row.original.name === 'Super Admin') {
        return <Badge className="bg-red-500">Toutes les permissions</Badge>;
      }
      return <Badge variant="secondary">{permsCount} permission(s)</Badge>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const role = row.original;
      // Super Admin ما نقدروش نموديفيوه ولا نمسحوه
      if (role.name === 'Super Admin') return null;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Ouvrir le menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Can permission="gerer_roles">
                <DropdownMenuItem onClick={() => onEdit(role)}>
                  <Edit className="mr-2 h-4 w-4 text-blue-600" /> Modifier
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(role)} className="text-red-600 focus:text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                </DropdownMenuItem>
              </Can>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];