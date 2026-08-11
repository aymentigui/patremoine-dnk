"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import { User, PaginatedResponse } from "@/types";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { Can } from "@/components/auth/Can"; // تأكد برك من مسار الـ Can (حرف صغير ولا كبير)
import { getColumns } from "./columns";

// Shadcn UI & Tanstack
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Plus, Search, Loader2, Users, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

// Modals
import { UserFormModal } from "@/components/users/UserFormModal";
import { ChangePasswordModal } from "@/components/users/ChangePasswordModal";
import { ManageUserRolesModal } from "@/components/users/ManageUserRolesModal";

export default function UsersPage() {
  // State Management
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState("15");
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });

  // Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);

  // Fetch Data from Laravel API
  const fetchUsers = useCallback(async (page = 1, searchQuery = "", limit = perPage) => {
    try {
      setLoading(true);
      const response = await api.get<{ status: string; data: PaginatedResponse<User> }>(
        `/users?page=${page}&per_page=${limit}&search=${searchQuery}`
      );
      
      setData(response.data.data.data);
      setPagination({
        current_page: response.data.data.current_page,
        last_page: response.data.data.last_page,
        total: response.data.data.total,
      });
    } catch (error) {
      toast.error("Erreur lors de la récupération des utilisateurs.");
    } finally {
      setLoading(false);
    }
  }, [perPage]);

  // Initial Load & Search Debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers(1, search, perPage);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search, perPage, fetchUsers]);

  // Actions Handlers
  const handleToggleBlock = async (user: User) => {
    try {
      const res = await api.patch(`/users/${user.id}/toggle-block`);
      toast.success(res.data.message);
      fetchUsers(pagination.current_page, search);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur de modification.");
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm("Voulez-vous vraiment supprimer cet utilisateur ?")) return;
    try {
      const res = await api.delete(`/users/${user.id}`);
      toast.success(res.data.message);
      fetchUsers(pagination.current_page, search);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur de suppression.");
    }
  };

  const handleExport = async () => {
    try {
      const toastId = toast.loading("Génération de l'Excel...");
      const response = await api.get('/users/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Utilisateurs_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Exportation réussie !", { id: toastId });
    } catch (error) {
      toast.error("Erreur lors de l'exportation.");
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  };

  const handleAddClick = () => {
    setSelectedUser(null);
    setIsFormOpen(true);
  };

  const handleChangePassword = (user: User) => {
    setSelectedUser(user);
    setIsPasswordModalOpen(true);
  };

  const handleManageRoles = (user: User) => {
    setSelectedUser(user);
    setIsRolesModalOpen(true);
  };

  // Tanstack Table Setup
  const table = useReactTable({
    data,
    columns: getColumns({
      onEdit: handleEdit,
      onToggleBlock: handleToggleBlock,
      onDelete: handleDelete,
      onChangePassword: handleChangePassword,
      onManageRoles: handleManageRoles,
    }),
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <PermissionGuard permission="voir_utilisateurs">
      <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 lg:p-8 space-y-6">
        
        {/* 🔹 HEADER & ACTIONS 🔹 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Comptes Utilisateurs</h1>
              <p className="text-sm text-slate-500 mt-1">Gérez les accès système et associez les employés.</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Can permission="exporter_utilisateurs">
              <Button variant="outline" onClick={handleExport} className="text-emerald-600 border-slate-200 hover:bg-emerald-50">
                <Download className="w-4 h-4 mr-2" /> Exporter
              </Button>
            </Can>

            <Can permission="creer_utilisateur">
              <Button onClick={handleAddClick} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Nouvel Utilisateur
              </Button>
            </Can>
          </div>
        </div>

        {/* 🔹 SEARCH BAR 🔹 */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher par nom, matricule ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200"
            />
          </div>
        </div>

        {/* 🔹 DATA TABLE (Tanstack) 🔹 */}
        <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="font-semibold text-slate-600">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={table.getAllColumns().length} className="h-64 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500" />
                      <p className="mt-2 text-sm text-slate-500">Chargement des données...</p>
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-slate-50/50">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={table.getAllColumns().length} className="h-48 text-center text-slate-500">
                      Aucun utilisateur trouvé.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* 🔹 PAGINATION CONTROLS 🔹 */}
          {pagination.total > 0 && (
            <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Afficher</span>
                <Select value={perPage} onValueChange={(val) => setPerPage(val)}>
                  <SelectTrigger className="w-[80px] h-8 bg-white"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span>utilisateurs par page</span>
              </div>
              
              <div className="flex items-center gap-4">
                <p className="text-sm text-slate-500">
                  Page <strong className="text-slate-900">{pagination.current_page}</strong> sur <strong className="text-slate-900">{pagination.last_page}</strong>
                  <span className="ml-2 hidden sm:inline-block">(Total: {pagination.total})</span>
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => fetchUsers(pagination.current_page - 1, search)} disabled={pagination.current_page === 1 || loading} className="bg-white">
                    <ChevronLeft className="w-4 h-4 mr-1 sm:hidden"/> <span className="hidden sm:inline">Précédent</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => fetchUsers(pagination.current_page + 1, search)} disabled={pagination.current_page === pagination.last_page || loading} className="bg-white">
                    <span className="hidden sm:inline">Suivant</span> <ChevronRight className="w-4 h-4 ml-1 sm:hidden"/>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 🔹 MODALS 🔹 */}
        <UserFormModal 
          isOpen={isFormOpen} 
          onClose={() => setIsFormOpen(false)} 
          onSuccess={() => fetchUsers(pagination.current_page, search)} 
          userToEdit={selectedUser}
        />
        <ChangePasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
          user={selectedUser}
        />
        <ManageUserRolesModal
          isOpen={isRolesModalOpen}
          onClose={() => setIsRolesModalOpen(false)}
          onSuccess={() => fetchUsers(pagination.current_page, search)}
          user={selectedUser}
        />
      </div>
    </PermissionGuard>
  );
}