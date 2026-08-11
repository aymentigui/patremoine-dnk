"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import Link from "next/link";

// Icons from Lucide
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Zap, Server, Bus, ArrowRight } from "lucide-react";

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { cn } from "../../lib/utils";

const loginSchema = z.object({
    email: z.string().email("Veuillez entrer une adresse email valide."),
    password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();
    const setAuth = useAuthStore((state) => state.setAuth);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormValues) => {
        try {
            setIsLoading(true);
            const response = await api.post("/login", data);
            
            const { token, user, employee_profile } = response.data.data;
            
            setAuth(token, user, employee_profile);
            
            toast.success("Connexion réussie ! Bienvenue.");
            router.push("/dashboard");
        } catch (error: any) {
            const message = error.response?.data?.message || "Erreur lors de la connexion. Vérifiez vos identifiants.";
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={cn('flex', 'min-h-screen', 'items-center', 'justify-center', 'bg-slate-50', 'p-4', 'sm:p-8')}>
            {/* Main Container - Split Layout */}
            <div className={cn('w-full', 'max-w-5xl', 'overflow-hidden', 'rounded-2xl', 'bg-white', 'shadow-2xl', 'flex', 'flex-col', 'md:flex-row', 'min-h-[600px]', 'border', 'border-gray-100')}>

                {/* Left Section (Branding/Visual) - Hidden on Mobile */}
                <div className={cn('relative', 'hidden', 'w-full', 'flex-col', 'justify-between', 'bg-primary', 'md:flex', 'md:w-1/2', 'lg:w-5/12', 'p-10', 'text-white', 'overflow-hidden')}>
                    <Image
                        src="/buses.jpeg"
                        alt="Logo"
                        fill
                        className={cn('object-cover', 'opacity-80', 'z-0')}
                    />
                    {/* Decorative Elements */}
                    <div className={cn('absolute', '-top-24', '-left-24', 'h-64', 'w-64', 'rounded-full', 'bg-white/10', 'blur-3xl')}></div>
                    <div className={cn('absolute', 'bottom-10', 'right-10', 'h-32', 'w-32', 'rounded-full', 'bg-white/20', 'blur-2xl')}></div>

                    {/* Logo / Header */}
                    <div className={cn('relative', 'z-10', 'flex', 'items-center', 'gap-3')}>
                        <div className={cn('flex', 'h-10', 'w-10', 'items-center', 'justify-center', 'rounded-lg', 'bg-white', 'font-bold', 'text-primary', 'shadow-sm')}>
                            <Bus size={24} />
                        </div>
                        <span className={cn('text-xl', 'font-bold', 'tracking-tight')}>Djamiaya</span>
                    </div>

                    {/* Hero Content */}
                    <div className={cn('relative', 'z-10', 'mt-auto')}>
                        <h1 className={cn('text-3xl', 'font-bold', 'tracking-tight', 'mb-4')}>Système Intégré de Gestion</h1>
                        <p className={cn('text-green-100', 'text-base', 'leading-relaxed', 'mb-6')}>
                            Gérez efficacement votre parc automobile, vos équipements et vos ressources humaines depuis une plateforme unique et sécurisée.
                        </p>

                        {/* Features list */}
                        <div className={cn('flex', 'flex-wrap', 'gap-4', 'text-sm', 'text-white/80')}>
                            <div className={cn('flex', 'items-center', 'gap-1.5')}>
                                <ShieldCheck size={16} className="text-green-300" /> Sécurisé
                            </div>
                            <div className={cn('flex', 'items-center', 'gap-1.5')}>
                                <Zap size={16} className="text-green-300" /> Rapide
                            </div>
                            <div className={cn('flex', 'items-center', 'gap-1.5')}>
                                <Server size={16} className="text-green-300" /> Centralisé
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Section (Login Form) */}
                <div className={cn('flex', 'w-full', 'flex-col', 'justify-center', 'p-8', 'md:w-1/2', 'lg:w-7/12', 'sm:p-12', 'lg:px-16')}>
                    <div className={cn('mx-auto', 'w-full', 'max-w-sm', 'space-y-8')}>

                        {/* Mobile Logo (Visible only on small screens) */}
                        <div className={cn('flex', 'items-center', 'gap-2', 'md:hidden', 'mb-8')}>
                            <div className={cn('flex', 'h-10', 'w-10', 'items-center', 'justify-center', 'rounded-lg', 'bg-primary', 'font-bold', 'text-white', 'shadow-sm')}>
                                <Bus size={20} />
                            </div>
                            <span className={cn('text-xl', 'font-bold', 'tracking-tight', 'text-gray-900')}>Djamiaya</span>
                        </div>

                        {/* Form Header */}
                        <div className={cn('space-y-2', 'text-left')}>
                            <h2 className={cn('text-3xl', 'font-bold', 'tracking-tight', 'text-gray-900')}>Bienvenue</h2>
                            <p className={cn('text-sm', 'text-gray-500')}>
                                Veuillez saisir vos identifiants pour accéder à votre espace de travail.
                            </p>
                        </div>

                        {/* Login Form */}
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                            {/* Email Input */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-700">Email professionnel</Label>
                                <div className="relative">
                                    <div className={cn('absolute', 'inset-y-0', 'left-0', 'flex', 'items-center', 'pl-3', 'pointer-events-none', 'text-gray-400')}>
                                        <Mail size={18} />
                                    </div>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="nom.prenom@djamiaya.dz"
                                        {...register("email")}
                                        className={`pl-10 h-11 ${errors.email ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-primary focus-visible:border-primary"}`}
                                    />
                                </div>
                                {errors.email && <p className={cn('text-sm', 'text-red-500')}>{errors.email.message}</p>}
                            </div>

                            {/* Password Input */}
                            <div className="space-y-2">
                                <div className={cn('flex', 'items-center', 'justify-between')}>
                                    <Label htmlFor="password" className="text-gray-700">Mot de passe</Label>
                                    <Link href="/forgot-password" className={cn('text-sm', 'font-medium', 'text-primary', 'hover:text-primary-hover', 'hover:underline', 'transition-colors')}>
                                        Mot de passe oublié ?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <div className={cn('absolute', 'inset-y-0', 'left-0', 'flex', 'items-center', 'pl-3', 'pointer-events-none', 'text-gray-400')}>
                                        <Lock size={18} />
                                    </div>
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        {...register("password")}
                                        className={`pl-10 pr-10 h-11 ${errors.password ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-primary focus-visible:border-primary"}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className={cn('absolute', 'inset-y-0', 'right-0', 'flex', 'items-center', 'pr-3', 'text-gray-400', 'hover:text-gray-600', 'focus:outline-none')}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {errors.password && <p className={cn('text-sm', 'text-red-500')}>{errors.password.message}</p>}
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className={cn('w-full', 'h-11', 'mt-6', 'text-base', 'font-medium', 'shadow-md', 'transition-all', 'group')}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className={cn('flex', 'items-center', 'gap-2')}>
                                        <div className={cn('h-4', 'w-4', 'animate-spin', 'rounded-full', 'border-2', 'border-white', 'border-t-transparent')}></div>
                                        Connexion en cours...
                                    </div>
                                ) : (
                                    <div className={cn('flex', 'items-center', 'gap-2')}>
                                        Se connecter
                                        <ArrowRight size={18} className={cn('transition-transform', 'group-hover:translate-x-1')} />
                                    </div>
                                )}
                            </Button>
                        </form>

                        <div className={cn('mt-8', 'text-center', 'text-sm', 'text-gray-400')}>
                            &copy; {new Date().getFullYear()} Djamiaya. Tous droits réservés.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}