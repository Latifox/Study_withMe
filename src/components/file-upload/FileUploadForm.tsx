
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, FileType, CheckCircle2, XCircle } from "lucide-react";
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
  const [isDragging, setIsDragging] = useState(false);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    validateAndSetFile(selectedFile);
  };
  
  const validateAndSetFile = (selectedFile: File | null) => {
    setFileError(null);
    
    if (!selectedFile) {
      setFile(null);
      return;
    }
    
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
    
    setFile(selectedFile);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files?.[0] || null;
    validateAndSetFile(droppedFile);
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
          
          <div
            className={`border-2 border-dashed rounded-md p-4 text-center ${
              isDragging 
                ? 'border-blue-500 bg-blue-900/20' 
                : file 
                  ? 'border-green-500 bg-green-900/20' 
                  : fileError 
                    ? 'border-red-500 bg-red-900/20'
                    : 'border-slate-600 bg-slate-800/50'
            } transition-colors duration-200 cursor-pointer`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input
              id="file-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
            />
            
            <div className="flex flex-col items-center justify-center py-4">
              {file ? (
                <>
                  <CheckCircle2 className="w-12 h-12 text-green-400 mb-2" />
                  <p className="text-white text-sm mb-1">File selected</p>
                  <p className="text-green-400 text-xs">
                    {file.name} ({(file.size / (1024 * 1024)).toFixed(2)}MB)
                  </p>
                </>
              ) : fileError ? (
                <>
                  <XCircle className="w-12 h-12 text-red-400 mb-2" />
                  <p className="text-white text-sm mb-1">Error selecting file</p>
                  <p className="text-red-400 text-xs">{fileError}</p>
                </>
              ) : (
                <>
                  <FileType className="w-12 h-12 text-slate-400 mb-2" />
                  <p className="text-white text-sm mb-1">Drag and drop a PDF file here</p>
                  <p className="text-slate-400 text-xs">or click to browse</p>
                </>
              )}
            </div>
          </div>
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
