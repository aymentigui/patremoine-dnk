"use client";

import { useState, useEffect } from "react";
import { Box, List, ArrowRightLeft, History } from "lucide-react";
// 🔹 استدعاء الـ Store لي تفاهمنا عليه 🔹
import { useAuthStore } from "@/store/useAuthStore";

// Components (Tabs)
import ArticlesTab from "./ArticlesTab"; 
import ArticleItemsTab from "./ArticlesItemsTab"; 
import TransfersTab from "./TransfersTab"; 
import HistoryTab from "./HistoryTab"; 

export default function InventoryDashboard() {
  // 🔹 جلب دالة التحقق من الصلاحيات 🔹
  const hasPermission = useAuthStore((state) => state.hasPermission);

  // 🔹 تعريف الـ Tabs مع ربط كل واحد بالصلاحية نتاعو من الـ API الأول 🔹
  const allTabs = [
    { id: "catalogue", label: "Catalogue", icon: Box, permission: "gerer_articles" },
    { id: "items", label: "Articles (Items)", icon: List, permission: "voir_article_items" },
    { id: "transfers", label: "Transferts", icon: ArrowRightLeft, permission: "voir_transfers" },
    { id: "history", label: "Historique", icon: History, permission: "gerer_articles" }, // حسب مسار الباك-اند Historique مربوط بـ gerer_articles
  ];

  // 🔹 فلترة الـ Tabs باش نخليو غير لي عندو الحق يشوفهم 🔹
  const availableTabs = allTabs.filter((tab) => hasPermission(tab.permission));

  // 🔹 تحديد أول Tab متاح كافتراضي (باش ما يفتحلوش تاب فارغ إذا ماعندوش صلاحية الأول) 🔹
  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    // إذا ماكاش Tab مفتوح وكاين Tabs متاحين، نفتحو الأول أوتوماتيكياً
    if (!activeTab && availableTabs.length > 0) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  // 🔹 إذا المستعمل ماعندوش صلاحية لحتى تاب، نمنعوه من الدخول للصفحة 🔹
  if (availableTabs.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-slate-500 space-y-4">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
          <Box className="w-8 h-8" />
        </div>
        <p className="text-lg font-medium">🚫 Accès refusé. Vous n'avez pas les permissions nécessaires.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 lg:p-8 space-y-6">
      {/* 🔹 TABS NAVIGATION */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200 inline-flex overflow-x-auto max-w-full shadow-sm">
        {availableTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                isActive
                  ? "bg-indigo-50 text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 🔹 TABS CONTENT */}
      <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === "catalogue" && <ArticlesTab />}
        
        {activeTab === "items" && <ArticleItemsTab />}

        {activeTab === "transfers" && <TransfersTab />}

        {activeTab === "history" && <HistoryTab />}
      </div>
    </div>
  );
}