"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

// 🔹 استدعاء الـ Store 🔹
import { useAuthStore } from "@/store/useAuthStore";

// UI Components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

// Icons
import { Loader2, Plus, CalendarRange, Building2, Users, ArrowRight, Save, Eye, ClipboardList, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";

// ==========================================
// 🔐 PERMISSIONS & UTILS (مطابقة للباك اند)
// ==========================================
const PERMISSIONS = {
  VIEW: "voir_campagnes_inventaire",
  ADD: "ajouter_campagnes_inventaire", // 🔹 تم التصحيح بزيادة حرف s 🔹
  MANAGE_COMMISSIONS: "gerer_commissions_inventaire",
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'en_cours') return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">▶ En Cours</Badge>;
  if (status === 'cloturee') return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200">🛑 Clôturée</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">⏳ Planifiée</Badge>;
};

export default function InventoryCampaignsPage() {
  const router = useRouter();
  
  // 🔹 جلب دالة التحقق من الصلاحيات من الـ Store 🔹
  const hasPermission = useAuthStore((state) => state.hasPermission);

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Aux Data
  const [parcs, setParcs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ status: "all", annee: new Date().getFullYear().toString() });

  // Creation Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Info, 2: Commissions
  
  // Form State
  const [formData, setFormData] = useState({
    titre: "", annee: new Date().getFullYear(), date_debut: "", parc_id: "all",
    commissions: [{ nom: "Ligne 1", step_level: 1, user_ids: [] as number[] }]
  });

  // --- Initial Loads ---
  useEffect(() => {
    // 🔹 حماية الـ API 🔹
    if (!hasPermission(PERMISSIONS.VIEW)) return;

    api.get("/organigramme/tree").then(res => setParcs(res.data.data.data || []));
    api.get("/users?per_page=500").then(res => setUsers(res.data.data.data || [])); // جلب الموظفين باش نديروهم في اللجان
  }, [hasPermission]);

  const fetchCampaigns = useCallback(async () => {
    // 🔹 حماية الـ API 🔹
    if (!hasPermission(PERMISSIONS.VIEW)) return;

    try {
      setLoading(true);
      const params: any = { page, per_page: 10 };
      if (filters.status !== "all") params.status = filters.status;
      if (filters.annee !== "all") params.annee = filters.annee;

      const res = await api.get("/inventory-campaigns", { params });
      setCampaigns(res.data.data || []);
      setLastPage(res.data.meta?.last_page || 1);
      setTotal(res.data.meta?.total ?? res.data.total ?? 0);
    } catch (error) { 
      toast.error("Erreur de chargement des campagnes."); 
    } finally { 
      setLoading(false); 
    }
  }, [page, filters, hasPermission]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  // --- Form Handlers ---
  const handleAddCommission = () => {
    setFormData(prev => ({
      ...prev,
      commissions: [...prev.commissions, { nom: `Ligne ${prev.commissions.length + 1}`, step_level: 1, user_ids: [] }]
    }));
  };

  const handleRemoveCommission = (index: number) => {
    setFormData(prev => ({
      ...prev,
      commissions: prev.commissions.filter((_, i) => i !== index)
    }));
  };

  const handleCommissionChange = (index: number, field: string, value: any) => {
    const newCommissions = [...formData.commissions];
    newCommissions[index] = { ...newCommissions[index], [field]: value };
    setFormData({ ...formData, commissions: newCommissions });
  };

  const toggleUserInCommission = (commIndex: number, userId: number) => {
    const currentUsers = formData.commissions[commIndex].user_ids;
    const newUsers = currentUsers.includes(userId) 
      ? currentUsers.filter(id => id !== userId) 
      : [...currentUsers, userId];
    handleCommissionChange(commIndex, 'user_ids', newUsers);
  };

  const handleSaveCampaign = async () => {
    // Validation
    if (formData.commissions.length === 0) return toast.error("Ajoutez au moins une commission.");
    if (formData.commissions.some(c => c.user_ids.length === 0)) return toast.error("Chaque commission doit avoir au moins un membre.");

    try {
      setActionLoading(true);
      const payload = {
        ...formData,
        annee: String(formData.annee),
        parc_id: formData.parc_id === "all" ? null : formData.parc_id // null يعني جرد شامل (Global)
      };
      await api.post("/inventory-campaigns", payload);
      toast.success("Campagne d'inventaire créée avec succès !");
      setIsAddModalOpen(false);
      setStep(1);
      setFormData({ titre: "", annee: new Date().getFullYear(), date_debut: "", parc_id: "all", commissions: [{ nom: "Ligne 1", step_level: 1, user_ids: [] }] });
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur lors de la création.");
    } finally {
      setActionLoading(false);
    }
  };

  // 🛡️ حماية الصفحة كاملة
  if (!hasPermission(PERMISSIONS.VIEW)) {
    return <div className="p-8 text-center text-slate-500">🚫 Accès refusé. Vous n'avez pas l'autorisation de voir cette page.</div>;
  }

  // --- View Render ---
  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 lg:p-8 space-y-6">
      
      {/* 🔹 HEADER 🔹 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <ClipboardList size={24} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Campagnes d&apos;Inventaire</h1>
            <p className="text-sm text-slate-500 mt-1">Gérez vos opérations de recensement du parc</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={filters.annee} onValueChange={v => { setFilters({...filters, annee: v??""}); setPage(1); }}>
            <SelectTrigger className="w-[120px] bg-white"><CalendarRange className="w-4 h-4 mr-2 text-slate-400"/><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {[...Array(5)].map((_, i) => {
                const y = new Date().getFullYear() - i;
                return <SelectItem key={y} value={y.toString()}>{y}</SelectItem>;
              })}
            </SelectContent>
          </Select>

          <Select value={filters.status} onValueChange={v => { setFilters({...filters, status: v??""}); setPage(1); }}>
            <SelectTrigger className="w-[140px] bg-white"><Filter className="w-4 h-4 mr-2 text-slate-400"/><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="planifiee">Planifiée</SelectItem>
              <SelectItem value="en_cours">En Cours</SelectItem>
              <SelectItem value="cloturee">Clôturée</SelectItem>
            </SelectContent>
          </Select>

          {/* 🔹 حماية زر الإضافة 🔹 */}
          {hasPermission(PERMISSIONS.ADD) && (
            <Button onClick={() => { setStep(1); setIsAddModalOpen(true); }} className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> Nouvelle Campagne
            </Button>
          )}
        </div>
      </div>

      {/* 🔹 TABLE 🔹 */}
      <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 border-b border-slate-100">
              <TableRow>
                <TableHead className="font-semibold text-slate-600 pl-6">Campagne (Titre)</TableHead>
                <TableHead className="font-semibold text-slate-600">Périmètre (Parc)</TableHead>
                <TableHead className="font-semibold text-slate-600">Dates</TableHead>
                <TableHead className="font-semibold text-slate-600">Commissions</TableHead>
                <TableHead className="font-semibold text-slate-600">Statut</TableHead>
                <TableHead className="text-right font-semibold text-slate-600 pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="h-64 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-500" /></TableCell></TableRow>
              ) : campaigns.length > 0 ? (
                campaigns.map((camp) => (
                  <TableRow key={camp.id} className="hover:bg-slate-50/50">
                    <TableCell className="pl-6">
                      <div className="font-bold text-slate-900">{camp.titre}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Année: {camp.annee}</div>
                    </TableCell>
                    
                    <TableCell>
                      {camp.parc_id ? (
                        <div className="flex items-center text-sm font-medium text-slate-700"><Building2 className="w-4 h-4 mr-2 text-indigo-400"/> {camp.parc?.nom || 'Parc Inconnu'}</div>
                      ) : (
                        <div className="flex items-center text-sm font-medium text-slate-700"><Building2 className="w-4 h-4 mr-2 text-slate-400"/> Global (Tous les parcs)</div>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="text-sm text-slate-700">Début: <span className="font-semibold">{camp.date_debut}</span></div>
                      <div className="text-xs text-slate-500 mt-0.5">Fin: {camp.date_fin || "—"}</div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1 text-sm font-semibold text-slate-700">
                        <Users className="w-4 h-4 text-violet-500 mr-1"/>
                        {camp.commissions?.length || 0} Équipes
                      </div>
                    </TableCell>

                    <TableCell><StatusBadge status={camp.status} /></TableCell>

                    <TableCell className="text-right pr-6">
                      <Button onClick={() => router.push(`/dashboard/inventory/${camp.id}`)} variant="outline" size="sm" className="text-violet-600 border-violet-200 hover:bg-violet-50">
                        <Eye className="w-4 h-4 mr-2" /> Gérer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (<TableRow><TableCell colSpan={6} className="h-48 text-center text-slate-500">Aucune campagne trouvée.</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination Controls Here... */}
        {total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <p className="text-sm text-slate-500">Page <strong className="text-slate-900">{page}</strong> sur <strong className="text-slate-900">{lastPage}</strong></p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="bg-white"><ChevronLeft className="w-4 h-4 mr-1"/> Précédent</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page === lastPage || loading} className="bg-white">Suivant <ChevronRight className="w-4 h-4 ml-1"/></Button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* 🔹 MODAL: CRÉATION (2 ÉTAPES) 🔹 */}
      {/* ========================================== */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden bg-white rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${step === 1 ? 'bg-violet-100 text-violet-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {step === 1 ? <ClipboardList className="w-5 h-5" /> : <Users className="w-5 h-5" />}
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-slate-800">
                  {step === 1 ? "Nouvelle Campagne d'Inventaire" : "Formation des Commissions"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-slate-500">
                  {step === 1 ? "Étape 1/2 : Définissez le périmètre." : "Étape 2/2 : Assignez les équipes de terrain."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-5">
            {/* ÉTAPE 1 */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                <div className="space-y-1.5"><label className="text-sm font-semibold text-slate-700">Titre de la campagne *</label><Input value={formData.titre} onChange={e => setFormData({...formData, titre: e.target.value})} placeholder="Ex: Inventaire Annuel 2026..." required /></div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-sm font-semibold text-slate-700">Année *</label><Input type="number" value={formData.annee} onChange={e => setFormData({...formData, annee: parseInt(e.target.value)})} required /></div>
                  <div className="space-y-1.5"><label className="text-sm font-semibold text-slate-700">Date de début *</label><Input type="date" value={formData.date_debut} onChange={e => setFormData({...formData, date_debut: e.target.value})} required /></div>
                </div>

                <div className="space-y-1.5"><label className="text-sm font-semibold text-slate-700">Périmètre (Parc ciblé)</label>
                  <Select value={formData.parc_id} onValueChange={v => setFormData({...formData, parc_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="font-bold text-violet-700">🌍 Inventaire Global (Tous les parcs)</SelectItem>
                      {parcs.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* ÉTAPE 2 */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 max-h-[50vh] overflow-y-auto pr-2">
                {formData.commissions.map((comm, index) => (
                  <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative">
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveCommission(index)} className="absolute top-2 right-2 text-slate-400 hover:text-red-600 h-6 w-6"><X className="w-4 h-4" /></Button>
                    
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs font-semibold text-slate-600">Nom de la commission</label>
                        <Input value={comm.nom} onChange={e => handleCommissionChange(index, 'nom', e.target.value)} className="h-8 text-sm bg-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600">Niveau (Step)</label>
                        <Input type="number" min={1} value={comm.step_level} onChange={e => handleCommissionChange(index, 'step_level', parseInt(e.target.value))} className="h-8 text-sm bg-white" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Membres (Scanners)</label>
                      <DropdownMenu>
                        <DropdownMenuTrigger >
                          <Button variant="outline" className="w-full justify-between h-9 text-sm font-normal bg-white">
                            {comm.user_ids.length > 0 ? `${comm.user_ids.length} membre(s) sélectionné(s)` : "Assigner des membres..."}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[350px] max-h-56 overflow-y-auto" align="start">
                          {users.map((u: any) => (
                            <DropdownMenuCheckboxItem 
                              key={u.id} 
                              checked={comm.user_ids.includes(u.id)}
                              onCheckedChange={() => toggleUserInCommission(index, u.id)}
                              onSelect={(e) => e.preventDefault()} // باش المينو مايتقفلش كي تكليكي
                            >
                              {u.name} <span className="text-xs text-slate-400 ml-2">({u.email})</span>
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}

                <Button type="button" variant="outline" onClick={handleAddCommission} className="w-full border-dashed border-2 text-violet-600 hover:bg-violet-50">
                  <Plus className="w-4 h-4 mr-2" /> Ajouter une autre commission
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-slate-50/50 flex justify-between sm:justify-between items-center">
            {step === 1 ? (
              <>
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Annuler</Button>
                <Button type="button" onClick={() => { if(!formData.titre || !formData.date_debut) toast.error("Complétez les champs requis."); else setStep(2); }} className="bg-violet-600 text-white">Suivant <ArrowRight className="w-4 h-4 ml-2"/></Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setStep(1)}><ChevronLeft className="w-4 h-4 mr-2"/> Retour</Button>
                <Button type="button" onClick={handleSaveCampaign} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>} Confirmer & Créer
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}