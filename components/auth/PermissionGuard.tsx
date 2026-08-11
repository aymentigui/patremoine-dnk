"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "../../lib/utils";

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
}

export function PermissionGuard({ permission, children }: PermissionGuardProps) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const router = useRouter();

  if (!hasPermission(permission)) {
    return (
      <div className={cn('flex', 'h-[80vh]', 'flex-col', 'items-center', 'justify-center', 'text-center', 'px-4')}>
        <div className={cn('rounded-full', 'bg-red-100', 'p-4', 'mb-6')}>
          <ShieldAlert className={cn('h-12', 'w-12', 'text-red-600')} />
        </div>
        <h2 className={cn('text-2xl', 'font-bold', 'text-gray-900', 'mb-2')}>Accès Refusé</h2>
        <p className={cn('text-gray-500', 'max-w-md', 'mb-6')}>
          Vous n&apos;avez pas les autorisations nécessaires pour accéder à cette page. 
          Veuillez contacter l&apos;administrateur système si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
        </p>
        <Button onClick={() => router.push("/dashboard")} variant="outline">
          Retour au tableau de Bord
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}