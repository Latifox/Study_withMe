import { Card } from "@/components/ui/card";
import { ReactNode } from "react";

interface StoryLayoutProps {
  pathwaySection: ReactNode;
  contentSection: ReactNode;
}

const StoryLayout = ({ pathwaySection, contentSection }: StoryLayoutProps) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
    <div className="md:col-span-1">
      <Card>
        {pathwaySection}
      </Card>
    </div>
    <div className="md:col-span-2">
      {contentSection}
    </div>
  </div>
);

export default StoryLayout;