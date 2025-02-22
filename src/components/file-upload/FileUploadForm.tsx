
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
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
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="file" className="text-white">PDF File</Label>
          <Input
            id="file"
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="bg-slate-800 border-slate-700 text-white file:bg-slate-700 file:text-white file:border-0"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button 
          variant="outline" 
          onClick={onClose}
          className="bg-transparent text-white border-slate-700 hover:bg-slate-800"
        >
          Cancel
        </Button>
        <Button
          onClick={onUpload}
          disabled={isUploading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {isUploading ? (
            <>
              <Upload className="animate-spin mr-2" />
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
