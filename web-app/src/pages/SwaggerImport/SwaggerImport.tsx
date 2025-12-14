/**
 * SwaggerImport Page
 * Clean, professional UI for importing OpenAPI/Swagger specs
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
} from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { Button, ErrorMessage } from '@/components/common';
import { specService } from '@/services';
import { useSpecStore, useToast } from '@/stores';
import { cn } from '@/utils';
import type { ImportSpecResponse, SpecSource } from '@/types';

type ImportMethod = 'url' | 'file' | 'paste';

export function SwaggerImport() {
  const navigate = useNavigate();
  const toast = useToast();
  const addSpec = useSpecStore((state) => state.addSpec);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<ImportMethod>('url');
  const [url, setUrl] = useState('');
  const [pastedContent, setPastedContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportSpecResponse | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setFileContent(content);
      };
      reader.onerror = () => {
        setError('Failed to read file');
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.json') || file.name.endsWith('.yaml') || file.name.endsWith('.yml'))) {
      setSelectedFile(file);
      setError(null);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setFileContent(content);
      };
      reader.readAsText(file);
    } else {
      setError('Please drop a valid JSON or YAML file');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFileContent('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateContent = (content: string): boolean => {
    try {
      JSON.parse(content);
      return true;
    } catch {
      // Could be YAML, let the backend handle it
      if (content.includes('openapi:') || content.includes('swagger:')) {
        return true;
      }
      return false;
    }
  };

  const handleImport = async () => {
    setIsLoading(true);
    setError(null);
    setImportResult(null);

    try {
      let source: SpecSource;

      if (activeTab === 'url') {
        if (!url.trim()) {
          throw new Error('Please enter a valid URL');
        }
        source = { type: 'url', url: url.trim() };
      } else if (activeTab === 'file') {
        if (!fileContent) {
          throw new Error('Please select a file');
        }
        if (!validateContent(fileContent)) {
          throw new Error('Invalid specification format. Expected JSON or YAML.');
        }
        source = { type: 'inline', content: fileContent, filename: selectedFile?.name };
      } else {
        if (!pastedContent.trim()) {
          throw new Error('Please paste the specification content');
        }
        if (!validateContent(pastedContent)) {
          throw new Error('Invalid specification format. Expected JSON or YAML.');
        }
        source = { type: 'inline', content: pastedContent };
      }

      const result = await specService.importSpec({
        source,
        generateMissingOperationIds: true,
        includeDeprecated: true,
      });

      setImportResult(result);
      addSpec({
        id: result.specId,
        title: result.title,
        version: result.version,
        operationCount: result.operationCount,
        importedAt: new Date().toISOString(),
      });

      toast.success('Import Successful', `Imported ${result.operationCount} operations from ${result.title}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setError(message);
      toast.error('Import Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const canImport = () => {
    if (activeTab === 'url') return url.trim().length > 0;
    if (activeTab === 'file') return fileContent.length > 0;
    return pastedContent.trim().length > 0;
  };

  // Success state - show simple card with next actions
  if (importResult) {
    return (
      <PageContainer title="Import Specification" description="Import your OpenAPI/Swagger specification">
        <div className="max-w-2xl mx-auto">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-green-800 dark:text-green-200 mb-2">
              Import Successful!
            </h2>
            <p className="text-green-700 dark:text-green-300 mb-6">
              <span className="font-medium">{importResult.title}</span> v{importResult.version}
              <br />
              <span className="text-sm">{importResult.operationCount} operations imported</span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="primary"
                onClick={() => navigate(`/operations/${importResult.specId}`)}
                icon={<ArrowRight className="h-4 w-4" />}
              >
                View Operations
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setImportResult(null);
                  setUrl('');
                  setPastedContent('');
                  clearFile();
                }}
              >
                Import Another
              </Button>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Import Specification" description="Import your OpenAPI/Swagger specification">
      <div className="max-w-3xl mx-auto">
        {/* Tab Selection */}
        <div className="flex border-b border-border mb-6">
          <button
            onClick={() => setActiveTab('url')}
            className={cn(
              'flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'url'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
            )}
          >
            <LinkIcon className="h-4 w-4" />
            URL
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={cn(
              'flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'file'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
            )}
          >
            <Upload className="h-4 w-4" />
            File
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={cn(
              'flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'paste'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
            )}
          >
            <FileJson className="h-4 w-4" />
            Paste
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-card border border-border rounded-lg p-6">
          {/* URL Tab */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="url" className="block text-sm font-medium mb-2">
                  Specification URL
                </label>
                <input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.example.com/openapi.json"
                  className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Enter the URL to your OpenAPI 3.x or Swagger 2.0 specification (JSON or YAML)
              </p>
            </div>
          )}

          {/* File Tab */}
          {activeTab === 'file' && (
            <div>
              {!selectedFile ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-muted rounded-lg p-12 text-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors"
                >
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-1">Drop your file here</p>
                  <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                  <p className="text-xs text-muted-foreground">Supports .json, .yaml, .yml files</p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={clearFile}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.yaml,.yml"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Paste Tab */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="paste" className="block text-sm font-medium mb-2">
                  Specification Content
                </label>
                <textarea
                  id="paste"
                  value={pastedContent}
                  onChange={(e) => setPastedContent(e.target.value)}
                  placeholder='{"openapi": "3.0.0", "info": {...}, "paths": {...}}'
                  rows={12}
                  className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm resize-y"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Paste your OpenAPI 3.x or Swagger 2.0 specification (JSON or YAML format)
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4">
              <ErrorMessage message={error} />
            </div>
          )}

          {/* Import Button */}
          <div className="mt-6 flex justify-end">
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={!canImport() || isLoading}
              loading={isLoading}
              size="lg"
            >
              {isLoading ? 'Importing...' : 'Import Specification'}
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Supported formats: <span className="font-medium">OpenAPI 3.0</span>, <span className="font-medium">OpenAPI 3.1</span>, <span className="font-medium">Swagger 2.0</span>
          </p>
        </div>
      </div>
    </PageContainer>
  );
}

export default SwaggerImport;
