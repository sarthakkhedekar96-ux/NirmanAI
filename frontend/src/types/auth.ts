export type UserRole = 'ADMIN' | 'DECISION_MAKER' | 'ANALYST';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at?: string | null;
  last_login_at?: string | null;
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  sessionExpired: boolean;
}
