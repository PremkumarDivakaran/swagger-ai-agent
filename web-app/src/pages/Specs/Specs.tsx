import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Import, FileCode, Search, Upload } from 'lucide-react';
import { SwaggerImport } from '../SwaggerImport/SwaggerImport';
import { Operations } from '../Operations/Operations';
import { useSearchParams } from 'react-router-dom';

/**
 * Unified Specs Page
 * Combines Import + Browse & Explore in a polished tabbed interface
 */
export function Specs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'import';
  const [activeTab, setActiveTab] = useState(initialTab === 'operations' ? 'browse' : initialTab);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-6">
      {/* Page Header with gradient accent */}
      <div className="relative overflow-hidden rounded-xl border bg-card p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/10 dark:from-blue-500/10 dark:to-cyan-500/20" />
        <div className="relative flex items-center gap-4">
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 p-3.5 shadow-lg">
            <FileCode className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">OpenAPI Specifications</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Import, manage, and explore your OpenAPI/Swagger specifications
            </p>
          </div>
        </div>
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[440px] h-12">
          <TabsTrigger value="import" className="space-x-2 text-sm">
            <Upload className="h-4 w-4" />
            <span className="font-semibold">Import Spec</span>
          </TabsTrigger>
          <TabsTrigger value="browse" className="space-x-2 text-sm">
            <Search className="h-4 w-4" />
            <span className="font-semibold">Browse & Explore</span>
          </TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          <SwaggerImport onImportSuccess={() => handleTabChange('browse')} />
        </TabsContent>

        {/* Browse & Explore Tab */}
        <TabsContent value="browse" className="space-y-4">
          <Operations />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Specs;
