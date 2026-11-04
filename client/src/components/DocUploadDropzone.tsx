import { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Eye,
  X,
  FileCheck,
} from 'lucide-react';
import { uploadDocument, type UserDocument } from '../lib/api';
import { Button, useToast, cx } from './ui';

interface DocUploadDropzoneProps {
  taskId?: string;
  caseId?: string;
  docName: string;
  onUploaded?: (doc: UserDocument) => void;
  className?: string;
}

export default function DocUploadDropzone({
  taskId,
  caseId,
  docName,
  onUploaded,
  className,
}: DocUploadDropzoneProps) {
  const { success, error, warning } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ file: File; url: string; isPdf: boolean } | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const validateFile = (file: File): boolean => {
    const validMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type) && !file.name.match(/\.(pdf|jpe?g|png|webp)$/i)) {
      error('Invalid File Type', 'Please upload a PDF document or image file (JPEG, PNG).');
      return false;
    }
    const maxBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxBytes) {
      error('File Too Large', `Maximum allowed upload size is 10 MB (file is ${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      return false;
    }
    return true;
  };

  const handleFile = (file: File) => {
    if (!validateFile(file)) return;
    const url = URL.createObjectURL(file);
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    setPreviewFile({ file, url, isPdf });
  };

  const handleCommitUpload = async () => {
    if (!previewFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', previewFile.file);
      fd.append('docType', docName);
      if (taskId) fd.append('taskId', taskId);
      if (caseId) fd.append('caseId', caseId);

      const res = await uploadDocument(fd);
      if (res.duplicate) {
        warning('Duplicate Document', 'Identical cryptographic SHA-256 fingerprint already indexed in vault.');
      } else {
        success('Document Uploaded & Indexed', `${previewFile.file.name} saved to SQLite Document Vault.`);
      }
      onUploaded?.(res.document);
      setPreviewFile(null);
    } catch (err) {
      error('Upload Failed', (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cx('space-y-3', className)}>
      {/* Drop Area */}
      {!previewFile ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFile(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={cx(
            'group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer',
            isDragging
              ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 scale-[1.01]'
              : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:border-brand-400 hover:bg-brand-50/20'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm transition group-hover:scale-110">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div className="mt-3 text-xs font-semibold text-slate-800 dark:text-slate-200">
            Drag & drop <span className="text-brand-600 dark:text-brand-400 font-bold">{docName}</span>, or click to browse
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            PDF, PNG, JPEG up to 10 MB · Automatically indexed into Document RAG
          </p>
        </div>
      ) : (
        /* Staged preview card */
        <div className="rounded-xl border border-brand-200 dark:border-brand-800/80 bg-brand-50/40 dark:bg-brand-950/20 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white shadow-xs">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-slate-900 dark:text-white">
                  {previewFile.file.name}
                </div>
                <div className="text-[11px] text-slate-500">
                  {(previewFile.file.size / 1024).toFixed(0)} KB · Ready to commit
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setViewerOpen(true)}
                title="Preview document"
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                Preview
              </Button>
              <button
                onClick={() => setPreviewFile(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-brand-200/60 dark:border-brand-800/40">
            <span className="text-[11px] text-brand-700 dark:text-brand-300 font-medium">
              Verified MIME & SHA-256 staging
            </span>
            <Button
              size="sm"
              variant="primary"
              loading={uploading}
              onClick={handleCommitUpload}
            >
              <FileCheck className="h-3.5 w-3.5 mr-1" />
              Commit to Document Vault
            </Button>
          </div>
        </div>
      )}

      {/* In-Browser PDF & Document Viewer Modal */}
      {viewerOpen && previewFile && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-4xl h-[85vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-surface shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-3.5">
              <div className="flex items-center gap-2 font-semibold text-sm text-slate-900 dark:text-white">
                <FileText className="h-4 w-4 text-brand-600" />
                <span>{previewFile.file.name}</span>
                <span className="text-xs text-slate-400">({(previewFile.file.size / 1024).toFixed(0)} KB)</span>
              </div>
              <button
                onClick={() => setViewerOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 bg-slate-900/90 p-2 overflow-auto flex items-center justify-center">
              {previewFile.isPdf ? (
                <iframe
                  src={previewFile.url}
                  className="w-full h-full rounded border-0"
                  title="PDF Viewer"
                />
              ) : (
                <img
                  src={previewFile.url}
                  alt="Document Proof Preview"
                  className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                />
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-6 py-3 bg-surface text-xs">
              <span className="text-slate-500">In-Browser Pre-Flight Preview</span>
              <Button size="sm" variant="secondary" onClick={() => setViewerOpen(false)}>
                Done Previewing
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
