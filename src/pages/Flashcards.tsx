import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import FlashcardsLoading from "@/components/story/FlashcardsLoading";

const Flashcards = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const {
    data: flashcards,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["flashcards", lectureId],
    queryFn: async () => {
      const { data } = await supabase
        .from("flashcards")
        .select("*")
        .eq("lecture_id", lectureId);
      return data;
    },
  });

  const handleBack = () => {
    navigate(`/course/${courseId}`);
  };

  const createFlashcard = async () => {
    setIsCreating(true);
    const { data, error } = await supabase.from("flashcards").insert([
      {
        lecture_id: lectureId,
        front: newFront,
        back: newBack,
      },
    ]);

    if (error) {
      toast({
        title: "Uh oh! Something went wrong.",
        description: "There was an error creating the flashcard.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success!",
        description: "Flashcard created successfully.",
      });
      setNewFront("");
      setNewBack("");
      refetch();
    }
    setIsCreating(false);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={handleBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Lectures
        </Button>
        <h1 className="text-2xl font-bold">Flashcards</h1>
      </div>

      {isLoading ? (
        <FlashcardsLoading />
      ) : flashcards ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flashcards.map((card) => (
            <Card key={card.id}>
              <CardHeader>
                <CardTitle>Flashcard</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm font-medium">Front:</p>
                <p className="text-muted-foreground">{card.front}</p>
                <Separator />
                <p className="text-sm font-medium">Back:</p>
                <p className="text-muted-foreground">{card.back}</p>
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardHeader>
              <CardTitle>Create New Flashcard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="front">Front</Label>
                <Input
                  id="front"
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="back">Back</Label>
                <Textarea
                  id="back"
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                />
              </div>
              <Button onClick={createFlashcard} disabled={isCreating}>
                Create Flashcard
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
};

export default Flashcards;
