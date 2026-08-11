import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: number;
    name: string;
    email: string;
    roles: string[];
    permissions: string[];
}

interface AuthState {
    token: string | null;
    user: User | null;
    employeeProfile: any | null;

    // Actions
    setAuth: (token: string, user: User, employeeProfile: any) => void;
    logout: () => void;

    // Helper Helper Helper! هذي اللي طلبتها باش تفيريفي الصلاحيات بسهولة
    hasPermission: (permissionName: string) => boolean;
    hasRole: (roleName: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            token: null,
            user: null,
            employeeProfile: null,

            setAuth: (token, user, employeeProfile) => set({ token, user, employeeProfile }),

            logout: () => set({ token: null, user: null, employeeProfile: null }),

            // الدالة السحرية باش نفيريفيو الصلاحيات في أي كومبوننت
            hasPermission: (permissionName) => {
                const user = get().user;
                if (!user) return false;
                // Super Admin عندو كلش أوتوماتيكيا
                if (user.roles.includes('Super Admin')) return true;
                return user.permissions.includes(permissionName);
            },

            hasRole: (roleName) => {
                const user = get().user;
                if (!user) return false;
                return user.roles.includes(roleName);
            }
        }),
        {
            name: 'auth-storage', // اسم الـ localStorage اللي راح يتخبى فيه الـ Token
        }
    )
);