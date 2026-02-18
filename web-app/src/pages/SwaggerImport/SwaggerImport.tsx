/**
 * SwaggerImport Page
 * Modern, polished UI for importing OpenAPI/Swagger specs
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Link as LinkIcon,
  FileJson,
  CheckCircle,
  ArrowRight,
  X,
  FileText,
  Globe,
  ClipboardPaste,
  Sparkles,
} from 'lucide-react';
import { Button, ErrorMessage } from '@/components/common';
import { specService } from '@/services';
import { useSpecStore, useToast } from '@/stores';
import { cn } from '@/utils';
import type { ImportSpecResponse, SpecSource, TransformedError } from '@/types';

function isTransformedError(error: unknown): error is TransformedError {
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
}

function getUserFriendlyErrorMessage(error: unknown): { title: string; message: string } {
  if (isTransformedError(error)) {
    if (error.code === 'CONFLICT' || error.status === 409) return { title: 'Duplicate Specification', message: 'This specification has already been imported.' };
    if (error.code === 'VALIDATION_ERROR' || error.status === 400) return { title: 'Invalid Specification', message: error.message || 'The specification format is invalid.' };
    if (error.code === 'NOT_FOUND' || error.status === 404) return { title: 'Specification Not Found', message: 'Could not fetch from the provided URL.' };
    if (error.code === 'NETWORK_ERROR') return { title: 'Network Error', message: 'Unable to connect to the server.' };
    return { title: 'Import Failed', message: error.message || 'An unexpected error occurred.' };
  }
  if (error instanceof Error) return { title: 'Import Failed', message: error.message };
  return { title: 'Import Failed', message: 'An unexpected error occurred.' };
}

type ImportMethod = 'url' | 'file' | 'paste';

const IMPORT_METHODS = [
  { id: 'url' as ImportMethod, label: 'From URL', icon: Globe, desc: 'Fetch from a public endpoint', color: 'from-blue-500 to-cyan-500', borderActive: 'border-blue-500' },
  { id: 'file' as ImportMethod, label: 'Upload File', icon: Upload, desc: 'Drop or browse for a file', color: 'from-green-500 to-emerald-500', borderActive: 'border-green-500' },
  { id: 'paste' as ImportMethod, label: 'Paste JSON/YAML', icon: ClipboardPaste, desc: 'Paste spec content directly', color: 'from-orange-500 to-amber-500', borderActive: 'border-orange-500' },
];

export interface SwaggerImportProps {
  onImportSuccess?: () => void;
}

export function SwaggerImport({ onImportSuccess }: SwaggerImportProps = {}) {
  const navigate = useNavigate();
  const toast = useToast();
  const addSpec = useSpecStore((state) => state.addSpec);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<ImportMethod>('url');
  const [url, setUrl] = useState('');
  const [pastedContent, setPastedContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportSpecResponse | null>(null);

  const handleTabChange = (tab: ImportMethod) => { setActiveTab(tab); setError(null); };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file); setError(null);
      const reader = new FileReader();
      reader.onload = (ev) => setFileContent(ev.target?.result as string);
      reader.onerror = () => setError('Failed to read file');
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.json') || file.name.endsWith('.yaml') || file.name.endsWith('.yml'))) {
      setSelectedFile(file); setError(null);
      const reader = new FileReader();
      reader.onload = (ev) => setFileContent(ev.target?.result as string);
      reader.readAsText(file);
    } else {
      setError('Please drop a valid JSON or YAML file');
    }
  };

  const clearFile = () => { setSelectedFile(null); setFileContent(''); if (fileInputRef.current) fileInputRef.current.value = ''; };

  const validateContent = (content: string): boolean => {
    try { JSON.parse(content); return true; } catch { return content.includes('openapi:') || content.includes('swagger:'); }
  };

  const handleImport = async () => {
    setIsLoading(true); setError(null); setImportResult(null);
    try {
      let source: SpecSource;
      if (activeTab === 'url') { if (!url.trim()) throw new Error('Please enter a valid URL'); source = { type: 'url', url: url.trim() }; }
      else if (activeTab === 'file') { if (!fileContent) throw new Error('Please select a file'); if (!validateContent(fileContent)) throw new Error('Invalid format. Expected JSON or YAML.'); source = { type: 'inline', content: fileContent, filename: selectedFile?.name }; }
      else { if (!pastedContent.trim()) throw new Error('Please paste the content'); if (!validateContent(pastedContent)) throw new Error('Invalid format. Expected JSON or YAML.'); source = { type: 'inline', content: pastedContent }; }

      const result = await specService.importSpec({ source, generateMissingOperationIds: true, includeDeprecated: true });
      setImportResult(result);
      addSpec({ id: result.specId, title: result.title, version: result.version, operationCount: result.operationCount, importedAt: new Date().toISOString() });
      toast.success('Import Successful', `Imported ${result.operationCount} operations from ${result.title}`);
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      const { title, message } = getUserFriendlyErrorMessage(err);
      setError(message); toast.error(title, message);
    } finally { setIsLoading(false); }
  };

  const canImport = () => {
    if (activeTab === 'url') return url.trim().length > 0;
    if (activeTab === 'file') return fileContent.length > 0;
    return pastedContent.trim().length > 0;
  };

  // Success State
  if (importResult) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="relative overflow-hidden rounded-xl border-2 border-green-400 p-10 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10" />
          <div className="relative">
            <div className="inline-flex rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 p-5 shadow-xl mb-5">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-2">Import Successful!</h2>
            <p className="text-green-700 dark:text-green-400 mb-1">
              <span className="font-bold">{importResult.title}</span> v{importResult.version}
            </p>
            <p className="text-sm text-green-600 dark:text-green-500 mb-6">{importResult.operationCount} operations imported</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="primary" onClick={() => navigate(`/operations/${importResult.specId}`)} icon={<ArrowRight className="h-4 w-4" />}>View Operations</Button>
              <Button variant="secondary" onClick={() => { setImportResult(null); setUrl(''); setPastedContent(''); clearFile(); }}>Import Another</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeMeta = IMPORT_METHODS.find((m) => m.id === activeTab)!;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Import Method Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {IMPORT_METHODS.map((m) => {
          const Icon = m.icon;
          const isActive = activeTab === m.id;
          return (
            <button
              key={m.id}
              onClick={() => handleTabChange(m.id)}
              className={cn(
                'group relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all duration-200',
                isActive ? `${m.borderActive} shadow-lg scale-[1.02]` : 'border-border hover:border-muted-foreground/40 hover:shadow-md'
              )}
            >
              <div className={cn('absolute inset-0 transition-opacity bg-gradient-to-br', m.color, isActive ? 'opacity-10' : 'opacity-0 group-hover:opacity-5')} />
              {isActive && <div className="absolute top-2.5 right-2.5"><CheckCircle className="h-4 w-4 text-green-500" /></div>}
              <div className="relative">
                <div className={cn('mb-2.5 inline-flex rounded-lg p-2 bg-gradient-to-br shadow-md', m.color)}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-bold text-sm mb-0.5">{m.label}</h3>
                <p className="text-[11px] text-muted-foreground">{m.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className={cn('rounded-xl border-2 p-6 transition-all', activeMeta.borderActive, 'bg-card')}>
        {/* URL Tab */}
        {activeTab === 'url' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="url" className="flex items-center gap-2 text-sm font-medium mb-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" /> Specification URL
              </label>
              <input id="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.com/openapi.json"
                className="w-full px-4 py-3 border-2 rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <p className="text-xs text-muted-foreground">OpenAPI 3.x or Swagger 2.0 specification (JSON or YAML)</p>
          </div>
        )}

        {/* File Tab */}
        {activeTab === 'file' && (
          <div>
            {!selectedFile ? (
              <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-muted rounded-xl p-14 text-center cursor-pointer hover:border-primary hover:bg-muted/30 transition-all">
                <div className="inline-flex rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 p-4 shadow-lg mb-4">
                  <Upload className="h-8 w-8 text-white" />
                </div>
                <p className="text-lg font-bold mb-1">Drop your file here</p>
                <p className="text-sm text-muted-foreground mb-3">or click to browse</p>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">.json .yaml .yml</span>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border-2">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 p-2 shadow-md">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button onClick={clearFile} className="p-2 hover:bg-muted rounded-lg transition-colors"><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".json,.yaml,.yml" onChange={handleFileSelect} className="hidden" />
          </div>
        )}

        {/* Paste Tab */}
        {activeTab === 'paste' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="paste" className="flex items-center gap-2 text-sm font-medium mb-2">
                <ClipboardPaste className="h-3.5 w-3.5 text-muted-foreground" /> Specification Content
              </label>
              <textarea id="paste" value={pastedContent} onChange={(e) => setPastedContent(e.target.value)}
                placeholder='{"openapi": "3.0.0", "info": {...}, "paths": {...}}'
                rows={10}
                className="w-full px-4 py-3 border-2 rounded-lg bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-y" />
            </div>
            <p className="text-xs text-muted-foreground">Paste your OpenAPI 3.x or Swagger 2.0 specification</p>
          </div>
        )}

        {error && <div className="mt-4"><ErrorMessage message={error} /></div>}

        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Supports: <span className="font-medium">OpenAPI 3.0</span>, <span className="font-medium">3.1</span>, <span className="font-medium">Swagger 2.0</span>
          </p>
          <Button variant="primary" onClick={handleImport} disabled={!canImport() || isLoading} loading={isLoading} size="lg"
            icon={<Sparkles className="h-4 w-4" />}>
            {isLoading ? 'Importing...' : 'Import Specification'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SwaggerImport;
