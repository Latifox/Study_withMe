
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Viewer, { SpecialZoomLevel } from '@phuocng/react-pdf-viewer';
import '@phuocng/react-pdf-viewer/cjs/react-pdf-viewer.css';
import * as pdfjs from 'pdfjs-dist';

// Make sure we're using the same version for both API and worker
// Using version 3.11.174 for both to match the API version mentioned in the error
pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

interface PDFViewerProps {
  lectureId?: string;
}

const PDFViewer = ({ lectureId }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  const { data: pdfUrl, isLoading } = useQuery({
    queryKey: ['lecture-pdf', lectureId],
    queryFn: async () => {
      const { data: lecture } = await supabase
        .from('lectures')
        .select('pdf_path')
        .eq('id', parseInt(lectureId!))
        .single();

      if (!lecture?.pdf_path) throw new Error('PDF path not found');

      const { data } = supabase.storage
        .from('lecture_pdfs')
        .getPublicUrl(lecture.pdf_path);

      return data.publicUrl;
    },
    enabled: !!lectureId
  });

  useEffect(() => {
    if (viewerContainerRef.current && pageNumber > 1) {
      // Try to find the page elements after they've been rendered
      const pages = viewerContainerRef.current.querySelectorAll('.rpv-page');
      if (pages.length >= pageNumber) {
        pages[pageNumber - 1].scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [pageNumber]);

  // Updated to match the DocumentLoadEvent type correctly
  const handleDocumentLoad = (e: any) => {
    if (e && e.doc) {
      setNumPages(e.doc.numPages || 0);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full">Loading PDF...</div>;
  }

  return (
    <div className="h-full flex flex-col" ref={setContainerRef}>
      <div className="flex-1 overflow-auto flex justify-center">
        {pdfUrl && (
          <div ref={viewerContainerRef} style={{ height: '100%', width: '100%' }}>
            <Viewer
              fileUrl={pdfUrl}
              onDocumentLoad={handleDocumentLoad}
              defaultScale={SpecialZoomLevel.PageFit}
            />
          </div>
        )}
      </div>
      
      <div className="p-4 border-t bg-white flex justify-center items-center gap-4">
        <Button
          variant="outline"
          onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
          disabled={pageNumber <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span>
          Page {pageNumber} of {numPages || '--'}
        </span>
        <Button
          variant="outline"
          onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages || prev))}
          disabled={pageNumber >= (numPages || 1)}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default PDFViewer;
