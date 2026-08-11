export interface Permission {
  id: number;
  name: string;
}

// تعديل على Role إذا ماكانش فيه permissions
export interface Role {
  id: number;
  name: string;
  permissions?: Permission[]; // زدناها باش نعرفو الصلاحيات تاع كل دور
}

export interface Emplacement {
  id: number;
  nom: string;
}

export interface Employee {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  fonction?: string;
  emplacement_id?: number;
  emplacement?: Emplacement;
  departement_id?: number;
  is_active: boolean;
  telephone: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  employee?: Employee;
  roles: Role[];
  parcs: { id: number; name: string }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}