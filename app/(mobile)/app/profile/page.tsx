"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { 
  User, Mail, Briefcase, MapPin, KeyRound, LogOut, 
  ChevronRight, Loader2, ShieldCheck, Fingerprint 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import toast from "react-hot-toast";

export default function MobileProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: ""
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/user");
        setUser(res.data);
      } catch (error) {
        toast.error("Veuillez vous reconnecter.");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      setActionLoading(true);
      await api.post("/logout");
      localStorage.removeItem("token"); // إذا كنت مخبي التوكن هنا
      toast.success("Déconnexion réussie");
      router.push("/login");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      return toast.error("Les nouveaux mots de passe ne correspondent pas.");
    }
    
    try {
      setActionLoading(true);
      await api.post("/user/change-password", passwordForm);
      toast.success("Mot de passe modifié avec succès !");
      setIsPasswordModalOpen(false);
      setPasswordForm({ current_password: "", new_password: "", new_password_confirmation: "" });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur de modification.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  // استخراج أول حرفين من الاسم للصورة الرمزية (Avatar)
  const initials = user?.name?.substring(0, 2).toUpperCase() || "US";

  return (
    <div className="flex flex-col min-h-full bg-slate-50">  
      
      {/* 🔹 HEADER 🔹 */}
      <header className="bg-blue-600 text-white px-6 pt-10 pb-16 rounded-b-[40px] shadow-md relative">
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-white text-blue-600 rounded-full flex items-center justify-center text-3xl font-extrabold shadow-lg mb-4 border-4 border-blue-400/30">
            {initials}
          </div>
          <h1 className="text-2xl font-bold capitalize">{user?.name?.replace('.', ' ') || "Utilisateur"}</h1>
          <p className="text-blue-100 text-sm mt-1">{user?.roles?.[0]?.name || "Personnel Terrain"}</p>
        </div>
      </header>

      <main className="flex-1 px-5 -mt-8 space-y-4">
        
        {/* 🔹 INFO PERSONNELLES 🔹 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2 ml-1">
            <User size={14} /> Informations
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-50 text-slate-500 rounded-full flex items-center justify-center shrink-0">
                <Fingerprint size={20} />
              </div>
              <div className="flex-1 border-b border-slate-50 pb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Matricule</p>
                <p className="text-sm font-semibold text-slate-900">{user?.employee?.matricule || "—"}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-50 text-slate-500 rounded-full flex items-center justify-center shrink-0">
                <Mail size={20} />
              </div>
              <div className="flex-1 border-b border-slate-50 pb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Email</p>
                <p className="text-sm font-semibold text-slate-900">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-50 text-slate-500 rounded-full flex items-center justify-center shrink-0">
                <Briefcase size={20} />
              </div>
              <div className="flex-1 border-b border-slate-50 pb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Fonction</p>
                <p className="text-sm font-semibold text-slate-900">{user?.employee?.fonction || "—"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-50 text-slate-500 rounded-full flex items-center justify-center shrink-0">
                <MapPin size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Affectation</p>
                <p className="text-sm font-semibold text-slate-900">{user?.employee?.emplacement?.nom || "Non affecté"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 🔹 SECURITÉ & PARAMÈTRES 🔹 */}
        <div className="bg-white rounded-3xl p-2 shadow-sm border border-slate-100">
          <button 
            onClick={() => setIsPasswordModalOpen(true)}
            className="w-full flex items-center justify-between p-4 active:bg-slate-50 transition-colors rounded-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
                <KeyRound size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900">Mot de passe</p>
                <p className="text-xs text-slate-500">Modifier votre clé d'accès</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-slate-300" />
          </button>
        </div>

        {/* 🔹 DÉCONNEXION 🔹 */}
        <Button 
          variant="outline" 
          onClick={handleLogout}
          disabled={actionLoading}
          className="w-full h-14 mt-6 rounded-2xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 bg-white shadow-sm font-bold text-base"
        >
          {actionLoading ? <Loader2 className="animate-spin mr-2" /> : <LogOut className="mr-2" />}
          Se déconnecter
        </Button>

      </main>

      {/* ========================================== */}
      {/* 🔹 MODAL: CHANGER MOT DE PASSE (Bottom Sheet) 🔹 */}
      {/* ========================================== */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="sm:max-w-md rounded-t-3xl sm:rounded-3xl p-0 overflow-hidden bg-white mt-auto sm:mt-0 mb-0 sm:mb-auto align-bottom">
          <div className="px-6 py-8 text-center bg-slate-50 border-b border-slate-100">
            <div className="w-16 h-16 bg-white text-orange-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Sécurité du compte</h3>
            <p className="text-sm text-slate-500 mt-1">Choisissez un mot de passe robuste.</p>
          </div>
          
          <form onSubmit={handlePasswordSubmit} className="px-6 py-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Mot de passe actuel</label>
              <Input 
                type="password" required 
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                className="h-12 rounded-xl bg-slate-50 text-base" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Nouveau mot de passe</label>
              <Input 
                type="password" required minLength={6}
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                className="h-12 rounded-xl bg-slate-50 text-base" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Confirmer le mot de passe</label>
              <Input 
                type="password" required minLength={6}
                value={passwordForm.new_password_confirmation}
                onChange={(e) => setPasswordForm({...passwordForm, new_password_confirmation: e.target.value})}
                className="h-12 rounded-xl bg-slate-50 text-base" 
              />
            </div>

            <DialogFooter className="pt-6 px-0 border-none flex-row flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)} className="w-full h-12 rounded-xl text-base">
                Annuler
              </Button>
              <Button type="submit" disabled={actionLoading} className="w-full h-12 rounded-xl text-base bg-orange-600 hover:bg-orange-700 text-white shadow-md">
                {actionLoading ? <Loader2 className="animate-spin" /> : "Mettre à jour"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}