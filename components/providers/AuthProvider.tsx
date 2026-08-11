"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isHydrated, setIsHydrated] = useState(false);
    const token = useAuthStore((state) => state.token);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // نتأكدو بلي الـ Zustand جاب الداتا من الـ localStorage
        setIsHydrated(true);
    }, []);

    useEffect(() => {
        if (!isHydrated) return;

        const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/forgot-password");

        // إذا ماعندوش توكن ويحوس يدخل للداشبورد، نرجعوه للـ login
        if (!token && !isAuthPage) {
            router.push("/login");
        }
        // إذا مكونيكتي ويحوس يولي للـ login، ندخلوه ديريكت للداشبورد
        else if (token && isAuthPage) {
            router.push("/dashboard");
        }
    }, [token, pathname, isHydrated, router]);

    // شاشة تحميل خفيفة بين ما يتأكد من التوكن
    if (!isHydrated) {
        return (
            <div className={cn('flex', 'min-h-screen', 'items-center', 'justify-center', 'bg-slate-50')}>
                <Loader2 className={cn('h-8', 'w-8', 'animate-spin', 'text-primary')} />
            </div>
        );
    }

    // ما نافيشيوش المحتوى المحمي إذا ماكاش توكن (باش ما يصراش فلاش)
    if (!token && !pathname.startsWith("/login") && !pathname.startsWith("/forgot-password")) {
        return null;
    }

    return <>{children}</>;
}