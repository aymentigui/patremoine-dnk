import { BottomNav } from "@/components/mobile/BottomNav";
import { ReactNode } from "react";

export default function MobileAppLayout({ children }: { children: ReactNode }) {
  return (
    // استعملنا 100dvh باش يجي سوا سوا مع شاشة التليفون، overflow-hidden باش ما يسكرووليش الصفحة كامل
    <div className="flex flex-col h-[100dvh] bg-slate-50 overflow-hidden font-sans">
      
      {/* 
        منطقة المحتوى:
        flex-1 باش تدي المساحة الباقية
        overflow-y-auto باش هاد البلاصة برك لي تتسكرولا
        pb-24 باش المحتوى ما يتخباش تحت الـ BottomNav
      */}
      <main className="flex-1 overflow-y-auto pb-24 relative">
        {children}
      </main>

      {/* الشريط السفلي */}
      <BottomNav />
      
    </div>
  );
}