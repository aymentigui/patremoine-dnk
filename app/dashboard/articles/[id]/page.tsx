"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
// @ts-ignore
import Barcode from "react-barcode";
import * as XLSX from "xlsx";

// 🔹 استدعاء الـ Store 🔹
import { useAuthStore } from "@/store/useAuthStore";

// UI Components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// Icons
import { Loader2, ArrowLeft, QrCode, MapPin, User, Settings2, ArrowRightLeft, Box, AlertTriangle, Tag, History, Clock, Search, Download, Printer, Check } from "lucide-react";

// ==========================================
// 🔐 إدارة الصلاحيات (PERMISSIONS) - مطابقة للباك اند
// ==========================================
const PERMISSIONS = {
  VIEW: "voir_article_items",
  CHANGE_STATUS: "modifier_statut_article_items",
  ASSIGN: "affecter_employe_article_items",
  TRANSFER: "ajouter_transfers", 
  HISTORY: "voir_article_items",
  EXPORT: "exporter_article_items"
};

const formatMoney = (amount: number) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount);

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    en_service: "bg-emerald-100 text-emerald-700 border-emerald-200",
    en_panne: "bg-orange-100 text-orange-700 border-orange-200",
    perdu: "bg-red-100 text-red-700 border-red-200",
    reforme: "bg-purple-100 text-purple-700 border-purple-200",
    vendu: "bg-blue-100 text-blue-700 border-blue-200",
  };
  const labels: Record<string, string> = {
    en_service: "En Service", en_panne: "En Panne", perdu: "Perdu", reforme: "Réformé", vendu: "Vendu"
  };
  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wider border ${styles[status] || "bg-slate-100 text-slate-700"}`}>
      {labels[status] || status}
    </span>
  );
};

export default function ArticleDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id;
  
  // 🔹 جلب دالة التحقق من الصلاحيات من الـ Store 🔹
  const hasPermission = useAuthStore((state) => state.hasPermission);

  // --- States ---
  const [article, setArticle] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Selection & Print States
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [labelType, setLabelType] = useState<"qr" | "barcode">("qr");

  // Lists
  const [employees, setEmployees] = useState<any[]>([]);
  const [treeData, setTreeData] = useState<any[]>([]);

  // Modals visibility
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Form states
  const [newStatus, setNewStatus] = useState("");
  const [newEmployeeId, setNewEmployeeId] = useState("");
  const [remarque, setRemarque] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Transfer Modal States
  const [transferParcId, setTransferParcId] = useState<string>("all");
  const [newEmplacementId, setNewEmplacementId] = useState<string>("");
  const [searchParc, setSearchParc] = useState("");
  const [searchEmplacement, setSearchEmplacement] = useState("");

  // History State
  const [itemHistory, setItemHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  // --- Data Fetching ---
  const refreshArticleDetails = useCallback(async () => {
    if (!hasPermission(PERMISSIONS.VIEW)) return; // 🔹 حماية
    try {
      const res = await api.get(`/articles/${articleId}`);
      
      setArticle(res.data?.data);
      setItems(res.data?.data?.items || []);
    } catch (error) {
      toast.error("Erreur lors de l'actualisation des détails.");
    }
  }, [articleId, hasPermission]);

  useEffect(() => {
    let isMounted = true;
    const loadAllData = async () => {
      // 🔹 لا تقم بتحميل البيانات إذا لم يكن لديه الصلاحية
      if (!hasPermission(PERMISSIONS.VIEW)) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const [articleRes, usersRes, treeRes] = await Promise.all([
          api.get(`/articles/${articleId}`),
          api.get("/users?per_page=500").catch(() => null),
          api.get("/organigramme/tree").catch(() => null)
        ]);
        if (isMounted) {
          if (articleRes.data?.data) {
            setArticle(articleRes.data.data);
            setItems(articleRes.data.data.items || []);
          }
          if (usersRes) {
            const usersList = usersRes.data?.data?.data || usersRes.data?.data || [];
            const emps = usersList.filter((u: any) => u.employee).map((u: any) => u.employee);
            setEmployees(emps);
          }
          if (treeRes) {
            setTreeData(treeRes.data?.data || []);
          }
        }
      } catch (error) {
        toast.error("Erreur lors du chargement des détails.");
        router.push("/dashboard/articles");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadAllData();
    return () => { isMounted = false; };
  }, [articleId, router, hasPermission]);

  const fetchItemHistory = async (itemId: number) => {
    if (!hasPermission(PERMISSIONS.HISTORY)) return; // 🔹 حماية
    setHistoryLoading(true);
    setHistorySearch("");
    try {
      const res = await api.get(`/article-items/${itemId}/history`);
      setItemHistory(res.data.data || []);
    } catch (error) {
      toast.error("Erreur lors du chargement de l'historique.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const { parcs, emplacements } = useMemo(() => {
    const availableParcs = treeData;
    let availableEmplacements: any[] = [];
    
    if (transferParcId !== "all") {
      const p = availableParcs.find(p => p.id?.toString() === transferParcId);
      if (p && p.emplacements) availableEmplacements = p.emplacements;
    } else {
      availableEmplacements = availableParcs.flatMap(p => p.emplacements || []);
    }

    return {
      parcs: availableParcs.filter(p => p?.nom?.toLowerCase().includes(searchParc.toLowerCase())),
      emplacements: availableEmplacements.filter(e => e?.nom?.toLowerCase().includes(searchEmplacement.toLowerCase()))
    };
  }, [treeData, transferParcId, searchParc, searchEmplacement]);

  // --- Actions ---
  const handleChangeStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus) return toast.error("Veuillez sélectionner un statut.");
    try {
      setActionLoading(true);
      await api.post(`/article-items/${selectedItem.id}/change-status`, { status: newStatus, remarque });
      toast.success("Statut mis à jour avec succès !");
      setIsStatusModalOpen(false);
      refreshArticleDetails(); 
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur de mise à jour.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeId) return toast.error("Veuillez sélectionner un employé.");
    try {
      setActionLoading(true);
      await api.post(`/article-items/${selectedItem.id}/assign-employee`, { employee_id: newEmployeeId, remarque });
      toast.success("Affectation réussie !");
      setIsAssignModalOpen(false);
      refreshArticleDetails();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur d'affectation.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmplacementId) return toast.error("Veuillez sélectionner une destination.");
    try {
      setActionLoading(true);
      await api.post(`/transfers`, { article_item_id: selectedItem.id, to_emplacement_id: newEmplacementId });
      toast.success("Ordre de transfert créé avec succès !");
      setIsTransferModalOpen(false);
      refreshArticleDetails();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur de transfert.");
    } finally {
      setActionLoading(false);
    }
  };

  const openModal = (type: 'status' | 'assign' | 'transfer' | 'history', item: any) => {
    setSelectedItem(item);
    setRemarque("");
    if (type === 'status') { setNewStatus(item.status); setIsStatusModalOpen(true); }
    if (type === 'assign') { setNewEmployeeId(item.employee_id?.toString() || ""); setIsAssignModalOpen(true); }
    if (type === 'transfer') { 
      setTransferParcId("all"); setNewEmplacementId(""); 
      setSearchParc(""); setSearchEmplacement("");
      setIsTransferModalOpen(true); 
    }
    if (type === 'history') { setIsHistoryModalOpen(true); fetchItemHistory(item.id); }
  };

  const filteredItems = items.filter(item => 
    item.qr_code_reference?.toLowerCase().includes(search.toLowerCase()) ||
    item.numero_serie_fabricant?.toLowerCase().includes(search.toLowerCase()) ||
    item.marque?.toLowerCase().includes(search.toLowerCase()) ||
    item.numero_facture?.toLowerCase().includes(search.toLowerCase())
  );
  
  const filteredHistory = itemHistory.filter(h => 
    h.action.toLowerCase().includes(historySearch.toLowerCase()) || 
    h.user_name?.toLowerCase().includes(historySearch.toLowerCase()) || 
    h.remarque?.toLowerCase().includes(historySearch.toLowerCase())
  );

  // --- Selection & Bulk Actions Logic ---
  const handleSelectAll = () => {
    if (selectedIds.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(item => item.id));
    }
  };

  const handleSelectItem = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item_id => item_id !== id) : [...prev, id]);
  };

  const handleExportExcel = () => {
    if (selectedIds.length === 0) return toast.error("Veuillez sélectionner au moins un article.");
    
    const dataToExport = items.filter(item => selectedIds.includes(item.id)).map(item => ({
      "N° Facture": item.numero_facture || "-",
      "Date Facture": item.date_facture || "-",
      "Référence (Code)": item.qr_code_reference,
      "Marque": item.marque || "-",
      "Modèle": item.modele || "-",
      "Numéro de Série": item.numero_serie_fabricant || "-",
      "Statut": item.status,
      "Localisation": item.emplacement ? `${item.emplacement.nom} ${item.emplacement.parc ? `(${item.emplacement.parc.nom})` : ''}` : "Non placé",
      "Employé": item.employee ? `${item.employee.nom} ${item.employee.prenom}` : "Sans affectation",
      "Valeur Unitaire": item.valeur_unitaire || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Articles");
    
    XLSX.writeFile(workbook, `Articles_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrint = () => {
    if (selectedIds.length === 0) return toast.error("Veuillez sélectionner au moins un article.");
    
    const printContent = document.getElementById("hidden-print-area")?.innerHTML;
    if (!printContent) return;

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    
    iframe.contentWindow?.document.open();
    iframe.contentWindow?.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Impression Étiquettes</title>
          <style>
            body {
              margin: 0;
              padding: 10px;
              font-family: Arial, sans-serif;
              background: white;
            }
            .print-container {
              display: flex;
              flex-wrap: wrap;
              gap: 15px;
              justify-content: flex-start;
            }
            .etiquette {
              border: 1px dashed #ccc;
              width: 220px;
              height: 140px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              page-break-inside: avoid;
              padding: 10px;
              box-sizing: border-box;
            }
            .etiquette-title {
              font-size: 11px;
              font-weight: bold;
              margin-bottom: 8px;
              text-transform: uppercase;
              color: #000;
            }
            .etiquette-text {
              font-size: 12px;
              margin-top: 5px;
              font-family: monospace;
              font-weight: bold;
              color: #000;
            }
            .etiquette-sub {
              font-size: 9px;
              margin-top: 3px;
              color: #444;
            }
            svg {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${printContent}
          </div>
          <script>
            window.onload = () => {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    iframe.contentWindow?.document.close();
    
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 2000);
  };

  // 🛡️ حماية الصفحة كاملة
  if (!hasPermission(PERMISSIONS.VIEW)) {
    return <div className="p-8 text-center text-slate-500">🚫 Vous n'avez pas l'autorisation de voir cette page.</div>;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-500 font-medium">Chargement des détails de la facture...</p>
      </div>
    );
  }

  if (!article) return null;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 lg:p-8 space-y-6">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none"></div>
        <Button variant="ghost" onClick={() => router.push("/dashboard/articles")} className="mb-4 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour à la liste
        </Button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{article.nom}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1.5"><Tag className="w-4 h-4 text-indigo-400"/> {article.category?.nom}</span>
              <span className="flex items-center gap-1.5"><Box className="w-4 h-4 text-indigo-400"/> {article.quantite_globale} Pièces générées</span>
              <span className="flex items-center gap-1.5 font-semibold text-slate-800"><span className="text-slate-400 font-normal">Valeur Globale:</span> {formatMoney(article.valeur_globale)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Scanner ou chercher par QR, N° Série ou N° Facture..." 
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200 focus-visible:ring-indigo-500/30 rounded-lg shadow-sm h-11"
          />
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center flex-wrap gap-3 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 animate-in fade-in zoom-in duration-200">
            <span className="text-sm font-semibold text-indigo-800">{selectedIds.length} sélectionné(s)</span>
            <div className="h-6 w-px bg-indigo-200 mx-1 hidden sm:block"></div>
            
            {/* 🔹 حماية زر التصدير */}
            {hasPermission(PERMISSIONS.EXPORT) && (
              <Button size="sm" onClick={handleExportExcel} className="bg-green-600 text-white hover:bg-green-700 shadow-sm">
                <Download className="w-4 h-4 mr-2" /> Exporter Excel
              </Button>
            )}
            
            <div className="h-6 w-px bg-indigo-200 mx-1 hidden sm:block"></div>

            <Select value={labelType} onValueChange={(val: any) => setLabelType(val)}>
              <SelectTrigger className="w-[140px] bg-white h-9 border-indigo-200">
                <SelectValue placeholder="Format..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="qr">QR Code</SelectItem>
                <SelectItem value="barcode">Code Barre</SelectItem>
              </SelectContent>
            </Select>

            <Button size="sm" onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
              <Printer className="w-4 h-4 mr-2" /> Imprimer
            </Button>
          </div>
        )}
      </div>

      {/* ITEMS TABLE */}
      <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/80 border-b border-slate-100">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 pl-6">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
                  onChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="font-semibold text-slate-600">N° Facture</TableHead>
              <TableHead className="font-semibold text-slate-600">Référence (Code)</TableHead>
              <TableHead className="font-semibold text-slate-600">Marque & Modèle</TableHead>
              <TableHead className="font-semibold text-slate-600">N° Série</TableHead>
              <TableHead className="font-semibold text-slate-600">Statut</TableHead>
              <TableHead className="font-semibold text-slate-600">Localisation & Affectation</TableHead>
              <TableHead className="text-right font-semibold text-slate-600 pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item: any) => (
                <TableRow key={item.id} className={`${selectedIds.includes(item.id) ? 'bg-indigo-50/50' : ''} group hover:bg-slate-50/50 transition-colors`}>
                  <TableCell className="pl-6">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                    />
                  </TableCell>
                  
                  <TableCell>
                    {item.numero_facture ? (
                      <div className="flex flex-col">
                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold uppercase border border-slate-200">
                          {item.numero_facture}
                        </span>
                        {item.date_facture && <span className="text-xs text-slate-400 mt-1">{new Date(item.date_facture).toLocaleDateString('fr-DZ')}</span>}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-mono text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded w-max border border-indigo-100">{item.qr_code_reference}</span>
                      <span className="text-xs text-slate-400 mt-1">{formatMoney(item.valeur_unitaire)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">{item.marque || "N/A"}</span>
                        <span className="text-xs text-slate-500">{item.modele || "N/A"}</span>
                      </div>
                    {item.is_labeled ? (
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 flex items-center gap-1 w-max mt-1">
                        <Check className="w-3 h-3"/> Enrichi
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 flex items-center gap-1 w-max mt-1">
                        <AlertTriangle className="w-3 h-3"/> Non enrichi
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-slate-600">{item.numero_serie_fabricant || "—"}</TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      {item.emplacement ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-md w-max">
                          <MapPin className="w-3.5 h-3.5 text-orange-500" /> 
                          {item.emplacement.nom} {item.emplacement.parc && <span className="text-slate-400 font-normal">({item.emplacement.parc.nom})</span>}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">— Non placé</span>
                      )}
                      {item.employee ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-md w-max border border-slate-200">
                          <User className="w-3.5 h-3.5 text-blue-500" /> {item.employee.nom} {item.employee.prenom}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">— Sans affectation</span>
                      )}
                    </div>
                  </TableCell>

                  {/* 🔹 الأزرار الفردية محمية بالصلاحيات 🔹 */}
                  <TableCell className="text-right pr-6 align-middle">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {hasPermission(PERMISSIONS.HISTORY) && (
                        <Button variant="ghost" size="icon" onClick={() => openModal('history', item)} title="Voir l'historique" className="text-slate-400 hover:text-purple-600 hover:bg-purple-50">
                          <History className="w-4 h-4" />
                        </Button>
                      )}
                      {hasPermission(PERMISSIONS.CHANGE_STATUS) && (
                        <Button variant="ghost" size="icon" onClick={() => openModal('status', item)} title="Changer le statut" className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                          <Settings2 className="w-4 h-4" />
                        </Button>
                      )}
                      {hasPermission(PERMISSIONS.ASSIGN) && (
                        <Button variant="ghost" size="icon" onClick={() => openModal('assign', item)} title="Affecter à un employé" className="text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                          <User className="w-4 h-4" />
                        </Button>
                      )}
                      {hasPermission(PERMISSIONS.TRANSFER) && (
                        <Button variant="ghost" size="icon" onClick={() => openModal('transfer', item)} title="Transférer" className="text-slate-400 hover:text-orange-600 hover:bg-orange-50">
                          <ArrowRightLeft className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={8} className="h-48 text-center text-slate-500">Aucun article ne correspond à votre recherche.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* منطقة الطباعة المخفية */}
      <div id="hidden-print-area" className="hidden">
        {items.filter(item => selectedIds.includes(item.id)).map(item => (
          <div key={item.id} className="etiquette">
            <div className="etiquette-title">{article?.nom?.substring(0, 25)}</div>
            
            {labelType === "qr" ? (
              <QRCodeSVG value={item.qr_code_reference} size={60} level="M" />
            ) : (
              <Barcode 
                value={item.qr_code_reference} 
                width={1.2} 
                height={40} 
                fontSize={10} 
                displayValue={false} 
                margin={0} 
              />
            )}
            
            <div className="etiquette-text">{item.qr_code_reference}</div>
            {item.marque && <div className="etiquette-sub">{item.marque} {item.modele}</div>}
          </div>
        ))}
      </div>

      {/* 🔹 MODALS 🔹 */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
            <DialogTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Settings2 className="w-5 h-5 text-indigo-600" /> Modifier l'état de l'article</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1">QR Code: <strong className="font-mono text-indigo-700">{selectedItem?.qr_code_reference}</strong></DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangeStatus} className="px-6 py-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Nouveau Statut</label>
              <Select value={newStatus} onValueChange={(val) => setNewStatus(val ?? "")}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Choisir un statut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_service">🟢 En Service</SelectItem>
                  <SelectItem value="en_panne">🟠 En Panne</SelectItem>
                  <SelectItem value="perdu">⚫ Perdu</SelectItem>
                  <SelectItem value="reforme">🟣 Réformé</SelectItem>
                  <SelectItem value="vendu">🔵 Vendu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Justification / Remarque</label>
              <Input placeholder="Ex: Appareil tombé en panne suite à..." value={remarque} onChange={e => setRemarque(e.target.value)} />
            </div>
            <DialogFooter className="pt-4 border-t mt-6 bg-transparent px-0">
              <Button type="button" variant="outline" onClick={() => setIsStatusModalOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[100px]">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Confirmer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
            <DialogTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2"><User className="w-5 h-5 text-blue-600" /> Affecter à un employé</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1">Transférer la responsabilité de cet article.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignEmployee} className="px-6 py-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Employé bénéficiaire</label>
              <Select value={newEmployeeId} onValueChange={(val) => setNewEmployeeId(val ?? "")}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Sélectionner un employé..." /></SelectTrigger>
                <SelectContent>
                  <div className="p-2 sticky top-0 bg-white z-10">
                    <Input placeholder="Chercher un nom..." className="h-8 text-sm" onKeyDown={(e) => e.stopPropagation()} />
                  </div>
                  {employees.length === 0 && <SelectItem value="0" disabled>Aucun employé trouvé</SelectItem>}
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>{emp.nom} {emp.prenom} - {emp.matricule}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Remarque de décharge</label>
              <Input placeholder="Numéro de PV de remise, état..." value={remarque} onChange={e => setRemarque(e.target.value)} />
            </div>
            <DialogFooter className="pt-4 border-t mt-6 bg-transparent px-0">
              <Button type="button" variant="outline" onClick={() => setIsAssignModalOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={actionLoading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Affecter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-white rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
            <DialogTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-orange-600" /> Ordre de Transfert</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1">Générer une demande de transfert en filtrant par structure.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTransfer} className="px-6 py-5 space-y-5">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center gap-3">
              <MapPin className="text-slate-400 w-5 h-5" />
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Localisation Actuelle</p>
                <p className="text-sm font-medium text-slate-800">{selectedItem?.emplacement?.nom || "Non défini"} {selectedItem?.emplacement?.parc && <span className="text-slate-500 font-normal">({selectedItem?.emplacement?.parc.nom})</span>}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-orange-50/50 p-4 border border-orange-100 rounded-xl">
              <div className="col-span-1 md:col-span-2 text-sm font-bold text-orange-800 mb-1 flex items-center gap-2"><Search className="w-4 h-4"/> Filtres de destination</div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">1. Parc / Structure</label>
                <Select value={transferParcId} onValueChange={(val) => { setTransferParcId(val??""); setNewEmplacementId(""); }}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Tous les parcs" /></SelectTrigger>
                  <SelectContent>
                    <div className="p-2 sticky top-0 bg-white z-10"><Input placeholder="Chercher parc..." value={searchParc} onChange={(e) => setSearchParc(e.target.value)} className="h-8 text-sm" onKeyDown={(e) => e.stopPropagation()} /></div>
                    <SelectItem value="all">Tous les parcs</SelectItem>
                    {parcs.map((p: any) => (<SelectItem key={p.id} value={p.id.toString()}>{p.nom}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-800">2. Emplacement <span className="text-red-500">*</span></label>
                <Select value={newEmplacementId} onValueChange={(val) => setNewEmplacementId(val ?? "")}>
                  <SelectTrigger className="bg-white border-slate-300 shadow-sm"><SelectValue placeholder="Sélectionner le bureau / magasin..." /></SelectTrigger>
                  <SelectContent>
                    <div className="p-2 sticky top-0 bg-white z-10"><Input placeholder="Chercher emplacement..." value={searchEmplacement} onChange={(e) => setSearchEmplacement(e.target.value)} className="h-8 text-sm" onKeyDown={(e) => e.stopPropagation()} /></div>
                    {emplacements.length === 0 && <SelectItem value="0" disabled>Aucun emplacement trouvé</SelectItem>}
                    {emplacements.map((loc: any) => (
                      <SelectItem key={loc.id} value={loc.id.toString()} disabled={loc.id === selectedItem?.emplacement_id}>
                        {loc.nom} {transferParcId === "all" && loc.parc && `— ${loc.parc.nom}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-4 border-t mt-6 bg-transparent px-0">
              <Button type="button" variant="outline" onClick={() => setIsTransferModalOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={actionLoading || !newEmplacementId} className="bg-orange-600 hover:bg-orange-700 text-white min-w-[120px]">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Lancer le Transfert"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-white rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2"><History className="w-5 h-5 text-purple-600" /> Historique de l'article</DialogTitle>
                <DialogDescription className="text-sm text-slate-500 mt-1">Traçabilité complète (QR Code: <span className="font-mono text-indigo-700">{selectedItem?.qr_code_reference}</span>)</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-6 pt-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Rechercher une action, utilisateur ou remarque..." value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} className="pl-9 bg-slate-50" />
            </div>
          </div>
          <div className="px-6 py-4 max-h-[50vh] overflow-y-auto">
            {historyLoading ? (
              <div className="flex justify-center items-center py-10"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-10 text-slate-400">Aucun historique correspondant.</div>
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {filteredHistory.map((hist, idx) => (
                  <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-purple-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800 text-sm capitalize">{hist.action.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(hist.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">Par : <span className="font-semibold text-slate-700">{hist.user_name}</span></p>
                      {(hist.old_value || hist.new_value) && (
                        <div className="bg-slate-50 p-2 rounded text-xs text-slate-600 mt-2 font-mono">
                          {hist.old_value && <span className="line-through text-slate-400 mr-2">{hist.old_value}</span>}
                          {hist.new_value && <span className="text-indigo-600 font-bold">➔ {hist.new_value}</span>}
                        </div>
                      )}
                      {hist.remarque && <p className="text-xs text-slate-500 italic mt-2 border-l-2 border-slate-300 pl-2">"{hist.remarque}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-slate-50/80"><Button variant="outline" onClick={() => setIsHistoryModalOpen(false)}>Fermer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}