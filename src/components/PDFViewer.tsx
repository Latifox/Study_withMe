import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  lectureId?: string;
}

const PDFViewer = ({ lectureId }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

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

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full">Loading PDF...</div>;
  }

  return (
    <div className="h-full flex flex-col" ref={setContainerRef}>
      <div className="flex-1 overflow-auto flex justify-center p-4">
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          className="max-w-full"
        >
          <Page
            pageNumber={pageNumber}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            width={containerRef?.clientWidth ? containerRef.clientWidth - 64 : undefined}
          />
        </Document>
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