"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/lib/axios";

// 🔹 استدعاء الـ Store 🔹
import { useAuthStore } from "@/store/useAuthStore";

// UI Components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, Download, UploadCloud, Plus, Briefcase, MapPin, Edit, Trash2, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Check, ChevronsUpDown, Building2, UserPlus, Filter, X } from "lucide-react";
import toast from "react-hot-toast";
import { Controller, useForm } from "react-hook-form";
import { cn } from "@/lib/utils";

// ==========================================
// 🔐 إدارة الصلاحيات (PERMISSIONS)
// ==========================================
const PERMISSIONS = {
  VIEW: "voir_employes",
  ADD: "creer_employe",
  EDIT: "modifier_employe",
  DELETE: "supprimer_employe",
  IMPORT: "importer_employes",
  EXPORT: "exporter_employes",
  PROMOTE: "creer_utilisateur" // صلاحية ترقية الموظف إلى مستخدم بنظام الدخول
};

export default function EmployeesPage() {
  // 🔹 جلب دالة التحقق من الصلاحيات من الـ Store 🔹
  const hasPermission = useAuthStore((state) => state.hasPermission);

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // 🔹 Filters & Pagination 🔹
  const [search, setSearch] = useState("");
  const [hasAccount, setHasAccount] = useState("all");
  const [showAdvFilters, setShowAdvFilters] = useState(false);
  const [advFilters, setAdvFilters] = useState({
    match_type: "contains", matricule: "", nom: "", prenom: "", fonction: ""
  });
  const [perPage, setPerPage] = useState("15");
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

  // 🔹 Modals 🔹
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  
  // 🔹 State Data 🔹
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [parcs, setParcs] = useState<any[]>([]);
  const [emplacements, setEmplacements] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  
  // Combobox States
  const [openParcCombobox, setOpenParcCombobox] = useState(false);
  const [openEmpCombobox, setOpenEmpCombobox] = useState(false);

  // 🔹 Forms 🔹
  const { control, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      matricule: "", nom: "", prenom: "", fonction: "", telephone: "",
      parc_id_form: "", emplacement_id: ""
    }
  });

  const promoteForm = useForm({
    defaultValues: { name: "", email: "", password: "", roles: [] as string[] }
  });

  const watchParc = watch("parc_id_form");
  const availableEmplacements = useMemo(() => {
    if (!watchParc) return [];
    return emplacements.filter(e => e.parc_id?.toString() === watchParc);
  }, [watchParc, emplacements]);

  // 🔹 Fetch Data 🔹
  const fetchEmployees = useCallback(async (page = 1, searchQuery = search, accountFilter = hasAccount, advanced = advFilters) => {
    // 🔹 حماية الـ API 🔹
    if (!hasPermission(PERMISSIONS.VIEW)) return;

    try {
      setLoading(true);
      const params: any = { page, per_page: perPage, search: searchQuery };
      if (accountFilter !== "all") params.has_user_account = accountFilter;
      
      // إضافة الفلاتر المتقدمة
      Object.entries(advanced).forEach(([key, value]) => {
        if (value) params[key] = value;
      });

      const res = await api.get("/employees", { params });
      
      if (perPage === "all") {
        setData(res.data.data || []);
        setPagination({ current_page: 1, last_page: 1, total: res.data.data?.length || 0 });
      } else {
        setData(res.data.data || []);
        setPagination({
          current_page: res.data.current_page,
          last_page: res.data.last_page,
          total: res.data.total,
        });
      }
    } catch (error) { 
      toast.error("Erreur de chargement des employés."); 
    } finally { 
      setLoading(false); 
    }
  }, [perPage, search, hasAccount, advFilters, hasPermission]);

  // Debounced Load
  useEffect(() => {
    const delay = setTimeout(() => fetchEmployees(1, search, hasAccount, advFilters), 500);
    return () => clearTimeout(delay);
  }, [search, hasAccount, perPage, advFilters, fetchEmployees]);

  // Load Context Data (Parcs, Emplacements, Roles)
  useEffect(() => {
    if (isFormModalOpen && parcs.length === 0 && hasPermission(PERMISSIONS.ADD)) {
      Promise.all([api.get("/parcs?per_page=500"), api.get("/emplacements?per_page=500")])
        .then(([parcRes, empRes]) => {
          setParcs(parcRes.data.data?.data || parcRes.data.data || []);
          setEmplacements(empRes.data.data?.data || empRes.data.data || []);
        });
    }
  }, [isFormModalOpen, parcs.length, hasPermission]);

  // 🔹 RH Actions 🔹
  const handleExport = async () => {
    try {
      const toastId = toast.loading("Génération de l'Excel...");
      const params: any = { has_user_account: hasAccount, search, ...advFilters };
      const response = await api.get('/employees/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a'); link.href = url; link.setAttribute('download', `Employes_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      toast.success("Exportation réussie !", { id: toastId });
    } catch (error) { toast.error("Erreur d'exportation."); }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/employees/export-template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a'); link.href = url; link.setAttribute('download', `Template_Employes.xlsx`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (error) { toast.error("Erreur de téléchargement."); }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excelFile) return toast.error("Fichier requis.");
    try {
      setActionLoading(true);
      const formData = new FormData(); formData.append("fichier_excel", excelFile);
      await api.post("/employees/import", formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Employés importés avec succès !");
      setIsImportModalOpen(false); setExcelFile(null); fetchEmployees();
    } catch (error: any) { toast.error("Erreur lors de l'importation."); }
    finally { setActionLoading(false); }
  };

  const openAddModal = () => {
    setSelectedEmp(null);
    reset({ matricule: "", nom: "", prenom: "", fonction: "", telephone: "", parc_id_form: "", emplacement_id: "" });
    setIsFormModalOpen(true);
  };

  const openEditModal = (emp: any) => {
    setSelectedEmp(emp);
    const empl = emplacements.find((e:any) => e.id === emp.emplacement_id);
    reset({
      matricule: emp.matricule, nom: emp.nom, prenom: emp.prenom, fonction: emp.fonction || "", telephone: emp.telephone || "",
      parc_id_form: empl?.parc_id?.toString() || "", emplacement_id: emp.emplacement_id?.toString() || ""
    });
    setIsFormModalOpen(true);
  };

  const onSubmitForm = async (data: any) => {
    try {
      setActionLoading(true);
      if (selectedEmp) {
        await api.put(`/employees/${selectedEmp.id}`, data);
        toast.success("Employé modifié avec succès.");
      } else {
        await api.post("/employees", data);
        toast.success("Employé ajouté avec succès.");
      }
      setIsFormModalOpen(false); fetchEmployees();
    } catch (error: any) { toast.error(error.response?.data?.message || "Erreur de sauvegarde."); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer cet employé ?")) return;
    try {
      await api.delete(`/employees/${id}`);
      toast.success("Employé supprimé."); fetchEmployees();
    } catch (error: any) { toast.error(error.response?.data?.message || "Erreur de suppression."); }
  };

  // 🔹 System Actions (Promote to User) 🔹
  const openPromoteModal = (emp: any) => {
    setSelectedEmp(emp);
    promoteForm.reset({ 
      name: `${emp.prenom.toLowerCase()}.${emp.nom.toLowerCase()}`.replace(/\s+/g, ''), 
      email: "", password: "", roles: [] 
    });
    if (rolesList.length === 0) {
      api.get("/roles").then(res => setRolesList(res.data.data?.roles || res.data.data || []));
    }
    setIsPromoteModalOpen(true);
  };

  const onSubmitPromote = async (data: any) => {
    if (!data.name || !data.email || !data.password) return toast.error("Champs obligatoires manquants.");
    try {
      setActionLoading(true);
      await api.post("/users", { ...data, employee_id: selectedEmp.id });
      toast.success("Compte système créé avec succès !");
      setIsPromoteModalOpen(false); fetchEmployees();
    } catch (error: any) { toast.error(error.response?.data?.message || "Erreur de création."); }
    finally { setActionLoading(false); }
  };

  const handleAdvFilterChange = (key: string, value: string) => {
    setAdvFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearAdvFilters = () => {
    setAdvFilters({ match_type: "contains", matricule: "", nom: "", prenom: "", fonction: "" });
    setSearch("");
    setHasAccount("all");
  };

  // 🛡️ حماية الصفحة كاملة
  if (!hasPermission(PERMISSIONS.VIEW)) {
    return <div className="p-8 text-center text-slate-500">🚫 Accès refusé. Vous n'avez pas l'autorisation de voir cette page.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 lg:p-8 space-y-6">
      
      {/* 🔹 HEADER 🔹 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Briefcase size={24} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Annuaire des Employés (RH)</h1>
            <p className="text-sm text-slate-500 mt-1">Gestion du personnel, indépendamment de leurs accès système.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => setShowAdvFilters(!showAdvFilters)} className={`bg-white border-slate-200 ${showAdvFilters ? 'text-orange-600 border-orange-200 bg-orange-50' : 'text-slate-700'}`}>
            <Filter className="w-4 h-4 mr-2" /> Filtres
          </Button>

          {/* 🔹 حماية زر التصدير 🔹 */}
          {hasPermission(PERMISSIONS.EXPORT) && (
            <Button variant="outline" onClick={handleExport} className="text-emerald-600 border-slate-200 hover:bg-emerald-50">
              <Download className="w-4 h-4 mr-2" /> Exporter
            </Button>
          )}

          {/* 🔹 حماية زر الاستيراد 🔹 */}
          {hasPermission(PERMISSIONS.IMPORT) && (
            <DropdownMenu>
              <DropdownMenuTrigger >
                <Button variant="outline" className="text-blue-600 border-slate-200 hover:bg-blue-50">
                  Import <ChevronRight className="w-4 h-4 ml-2 rotate-90"/>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs text-slate-500">IMPORT EXCEL</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleDownloadTemplate} className="cursor-pointer font-medium"><Download className="w-4 h-4 mr-2 text-slate-500" /> Télécharger Modèle</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsImportModalOpen(true)} className="cursor-pointer font-medium"><UploadCloud className="w-4 h-4 mr-2 text-blue-600" /> Importer Fichier</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* 🔹 حماية زر الإضافة 🔹 */}
          {hasPermission(PERMISSIONS.ADD) && (
            <Button onClick={openAddModal} className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> Nouvel Employé
            </Button>
          )}
        </div>
      </div>

      {/* 🔹 ADVANCED FILTERS PANEL 🔹 */}
      {showAdvFilters && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Search className="w-4 h-4 text-orange-500"/> Recherche Avancée</h3>
            <Button variant="ghost" size="sm" onClick={clearAdvFilters} className="text-slate-500 hover:text-red-600 h-8"><X className="w-4 h-4 mr-1"/> Réinitialiser</Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div className="space-y-1.5 lg:col-span-5 bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-wrap items-center gap-4">
              <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Méthode de recherche :</label>
              <div className="w-64">
                <Select value={advFilters.match_type} onValueChange={(val) => handleAdvFilterChange("match_type", val??"")}>
                  <SelectTrigger className="bg-white h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Contient (Floue)</SelectItem>
                    <SelectItem value="exact">Exactement</SelectItem>
                    <SelectItem value="starts_with">Commence par</SelectItem>
                    <SelectItem value="ends_with">Se termine par</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Matricule</label><Input value={advFilters.matricule} onChange={e => handleAdvFilterChange('matricule', e.target.value)} className="h-9 text-sm" /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Nom</label><Input value={advFilters.nom} onChange={e => handleAdvFilterChange('nom', e.target.value)} className="h-9 text-sm" /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Prénom</label><Input value={advFilters.prenom} onChange={e => handleAdvFilterChange('prenom', e.target.value)} className="h-9 text-sm" /></div>
            <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-600">Fonction</label><Input value={advFilters.fonction} onChange={e => handleAdvFilterChange('fonction', e.target.value)} className="h-9 text-sm" /></div>
          </div>
        </div>
      )}

      {/* 🔹 SIMPLE FILTERS (Search Bar & Status) 🔹 */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Rechercher rapide (Nom, prénom, matricule)..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-slate-50 border-slate-200" />
        </div>
        
        <div className="w-full sm:w-auto flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-600 whitespace-nowrap">Compte :</span>
          <Select value={hasAccount} onValueChange={(v)=>setHasAccount(v??"")}>
            <SelectTrigger className="w-[180px] bg-slate-50 border-slate-200"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="true">Avec Compte</SelectItem>
              <SelectItem value="false">Sans Compte</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 🔹 TABLE 🔹 */}
      <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto min-h-[400px]">
          <Table>
            <TableHeader className="bg-slate-50/80 border-b border-slate-100">
              <TableRow>
                <TableHead className="font-semibold text-slate-600 pl-6">Employé (Matricule)</TableHead>
                <TableHead className="font-semibold text-slate-600">Fonction & Contact</TableHead>
                <TableHead className="font-semibold text-slate-600">Affectation</TableHead>
                <TableHead className="font-semibold text-center text-slate-600">Compte Système ?</TableHead>
                <TableHead className="text-right font-semibold text-slate-600 pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="h-64 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" /></TableCell></TableRow>
              ) : data.length > 0 ? (
                data.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/50">
                    <TableCell className="pl-6">
                      <div className="font-bold text-slate-900">{item.nom} {item.prenom}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">Mat: {item.matricule}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-slate-700">{item.fonction || '—'}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{item.telephone || '—'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-slate-800 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400"/>{item.emplacement?.parc?.nom || '—'}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 text-indigo-400"/> {item.emplacement?.nom || '—'}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.user_id ? (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200"><CheckCircle2 className="w-3 h-3 mr-1"/> Possède un compte</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-600 border-slate-200"><XCircle className="w-3 h-3 mr-1"/> Sans compte</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2 items-center">
                        
                        {/* 🔹 حماية زر إنشاء حساب 🔹 */}
                        {!item.user_id && hasPermission(PERMISSIONS.PROMOTE) && (
                          <Button size="sm" variant="outline" onClick={() => openPromoteModal(item)} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-8" title="Créer un compte système">
                            <UserPlus className="w-4 h-4 mr-1.5" /> Compte
                          </Button>
                        )}

                        {/* 🔹 حماية زر التعديل 🔹 */}
                        {hasPermission(PERMISSIONS.EDIT) && (
                          <Button size="sm" variant="ghost" onClick={() => openEditModal(item)} className="text-blue-600 hover:bg-blue-50 h-8 w-8 p-0" title="Modifier"><Edit className="w-4 h-4" /></Button>
                        )}

                        {/* 🔹 حماية زر الحذف 🔹 */}
                        {hasPermission(PERMISSIONS.DELETE) && (
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)} disabled={!!item.user_id} className="text-red-600 hover:bg-red-50 h-8 w-8 p-0" title={item.user_id ? "Impossible de supprimer un employé avec compte" : "Supprimer"}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (<TableRow><TableCell colSpan={5} className="h-48 text-center text-slate-500">Aucun employé trouvé.</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Afficher</span>
              <Select value={perPage} onValueChange={(v)=>setPerPage(v??"15")}>
                <SelectTrigger className="w-[80px] h-8 bg-white"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="15">15</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="all">Tout</SelectItem></SelectContent>
              </Select>
            </div>
            {perPage !== "all" && (
              <div className="flex items-center gap-4">
                <p className="text-sm text-slate-500">Page <strong className="text-slate-900">{pagination.current_page}</strong> sur <strong className="text-slate-900">{pagination.last_page}</strong></p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => fetchEmployees(pagination.current_page - 1)} disabled={pagination.current_page === 1} className="bg-white"><ChevronLeft className="w-4 h-4"/></Button>
                  <Button variant="outline" size="sm" onClick={() => fetchEmployees(pagination.current_page + 1)} disabled={pagination.current_page === pagination.last_page} className="bg-white"><ChevronRight className="w-4 h-4"/></Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 🔹 MODAL IMPORT EXCEL 🔹 */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b bg-blue-50/50">
            <div className="flex items-center gap-3"><div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><UploadCloud className="w-5 h-5" /></div><div><DialogTitle className="text-xl font-semibold text-slate-800">Importer Employés</DialogTitle></div></div>
          </DialogHeader>
          <form onSubmit={handleImportSubmit} className="px-6 py-6 space-y-4">
            <div className="border-2 border-dashed border-blue-200 rounded-xl p-8 text-center hover:border-blue-500 bg-blue-50/30">
              <input type="file" accept=".xlsx, .xls, .csv" onChange={e => setExcelFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-blue-100 file:text-blue-700 cursor-pointer" />
            </div>
            <DialogFooter className="px-0 pt-4 border-t bg-transparent">
              <Button type="button" variant="outline" onClick={() => setIsImportModalOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={actionLoading || !excelFile} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">{actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Importer"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 🔹 MODAL ADD / EDIT EMPLOYE 🔹 */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b bg-orange-50/50">
            <DialogTitle className="text-xl font-bold text-orange-800">{selectedEmp ? "Modifier Employé" : "Nouvel Employé (Sans compte)"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitForm)} className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Matricule *</label>
                <Controller name="matricule" control={control} render={({ field }) => <Input required {...field} />} />
              </div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Fonction</label>
                <Controller name="fonction" control={control} render={({ field }) => <Input {...field} />} />
              </div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Nom *</label>
                <Controller name="nom" control={control} render={({ field }) => <Input required {...field} />} />
              </div>
              <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700">Prénom *</label>
                <Controller name="prenom" control={control} render={({ field }) => <Input required {...field} />} />
              </div>
              <div className="space-y-1.5 col-span-2"><label className="text-xs font-semibold text-slate-700">Téléphone</label>
                <Controller name="telephone" control={control} render={({ field }) => <Input {...field} />} />
              </div>
            </div>

            {/* COMBOBOX: Parc & Emplacement */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Parc (Optionnel) *</label>
                <Controller name="parc_id_form" control={control} render={({ field }) => (
                  <Popover open={openParcCombobox} onOpenChange={setOpenParcCombobox}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={openParcCombobox} className="w-full justify-between bg-white text-left font-normal">
                        {field.value ? parcs.find((p) => p.id.toString() === field.value)?.nom : "Sélectionner un parc..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[260px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher un parc..." />
                        <CommandList>
                          <CommandEmpty>Aucun parc trouvé.</CommandEmpty>
                          <CommandGroup className="max-h-48 overflow-y-auto">
                            {parcs.map((p) => (
                              <CommandItem key={p.id} value={p.nom} onSelect={() => {
                                field.onChange(p.id.toString());
                                setValue("emplacement_id", "");
                                setOpenParcCombobox(false);
                              }}>
                                <Check className={cn("mr-2 h-4 w-4", field.value === p.id.toString() ? "opacity-100" : "opacity-0")} />
                                {p.nom}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}/>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Emplacement Final *</label>
                <Controller name="emplacement_id" control={control} render={({ field }) => (
                  <Popover open={openEmpCombobox} onOpenChange={setOpenEmpCombobox}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={openEmpCombobox} disabled={!watchParc} className="w-full justify-between bg-white text-left font-normal">
                        {field.value ? availableEmplacements.find((e) => e.id.toString() === field.value)?.nom : "Sélectionner un emplacement..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[260px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher un emplacement..." />
                        <CommandList>
                          <CommandEmpty>Aucun emplacement trouvé.</CommandEmpty>
                          <CommandGroup className="max-h-48 overflow-y-auto">
                            {availableEmplacements.map((e) => (
                              <CommandItem key={e.id} value={e.nom} onSelect={() => {
                                field.onChange(e.id.toString());
                                setOpenEmpCombobox(false);
                              }}>
                                <Check className={cn("mr-2 h-4 w-4", field.value === e.id.toString() ? "opacity-100" : "opacity-0")} />
                                {e.nom}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}/>
              </div>
            </div>

            <DialogFooter className="pt-4 mt-6 border-t px-0">
              <Button type="button" variant="outline" onClick={() => setIsFormModalOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={actionLoading || !watchParc || !watch("emplacement_id")} className="bg-orange-600 hover:bg-orange-700 text-white min-w-[120px]">{actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Enregistrer"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 🔹 MODAL CREATION COMPTE SYSTEME (Promote to User) 🔹 */}
      <Dialog open={isPromoteModalOpen} onOpenChange={setIsPromoteModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b bg-emerald-50/50">
            <DialogTitle className="text-xl font-bold text-emerald-800">Créer un Compte Système</DialogTitle>
            <DialogDescription className="text-sm text-slate-600 mt-1">
              Générer des accès pour : <strong className="text-slate-900">{selectedEmp?.nom} {selectedEmp?.prenom}</strong>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={promoteForm.handleSubmit(onSubmitPromote)} className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Nom d'utilisateur *</label>
              <Controller name="name" control={promoteForm.control} render={({ field }) => <Input required {...field} />} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Email professionnel *</label>
              <Controller name="email" control={promoteForm.control} render={({ field }) => <Input type="email" required {...field} />} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Mot de passe *</label>
              <Controller name="password" control={promoteForm.control} render={({ field }) => <Input type="password" required minLength={6} {...field} />} />
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-700 mb-2 block">Rôles (Permissions)</label>
              <Controller name="roles" control={promoteForm.control} render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {rolesList.map(r => (
                    <label key={r.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-slate-50 cursor-pointer">
                      <Checkbox checked={field.value.includes(r.name)} onCheckedChange={(c) => c ? field.onChange([...field.value, r.name]) : field.onChange(field.value.filter((v:any) => v !== r.name))} />
                      <span className="text-sm">{r.name}</span>
                    </label>
                  ))}
                </div>
              )} />
            </div>

            <DialogFooter className="pt-4 mt-6 border-t px-0">
              <Button type="button" variant="outline" onClick={() => setIsPromoteModalOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Créer le compte"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}