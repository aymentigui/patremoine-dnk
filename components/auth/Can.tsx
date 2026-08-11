"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { ReactNode } from "react";

interface CanProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode; // واش نافيشيو إذا ماعندوش الصلاحية (بار ديفو مانافيشيو والو)
}

export function Can({ permission, children, fallback = null }: CanProps) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  // console.log(hasPermission(permission))
  // إذا عندو الصلاحية (ولا راهو Super Admin)، نافيشيو المحتوى
  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  // إذا ماعندوش، نافيشيو الـ fallback (غالباً null يعني ما يبان والو)
  return <>{fallback}</>;
}