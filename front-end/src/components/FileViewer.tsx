import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { renderAsync } from 'docx-preview';
import { API_BASE_URL } from '../services/api';
// Removed CSS imports that might cause issues

// Set up the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface FileViewerProps {
  fileUrl: string;
  fileName: string;
}

const FileViewer: React.FC<FileViewerProps> = ({ fileUrl, fileName }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [docxContainer, setDocxContainer] = useState<HTMLDivElement | null>(null);

  const fullFileUrl = fileUrl.startsWith('http') ? fileUrl : `${API_BASE_URL}${fileUrl}`;
  const isDocx = fileName.toLowerCase().endsWith('.docx');
  const isPdf = fileName.toLowerCase().endsWith('.pdf');

  useEffect(() => {
    if (isDocx && docxContainer) {
      setIsLoading(true);
      setError(null);
      
      // Fetch the DOCX file and render it
      fetch(fullFileUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch the document');
          }
          return response.arrayBuffer();
        })
        .then(buffer => {
          // Render the DOCX file to the container
          renderAsync(buffer, docxContainer, undefined, {
            className: 'docx-viewer',
            inWrapper: true,
          })
            .then(() => {
              setIsLoading(false);
            })
            .catch(err => {
              console.error('Error rendering DOCX:', err);
              setError('Failed to render the document');
              setIsLoading(false);
            });
        })
        .catch(err => {
          console.error('Error fetching DOCX:', err);
          setError('Failed to load the document');
          setIsLoading(false);
        });
    }
  }, [isDocx, fullFileUrl, docxContainer]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setError('Failed to load the document');
    setIsLoading(false);
  };

  const handlePrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    if (numPages) {
      setPageNumber(prev => Math.min(prev + 1, numPages));
    }
  };

  if (!isPdf && !isDocx) {
    return <div className="file-viewer-error">Unsupported file format. Only PDF and DOCX files are supported.</div>;
  }

  return (
    <div className="file-viewer-container">
      <div className="file-viewer-header">
        <h3>{fileName}</h3>
      </div>
      
      {isLoading && (
        <div className="file-viewer-loading">
          <p>Loading document...</p>
        </div>
      )}
      
      {error && (
        <div className="file-viewer-error">
          <p>{error}</p>
        </div>
      )}
      
      {isPdf && (
        <div className="pdf-viewer">
          <Document
            file={fullFileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<p>Loading PDF...</p>}
          >
            <Page 
              pageNumber={pageNumber} 
              renderTextLayer={true}
              renderAnnotationLayer={true}
              scale={1.2}
            />
          </Document>
          
          {numPages && numPages > 1 && (
            <div className="pdf-controls">
              <button 
                onClick={handlePrevPage} 
                disabled={pageNumber <= 1}
                className="pdf-control-btn"
              >
                Previous
              </button>
              <span className="pdf-page-info">
                Page {pageNumber} of {numPages}
              </span>
              <button 
                onClick={handleNextPage} 
                disabled={pageNumber >= numPages}
                className="pdf-control-btn"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
      
      {isDocx && (
        <div 
          className="docx-viewer-container" 
          ref={setDocxContainer}
        />
      )}
    </div>
  );
};

export default FileViewer;