import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  status: "pending" | "active" | "rejected" | "suspended";
  rejectionReason?: string;
  authProvider?: "local" | "google";
  googleId?: string;
  avatar?: string;
  registeredAt?: string;
  approvedAt?: string;
  lastLoginAt?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; status?: string; rejectionReason?: string }>;
  loginWithGoogle: (credential: string) => Promise<{ success: boolean; message?: string; error?: string; status?: string; rejectionReason?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string; error?: string; status?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_URL || "";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("cmd_user");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("cmd_token");
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Authenticated fetch wrapper that automatically injects Bearer token
  const authFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers || {});
    const currentToken = localStorage.getItem("cmd_token");
    if (currentToken) {
      headers.set("Authorization", `Bearer ${currentToken}`);
    }
    return fetch(input, { ...init, headers });
  }, []);

  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem("cmd_token");
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem("cmd_user", JSON.stringify(data.user));
      } else {
        // Token invalid or expired
        localStorage.removeItem("cmd_token");
        localStorage.removeItem("cmd_user");
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.warn("User profile refresh skipped:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.error || "Login failed",
          status: data.status,
          rejectionReason: data.rejectionReason,
        };
      }

      localStorage.setItem("cmd_token", data.token);
      localStorage.setItem("cmd_user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      return { success: false, error: message };
    }
  };

  const loginWithGoogle = async (credential: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.error || "Google authentication failed",
          status: data.status,
          rejectionReason: data.rejectionReason,
        };
      }

      if (data.token && data.user) {
        localStorage.setItem("cmd_token", data.token);
        localStorage.setItem("cmd_user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return { success: true, message: data.message, status: "active" };
      }

      return { success: true, message: data.message, status: data.status || "pending" };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      return { success: false, error: message };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Registration failed" };
      }

      if (data.token && data.user) {
        // First admin auto-login
        localStorage.setItem("cmd_token", data.token);
        localStorage.setItem("cmd_user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return { success: true, message: data.message, status: "active" };
      }

      return { success: true, message: data.message, status: data.status || "pending" };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem("cmd_token");
    localStorage.removeItem("cmd_user");
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token && !!user && user.status === "active";
  const isAdmin = isAuthenticated && user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        isAdmin,
        login,
        loginWithGoogle,
        register,
        logout,
        refreshUser,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
