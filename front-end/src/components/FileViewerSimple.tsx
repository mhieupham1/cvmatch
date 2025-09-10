import React from 'react';
import { API_BASE_URL } from '../services/api';

interface FileViewerProps {
  fileUrl: string;
  fileName: string;
}

const FileViewerSimple: React.FC<FileViewerProps> = ({ fileUrl, fileName }) => {
  const fullFileUrl = fileUrl.startsWith('http') ? fileUrl : `${API_BASE_URL}${fileUrl}`;
  
  return (
    <div className="file-viewer-container">
      <div className="file-viewer-header">
        <h3>{fileName}</h3>
      </div>
      <div className="iframe-container">
        <iframe 
          src={fullFileUrl} 
          title={fileName}
          width="100%"
          height="100%"
          style={{ border: 'none', minHeight: '500px' }}
        />
      </div>
    </div>
  );
};

export default FileViewerSimple;