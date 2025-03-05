import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Facebook, Mail, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [authLoading, setAuthLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  
  const queryParams = new URLSearchParams(location.search);
  const tabParam = queryParams.get('tab');
  const [activeTab, setActiveTab] = useState<"login" | "register">(
    tabParam === "register" ? "register" : "login"
  );

  useEffect(() => {
    if (user && !loading) {
      const accountType = user.user_metadata?.account_type;
      if (accountType === 'teacher') {
        navigate('/teacher-dashboard');
      } else if (accountType === 'student') {
        navigate('/dashboard');
      } else {
        navigate('/account-type');
      }
    }
  }, [user, loading, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }
    
    setAuthLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (error) throw error;

      if (data?.user?.identities?.length === 0) {
        toast({
          title: "Account already exists",
          description: "Please try logging in instead.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success!",
        description: "Please check your email to confirm your account.",
      });
      
      if (data?.user) {
        navigate("/account-type");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          toast({
            title: "Email not confirmed",
            description: "Please check your email and confirm your account before logging in.",
            variant: "destructive",
          });
        } else if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Invalid credentials",
            description: "Please check your email and password and try again.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      if (data?.user) {
        navigate("/account-type");
      }
    } catch (error: any) {
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "facebook") => {
    setSocialLoading(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/account-type`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      toast({
        title: `Error signing in with ${provider}`,
        description: error.message,
        variant: "destructive",
      });
      setSocialLoading(null);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Button 
            variant="ghost" 
            className="absolute top-4 left-4 text-gray-600 hover:text-gray-900"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            {activeTab === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-gray-600 mt-2">
            {activeTab === "login" 
              ? "Sign in to your account to continue" 
              : "Register to start your learning journey"}
          </p>
        </div>
        
        <Card className="w-full border-none shadow-lg bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-center text-gray-800">
              Account Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs 
              defaultValue={activeTab} 
              className="w-full"
              onValueChange={(value) => setActiveTab(value as "login" | "register")}
            >
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100">
                <TabsTrigger 
                  value="login"
                  className="data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger 
                  value="register"
                  className="data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm"
                >
                  Register
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <Button
                      variant="outline"
                      onClick={() => handleSocialLogin("google")}
                      disabled={Boolean(socialLoading)}
                      className="w-full border-gray-200 hover:bg-gray-50 hover:text-purple-700 transition-all duration-300"
                    >
                      {socialLoading === "google" ? (
                        <span className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full"></span>
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            height="20"
                            width="20"
                            viewBox="0 0 24 24"
                            className="mr-2"
                          >
                            <path
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              fill="#4285F4"
                            />
                            <path
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              fill="#34A853"
                            />
                            <path
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              fill="#FBBC05"
                            />
                            <path
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              fill="#EA4335"
                            />
                          </svg>
                          Google
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleSocialLogin("facebook")}
                      disabled={Boolean(socialLoading)}
                      className="w-full border-gray-200 hover:bg-gray-50 hover:text-purple-700 transition-all duration-300"
                    >
                      {socialLoading === "facebook" ? (
                        <span className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full"></span>
                      ) : (
                        <>
                          <Facebook className="mr-2 h-4 w-4 text-blue-600" />
                          Facebook
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-700">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-gray-700">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="border-gray-200 focus:border-purple-400 focus:ring-purple-400 pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          onClick={togglePasswordVisibility}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-300" 
                      disabled={authLoading}
                    >
                      {authLoading ? (
                        <span className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full mr-2"></span>
                      ) : (
                        <Mail className="mr-2 h-4 w-4" />
                      )}
                      {authLoading ? "Signing in..." : "Sign in with Email"}
                    </Button>
                  </form>
                </div>
              </TabsContent>
              
              <TabsContent value="register">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <Button
                      variant="outline"
                      onClick={() => handleSocialLogin("google")}
                      disabled={Boolean(socialLoading)}
                      className="w-full border-gray-200 hover:bg-gray-50 hover:text-purple-700 transition-all duration-300"
                    >
                      {socialLoading === "google" ? (
                        <span className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full"></span>
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            height="20"
                            width="20"
                            viewBox="0 0 24 24"
                            className="mr-2"
                          >
                            <path
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              fill="#4285F4"
                            />
                            <path
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              fill="#34A853"
                            />
                            <path
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              fill="#FBBC05"
                            />
                            <path
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              fill="#EA4335"
                            />
                          </svg>
                          Google
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleSocialLogin("facebook")}
                      disabled={Boolean(socialLoading)}
                      className="w-full border-gray-200 hover:bg-gray-50 hover:text-purple-700 transition-all duration-300"
                    >
                      {socialLoading === "facebook" ? (
                        <span className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full"></span>
                      ) : (
                        <>
                          <Facebook className="mr-2 h-4 w-4 text-blue-600" />
                          Facebook
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="text-gray-700">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password" className="text-gray-700">Password</Label>
                      <div className="relative">
                        <Input
                          id="register-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          className="border-gray-200 focus:border-purple-400 focus:ring-purple-400 pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          onClick={togglePasswordVisibility}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-gray-700">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={6}
                          className="border-gray-200 focus:border-purple-400 focus:ring-purple-400 pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          onClick={toggleConfirmPasswordVisibility}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-300" 
                      disabled={authLoading}
                    >
                      {authLoading ? (
                        <span className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full mr-2"></span>
                      ) : (
                        <Mail className="mr-2 h-4 w-4" />
                      )}
                      {authLoading ? "Signing up..." : "Sign up with Email"}
                    </Button>
                  </form>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <p className="text-center text-gray-600 text-sm mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Auth;
