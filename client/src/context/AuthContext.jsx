import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [member, setMember] = useState(null);
  const [token, setToken] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('carecircle_token_cache') : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Check current session
  const checkAuth = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/me', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setProfile(json.data.profile);
          setMember(json.data.member);
          return true;
        }
      }
      setProfile(null);
      setMember(null);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('carecircle_token_cache');
      }
      return false;
    } catch (err) {
      console.warn('Auth check failed:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const createProfile = async (payload) => {
    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || 'Failed to create profile');
    }
    setProfile(json.data.profile);
    setMember(json.data.member);
    if (json.data.token) {
      setToken(json.data.token);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('carecircle_token_cache', json.data.token);
      }
    }
    return json.data;
  };

  const joinCircle = async (payload) => {
    const res = await fetch('/api/auth/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || 'Failed to join circle');
    }
    setProfile(json.data.profile);
    setMember(json.data.member);
    if (json.data.token) {
      setToken(json.data.token);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('carecircle_token_cache', json.data.token);
      }
    }
    return json.data;
  };

  const login = async (payload) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || 'Failed to log in');
    }

    if (json.requiresMemberSelection) {
      return json;
    }

    setProfile(json.data.profile);
    setMember(json.data.member);
    if (json.data.token) {
      setToken(json.data.token);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('carecircle_token_cache', json.data.token);
      }
    }
    return json.data;
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    setProfile(null);
    setMember(null);
    setToken(null);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('carecircle_token_cache');
    }
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        profile,
        member,
        token,
        loading,
        isAuthenticated: Boolean(profile && member),
        isAdmin: Boolean(member?.isAdmin),
        createProfile,
        joinCircle,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
