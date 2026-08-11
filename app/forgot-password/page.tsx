"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import api from "@/lib/axios";
import toast from "react-hot-toast";

// Icons
import { Mail, Lock, ArrowLeft, Bus, ShieldCheck, KeyRound, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Schema for Step 1 (Email)
const emailSchema = z.object({
    email: z.string().email("Veuillez entrer une adresse email valide."),
});

// Schema for Step 2 (Code + New Password)
const resetSchema = z.object({
    code: z.string().min(6, "Le code doit contenir 6 chiffres."),
    new_password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères."),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type ResetFormValues = z.infer<typeof resetSchema>;

export default function ForgotPasswordPage() {
    const [step, setStep] = useState<1 | 2>(1);
    const [userEmail, setUserEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    // Form for Step 1
    const formStep1 = useForm<EmailFormValues>({
        resolver: zodResolver(emailSchema),
    });

    // Form for Step 2
    const formStep2 = useForm<ResetFormValues>({
        resolver: zodResolver(resetSchema),
    });

    // Handle Step 1: Send Code
    const onSendCode = async (data: EmailFormValues) => {
        try {
            setIsLoading(true);
            await api.post("/forgot-password/send-code", data);
            setUserEmail(data.email);
            setStep(2);
            toast.success("Code envoyé avec succès à votre email.");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Erreur lors de l'envoi du code.");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Step 2: Reset Password
    const onResetPassword = async (data: ResetFormValues) => {
        try {
            setIsLoading(true);
            await api.post("/forgot-password/reset", {
                email: userEmail,
                code: data.code,
                new_password: data.new_password,
            });

            toast.success("Mot de passe modifié avec succès !");
            router.push("/login");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Code invalide ou expiré.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={cn('flex', 'min-h-screen', 'items-center', 'justify-center', 'bg-slate-50', 'p-4', 'sm:p-8')}>
            <div className={cn('w-full', 'max-w-5xl', 'overflow-hidden', 'rounded-2xl', 'bg-white', 'shadow-2xl', 'flex', 'flex-col', 'md:flex-row', 'min-h-[600px]', 'border', 'border-gray-100')}>

                {/* Left Section (Branding/Visual) */}
                <div className={cn('relative', 'hidden', 'w-full', 'flex-col', 'justify-between', 'bg-primary', 'md:flex', 'md:w-1/2', 'lg:w-5/12', 'p-10', 'text-white', 'overflow-hidden')}>
                    <Image
                        src="/buses.jpeg"
                        alt="Logo"
                        fill
                        className={cn('object-cover', 'opacity-80', 'z-0')}
                    />
                    <div className={cn('relative', 'z-10', 'flex', 'items-center', 'gap-3')}>
                        <div className={cn('flex', 'h-10', 'w-10', 'items-center', 'justify-center', 'rounded-lg', 'bg-white', 'font-bold', 'text-primary', 'shadow-sm')}>
                            <Bus size={24} />
                        </div>
                        <span className={cn('text-xl', 'font-bold', 'tracking-tight')}>Djamiaya Transport</span>
                    </div>

                    <div className={cn('relative', 'z-10', 'mt-auto')}>
                        <h1 className={cn('text-3xl', 'font-bold', 'tracking-tight', 'mb-4')}>Sécurité des accès</h1>
                        <p className={cn('text-green-50', 'text-base', 'leading-relaxed', 'mb-6')}>
                            La protection de vos données est notre priorité. Récupérez l'accès à votre compte en toute sécurité.
                        </p>
                        <div className={cn('flex', 'items-center', 'gap-2', 'text-sm', 'text-white/90')}>
                            <ShieldCheck size={18} className="text-green-300" />
                            Processus de vérification à deux étapes
                        </div>
                    </div>
                </div>

                {/* Right Section (Forms) */}
                <div className={cn('flex', 'w-full', 'flex-col', 'justify-center', 'p-8', 'md:w-1/2', 'lg:w-7/12', 'sm:p-12', 'lg:px-16')}>
                    <div className={cn('mx-auto', 'w-full', 'max-w-sm', 'space-y-8')}>

                        <Link href="/login" className={cn('inline-flex', 'items-center', 'text-sm', 'font-medium', 'text-gray-500', 'hover:text-primary', 'transition-colors')}>
                            <ArrowLeft size={16} className="mr-2" /> Retour à la connexion
                        </Link>

                        {step === 1 ? (
                            // ================= STEP 1 =================
                            <div className={cn('animate-in', 'fade-in', 'slide-in-from-right-4', 'duration-500')}>
                                <div className={cn('space-y-2', 'text-left', 'mb-8')}>
                                    <div className={cn('w-12', 'h-12', 'bg-primary/10', 'rounded-full', 'flex', 'items-center', 'justify-center', 'mb-4')}>
                                        <KeyRound size={24} className="text-primary" />
                                    </div>
                                    <h2 className={cn('text-3xl', 'font-bold', 'tracking-tight', 'text-gray-900')}>Mot de passe oublié ?</h2>
                                    <p className={cn('text-sm', 'text-gray-500')}>
                                        Entrez votre adresse email, nous vous enverrons un code de vérification à 6 chiffres.
                                    </p>
                                </div>

                                <form onSubmit={formStep1.handleSubmit(onSendCode)} className="space-y-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email professionnel</Label>
                                        <div className="relative">
                                            <div className={cn('absolute', 'inset-y-0', 'left-0', 'flex', 'items-center', 'pl-3', 'pointer-events-none', 'text-gray-400')}>
                                                <Mail size={18} />
                                            </div>
                                            <Input
                                                id="email"
                                                placeholder="nom.prenom@djamiaya.dz"
                                                {...formStep1.register("email")}
                                                className={`pl-10 h-11 ${formStep1.formState.errors.email ? "border-red-500" : "focus-visible:ring-primary"}`}
                                            />
                                        </div>
                                        {formStep1.formState.errors.email && <p className={cn('text-sm', 'text-red-500')}>{formStep1.formState.errors.email.message}</p>}
                                    </div>

                                    <Button type="submit" className={cn('w-full', 'h-11')} disabled={isLoading}>
                                        {isLoading ? "Envoi en cours..." : "Envoyer le code"}
                                    </Button>
                                </form>
                            </div>
                        ) : (
                            // ================= STEP 2 =================
                            <div className={cn('animate-in', 'fade-in', 'slide-in-from-right-4', 'duration-500')}>
                                <div className={cn('space-y-2', 'text-left', 'mb-8')}>
                                    <div className={cn('w-12', 'h-12', 'bg-green-100', 'rounded-full', 'flex', 'items-center', 'justify-center', 'mb-4')}>
                                        <CheckCircle2 size={24} className="text-primary" />
                                    </div>
                                    <h2 className={cn('text-3xl', 'font-bold', 'tracking-tight', 'text-gray-900')}>Vérification</h2>
                                    <p className={cn('text-sm', 'text-gray-500')}>
                                        Un code a été envoyé à <span className={cn('font-semibold', 'text-gray-900')}>{userEmail}</span>. Entrez-le ci-dessous avec votre nouveau mot de passe.
                                    </p>
                                </div>

                                <form onSubmit={formStep2.handleSubmit(onResetPassword)} className="space-y-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="code">Code de vérification (OTP)</Label>
                                        <Input
                                            id="code"
                                            placeholder="Ex: 123456"
                                            className={`h-11 text-center tracking-widest text-lg ${formStep2.formState.errors.code ? "border-red-500" : "focus-visible:ring-primary"}`}
                                            {...formStep2.register("code")}
                                        />
                                        {formStep2.formState.errors.code && <p className={cn('text-sm', 'text-red-500')}>{formStep2.formState.errors.code.message}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="new_password">Nouveau mot de passe</Label>
                                        <div className="relative">
                                            <div className={cn('absolute', 'inset-y-0', 'left-0', 'flex', 'items-center', 'pl-3', 'pointer-events-none', 'text-gray-400')}>
                                                <Lock size={18} />
                                            </div>
                                            <Input
                                                id="new_password"
                                                type="password"
                                                placeholder="••••••••"
                                                className={`pl-10 h-11 ${formStep2.formState.errors.new_password ? "border-red-500" : "focus-visible:ring-primary"}`}
                                                {...formStep2.register("new_password")}
                                            />
                                        </div>
                                        {formStep2.formState.errors.new_password && <p className={cn('text-sm', 'text-red-500')}>{formStep2.formState.errors.new_password.message}</p>}
                                    </div>

                                    <Button type="submit" className={cn('w-full', 'h-11')} disabled={isLoading}>
                                        {isLoading ? "Modification..." : "Réinitialiser le mot de passe"}
                                    </Button>
                                </form>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}