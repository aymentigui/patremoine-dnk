"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
// 🔹 الاستيراد الجديد لي تفاهمنا عليه 🔹
import { useAuthStore } from "@/store/useAuthStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, LayoutDashboard, Wallet, ClipboardCheck, Droplet, ArrowRightLeft, TrendingUp, AlertTriangle } from "lucide-react";

// Recharts
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const formatMoney = (amount: number) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(amount || 0);

// Colors for Charts
const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#64748B'];
const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Jui", "Aoû", "Sep", "Oct", "Nov", "Déc"];

export default function DashboardPage() {
  // 🔹 جلب دالة التحقق من الصلاحيات من الـ Store 🔹
  const hasPermission = useAuthStore((state) => state.hasPermission);

  const [loading, setLoading] = useState(true);
  const [annee, setAnnee] = useState(new Date().getFullYear().toString());
  const [parcs, setParcs] = useState<any[]>([]);
  const [parcId, setParcId] = useState("all");

  // States
  const [finance, setFinance] = useState<any>(null);
  const [inventory, setInventory] = useState<any>(null);
  const [gasoil, setGasoil] = useState<any>(null);
  const [logistics, setLogistics] = useState<any>(null);

  // 🔹 متغيرات للتحكم في ظهور الأقسام حسب الصلاحيات الدقيقة (من تحليل الكود الأول) 🔹
  const canViewInventory = hasPermission("voir_campagnes_inventaire") || hasPermission("voir_reforme");
  const canViewGasoil = hasPermission("gerer_gasoil");
  const canViewLogistics = hasPermission("voir_transfers");

  useEffect(() => {
    // 🔹 حماية الـ Request باش ما يضربش 403 🔹
    if (hasPermission("voir_dashboard")) {
      api.get("/organigramme/tree").then(res => setParcs(res.data.data || []));
    }
  }, [hasPermission]);

  useEffect(() => {
    const fetchAllData = async () => {
      // 🔹 لا تقم بتحميل البيانات إذا لم يكن لديه الصلاحية 🔹
      if (!hasPermission("voir_dashboard")) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const params: any = { annee };
      if (parcId !== "all") params.parc_id = parcId;

      try {
        const [finRes, invRes, gasRes, logRes] = await Promise.all([
          api.get("/dashboard/finance", { params }),
          api.get("/dashboard/inventory", { params }),
          api.get("/dashboard/gasoil", { params }),
          api.get("/dashboard/logistics", { params })
        ]);

        setFinance(finRes.data.data);
        setInventory(invRes.data.data);
        setGasoil(gasRes.data.data);
        setLogistics(logRes.data.data);
      } catch (e) {
        console.error("Dashboard error", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [annee, parcId, hasPermission]);

  // --- Formatage pour Inventaire & Réforme ---
  const formatCampagnesStatus = () => {
    if (!inventory?.campagnes_status) return [];
    const labels: any = { 'planifiee': 'Planifiée', 'en_cours': 'En Cours', 'cloturee': 'Clôturée' };
    return inventory.campagnes_status.map((s: any) => ({
      name: labels[s.status] || s.status,
      value: parseInt(s.total)
    }));
  };

  const formatAnomalies = () => {
    if (!inventory?.ecarts_annuels) return [];
    return [
      { name: 'Articles Déplacés', total: parseInt(inventory.ecarts_annuels.total_deplaces) || 0 },
      { name: 'Articles en Panne', total: parseInt(inventory.ecarts_annuels.total_pannes) || 0 }
    ];
  };

  // --- Data Formatting for Charts ---
  const formatEvoMensuelle = (data: any[], valueKey: string) => {
    return MONTHS.map((m, idx) => {
      const found = data?.find((d: any) => parseInt(d.mois) === idx + 1);
      return { mois: m, [valueKey]: found ? parseFloat(found[valueKey]) : 0 };
    });
  };

  const formatGasoilEvo = () => {
    return MONTHS.map((m, idx) => {
      const found = gasoil?.evolution_mensuelle?.find((d: any) => parseInt(d.mois) === idx + 1);
      return { mois: m, consomme: found ? parseFloat(found.consomme) : 0, perte_dzd: found ? parseFloat(found.perte_dzd) : 0 };
    });
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-violet-600"/></div>;

  return (
    <PermissionGuard permission="voir_dashboard">
      <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 lg:p-8 space-y-6">
        
        {/* 🔹 HEADER & FILTERS 🔹 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <LayoutDashboard size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tableau de Bord Global</h1>
              <p className="text-sm text-slate-500 mt-1">Vue d'ensemble de l'entreprise</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={parcId} onValueChange={setParcId}>
              <SelectTrigger className="w-[180px] bg-white"><SelectValue placeholder="Parc" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les Parcs</SelectItem>
                {parcs.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.nom}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={annee} onValueChange={setAnnee}>
              <SelectTrigger className="w-[120px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[...Array(5)].map((_, i) => {
                  const y = new Date().getFullYear() - i;
                  return <SelectItem key={y} value={y.toString()}>{y}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 🔹 TABS 🔹 */}
        <Tabs defaultValue="finance" className="w-full">
          <TabsList className="bg-white border border-slate-100 p-1 rounded-xl h-auto flex flex-wrap shadow-sm mb-6">
            <TabsTrigger value="finance" className="data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 py-2.5 px-4 rounded-lg flex-1">
              <Wallet className="w-4 h-4 mr-2" /> Finance & Patrimoine
            </TabsTrigger>
            
            {/* 🔹 حماية الـ Tabs باش ما يبانوش للي ماعندوش الحق 🔹 */}
            {canViewInventory && (
              <TabsTrigger value="inventory" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 py-2.5 px-4 rounded-lg flex-1">
                <ClipboardCheck className="w-4 h-4 mr-2" /> Inventaire & Réforme
              </TabsTrigger>
            )}
            
            {canViewGasoil && (
              <TabsTrigger value="gasoil" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 py-2.5 px-4 rounded-lg flex-1">
                <Droplet className="w-4 h-4 mr-2" /> Carburant (Gasoil)
              </TabsTrigger>
            )}

            {canViewLogistics && (
              <TabsTrigger value="logistics" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 py-2.5 px-4 rounded-lg flex-1">
                <ArrowRightLeft className="w-4 h-4 mr-2" /> Logistique & Transferts
              </TabsTrigger>
            )}
          </TabsList>

          {/* ======================================= */}
          {/* TAB 1: FINANCE */}
          {/* ======================================= */}
          <TabsContent value="finance" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="text-slate-500 text-sm font-semibold uppercase mb-2 flex items-center gap-2"><Wallet className="w-4 h-4 text-violet-500"/> Valeur Totale du Patrimoine</div>
                <div className="text-3xl font-bold text-slate-800">{formatMoney(finance?.valeur_totale)}</div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="text-slate-500 text-sm font-semibold uppercase mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500"/> Nombre d'Articles Actifs</div>
                <div className="text-3xl font-bold text-slate-800">{new Intl.NumberFormat('fr-DZ').format(finance?.total_pieces || 0)} <span className="text-sm font-normal text-slate-500">Unités</span></div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="text-slate-500 text-sm font-semibold uppercase mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500"/> Articles en Panne</div>
                <div className="text-3xl font-bold text-slate-800">
                  {finance?.valeur_par_etat?.find((e:any) => e.status === 'en_panne')?.count || 0}
                  <span className="text-sm font-normal text-orange-600 ml-2">({formatMoney(finance?.valeur_par_etat?.find((e:any) => e.status === 'en_panne')?.total_valeur || 0)})</span>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6">Investissements par Mois ({annee})</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formatEvoMensuelle(finance?.evolution_mensuelle, 'valeur')}>
                      <defs>
                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                      <YAxis tickFormatter={(val) => `${val / 1000000}M`} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                      <Tooltip formatter={(value: number) => [formatMoney(value), "Investissement"]} />
                      <Area type="monotone" dataKey="valeur" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6">Répartition par Catégorie</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={finance?.valeur_par_categorie} dataKey="total_valeur" nameKey="categorie" cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5}>
                        {finance?.valeur_par_categorie?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatMoney(value)} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ======================================= */}
          {/* TAB 2: INVENTAIRE & RÉFORME */}
          {/* ======================================= */}
          {canViewInventory && (
            <TabsContent value="inventory" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                  <div className="text-emerald-700 text-xs font-bold uppercase mb-1">Campagnes Terminées</div>
                  <div className="text-2xl font-bold text-emerald-800">{inventory?.campagnes_status?.find((s:any)=>s.status==='cloturee')?.total || 0}</div>
                </div>
                <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
                  <div className="text-orange-700 text-xs font-bold uppercase mb-1">Écarts (Déplacés)</div>
                  <div className="text-2xl font-bold text-orange-800">{inventory?.ecarts_annuels?.total_deplaces || 0}</div>
                </div>
                <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100">
                  <div className="text-rose-700 text-xs font-bold uppercase mb-1">Articles Réformés</div>
                  <div className="text-2xl font-bold text-rose-800">{inventory?.reformes_stats?.executes || 0}</div>
                </div>
                <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                  <div className="text-blue-700 text-xs font-bold uppercase mb-1">Gains Vente Réforme</div>
                  <div className="text-2xl font-bold text-blue-800">{formatMoney(inventory?.reformes_stats?.total_gagne_vente || 0)}</div>
                </div>
              </div>
              
              {/* Charts Inventaire & Réforme */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                
                {/* Chart 1 : Statut des campagnes (PieChart) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-6">Répartition des Campagnes</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={formatCampagnesStatus()} 
                          dataKey="value" 
                          nameKey="name" 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={70} 
                          outerRadius={100} 
                          paddingAngle={5}
                        >
                          {formatCampagnesStatus().map((entry: any, index: number) => {
                             let color = "#64748B"; 
                             if(entry.name === 'Planifiée') color = "#F59E0B";
                             if(entry.name === 'En Cours') color = "#10B981";
                             if(entry.name === 'Clôturée') color = "#3B82F6";
                             return <Cell key={`cell-${index}`} fill={color} />;
                          })}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2 : Bilan des Anomalies (BarChart) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-6">Bilan des Anomalies (Écarts)</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={formatAnomalies()} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} barSize={60}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                        <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                        <Tooltip cursor={{ fill: 'transparent' }} />
                        <Bar dataKey="total" name="Nombre d'articles" radius={[6, 6, 0, 0]}>
                          {formatAnomalies().map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#F97316' : '#EF4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </TabsContent>
          )}

          {/* ======================================= */}
          {/* TAB 3: GASOIL */}
          {/* ======================================= */}
          {canViewGasoil && (
            <TabsContent value="gasoil" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="text-slate-500 text-sm font-semibold uppercase mb-2">Total Consommé</div>
                  <div className="text-3xl font-bold text-slate-800">{new Intl.NumberFormat('fr-DZ').format(gasoil?.total_annuel?.total_consomme_litres || 0)} L</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="text-slate-500 text-sm font-semibold uppercase mb-2">Perte Volume (Écart)</div>
                  <div className="text-3xl font-bold text-orange-600">{new Intl.NumberFormat('fr-DZ').format(Math.abs(gasoil?.total_annuel?.total_ecart_litres || 0))} L</div>
                </div>
                <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 shadow-sm">
                  <div className="text-rose-700 text-sm font-bold uppercase mb-2">Perte Financière Estimée</div>
                  <div className="text-3xl font-bold text-rose-700">{formatMoney(gasoil?.total_annuel?.total_perte_financiere_dzd || 0)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-6">Consommation vs Pertes Financières</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={formatGasoilEvo()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="mois" axisLine={false} tickLine={false} />
                        {/* YAxis gauche pour les Litres */}
                        <YAxis yAxisId="left" tickFormatter={(v)=>`${v/1000}kL`} axisLine={false} tickLine={false} />
                        {/* YAxis droite pour les DZD */}
                        <YAxis yAxisId="right" orientation="right" tickFormatter={(v)=>`${v/1000}k`} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="consomme" name="Consommation (L)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="perte_dzd" name="Pertes (DZD)" fill="#EF4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-6">Top Parcs : Les plus grosses pertes</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gasoil?.perte_par_parc} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tickFormatter={(v) => `${v/1000}k`} axisLine={false} />
                        <YAxis dataKey="parc" type="category" axisLine={false} tickLine={false} width={100} />
                        <Tooltip formatter={(value: number) => formatMoney(value)} />
                        <Bar dataKey="perte_dzd" name="Perte DZD" fill="#F97316" radius={[0, 4, 4, 0]}>
                          {gasoil?.perte_par_parc?.map((entry:any, index:number) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#EF4444' : '#F97316'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </TabsContent>
          )}

          {/* ======================================= */}
          {/* TAB 4: LOGISTIQUE */}
          {/* ======================================= */}
          {canViewLogistics && (
            <TabsContent value="logistics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-6">Évolution des Transferts Mensuels</h3>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={formatEvoMensuelle(logistics?.evolution_mensuelle, 'total')}>
                        <defs>
                          <linearGradient id="colorLog" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="mois" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="total" name="Mouvements" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorLog)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-6">Top Destinations (Réceptions)</h3>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={logistics?.top_destinations}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="nom" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="total_recus" name="Biens Reçus" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </TabsContent>
          )}

        </Tabs>
      </div>
    </PermissionGuard>
  );
}