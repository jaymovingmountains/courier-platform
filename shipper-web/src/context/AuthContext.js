import { createContext, useContext } from 'react';

// Create Auth Context
export const AuthContext = createContext(null);

// Auth Context Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 