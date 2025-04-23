import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Viewer, { SpecialZoomLevel, DocumentLoadEvent } from '@phuocng/react-pdf-viewer';
import '@phuocng/react-pdf-viewer/cjs/react-pdf-viewer.css';
import * as pdfjs from 'pdfjs-dist';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Make sure we're using the same version for both API and worker
// Using version 3.11.174 for both to match the API version mentioned in the error
pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
interface PDFViewerProps {
  lectureId?: string;
}
const PDFViewer = ({
  lectureId
}: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const {
    data: pdfUrl,
    isLoading,
    isError
  } = useQuery({
    queryKey: ['lecture-pdf', lectureId],
    queryFn: async () => {
      try {
        const {
          data: lecture
        } = await supabase.from('lectures').select('pdf_path').eq('id', parseInt(lectureId!)).single();
        
        if (!lecture?.pdf_path) throw new Error('PDF path not found');
        
        const {
          data
        } = supabase.storage.from('lecture_pdfs').getPublicUrl(lecture.pdf_path);
        
        return data.publicUrl;
      } catch (err) {
        console.error('Error fetching PDF:', err);
        setError('Failed to load the PDF. Please check your permissions or try again later.');
        throw err;
      }
    },
    enabled: !!lectureId
  });
  
  useEffect(() => {
    if (viewerContainerRef.current && pageNumber > 1) {
      // Try to find the page elements after they've been rendered
      const pages = viewerContainerRef.current.querySelectorAll('.rpv-page');
      if (pages.length >= pageNumber) {
        pages[pageNumber - 1].scrollIntoView({
          behavior: 'smooth'
        });
      }
    }
  }, [pageNumber]);

  // Updated to use the proper DocumentLoadEvent type from the library
  const handleDocumentLoad = (e: DocumentLoadEvent) => {
    if (e && e.doc) {
      setNumPages(e.doc.numPages || 0);
    }
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-full">Loading PDF...</div>;
  }
  
  if (isError || error) {
    return (
      <div className="flex justify-center items-center h-full">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "Failed to load the PDF. This may be due to permission issues or the file no longer exists."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return <div className="h-full flex flex-col" ref={setContainerRef}>
      <div className="flex-1 overflow-auto flex justify-center">
        {pdfUrl && <div ref={viewerContainerRef} style={{
        height: '100%',
        width: '100%'
      }}>
            <Viewer fileUrl={pdfUrl} onDocumentLoad={handleDocumentLoad} defaultScale={SpecialZoomLevel.PageFit} />
          </div>}
      </div>
    </div>;
};

export default PDFViewer;