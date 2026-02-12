import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Import, List, FileCode } from 'lucide-react';
import { SwaggerImport } from '../SwaggerImport/SwaggerImport';
import { Operations } from '../Operations/Operations';
import { useSearchParams } from 'react-router-dom';

/**
 * Unified Specs Page
 * Combines Import + View Specs + Operations in a single tabbed interface
 * Modern industry standard: Keep related functionality together
 */
export function Specs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'import';
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">OpenAPI Specifications</h1>
        <p className="text-muted-foreground">
          Import, manage, and explore your OpenAPI/Swagger specifications
        </p>
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
          <TabsTrigger value="import" className="space-x-2">
            <Import className="h-4 w-4" />
            <span>Import</span>
          </TabsTrigger>
          <TabsTrigger value="browse" className="space-x-2">
            <List className="h-4 w-4" />
            <span>Browse Specs</span>
          </TabsTrigger>
          <TabsTrigger value="operations" className="space-x-2">
            <FileCode className="h-4 w-4" />
            <span>Operations</span>
          </TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          <SwaggerImport onImportSuccess={() => handleTabChange('browse')} />
        </TabsContent>

        {/* Browse Specs Tab - Shows spec list by calling Operations without specId */}
        <TabsContent value="browse" className="space-y-4">
          <Operations />
        </TabsContent>

        {/* Operations Tab - Also shows Operations (will show spec list or operations based on URL) */}
        <TabsContent value="operations" className="space-y-4">
          <Operations />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Specs;

