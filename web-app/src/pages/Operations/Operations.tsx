/**
 * Operations Page
 * View and select API operations
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileCode,
  Search,
  Filter,
  Play,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Tag,
  Trash2,
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
  /**
   * If true, only shows the spec list without operations details
   */
  showOnlySpecList?: boolean;
}

export function Operations({ showOnlySpecList = false }: OperationsProps = {}) {
  const { specId } = useParams<{ specId?: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  
  const specs = useSpecStore((state) => state.specs);
  const setSpecs = useSpecStore((state) => state.setSpecs);
  const removeSpec = useSpecStore((state) => state.removeSpec);
  const operations = useSpecStore((state) => state.operations);
  const setOperations = useSpecStore((state) => state.setOperations);
  const selectedSpec = useSpecStore((state) => state.selectedSpec);
  const setSelectedSpec = useSpecStore((state) => state.setSelectedSpec);
  const storedSelectedOperationIds = useSpecStore((state) => state.selectedOperationIds);
  const setStoredSelectedOperationIds = useSpecStore((state) => state.setSelectedOperationIds);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(new Set());
  // Local state for UI, synced to store on navigation
  const [selectedOperationIds, setSelectedOperationIds] = useState<Set<string>>(
    new Set(storedSelectedOperationIds)
  );
  const [showFilters, setShowFilters] = useState(false);

  // Load specs list
  useEffect(() => {
    const loadSpecs = async () => {
      try {
        const response = await specService.listSpecs();
        setSpecs(response.specs);
      } catch (err) {
        console.error('Failed to load specs:', err);
      }
    };
    
    if (specs.length === 0) {
      loadSpecs();
    }
  }, []);

  // Load operations when specId changes
  useEffect(() => {
    const loadOperations = async (id: string) => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Load spec metadata
        const specMeta = await specService.getSpec(id);
        setSelectedSpec(specMeta);
        
        // Load operations
        const response = await specService.listOperations(id);
        setOperations(response.operations);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load operations');
        setOperations([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (specId) {
      loadOperations(specId);
    }
  }, [specId]);

  const handleSpecSelect = (id: string) => {
    navigate(`/operations/${id}`);
  };

  const handleDeleteSpec = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the spec select
    
    if (!confirm('Are you sure you want to delete this specification? This action cannot be undone.')) {
      return;
    }
    
    setIsDeleting(id);
    try {
      await specService.deleteSpec(id);
      removeSpec(id);
      toast.success('Spec Deleted', 'The specification has been deleted successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete spec';
      toast.error('Delete Failed', message);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleRefresh = () => {
    if (specId) {
      const loadOperations = async () => {
        setIsLoading(true);
        try {
          const response = await specService.listOperations(specId);
          setOperations(response.operations);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to refresh');
        } finally {
          setIsLoading(false);
        }
      };
      loadOperations();
    }
  };

  const toggleOperationExpand = (operationId: string) => {
    setExpandedOperations((prev) => {
      const next = new Set(prev);
      if (next.has(operationId)) {
        next.delete(operationId);
      } else {
        next.add(operationId);
      }
      return next;
    });
  };

  const toggleOperationSelect = (operationId: string) => {
    setSelectedOperationIds((prev) => {
      const next = new Set(prev);
      if (next.has(operationId)) {
        next.delete(operationId);
      } else {
        next.add(operationId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedOperationIds(new Set(filteredOperations.map((op) => op.operationId)));
  };

  const deselectAll = () => {
    setSelectedOperationIds(new Set());
  };

  const handleRunTests = () => {
    // Sync to store before navigating
    setStoredSelectedOperationIds(Array.from(selectedOperationIds));
    
    navigate('/execution', { 
      state: { 
        specId, 
      } 
    });
  };

  // Filter operations
  const filteredOperations = operations.filter((op) => {
    const matchesSearch =
      !searchQuery ||
      op.operationId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      op.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      op.summary?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTags =
      selectedTags.length === 0 ||
      op.tags.some((tag) => selectedTags.includes(tag));

    const matchesMethods =
      selectedMethods.length === 0 ||
      selectedMethods.includes(op.method.toLowerCase());

    return matchesSearch && matchesTags && matchesMethods;
  });

  // Get unique tags and methods
  const allTags = [...new Set(operations.flatMap((op) => op.tags))];
  const allMethods = [...new Set(operations.map((op) => op.method.toLowerCase()))];

  // If no specId, show spec selection
  if (!specId) {
    return (
      <PageContainer
        title="API Operations"
        description="Select a specification to view its operations"
      >
        <Card>
          <CardContent className="pt-6">
            {specs.length === 0 ? (
              <EmptyState
                icon={FileCode}
                title="No Specifications"
                description="Import a Swagger/OpenAPI specification first"
                action={
                  <Button onClick={() => navigate('/import')}>
                    Import Specification
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {specs.map((spec) => (
                  <div
                    key={spec.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <button
                      onClick={() => handleSpecSelect(spec.id)}
                      className="flex-1 text-left"
                    >
                      <p className="font-medium">{spec.title}</p>
                      <p className="text-sm text-muted-foreground">
                        v{spec.version} • {spec.operationCount} operations
                      </p>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDeleteSpec(spec.id, e)}
                        disabled={isDeleting === spec.id}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-50"
                        title="Delete specification"
                      >
                        {isDeleting === spec.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
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
      description={
        selectedSpec
          ? `v${selectedSpec.version} • ${operations.length} operations`
          : 'Loading...'
      }
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            loading={isLoading}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
          <Button
            onClick={handleRunTests}
            icon={<Play className="h-4 w-4" />}
            disabled={isLoading}
          >
            Run Tests{selectedOperationIds.size > 0 && ` (${selectedOperationIds.size})`}
          </Button>
        </div>
      }
    >
      {error ? (
        <ErrorMessage
          title="Failed to Load Operations"
          message={error}
          onRetry={handleRefresh}
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner label="Loading operations..." />
        </div>
      ) : (
        <>
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search operations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background text-sm"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                icon={<Filter className="h-4 w-4" />}
              >
                Filters
              </Button>
            </div>

            {showFilters && (
              <Card>
                <CardContent className="pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Tags Filter */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Tags</label>
                      <div className="flex flex-wrap gap-2">
                        {allTags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => {
                              setSelectedTags((prev) =>
                                prev.includes(tag)
                                  ? prev.filter((t) => t !== tag)
                                  : [...prev, tag]
                              );
                            }}
                            className={cn(
                              'px-2 py-1 rounded-full text-xs font-medium transition-colors',
                              selectedTags.includes(tag)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                            )}
                          >
                            <Tag className="h-3 w-3 inline mr-1" />
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Methods Filter */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Methods</label>
                      <div className="flex flex-wrap gap-2">
                        {allMethods.map((method) => (
                          <button
                            key={method}
                            onClick={() => {
                              setSelectedMethods((prev) =>
                                prev.includes(method)
                                  ? prev.filter((m) => m !== method)
                                  : [...prev, method]
                              );
                            }}
                            className={cn(
                              'px-2 py-1 rounded text-xs font-medium transition-colors',
                              selectedMethods.includes(method)
                                ? 'bg-primary text-primary-foreground'
                                : getMethodColor(method)
                            )}
                          >
                            {formatMethod(method)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Selection Controls */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {filteredOperations.length} of {operations.length} operations
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  Deselect All
                </Button>
              </div>
            </div>
          </div>

          {/* Operations List */}
          <div className="space-y-2">
            {filteredOperations.map((operation) => (
              <Card
                key={operation.operationId}
                className={cn(
                  'transition-colors',
                  selectedOperationIds.has(operation.operationId) && 'border-primary'
                )}
              >
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedOperationIds.has(operation.operationId)}
                      onChange={() => toggleOperationSelect(operation.operationId)}
                      className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                    />

                    {/* Expand/Collapse */}
                    <button
                      onClick={() => toggleOperationExpand(operation.operationId)}
                      className="p-1 hover:bg-accent rounded"
                    >
                      {expandedOperations.has(operation.operationId) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    {/* Method Badge */}
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-bold',
                        getMethodColor(operation.method)
                      )}
                    >
                      {formatMethod(operation.method)}
                    </span>

                    {/* Path */}
                    <code className="text-sm font-mono flex-1 truncate">
                      {operation.path}
                    </code>

                    {/* Tags */}
                    <div className="flex gap-1">
                      {operation.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                      {operation.tags.length > 2 && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">
                          +{operation.tags.length - 2}
                        </span>
                      )}
                    </div>

                    {/* Deprecated Badge */}
                    {operation.deprecated && (
                      <StatusBadge status="cancelled" size="sm" />
                    )}
                  </div>

                  {/* Summary */}
                  {operation.summary && (
                    <p className="mt-2 ml-16 text-sm text-muted-foreground">
                      {operation.summary}
                    </p>
                  )}

                  {/* Expanded Details */}
                  {expandedOperations.has(operation.operationId) && (
                    <div className="mt-4 ml-16 p-4 rounded-lg bg-muted">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            Operation ID
                          </p>
                          <code className="text-sm">{operation.operationId}</code>
                        </div>

                        {operation.description && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">
                              Description
                            </p>
                            <p className="text-sm">{operation.description}</p>
                          </div>
                        )}

                        {operation.parameters && operation.parameters.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Parameters
                            </p>
                            <div className="space-y-1">
                              {operation.parameters.map((param, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <code className="font-medium">{param.name}</code>
                                  <span className="text-muted-foreground">
                                    ({param.in})
                                  </span>
                                  {param.required && (
                                    <span className="text-red-500 dark:text-red-400 text-xs">
                                      required
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {filteredOperations.length === 0 && (
            <EmptyState
              icon={FileCode}
              title="No Operations Found"
              description="Try adjusting your search or filter criteria"
            />
          )}
        </>
      )}
    </PageContainer>
  );
}

export default Operations;
