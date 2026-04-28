'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

// Usamos react-quill-new que es una versión más mantenida y compatible con React 18
const ReactQuill = dynamic(() => import('react-quill-new'), { 
  ssr: false,
  loading: () => <div className="h-40 bg-gray-50 animate-pulse rounded-xl border border-gray-100" />
});

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const RichTextEditor = ({ value, onChange, placeholder, className }: RichTextEditorProps) => {
  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['clean']
    ],
  };

  const formats = [
    'bold', 'italic', 'underline',
    'list', 'bullet'
  ];

  return (
    <div className={`rich-text-editor ${className || ''}`}>
      <style jsx global>{`
        .rich-text-editor .ql-container {
          border-bottom-left-radius: 1rem;
          border-bottom-right-radius: 1rem;
          font-family: inherit;
          font-size: 0.875rem;
          min-height: 120px;
          background: white;
        }
        .rich-text-editor .ql-toolbar {
          border-top-left-radius: 1rem;
          border-top-right-radius: 1rem;
          background: #f9fafb;
          border-color: #f3f4f6;
        }
        .rich-text-editor .ql-container.ql-snow {
          border-color: #f3f4f6;
        }
      `}</style>
      <ReactQuill 
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
};

export default RichTextEditor;
