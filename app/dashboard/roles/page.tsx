"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import { Role } from "@/types";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { Can } from "@/components/auth/Can";
import { getColumns } from "./columns";
import { RoleFormModal } from "@/components/roles/RoleFormModal";

import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "../../../lib/utils";

export default function RolesPage() {
  const [data, setData] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States for Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      // نجيبو الـ Roles من الباكاند
      const response = await api.get("/roles");
      setData(response.data.data.roles || response.data.data);
    } catch (error) {
      toast.error("Erreur lors de la récupération des rôles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setSelectedRole(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (role: Role) => {
    if (!confirm(`Voulez-vous vraiment supprimer le rôle ${role.name} ?`)) return;
    try {
      await api.delete(`/roles/${role.id}`);
      toast.success("Rôle supprimé avec succès.");
      fetchRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur de suppression.");
    }
  };

  const table = useReactTable({
    data,
    columns: getColumns({ onEdit: handleEdit, onDelete: handleDelete }),
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <PermissionGuard permission="gerer_roles">
      <div className="space-y-6">
        
        <div className={cn('flex', 'flex-col', 'sm:flex-row', 'sm:items-center', 'justify-between', 'gap-4')}>
          <div>
            <h1 className={cn('text-2xl', 'font-bold', 'tracking-tight', 'text-gray-900')}>Gestion des Rôles & Permissions</h1>
            <p className="text-gray-500">Gérez les différents rôles et leurs accès au système.</p>
          </div>
          
          <Can permission="gerer_roles">
            <Button onClick={handleAddClick} className={cn('flex', 'items-center', 'gap-2')}>
              <Plus size={16} /> Nouveau Rôle
            </Button>
          </Can>
        </div>

        <div className={cn('rounded-md', 'border', 'bg-white', 'shadow-sm')}>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={table.getAllColumns().length} className={cn('h-48', 'text-center')}>
                    <Loader2 className={cn('mx-auto', 'h-8', 'w-8', 'animate-spin', 'text-primary')} />
                    <p className={cn('mt-2', 'text-sm', 'text-gray-500')}>Chargement des rôles...</p>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={table.getAllColumns().length} className={cn('h-24', 'text-center', 'text-gray-500')}>
                    Aucun rôle trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <RoleFormModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchRoles} 
          roleToEdit={selectedRole}
        />

      </div>
    </PermissionGuard>
  );
}