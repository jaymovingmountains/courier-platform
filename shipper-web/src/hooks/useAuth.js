import { useAuth } from '../context/AuthContext';

// Re-export the useAuth hook from our context file
export { useAuth };

// The AuthProvider component isn't needed, so we provide a simple pass-through
export const AuthProvider = ({ children }) => children; 