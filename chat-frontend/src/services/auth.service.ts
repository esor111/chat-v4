import axios from 'axios';
import type { LoginRequest, LoginResponse, User } from '../types/auth';

const EXTERNAL_API_BASE = 'https://dev.kaha.com.np/main/api/v3';

class AuthService {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('chat_token');
  }

  async login(credentials: LoginRequest): Promise<{ user: User; token: string }> {
    try {
      const response = await axios.post<LoginResponse>(
        `${EXTERNAL_API_BASE}/auth/login`,
        credentials,
        {
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json',
          },
        }
      );

      const { accessToken, role } = response.data;
      
      // Decode JWT to get user info (simple decode, not verification)
      const payload = this.decodeJWT(accessToken);
      
      const user: User = {
        id: payload.id || payload.userId,
        kahaId: payload.kahaId,
        name: payload.name,
        role,
      };

      // Store token
      this.token = accessToken;
      localStorage.setItem('chat_token', accessToken);

      return { user, token: accessToken };
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Login failed. Please check your credentials.');
    }
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem('chat_token');
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getCurrentUser(): User | null {
    if (!this.token) return null;
    
    try {
      const payload = this.decodeJWT(this.token);
      return {
        id: payload.id || payload.userId,
        kahaId: payload.kahaId,
        name: payload.name,
      };
    } catch {
      return null;
    }
  }

  private decodeJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to decode JWT:', error);
      return {};
    }
  }
}

export const authService = new AuthService();