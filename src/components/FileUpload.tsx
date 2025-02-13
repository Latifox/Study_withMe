
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";

interface FileUploadProps {
  courseId?: string;
  onClose: () => void;
}

const FileUpload = ({ courseId, onClose }: FileUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const extractPDFContent = async (filePath: string, lectureId: number): Promise<string> => {
    console.log('Sending file path for text extraction:', filePath);
    
    const { data, error } = await supabase.functions.invoke('extract-pdf-text', {
      body: {
        filePath,
        lectureId: lectureId.toString()
      }
    });

    if (error) {
      console.error('Error extracting PDF content:', error);
      throw error;
    }

    if (!data?.text) {
      console.error('No text content returned from extraction:', data);
      throw new Error('No text content extracted from PDF');
    }

    console.log('Extracted text length:', data.text.length);
    return data.text;
  };

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

      // Upload PDF to storage first
      const fileExt = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;
      
      console.log('Uploading PDF to storage...');
      const { error: uploadError } = await supabase.storage
        .from('lecture_pdfs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;
      console.log('PDF uploaded successfully');

      // Save lecture metadata and get the lecture ID
      console.log('Saving lecture to database...');
      const { data: lectureData, error: dbError } = await supabase
        .from('lectures')
        .insert({
          course_id: parseInt(courseId),
          title,
          pdf_path: filePath,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      console.log('Lecture saved successfully');

      // Extract PDF content with the new lecture ID
      if (!lectureData?.id) {
        throw new Error('No lecture ID returned from database');
      }

      console.log('Extracting PDF content...');
      await extractPDFContent(filePath, lectureData.id);
      console.log('PDF content extracted and stored');

      // Invalidate queries and wait a moment to ensure the UI updates
      await queryClient.invalidateQueries({ queryKey: ['lectures', courseId] });
      
      // Small delay to ensure the UI has time to process the update
      await new Promise(resolve => setTimeout(resolve, 500));

      toast({
        title: "Success",
        description: "Lecture uploaded successfully!",
      });
      onClose();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload lecture",
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
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800 mb-2">File Requirements:</h4>
              <ul className="text-sm text-amber-700 space-y-1 list-disc pl-4">
                <li>PDF files only</li>
                <li>Text must be searchable (not scanned documents)</li>
                <li>Maximum file size: 10MB</li>
                <li>Clear, readable text formatting</li>
                <li>No password-protected documents</li>
              </ul>
            </div>
          </div>
        </div>

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
