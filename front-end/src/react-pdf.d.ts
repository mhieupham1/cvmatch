declare module 'react-pdf' {
  import React from 'react';
  
  export interface DocumentProps {
    file: string | { url: string } | { data: ArrayBuffer | Uint8Array };
    onLoadSuccess?: (pdf: { numPages: number }) => void;
    onLoadError?: (error: Error) => void;
    loading?: React.ReactNode;
    children?: React.ReactNode;
  }
  
  export interface PageProps {
    pageNumber: number;
    renderTextLayer?: boolean;
    renderAnnotationLayer?: boolean;
    scale?: number;
    width?: number;
    height?: number;
  }
  
  export const Document: React.FC<DocumentProps>;
  export const Page: React.FC<PageProps>;
  
  export const pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: string;
    };
    version: string;
  };
}

declare module 'docx-preview' {
  export function renderAsync(
    blob: ArrayBuffer,
    container: HTMLElement,
    styleMap?: unknown,
    options?: {
      className?: string;
      inWrapper?: boolean;
      ignoreWidth?: boolean;
      ignoreHeight?: boolean;
      ignoreFonts?: boolean;
      breakPages?: boolean;
      ignoreLastRenderedPageBreak?: boolean;
      renderHeaders?: boolean;
      renderFooters?: boolean;
      renderFootnotes?: boolean;
      renderEndnotes?: boolean;
      useBase64URL?: boolean;
      useMathMLPolyfill?: boolean;
      debug?: boolean;
    }
  ): Promise<void>;
}