
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface AIConfigSlidersProps {
  temperature: number[];
  setTemperature: (value: number[]) => void;
  creativity: number[];
  setCreativity: (value: number[]) => void;
  detailLevel: number[];
  setDetailLevel: (value: number[]) => void;
}

const AIConfigSliders = ({
  temperature,
  setTemperature,
  creativity,
  setCreativity,
  detailLevel,
  setDetailLevel,
}: AIConfigSlidersProps) => {
  return (
    <>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label className="text-white">Temperature</Label>
          <span className="text-sm text-white/80">{temperature[0]}</span>
        </div>
        <Slider
          value={temperature}
          onValueChange={setTemperature}
          max={1}
          step={0.1}
          className="w-full"
        />
        <p className="text-sm text-white/70">
          Controls randomness in responses. Higher values make output more creative but less focused.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label className="text-white">Creativity Level</Label>
          <span className="text-sm text-white/80">{creativity[0]}</span>
        </div>
        <Slider
          value={creativity}
          onValueChange={setCreativity}
          max={1}
          step={0.1}
          className="w-full"
        />
        <p className="text-sm text-white/70">
          Balances between creative and analytical responses.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label className="text-white">Detail Level</Label>
          <span className="text-sm text-white/80">{detailLevel[0]}</span>
        </div>
        <Slider
          value={detailLevel}
          onValueChange={setDetailLevel}
          max={1}
          step={0.1}
          className="w-full"
        />
        <p className="text-sm text-white/70">
          Controls the depth and length of AI responses.
        </p>
      </div>
    </>
  );
};

export default AIConfigSliders;

