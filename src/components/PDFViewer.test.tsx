import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PDFViewer from './PDFViewer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock pour éviter les erreurs avec supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { pdf_path: '051675f4-3499-4ebc-a5bc-79b4292d06b6.pdf' }
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://rvarixstojstceiuezsp.supabase.co/storage/v1/object/public/lecture_pdfs//051675f4-3499-4ebc-a5bc-79b4292d06b6.pdf' }
        })
      })
    }
  }
}));

// Import the mocked supabase client
import { supabase } from '@/integrations/supabase/client';

// Mock pour @phuocng/react-pdf-viewer
vi.mock('@phuocng/react-pdf-viewer', () => {
  return {
    default: vi.fn().mockImplementation(({ fileUrl, onDocumentLoad }) => {
      // Simuler le chargement du document
      if (onDocumentLoad) {
        onDocumentLoad({ doc: { numPages: 5 } });
      }
      return <div data-testid="pdf-viewer">PDF Viewer Mock</div>;
    }),
    SpecialZoomLevel: { PageFit: 'fit' }
  };
});

describe('PDFViewer Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  it('affiche un message de chargement initialement', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PDFViewer lectureId="123" />
      </QueryClientProvider>
    );

    expect(screen.getByText('Loading PDF...')).toBeInTheDocument();
  });

  it('affiche une erreur quand le chargement échoue', async () => {
    // Modifier le mock pour simuler une erreur
    vi.mocked(supabase.from).mockImplementationOnce(() => {
      throw new Error('Erreur de chargement');
    });

    render(
      <QueryClientProvider client={queryClient}>
        <PDFViewer lectureId="123" />
      </QueryClientProvider>
    );

    // On s'attend à voir un message d'erreur
    const errorElement = await screen.findByText('Error');
    expect(errorElement).toBeInTheDocument();
    expect(screen.getByText(/Failed to load the PDF/i)).toBeInTheDocument();
  });
}); 