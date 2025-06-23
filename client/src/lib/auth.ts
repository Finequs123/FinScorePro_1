import { apiRequest } from "./queryClient";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    organizationId: number;
  };
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Login failed");
    }
    
    return response.json();
  },

  getCurrentUser: async () => {
    const response = await apiRequest("GET", "/api/auth/me");
    return response.json();
  },

  forgotPassword: async ({ email }: { email: string }) => {
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Failed to send reset email");
    }
    
    return response.json();
  },

  verifyOtp: async ({ email, otp }: { email: string; otp: string }): Promise<{ token: string }> => {
    const response = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, otp }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Invalid OTP");
    }
    
    return response.json();
  },

  resetPassword: async ({ token, newPassword }: { token: string; newPassword: string }) => {
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, newPassword }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Failed to reset password");
    }
    
    return response.json();
  },

  changePassword: async ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) => {
    const response = await apiRequest("POST", "/api/auth/change-password", { oldPassword, newPassword });
    return response.json();
  },

  logout: () => {
    localStorage.removeItem("auth_token");
  }
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem("auth_token");
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem("auth_token", token);
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};
