import React, { createContext, useState, useContext, useEffect } from 'react';
import { isSchoolEmail } from '@/lib/schoolConfig';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { normalizeUserRecord } from '@/lib/userDisplayName';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;
    let active = true;
    let refreshing = false;
    const refreshUser = async () => {
      if (!active || refreshing || navigator.onLine === false || document.visibilityState === 'hidden') return;
      refreshing = true;
      try {
        const currentUser = await base44.auth.me();
        if (active) setUser(normalizeUserRecord(currentUser));
      } catch (error) {
        if (!active) return;
        const status = error.status ?? error.response?.status;
        if (status === 401 || status === 403) {
          setUser(null);
          setIsAuthenticated(false);
          setAuthError({ type: 'auth_required', message: 'Authentication required' });
        }
        // A failed background refresh does not invalidate the signed-in session.
        // Try again when the connection returns or the student returns to the app.
      } finally {
        refreshing = false;
      }
    };
    const unsubscribe = base44.entities.User.subscribe(event => {
      if (!active || event.type !== 'update' || event.data?.id !== user.id) return;
      setUser(current => normalizeUserRecord({ ...current, ...event.data }));
    });
    window.addEventListener('focus', refreshUser);
    window.addEventListener('online', refreshUser);
    document.addEventListener('visibilitychange', refreshUser);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener('focus', refreshUser);
      window.removeEventListener('online', refreshUser);
      document.removeEventListener('visibilitychange', refreshUser);
    };
  }, [user?.id]);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      const isStudentOutsideSchool = currentUser?.role !== 'admin' && !isSchoolEmail(currentUser?.email);
      if (isStudentOutsideSchool) {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        await base44.auth.logout('/login?error=domain');
        return;
      }
      setUser(normalizeUserRecord(currentUser));
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  const updateCurrentUser = async (data) => {
    // Merge the current user's existing fields into the payload so custom
    // fields (class_period, grade, dismissed_* flags, theme, etc.) are always
    // preserved, even if the server applies the PUT as a replace rather than
    // a merge. Built-ins (id, email, role) are ignored server-side.
    const payload = { ...user, ...data };
    const updatedUser = await base44.auth.updateMe(payload);
    setUser((currentUser) => ({ ...currentUser, ...data, ...updatedUser }));
    return updatedUser;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      updateCurrentUser,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};