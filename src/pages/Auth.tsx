
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Facebook, Mail } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
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
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
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
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "facebook") => {
    setSocialLoading(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Welcome</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <Button
                    variant="outline"
                    onClick={() => handleSocialLogin("google")}
                    disabled={Boolean(socialLoading)}
                    className="w-full"
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
                    className="w-full"
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
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <span className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full mr-2"></span>
                    ) : (
                      <Mail className="mr-2 h-4 w-4" />
                    )}
                    {loading ? "Signing in..." : "Sign in with Email"}
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
                    className="w-full"
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
                    className="w-full"
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
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <span className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full mr-2"></span>
                    ) : (
                      <Mail className="mr-2 h-4 w-4" />
                    )}
                    {loading ? "Signing up..." : "Sign up with Email"}
                  </Button>
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
