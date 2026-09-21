"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2, Layers, ListTree, BookA } from "lucide-react";

// استدعاء المكونات (Les Tabs)
import CategoriesTabContent from "@/components/settings/CategoriesTabContent";
import SubCategoriesTabContent from "@/components/settings/SubCategoriesTabContent";
import NomenclaturesTabContent from "@/components/settings/NomenclaturesTabContent";

const PERMISSIONS = {
  MANAGE_SETTINGS: "gerer_articles", // 👈 بدلها بالصلاحية اللي تناسبك إذا عندك "gerer_parametres"
};

export default function SettingsPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const [activeTab, setActiveTab] = useState("categories");

  if (!hasPermission(PERMISSIONS.MANAGE_SETTINGS)) {
    return <div className="p-8 text-center text-slate-500">🚫 Accès refusé. Vous n'avez pas la permission de gérer les paramètres.</div>;
  }

  return (
    <div className="space-y-6 min-h-screen bg-slate-50/50 p-4 md:p-6 lg:p-8">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Settings2 size={24} strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Paramètres du Catalogue</h1>
          <p className="text-sm text-slate-500 mt-1">Gérer les catégories, sous-catégories et les nomenclatures des articles.</p>
        </div>
      </div>

      {/* TABS CONTAINER */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-white border border-slate-200 shadow-sm p-1 h-auto rounded-xl flex flex-wrap gap-1 justify-start">
          <TabsTrigger value="categories" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-6 py-2.5 flex items-center gap-2">
            <Layers className="w-4 h-4" /> Catégories
          </TabsTrigger>
          <TabsTrigger value="subcategories" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-6 py-2.5 flex items-center gap-2">
            <ListTree className="w-4 h-4" /> Sous-catégories
          </TabsTrigger>
          <TabsTrigger value="nomenclatures" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-6 py-2.5 flex items-center gap-2">
            <BookA className="w-4 h-4" /> Nomenclatures (Articles)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="outline-none m-0">
          <CategoriesTabContent />
        </TabsContent>

        <TabsContent value="subcategories" className="outline-none m-0">
          <SubCategoriesTabContent />
        </TabsContent>

        <TabsContent value="nomenclatures" className="outline-none m-0">
          <NomenclaturesTabContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}