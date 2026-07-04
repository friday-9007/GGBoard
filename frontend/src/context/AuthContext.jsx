/**
 * ggBoard — Auth Context
 * Provides authentication state across the app.
 */

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('ggboard_token');
    const savedUser = localStorage.getItem('ggboard_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('ggboard_token', authToken);
    localStorage.setItem('ggboard_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('ggboard_token');
    localStorage.removeItem('ggboard_user');
  };

  // Merge a partial update into the current user (e.g. after leaving a team).
  const updateUser = (partial) => {
    setUser((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem('ggboard_user', JSON.stringify(next));
      return next;
    });
  };

  const isAdmin = user?.role === 'admin';
  const isTeamLeader = user?.role === 'team_leader';
  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, logout, updateUser,
      isAdmin, isTeamLeader, isAuthenticated
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
