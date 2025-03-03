
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AIProfessorLoading from "./AIProfessorLoading";
import { FileUploadForm } from "./file-upload/FileUploadForm";
import { useLectureUpload } from "./file-upload/useLectureUpload";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface FileUploadProps {
  courseId?: string;
  onClose: () => void;
  isProfessorCourse?: boolean;
}

const FileUpload = ({ courseId, onClose, isProfessorCourse = false }: FileUploadProps) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const {
    file,
    setFile,
    title,
    setTitle,
    isUploading,
    showAIProfessor,
    currentLectureId,
    handleUpload
  } = useLectureUpload(onClose, courseId, isProfessorCourse);

  const handleUploadWithErrorCatching = async () => {
    setErrorMessage(null);
    try {
      await handleUpload();
    } catch (error: any) {
      console.error("Upload error caught in FileUpload component:", error);
      setErrorMessage(error.message || "An unexpected error occurred during upload");
    }
  };

  if (showAIProfessor && currentLectureId && courseId) {
    return <AIProfessorLoading 
      lectureId={currentLectureId} 
      courseId={parseInt(courseId)}
      isProfessorLecture={isProfessorCourse}
    />;
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-slate-900/95 backdrop-blur-md border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white">Upload New Lecture</DialogTitle>
        </DialogHeader>
        
        {errorMessage && (
          <Alert variant="destructive" className="border-red-800 bg-red-950/50">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="text-red-200 text-sm">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}
        
        <FileUploadForm
          title={title}
          setTitle={setTitle}
          file={file}
          setFile={setFile}
          onUpload={handleUploadWithErrorCatching}
          isUploading={isUploading}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};

export default FileUpload;
