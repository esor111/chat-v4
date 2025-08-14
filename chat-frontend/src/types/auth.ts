export interface LoginRequest {
  contactNumber: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  role: string;
}

export interface User {
  id: string;
  kahaId?: string;
  name?: string;
  role?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}