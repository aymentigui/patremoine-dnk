"use client";

import { useState, useEffect } from "react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Briefcase, Bus, MapPin, Network, Loader2, Layers } from "lucide-react";
import api from "@/lib/axios";
import toast from "react-hot-toast";

import { DirectionsTab } from "@/components/organigramme/DirectionsTab";
import { DepartementsTab } from "@/components/organigramme/DepartementsTab";
import { ParcsTab } from "@/components/organigramme/ParcsTab";
import { EmplacementsTab } from "@/components/organigramme/EmplacementsTab";

export default function OrganigrammePage() {
  const [activeTab, setActiveTab] = useState("directions");
  const [treeData, setTreeData] = useState<any[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    if (val === "tree") {
      setLoadingTree(true);
      api.get("/organigramme/tree")
        .then(res => setTreeData(res.data.data || []))
        .catch(() => toast.error("Erreur de chargement de l'organigramme"))
        .finally(() => setLoadingTree(false));
    }
  };

  return (
    <PermissionGuard permission="gerer_organigramme">
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 p-4 md:p-6 lg:p-8 space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Structure de l&apos;Entreprise
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Gérez les directions, départements, parcs et emplacements physiques.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="directions" value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
          
          <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 w-full overflow-x-auto">
            <TabsList className="flex w-full min-w-max h-auto bg-transparent p-0 gap-2">
              <TabsTrigger 
                value="directions" 
                className="flex-1 py-3 px-4 rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none transition-all duration-300"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Directions
              </TabsTrigger>
              <TabsTrigger 
                value="departements" 
                className="flex-1 py-3 px-4 rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none transition-all duration-300"
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Départements
              </TabsTrigger>
              <TabsTrigger 
                value="parcs" 
                className="flex-1 py-3 px-4 rounded-lg data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none transition-all duration-300"
              >
                <Bus className="w-4 h-4 mr-2" />
                Parcs
              </TabsTrigger>
              <TabsTrigger 
                value="emplacements" 
                className="flex-1 py-3 px-4 rounded-lg data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:shadow-none transition-all duration-300"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Emplacements
              </TabsTrigger>
              <TabsTrigger 
                value="tree" 
                className="flex-1 py-3 px-4 rounded-lg data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:shadow-none transition-all duration-300 font-medium"
              >
                <Network className="w-4 h-4 mr-2" />
                Vue Arborescente 
              </TabsTrigger>
            </TabsList>
          </div>

          {/* محتوى كل تبويبة */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 min-h-[400px]">
            <TabsContent value="directions" className="m-0 focus-visible:outline-none">
              <DirectionsTab />
            </TabsContent>
            
            <TabsContent value="departements" className="m-0 focus-visible:outline-none">
              <DepartementsTab />
            </TabsContent>
            
            <TabsContent value="parcs" className="m-0 focus-visible:outline-none">
              <ParcsTab />
            </TabsContent>
            
            <TabsContent value="emplacements" className="m-0 focus-visible:outline-none">
              <EmplacementsTab />
            </TabsContent>

        {/* 🔥 التبويبة الجديدة الخرافية (Vue Arborescente) */}
            <TabsContent value="tree" className="m-0 p-6 focus-visible:outline-none">
              {loadingTree ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-2" />
                  <p className="text-sm text-slate-500">Construction de l&apos;arborescence...</p>
                </div>
              ) : treeData.length === 0 ? (
                <div className="text-center py-16 text-slate-400">Aucune donnée disponible.</div>
              ) : (
                <div className="space-y-6">
                  <div className="border-l-4 border-emerald-500 pl-4 py-1">
                    <h3 className="text-lg font-bold text-slate-800">Hiérarchie par Parcs Roulants</h3>
                    <p className="text-sm text-slate-500">Visualisation par infrastructure : Parcs ➔ Départements &amp; Directions ➔ Emplacements physiques</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {/* Map على الـ Parcs اللي جات من الـ API */}
                    {treeData.map((parc) => (
                      <div key={parc.id} className="border border-slate-200 rounded-xl p-5 bg-slate-50/40 shadow-sm space-y-4">
                        
                        {/* 1. Parc Card (الأساس) */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
                              <Bus className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded mr-2">{parc.code}</span>
                              <span className="text-base font-bold text-slate-900">{parc.nom}</span>
                              {parc.wilaya && <span className="text-xs text-slate-400 ml-2">({parc.wilaya})</span>}
                            </div>
                          </div>
                        </div>

                        {/* 2. Départements et Directions affiliés (بما أنها مصفوفة List) */}
                        {parc.departements && parc.departements.length > 0 ? (
                          <div className="ml-6 space-y-2">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2">Départements ({parc.departements.length})</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {parc.departements.map((dep: any) => (
                                <div key={dep.id} className="pl-4 border-l-2 border-indigo-200 bg-indigo-50/30 rounded-lg p-3 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-md">
                                      <Briefcase className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded mr-2">{dep.code}</span>
                                      <span className="text-sm font-semibold text-slate-800">{dep.nom}</span>
                                    </div>
                                  </div>

                                  {/* Direction Mère اللي يتبع ليها هاد القسم */}
                                  {dep.direction && (
                                    <div className="ml-6 flex items-center gap-2 text-xs text-slate-500 pt-1">
                                      <Building2 className="w-3.5 h-3.5 text-blue-500" />
                                      <span>Direction : <strong className="text-slate-700">{dep.direction.nom}</strong> ({dep.direction.code})</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="ml-6 text-xs text-amber-600 bg-amber-50 p-2 rounded w-fit">⚠️ Aucun département lié à ce parc</div>
                        )}

                        {/* 3. Emplacements du Parc */}
                        {parc.emplacements && parc.emplacements.length > 0 && (
                          <div className="ml-6 pl-4 border-l-2 border-orange-200 space-y-2 pt-2">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Emplacements ({parc.emplacements.length})</p>
                            <div className="flex flex-wrap gap-2">
                              {parc.emplacements.map((emp: any) => (
                                <div key={emp.id} className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs shadow-xs">
                                  <MapPin className="w-3.5 h-3.5 text-orange-500" />
                                  <span className="font-medium text-slate-700">{emp.nom}</span>
                                  <span className="text-[10px] uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">{emp.type}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </div>

        </Tabs>
      </div>
    </PermissionGuard>
  );
}