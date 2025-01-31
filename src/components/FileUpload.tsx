import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FileUploadProps {
  courseId?: string;
  onClose: () => void;
}

const FileUpload = ({ courseId, onClose }: FileUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async () => {
    if (!file || !title || !courseId) {
      toast({
        title: "Error",
        description: "Please provide both a title and a file",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);

      // Upload PDF to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('lecture_pdfs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL of the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('lecture_pdfs')
        .getPublicUrl(filePath);

      // Extract text from PDF
      const { data: extractedData, error: extractError } = await supabase.functions
        .invoke('extract-pdf-text', {
          body: { pdfUrl: publicUrl },
        });

      if (extractError) throw extractError;

      // Save lecture metadata and content to database
      const { error: dbError } = await supabase
        .from('lectures')
        .insert({
          course_id: parseInt(courseId),
          title,
          pdf_path: filePath,
          content: extractedData.text,
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Lecture uploaded successfully!",
      });
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload lecture: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
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
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={isUploading}>
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileUpload;