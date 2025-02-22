
import { AlertCircle } from "lucide-react";

export const FileUploadRequirements = () => {
  return (
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
  );
};
