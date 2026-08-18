"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { ArrowLeft, Keyboard, Loader2, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

// مكون السكانار (درناه داخل Suspense باش الـ useSearchParams مايديرش مشكل في Next.js)
function ScannerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get("action"); // باش نعرفو واش من عملية نديرو بعد السكان
  
  const [isScanning, setIsScanning] = useState(true);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const stopScanner = useCallback(() => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().catch(console.error);
    }
  }, []);

  // دالة التعامل مع الكود بعد قراءته
  const handleScanSuccess = useCallback((code: string) => {
    stopScanner();
    setIsScanning(false);
    
    // فايبريسيون خفيفة في التليفون باش الخدام يعرف بلي تقرا الكود
    if (navigator.vibrate) navigator.vibrate(200);

    toast.success(`Code scanné : ${code}`);

    // التوجيه الذكي على حساب الـ action
    if (action === "initial_placement") {
      router.push(`/app/inventory/placement?qr=${code}`);
    } else if (action === "quick_transfer") {
      router.push(`/app/inventory/transfer?qr=${code}`);
    } else if (action === "room_status") {
      router.push(`/app/inventory/room?qr=${code}`);
    } else if (action === "inventory") {
      const commissionId = searchParams.get("commission_id");
      const emplacementId = searchParams.get("emplacement_id");
      // نرجعوه لصفحة الجرد مع الكود اللي سكانيناه
      router.push(`/app/inventory/${commissionId}?emplacement_id=${emplacementId}&qr=${code}`);
    } else {
      // إذا ماكانش أكشن (سكانار عام)، نبعثوه لصفحة تفاصيل العتاد/السيارة
      router.push(`/app/details?qr=${code}`);
    }
  }, [action, router, searchParams, stopScanner]);

  // إعداد الكاميرا
  useEffect(() => {
    if (manualMode) {
      stopScanner();
      return;
    }

    const startScanner = async () => {
      try {
        scannerRef.current = new Html5Qrcode("qr-reader");
        await scannerRef.current.start(
          { facingMode: "environment" }, // الكاميرا الخلفية دائما
          {
            fps: 10,    // سرعة الفحص (10 إطارات في الثانية)
            qrbox: { width: 250, height: 250 }, // المربع نتاع الفوكس
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // كي ينجح في قراءة الكود
            handleScanSuccess(decodedText);
          },
          (errorMessage) => {
            // نتجاهلو الأخطاء العادية نتاع الفوكس
          }
        );
      } catch (err) {
        console.error("Erreur de caméra:", err);
        toast.error("Impossible d'accéder à la caméra. Utilisez la saisie manuelle.");
        setManualMode(true);
      }
    };

    startScanner();

    // Cleanup: نحبسو الكاميرا كي نخرجو من الصفحة
    return () => {
      stopScanner();
    };
  }, [manualMode, stopScanner, handleScanSuccess]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return toast.error("Veuillez entrer un code.");
    handleScanSuccess(manualCode.trim());
  };

  return (
    <div className="flex flex-col h-full bg-black text-white relative">
      
      {/* HEADER */}
      <header className="absolute top-0 left-0 w-full p-4 z-50 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={() => router.back()} className="p-2 bg-white/10 rounded-full backdrop-blur-md active:scale-95 transition-transform">
          <ArrowLeft size={24} className="text-white" />
        </button>
        <h1 className="text-white font-bold tracking-wide">
          {action ? "Action requise" : "Scanner un article"}
        </h1>
        <div className="w-10"></div> {/* Spacer */}
      </header>

      {/* منطقة الكاميرا */}
      {!manualMode ? (
        <div className="flex-1 relative flex flex-col items-center justify-center">
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <Loader2 className="w-8 h-8 animate-spin text-white/50" />
            </div>
          )}
          
          <div id="qr-reader" className="w-full h-full object-cover"></div>

          {/* Overlay UI (الزخرفة نتاع السكانار) */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className="w-[250px] h-[250px] border-2 border-white/50 rounded-3xl relative">
              {/* زوايا المربع (Corners) */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-3xl"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-3xl"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-3xl"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-3xl"></div>
              
              {/* خط الفحص المتحرك (Scan Line) */}
              <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-500/80 shadow-[0_0_8px_2px_rgba(59,130,246,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
            </div>
            <p className="mt-8 text-sm text-white/80 bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">
              Centrez le QR Code dans le cadre
            </p>
          </div>

          {/* زر التبديل إلى الإدخال اليدوي */}
          <div className="absolute bottom-28 w-full flex justify-center z-50">
            <button 
              onClick={() => setManualMode(true)}
              className="flex items-center gap-2 bg-white/20 text-white px-6 py-3 rounded-full backdrop-blur-md active:scale-95 transition-all"
            >
              <Keyboard size={20} />
              <span className="font-semibold text-sm">Saisie Manuelle</span>
            </button>
          </div>
        </div>
      ) : (
        /* وضع الإدخال اليدوي (Manual Entry) */
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-900">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
            <div className="w-16 h-16 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <QrCode size={32} />
            </div>
            <h2 className="text-xl font-bold text-center text-slate-900 mb-2">Entrer le code</h2>
            <p className="text-sm text-slate-500 text-center mb-6">
              Saisissez le numéro de série ou la référence sous le QR Code.
            </p>
            
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <Input 
                autoFocus
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ex: QR-12345" 
                className="text-center text-lg font-mono py-6 bg-slate-50"
              />
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-base rounded-xl">
                Valider
              </Button>
              <Button type="button" variant="ghost" onClick={() => setManualMode(false)} className="w-full text-slate-500">
                <ArrowLeft size={16} className="mr-2" /> Retour à la caméra
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ستايل الخط المتحرك */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}} />
    </div>
  );
}

export default function MobileScanPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center bg-black"><Loader2 className="w-8 h-8 animate-spin text-white"/></div>}>
      <ScannerContent />
    </Suspense>
  );
}