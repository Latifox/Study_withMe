
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Viewer, { SpecialZoomLevel } from '@phuocng/react-pdf-viewer';
import '@phuocng/react-pdf-viewer/cjs/react-pdf-viewer.css';

interface PDFViewerProps {
  lectureId?: string;
}

const PDFViewer = ({ lectureId }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);

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
    if (viewerRef.current && pageNumber !== 1) {
      viewerRef.current.getPagesContainer().children[pageNumber - 1].scrollIntoView();
    }
  }, [pageNumber]);

  // Updated to match the DocumentLoadEvent type
  const handleDocumentLoad = (e: any) => {
    if (e && e.doc) {
      e.doc.getMetadata().then((meta: any) => {
        setNumPages(e.doc.numPages || 0);
      });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full">Loading PDF...</div>;
  }

  // Need to set worker externally instead of as a component
  if (pdfUrl) {
    // Set the worker URL globally
    (window as any).pdfjsWorker = 'https://unpkg.com/pdfjs-dist@2.6.347/build/pdf.worker.min.js';
  }

  return (
    <div className="h-full flex flex-col" ref={setContainerRef}>
      <div className="flex-1 overflow-auto flex justify-center">
        {pdfUrl && (
          <div style={{ height: '100%', width: '100%' }}>
            <Viewer
              fileUrl={pdfUrl}
              onDocumentLoad={handleDocumentLoad}
              ref={viewerRef}
              defaultScale={SpecialZoomLevel.PageFit}
              // Remove the custom renderPage prop that was causing errors
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
