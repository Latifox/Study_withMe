
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Mail, LogOut } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import Analytics from "@/components/Analytics";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/auth');
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="min-h-screen animate-gradient bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-8 flex items-center justify-center">
      Loading...
    </div>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated background with gradient mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTBlMGUwIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/20"></div>
        <div className="absolute inset-0 animate-pulse-slow bg-gradient-to-br from-purple-100/30 via-transparent to-indigo-100/30"></div>
      </div>

      {/* Content */}
      <div className="relative p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800">Welcome to Course Manager</h1>
            <Button variant="outline" onClick={handleSignOut} className="gap-2 bg-white/80 backdrop-blur-sm hover:bg-white/90">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto mb-12">
            <Card 
              className="hover:shadow-lg transition-all duration-300 cursor-pointer bg-gradient-to-br from-indigo-50 via-white to-purple-50 border-0 backdrop-blur-sm hover:scale-[1.02]"
              onClick={() => navigate('/uploaded-courses')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-6 h-6" />
                  My Uploaded Courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Access and manage courses you've created and uploaded
                </p>
              </CardContent>
            </Card>

            <Card 
              className="hover:shadow-lg transition-all duration-300 cursor-pointer bg-gradient-to-br from-indigo-50 via-white to-purple-50 border-0 backdrop-blur-sm hover:scale-[1.02]"
              onClick={() => navigate('/invited-courses')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-6 h-6" />
                  Invited Courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  View courses you've been invited to join
                </p>
              </CardContent>
            </Card>
          </div>

          <Analytics />
        </div>
      </div>
    </div>
  );
};

export default Index;
