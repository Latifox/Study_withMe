
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Mail, LogOut } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import Analytics from "@/components/Analytics";

const Dashboard = () => {
  const navigate = useNavigate();
  const {
    user,
    loading
  } = useAuth();
  const {
    toast
  } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    // Check if the user has a teacher role and redirect
    if (!loading && user) {
      const checkUserRole = async () => {
        const { data } = await supabase.auth.getUser();
        const accountType = data.user?.user_metadata?.account_type;
        
        if (accountType === 'teacher') {
          navigate('/teacher-dashboard');
        }
      };
      
      checkUserRole();
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    try {
      const {
        error
      } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-600">
      Loading...
    </div>;
  }

  return <div className="relative min-h-screen overflow-hidden">
      {/* Bold animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-600">
        {/* Animated mesh pattern */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Animated orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-violet-900/50 via-transparent to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-white">Student Dashboard</h1>
            <Button variant="outline" onClick={handleSignOut} className="gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 border-white/20 text-white">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto mb-12">
            <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer bg-white/10 backdrop-blur-md border-white/20 hover:scale-[1.02] hover:bg-white/20" onClick={() => navigate('/uploaded-courses')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white group-hover:text-white/90 font-bold">
                  <Upload className="w-6 h-6" />
                  My Uploaded Courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80 font-bold">
                  Access and manage courses you've created and uploaded
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer bg-white/10 backdrop-blur-md border-white/20 hover:scale-[1.02] hover:bg-white/20" onClick={() => navigate('/invited-courses')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white group-hover:text-white/90 font-bold">
                  <Mail className="w-6 h-6" />
                  Invited Courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80 font-extrabold">
                  View courses you've been invited to join
                </p>
              </CardContent>
            </Card>
          </div>

          <Analytics />
        </div>
      </div>
    </div>;
};

export default Dashboard;
