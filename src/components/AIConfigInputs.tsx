
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface AIConfigInputsProps {
  customInstructions: string;
  setCustomInstructions: (value: string) => void;
  contentLanguage: string;
  setContentLanguage: (value: string) => void;
}

const AIConfigInputs = ({
  customInstructions,
  setCustomInstructions,
  contentLanguage,
  setContentLanguage,
}: AIConfigInputsProps) => {
  return (
    <>
      <div className="space-y-2">
        <Label className="text-white">Custom Instructions</Label>
        <Textarea
          placeholder="Enter any specific instructions or requirements for content generation"
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          className="min-h-[100px] bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
        />
        <p className="text-sm text-white/70">
          Specify any particular focus areas or special requirements for the content generation.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-white">Content Language (Optional)</Label>
        <Input
          placeholder="Enter target language (e.g., English, Spanish, French)"
          value={contentLanguage}
          onChange={(e) => setContentLanguage(e.target.value)}
          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
        />
        <p className="text-sm text-white/70">
          Leave empty to use the original lecture language.
        </p>
      </div>
    </>
  );
};

export default AIConfigInputs;

