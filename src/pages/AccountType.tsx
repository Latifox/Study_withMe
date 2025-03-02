
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GraduationCap, School } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AccountType = () => {
  const [accountType, setAccountType] = useState<"student" | "teacher" | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accountType) {
      toast({
        title: "Please select an account type",
        description: "You need to select either Student or Teacher to proceed",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Update user metadata with account type
      const { error } = await supabase.auth.updateUser({
        data: { account_type: accountType }
      });

      if (error) throw error;

      toast({
        title: "Account type set!",
        description: `You've selected ${accountType === "student" ? "Student" : "Teacher"} account type.`,
      });

      // Redirect to dashboard after setting account type
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error setting account type",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md border-none shadow-lg bg-white/90 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Select Your Account Type
            </h1>
            <p className="text-gray-600 mt-2">
              Choose the account type that best describes you
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <RadioGroup value={accountType || ""} onValueChange={(value) => setAccountType(value as "student" | "teacher")}>
              <div className="grid grid-cols-1 gap-4">
                <div className={`rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  accountType === "student" 
                    ? "border-purple-500 bg-purple-50" 
                    : "border-gray-200 hover:border-purple-300"
                }`}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="student" id="student" className="text-purple-600" />
                    <Label
                      htmlFor="student"
                      className="flex items-center cursor-pointer w-full"
                    >
                      <div className="bg-purple-100 p-2 rounded-full mr-3">
                        <GraduationCap className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">Student</p>
                        <p className="text-sm text-gray-500">
                          Join courses and access learning materials
                        </p>
                      </div>
                    </Label>
                  </div>
                </div>

                <div className={`rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  accountType === "teacher" 
                    ? "border-indigo-500 bg-indigo-50" 
                    : "border-gray-200 hover:border-indigo-300"
                }`}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="teacher" id="teacher" className="text-indigo-600" />
                    <Label
                      htmlFor="teacher"
                      className="flex items-center cursor-pointer w-full"
                    >
                      <div className="bg-indigo-100 p-2 rounded-full mr-3">
                        <School className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium">Teacher</p>
                        <p className="text-sm text-gray-500">
                          Create courses and manage learning materials
                        </p>
                      </div>
                    </Label>
                  </div>
                </div>
              </div>
            </RadioGroup>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              disabled={loading}
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full mr-2"></span>
              ) : null}
              {loading ? "Setting account type..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountType;
