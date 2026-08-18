"use client";

import { useState, useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/axios";
import toast from "react-hot-toast";

// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User as UserIcon, MapPin, ShieldCheck, ChevronRight, AlertCircle, Briefcase } from "lucide-react";

// Types
import { User } from "@/types";

// Schema Zod
const formSchema = z.object({
  name: z.string().min(2, "Le nom d'utilisateur est requis"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "6 caractères minimum").optional().or(z.literal("")),
  matricule: z.string().min(1, "Le matricule est requis"),
  nom: z.string().min(1, "Le nom est requis"),
  prenom: z.string().min(1, "Le prénom est requis"),
  fonction: z.string().optional(),
  telephone: z.string().optional(),
  
  direction_id: z.string().optional(),
  departement_id: z.string().optional(),
  parc_id_form: z.string().min(1, "Requis"), 
  emplacement_id: z.string().min(1, "L'emplacement final est requis"),
  
  roles: z.array(z.string()),
  parcs: z.array(z.number()),
});

type FormValues = z.infer<typeof formSchema>;

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: User | null;
  onSuccess: () => void;
}

export function UserFormModal({ isOpen, onClose, userToEdit, onSuccess }: UserFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  
  // 🔥 قوائم مسطحة (Flat Arrays) باش نتفاداو مشاكل الـ Tree
  const [directions, setDirections] = useState<any[]>([]);
  const [departements, setDepartements] = useState<any[]>([]);
  const [parcs, setParcs] = useState<any[]>([]);
  const [emplacements, setEmplacements] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);

  const isEdit = !!userToEdit;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "", email: "", password: "",
      matricule: "", nom: "", prenom: "", fonction: "", telephone: "",
      direction_id: "", departement_id: "", parc_id_form: "", emplacement_id: "",
      roles: [], parcs: []
    }
  });

  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setFetchingData(true);
      try {
        // 🔥 نجبدو القوائم مباشرة باش الفلترة تجي ساهلة وخفيفة
        const [dirRes, depRes, parcRes, empRes, rolesRes] = await Promise.all([
          api.get("/directions?per_page=500"),
          api.get("/departements?per_page=500"),
          api.get("/parcs?per_page=500"),
          api.get("/emplacements?per_page=500"),
          api.get("/roles")
        ]);
        
        const fetchedDirs = dirRes.data.data?.data || dirRes.data.data || [];
        const fetchedDeps = depRes.data.data?.data || depRes.data.data || [];
        const fetchedParcs = parcRes.data.data?.data || parcRes.data.data || [];
        const fetchedEmps = empRes.data.data?.data || empRes.data.data || [];
        
        setDirections(fetchedDirs);
        setDepartements(fetchedDeps);
        setParcs(fetchedParcs);
        setEmplacements(fetchedEmps);
        setRolesList(rolesRes.data.data?.roles || rolesRes.data.data || []);

        if (userToEdit) {
          // 🔥 البحث العكسي ولى ساهل وبسيط جداً
          const foundDepId = userToEdit.employee?.departement_id?.toString() || "";
          const foundEmpId = userToEdit.employee?.emplacement_id?.toString() || userToEdit.employee?.emplacement?.id?.toString() || "";
          
          let foundDirId = "";
          let foundParcId = "";

          if (foundDepId) {
            const dep = fetchedDeps.find((d: any) => d.id.toString() === foundDepId);
            if (dep) foundDirId = dep.direction_id?.toString() || "";
          }

          if (foundEmpId) {
            const emp = fetchedEmps.find((e: any) => e.id.toString() === foundEmpId);
            if (emp) foundParcId = emp.parc_id?.toString() || "";
          }

          form.reset({
            name: userToEdit.name,
            email: userToEdit.email,
            password: "", 
            matricule: userToEdit.employee?.matricule || "",
            nom: userToEdit.employee?.nom || "",
            prenom: userToEdit.employee?.prenom || "",
            fonction: userToEdit.employee?.fonction || "",
            telephone: userToEdit.employee?.telephone || "",
            
            direction_id: foundDirId,
            departement_id: foundDepId,
            parc_id_form: foundParcId,
            emplacement_id: foundEmpId,
            
            roles: userToEdit.roles?.map(r => r.name) || [],
            parcs: userToEdit.parcs?.map(p => p.id) || [],
          });
        } else {
          form.reset({
            name: "", email: "", password: "",
            matricule: "", nom: "", prenom: "", fonction: "", telephone: "",
            direction_id: "", departement_id: "", parc_id_form: "", emplacement_id: "",
            roles: [], parcs: []
          });
        }
      } catch (error) {
        toast.error("Erreur lors du chargement des données système.");
      } finally {
        setFetchingData(false);
      }
    };

    fetchData();
  }, [isOpen, userToEdit, form]);

  const watchDirection = form.watch("direction_id");
  const watchParc = form.watch("parc_id_form");

  // 🔥 فلترة ديناميكية ومباشرة
  const availableDepartements = useMemo(() => {
    return departements.filter(d => d.direction_id?.toString() === watchDirection);
  }, [watchDirection, departements]);

  const availableEmplacements = useMemo(() => {
    return emplacements.filter(e => e.parc_id?.toString() === watchParc);
  }, [watchParc, emplacements]);

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);
      const payload: Record<string, any> = {
        ...data,
        departement_id: parseInt(data.departement_id, 10), // 🔥 نبعثو الديبارتمون
        emplacement_id: parseInt(data.emplacement_id, 10), // 🔥 ونبعثو لومبلاصمون
      };

      if (isEdit) {
        if (!payload.password) delete payload.password;
        await api.put(`/users/${userToEdit.id}`, payload);
        toast.success("Utilisateur modifié avec succès !");
      } else {
        await api.post("/users", payload);
        toast.success("Utilisateur créé avec succès !");
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Une erreur s'est produite.");
    } finally {
      setLoading(false);
    }
  };

  const onError = (errors: any) => {
    toast.error("Le formulaire contient des erreurs. Veuillez vérifier tous les onglets.");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-background shadow-2xl">
        
        <DialogHeader className="px-6 py-5 border-b bg-muted/30">
          <DialogTitle className="text-xl font-semibold text-foreground">
            {isEdit ? "Modifier l'utilisateur" : "Nouvel Utilisateur"}
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-sm">
            Configurez les informations, l&apos;affectation et les droits d&apos;accès du collaborateur.
          </DialogDescription>
        </DialogHeader>

        {fetchingData ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="animate-spin h-10 w-10 text-primary mb-4" />
            <p className="text-sm text-muted-foreground font-medium">Chargement de l&apos;environnement...</p>
          </div>
        ) : (
          <form id="form-user-modal" onSubmit={form.handleSubmit(onSubmit, onError)}>
            
            <Tabs defaultValue="general" className="w-full flex flex-col">
              
              <div className="px-6 pt-2 border-b bg-muted/10">
                <TabsList className="grid w-full grid-cols-3 mb-[-1px] rounded-none bg-transparent p-0">
                  <TabsTrigger value="general" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:text-primary rounded-none py-3.5 transition-all">
                    <UserIcon className="w-4 h-4 mr-2" /> Général
                  </TabsTrigger>
                  <TabsTrigger value="affectation" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:text-primary rounded-none py-3.5 transition-all">
                    <MapPin className="w-4 h-4 mr-2" /> Affectation
                  </TabsTrigger>
                  <TabsTrigger value="securite" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:text-primary rounded-none py-3.5 transition-all">
                    <ShieldCheck className="w-4 h-4 mr-2" /> Sécurité
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="h-[50vh] min-h-[400px] max-h-[600px] overflow-y-auto">
                
                {/* TAB 1: GÉNÉRAL */}
                <TabsContent value="general" className="px-6 py-6 m-0 focus-visible:outline-none">
                  <div className="space-y-8">
                    <div>
                      <h4 className="flex items-center text-xs font-bold text-muted-foreground mb-4 uppercase tracking-wider">Identifiants de connexion</h4>
                      <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Controller name="name" control={form.control} render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Nom d&apos;utilisateur <span className="text-destructive">*</span></FieldLabel>
                            <Input {...field} placeholder="j.doe" aria-invalid={fieldState.invalid} />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )} />
                        <Controller name="email" control={form.control} render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Email professionnel <span className="text-destructive">*</span></FieldLabel>
                            <Input type="email" {...field} placeholder="jean@entreprise.com" aria-invalid={fieldState.invalid} />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )} />
                        <Controller name="password" control={form.control} render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid} className="md:col-span-2">
                            <FieldLabel>{isEdit ? "Nouveau mot de passe (laisser vide si inchangé)" : "Mot de passe *"}</FieldLabel>
                            <Input type="password" {...field} placeholder="••••••••" aria-invalid={fieldState.invalid} />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )} />
                      </FieldGroup>
                    </div>

                    <div className="pt-6 border-t">
                      <h4 className="flex items-center text-xs font-bold text-muted-foreground mb-4 uppercase tracking-wider">Profil Employé (RH)</h4>
                      <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Controller name="matricule" control={form.control} render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Matricule RH <span className="text-destructive">*</span></FieldLabel>
                            <Input {...field} placeholder="EMP-001" aria-invalid={fieldState.invalid} />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )} />
                        <Controller name="fonction" control={form.control} render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Fonction</FieldLabel>
                            <Input {...field} placeholder="Développeur, Chauffeur..." aria-invalid={fieldState.invalid} />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )} />
                        <Controller name="nom" control={form.control} render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Nom de famille <span className="text-destructive">*</span></FieldLabel>
                            <Input {...field} aria-invalid={fieldState.invalid} />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )} />
                        <Controller name="prenom" control={form.control} render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Prénom <span className="text-destructive">*</span></FieldLabel>
                            <Input {...field} aria-invalid={fieldState.invalid} />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )} />
                        <Controller name="telephone" control={form.control} render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid} className="md:col-span-2">
                            <FieldLabel>Téléphone</FieldLabel>
                            <Input {...field} placeholder="0555..." aria-invalid={fieldState.invalid} />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )} />
                      </FieldGroup>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 2: AFFECTATION */}
                <TabsContent value="affectation" className="px-6 py-6 m-0 focus-visible:outline-none">
                  <div className="space-y-6">

                    <FieldGroup className="space-y-6 mt-4">
                      {/* Section 2 : Physique */}
                      <div className="p-4 border rounded-xl bg-orange-50/30 space-y-4">
                        <h5 className="flex items-center text-sm font-semibold text-slate-800 gap-2"><MapPin className="w-4 h-4 text-orange-500"/> Lieu de travail physique</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Controller name="parc_id_form" control={form.control} render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel>Parc</FieldLabel>
                              <Select value={field.value} onValueChange={(val) => { field.onChange(val); form.setValue("emplacement_id", ""); }}>
                                <SelectTrigger aria-invalid={fieldState.invalid} className="bg-white"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                                <SelectContent>{parcs.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.nom}</SelectItem>)}</SelectContent>
                              </Select>
                            </Field>
                          )} />

                          <Controller name="emplacement_id" control={form.control} render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel>Emplacement final <span className="text-destructive">*</span></FieldLabel>
                              <Select disabled={!watchParc} value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger aria-invalid={fieldState.invalid} className="bg-white"><SelectValue placeholder="Bureau, atelier..." /></SelectTrigger>
                                <SelectContent>{availableEmplacements.map((e: any) => <SelectItem key={e.id} value={e.id.toString()}>{e.nom}</SelectItem>)}</SelectContent>
                              </Select>
                              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                            </Field>
                          )} />
                        </div>
                      </div>
                    </FieldGroup>
                  </div>
                </TabsContent>

                {/* TAB 3: SÉCURITÉ */}
                <TabsContent value="securite" className="px-6 py-6 m-0 focus-visible:outline-none">
                  <div className="space-y-8">
                    <div>
                      <div className="mb-4">
                        <h4 className="text-base font-semibold text-foreground">Rôles Système</h4>
                        <p className="text-sm text-muted-foreground mt-1">Cochez les rôles pour définir les permissions globales de cet utilisateur.</p>
                      </div>
                      <Controller name="roles" control={form.control} render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {rolesList.map((role) => (
                              <label key={role.id} htmlFor={`role-${role.id}`} className="group flex flex-row items-center space-x-3 rounded-lg border p-3.5 shadow-sm hover:bg-muted/50 cursor-pointer transition-all has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-md">
                                <Checkbox
                                  id={`role-${role.id}`}
                                  checked={field.value?.includes(role.name)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, role.name])
                                      : field.onChange(field.value?.filter((value: string) => value !== role.name));
                                  }}
                                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{role.name}</span>
                              </label>
                            ))}
                          </div>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )} />
                    </div>

                    <div className="pt-6 border-t">
                      <div className="mb-4">
                        <h4 className="text-base font-semibold text-foreground">Périmètre de visibilité (Parcs)</h4>
                        <p className="text-sm text-muted-foreground mt-1">Sélectionnez les parcs auxquels cet utilisateur aura accès dans l&apos;application.</p>
                      </div>
                      <Controller name="parcs" control={form.control} render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-2 pb-2">
                            {parcs.map((parc: any) => (
                              <label key={parc.id} htmlFor={`parc-${parc.id}`} className="group flex flex-row items-center space-x-3 rounded-lg border p-3.5 shadow-sm hover:bg-muted/50 cursor-pointer transition-all has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-md">
                                <Checkbox
                                  id={`parc-${parc.id}`}
                                  checked={field.value?.includes(parc.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, parc.id])
                                      : field.onChange(field.value?.filter((value: number) => value !== parc.id));
                                  }}
                                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                                <span className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors" title={parc.nom}>{parc.nom}</span>
                              </label>
                            ))}
                          </div>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )} />
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <DialogFooter className="px-6 py-8 border-t bg-muted/30 flex sm:justify-between items-center gap-4">
              <p className="text-xs text-muted-foreground hidden md:block">Assurez-vous de vérifier les accès avant d&apos;enregistrer.</p>
              <div className="flex gap-3 w-full sm:w-auto">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="w-full sm:w-auto">Annuler</Button>
                <Button type="submit" disabled={loading} className="w-full sm:w-auto min-w-[140px]">
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...</> : isEdit ? "Enregistrer" : "Créer l'utilisateur"}
                </Button>
              </div>
            </DialogFooter>

          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}