
import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Check active sessions and sets the user
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          
          // Check if the user has set an account type
          const hasAccountType = session.user.user_metadata?.account_type;
          
          // If user is logged in but hasn't set account type, redirect to account type page
          // Skip this redirect if already on the account type page
          if (!hasAccountType && location.pathname !== '/account-type') {
            navigate('/account-type');
            return;
          }
          
          // If user is logged in and has set account type but trying to access auth page or landing page,
          // redirect to dashboard
          if (hasAccountType && (location.pathname === '/auth' || location.pathname === '/')) {
            navigate('/dashboard');
          }
        } else {
          setUser(null);
          // If no session exists and we're not on the auth page or landing page, redirect to auth
          const publicRoutes = ['/auth', '/'];
          if (!publicRoutes.includes(location.pathname)) {
            navigate('/auth');
          }
        }
      } catch (error) {
        console.error('Error checking auth session:', error);
        setUser(null);
        navigate('/auth');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN') {
          setUser(session?.user ?? null);
          
          // Check if the user has set an account type
          const hasAccountType = session?.user?.user_metadata?.account_type;
          
          if (!hasAccountType) {
            navigate('/account-type');
          } else {
            navigate('/dashboard');
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          navigate('/');
        } else if (event === 'TOKEN_REFRESHED') {
          setUser(session?.user ?? null);
        } else if (event === 'USER_UPDATED') {
          setUser(session?.user ?? null);
        } else if (event === 'INITIAL_SESSION') {
          if (!session) {
            const publicRoutes = ['/auth', '/'];
            if (!publicRoutes.includes(location.pathname)) {
              navigate('/auth');
            }
          }
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
