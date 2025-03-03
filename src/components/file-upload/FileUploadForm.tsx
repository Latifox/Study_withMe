
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2 } from "lucide-react";
import { FileUploadRequirements } from "./FileUploadRequirements";

interface FileUploadFormProps {
  title: string;
  setTitle: (title: string) => void;
  file: File | null;
  setFile: (file: File | null) => void;
  onUpload: () => void;
  isUploading: boolean;
  onClose: () => void;
}

export const FileUploadForm = ({ 
  title, 
  setTitle, 
  file, 
  setFile, 
  onUpload, 
  isUploading, 
  onClose 
}: FileUploadFormProps) => {
  const [fileError, setFileError] = useState<string | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFileError(null);
    
    if (selectedFile) {
      // Check file type
      if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
        setFileError('Only PDF files are allowed');
        setFile(null);
        return;
      }
      
      // Check file size (10MB limit)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setFileError('File size must be less than 10MB');
        setFile(null);
        return;
      }
    }
    
    setFile(selectedFile);
  };
  
  return (
    <div>
      <FileUploadRequirements />

      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="title" className="text-white">Lecture Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter lecture title"
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
            disabled={isUploading}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="file" className="text-white">PDF File</Label>
          <Input
            id="file"
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="bg-slate-800 border-slate-700 text-white file:bg-slate-700 file:text-white file:border-0"
            disabled={isUploading}
          />
          {fileError && (
            <p className="text-red-400 text-sm mt-1">{fileError}</p>
          )}
          {file && (
            <p className="text-green-400 text-sm mt-1">Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)}MB)</p>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button 
          variant="outline" 
          onClick={onClose}
          className="bg-transparent text-white border-slate-700 hover:bg-slate-800"
          disabled={isUploading}
        >
          Cancel
        </Button>
        <Button
          onClick={onUpload}
          disabled={isUploading || !title || !file}
          className={`${
            !title || !file 
              ? 'bg-gray-600 hover:bg-gray-600 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700'
          } text-white`}
        >
          {isUploading ? (
            <>
              <Loader2 className="animate-spin mr-2" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2" />
              Upload
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
