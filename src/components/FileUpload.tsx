
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Upload } from "lucide-react";
import AIProfessorLoading from "./AIProfessorLoading";
import { useFileUpload } from "@/hooks/useFileUpload";

interface FileUploadProps {
  courseId?: string;
  onClose: () => void;
}

const FileUpload = ({ courseId, onClose }: FileUploadProps) => {
  const {
    file,
    setFile,
    title,
    setTitle,
    isUploading,
    showAIProfessor,
    currentLectureId,
    handleUpload
  } = useFileUpload({ courseId, onClose });

  if (showAIProfessor && currentLectureId && courseId) {
    return <AIProfessorLoading 
      lectureId={currentLectureId} 
      courseId={parseInt(courseId)} 
    />;
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-slate-900/95 backdrop-blur-md border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white">Upload New Lecture</DialogTitle>
        </DialogHeader>
        
        <div className="bg-amber-900/20 border border-amber-500/20 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-400 mb-2">File Requirements:</h4>
              <ul className="text-sm text-amber-300/90 space-y-1 list-disc pl-4">
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
            onClick={handleUpload}
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
      </DialogContent>
    </Dialog>
  );
};

export default FileUpload;
