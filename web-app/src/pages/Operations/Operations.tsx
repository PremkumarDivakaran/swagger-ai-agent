/**
 * Operations Page
 * View and explore API operations (read-only, visually polished)
 * Test generation/execution is done via the Test Lab (agentic)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileCode,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Tag,
  Trash2,
  ArrowRight,
  Layers,
  Code2,
  Info,
} from 'lucide-react';
import { PageContainer } from '@/components/layout';
import {
  Card,
  CardContent,
  Button,
  LoadingSpinner,
  ErrorMessage,
  EmptyState,
  StatusBadge,
} from '@/components/common';
import { specService } from '@/services';
import { useSpecStore, useToast } from '@/stores';
import { cn, getMethodColor, formatMethod } from '@/utils';

export interface OperationsProps {
  showOnlySpecList?: boolean;
}

export function Operations({ showOnlySpecList = false }: OperationsProps = {}) {
  const { specId } = useParams<{ specId?: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const specs = useSpecStore((s) => s.specs);
  const setSpecs = useSpecStore((s) => s.setSpecs);
  const removeSpec = useSpecStore((s) => s.removeSpec);
  const operations = useSpecStore((s) => s.operations);
  const setOperations = useSpecStore((s) => s.setOperations);
  const selectedSpec = useSpecStore((s) => s.selectedSpec);
  const setSelectedSpec = useSpecStore((s) => s.setSelectedSpec);

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { if (specs.length === 0) { (async () => { try { const r = await specService.listSpecs(); setSpecs(r.specs); } catch {} })(); } }, []);

  useEffect(() => {
    if (specId) {
      (async () => {
        setIsLoading(true); setError(null);
        try {
          const m = await specService.getSpec(specId); setSelectedSpec(m);
          const r = await specService.listOperations(specId); setOperations(r.operations);
        } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); setOperations([]); } finally { setIsLoading(false); }
      })();
    }
  }, [specId]);

  const handleSpecSelect = (id: string) => navigate(`/operations/${id}`);

  const handleDeleteSpec = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this specification? This cannot be undone.')) return;
    setIsDeleting(id);
    try { await specService.deleteSpec(id); removeSpec(id); toast.success('Spec Deleted'); } catch (e) { toast.error('Delete Failed', e instanceof Error ? e.message : 'Error'); } finally { setIsDeleting(null); }
  };

  const handleRefresh = () => {
    if (!specId) return;
    (async () => { setIsLoading(true); try { const r = await specService.listOperations(specId); setOperations(r.operations); } catch (e) { setError(e instanceof Error ? e.message : 'Refresh failed'); } finally { setIsLoading(false); } })();
  };

  const toggleExpand = (id: string) => setExpandedOperations((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const filteredOps = operations.filter((op) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || op.operationId.toLowerCase().includes(q) || op.path.toLowerCase().includes(q) || op.summary?.toLowerCase().includes(q);
    const matchTags = selectedTags.length === 0 || op.tags.some((t) => selectedTags.includes(t));
    const matchMethods = selectedMethods.length === 0 || selectedMethods.includes(op.method.toLowerCase());
    return matchSearch && matchTags && matchMethods;
  });

  const allTags = [...new Set(operations.flatMap((op) => op.tags))];
  const allMethods = [...new Set(operations.map((op) => op.method.toLowerCase()))];

  // Spec selection view
  if (!specId) {
    return (
      <PageContainer title="API Operations" description="Select a specification to explore">
        <Card>
          <CardContent className="pt-6">
            {specs.length === 0 ? (
              <EmptyState icon={FileCode} title="No Specifications" description="Import a spec first"
                action={<Button onClick={() => navigate('/specs?tab=import')}>Import Specification</Button>} />
            ) : (
              <div className="space-y-3">
                {specs.map((spec) => (
                  <div key={spec.id}
                    className="group flex items-center justify-between p-4 rounded-xl border-2 hover:border-primary hover:shadow-md transition-all cursor-pointer"
                    onClick={() => handleSpecSelect(spec.id)}>
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 p-2.5 shadow-md">
                        <FileCode className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold group-hover:text-primary transition-colors">{spec.title}</p>
                        <p className="text-sm text-muted-foreground">v{spec.version} &middot; {spec.operationCount} operations</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => handleDeleteSpec(spec.id, e)} disabled={isDeleting === spec.id}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-50" title="Delete">
                        {isDeleting === spec.id ? <LoadingSpinner size="sm" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={selectedSpec?.title || 'Operations'}
      description={selectedSpec ? `v${selectedSpec.version} \u00b7 ${operations.length} operations` : 'Loading...'}
      actions={<Button variant="outline" onClick={handleRefresh} loading={isLoading} icon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>}
    >
      {error ? <ErrorMessage title="Failed to Load" message={error} onRetry={handleRefresh} /> : isLoading ? (
        <div className="flex items-center justify-center py-12"><LoadingSpinner label="Loading operations..." /></div>
      ) : (
        <>
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="text" placeholder="Search operations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)} icon={<Filter className="h-4 w-4" />}>Filters</Button>
            </div>

            {showFilters && (
              <div className="rounded-xl border-2 p-5 bg-muted/30">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map((tag) => (
                        <button key={tag} onClick={() => setSelectedTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag])}
                          className={cn('px-2.5 py-1 rounded-full text-xs font-semibold transition-all',
                            selectedTags.includes(tag) ? 'bg-primary text-primary-foreground shadow-md' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80')}>
                          <Tag className="h-3 w-3 inline mr-1" />{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Methods</label>
                    <div className="flex flex-wrap gap-2">
                      {allMethods.map((method) => (
                        <button key={method} onClick={() => setSelectedMethods((p) => p.includes(method) ? p.filter((m) => m !== method) : [...p, method])}
                          className={cn('px-2.5 py-1 rounded text-xs font-bold transition-all',
                            selectedMethods.includes(method) ? 'bg-primary text-primary-foreground shadow-md' : getMethodColor(method))}>
                          {formatMethod(method)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-bold text-foreground">{filteredOps.length}</span> of <span className="font-bold text-foreground">{operations.length}</span> operations
              </p>
            </div>
          </div>

          {/* Operations List */}
          <div className="space-y-2">
            {filteredOps.map((op) => {
              const isExpanded = expandedOperations.has(op.operationId);
              return (
                <div key={op.operationId} className="rounded-xl border-2 hover:shadow-md transition-all bg-card">
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleExpand(op.operationId)} className="p-1 hover:bg-accent rounded-md transition-colors">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>

                      <span className={cn('px-2.5 py-0.5 rounded text-xs font-bold min-w-[60px] text-center', getMethodColor(op.method))}>
                        {formatMethod(op.method)}
                      </span>

                      <code className="text-sm font-mono flex-1 truncate font-medium">{op.path}</code>

                      <div className="flex gap-1.5">
                        {op.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-secondary-foreground">{tag}</span>
                        ))}
                        {op.tags.length > 2 && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-secondary-foreground">+{op.tags.length - 2}</span>}
                      </div>

                      {op.deprecated && <StatusBadge status="cancelled" size="sm" />}
                    </div>

                    {op.summary && <p className="mt-2 ml-10 text-sm text-muted-foreground">{op.summary}</p>}

                    {isExpanded && (
                      <div className="mt-4 ml-10 p-5 rounded-xl bg-muted/50 border space-y-4">
                        <div className="flex items-center gap-2">
                          <Code2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Operation ID</span>
                        </div>
                        <code className="text-sm font-mono bg-background px-3 py-1.5 rounded-lg border inline-block">{op.operationId}</code>

                        {op.description && (
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Info className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description</span>
                            </div>
                            <p className="text-sm">{op.description}</p>
                          </div>
                        )}

                        {op.parameters && op.parameters.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Layers className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Parameters</span>
                            </div>
                            <div className="space-y-1.5">
                              {op.parameters.map((param, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-background border">
                                  <code className="font-bold">{param.name}</code>
                                  <span className="text-muted-foreground text-xs">({param.in})</span>
                                  {param.required && <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">required</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredOps.length === 0 && <EmptyState icon={FileCode} title="No Operations Found" description="Adjust your search or filter criteria" />}
        </>
      )}
    </PageContainer>
  );
}

export default Operations;
