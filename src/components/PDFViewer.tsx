import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  lectureId?: string;
}

const PDFViewer = ({ lectureId }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto flex justify-center p-4">
        <Document
          file={`/path/to/pdf/${lectureId}.pdf`} // This will be replaced with actual PDF path
          onLoadSuccess={onDocumentLoadSuccess}
          className="max-w-full"
        >
          <Page
            pageNumber={pageNumber}
            renderTextLayer={false}
            renderAnnotationLayer={false}
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