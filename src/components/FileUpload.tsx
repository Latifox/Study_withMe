import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface FileUploadProps {
  courseId?: string;
  onClose: () => void;
}

const FileUpload = ({ courseId, onClose }: FileUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const { toast } = useToast();

  const handleUpload = async () => {
    if (!file || !title) {
      toast({
        title: "Error",
        description: "Please provide both a title and a file",
        variant: "destructive",
      });
      return;
    }

    try {
      // Here we'll handle file upload and text extraction
      toast({
        title: "Success",
        description: "Lecture uploaded successfully!",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload lecture",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload New Lecture</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Lecture Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter lecture title"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="file">PDF File</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleUpload}>Upload</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileUpload;