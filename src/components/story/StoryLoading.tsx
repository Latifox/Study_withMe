import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const StoryLoading = () => (
  <Card className="p-4">
    <div className="flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-center text-muted-foreground">
        Generating story content...
        <br />
        This may take a few moments.
      </p>
    </div>
  </Card>
);

export default StoryLoading;