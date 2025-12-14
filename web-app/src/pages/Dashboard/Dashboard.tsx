/**
 * Dashboard Page
 * Shows health check status and overview
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Upload,
  FileCode,
  Play,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { PageContainer } from '@/components/layout';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  LoadingSpinner,
  ErrorMessage,
} from '@/components/common';
import { healthService, specService, type HealthStatus } from '@/services';
import { useSpecStore } from '@/stores';
import { formatDuration } from '@/utils';

export function Dashboard() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const specs = useSpecStore((state) => state.specs);
  const setSpecs = useSpecStore((state) => state.setSpecs);

  const checkHealth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const status = await healthService.checkHealth();
      setHealth(status);
      setLastChecked(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check health');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSpecs = async () => {
    try {
      const response = await specService.listSpecs();
      setSpecs(response.specs);
    } catch (err) {
      console.error('Failed to load specs:', err);
    }
  };

  useEffect(() => {
    checkHealth();
    loadSpecs();
  }, []);

  const quickActions = [
    {
      title: 'Import Swagger',
      description: 'Import an OpenAPI specification',
      icon: Upload,
      href: '/import',
      color: 'text-blue-600 bg-blue-100',
    },
    {
      title: 'View Operations',
      description: 'Browse API operations',
      icon: FileCode,
      href: '/operations',
      color: 'text-green-600 bg-green-100',
    },
    {
      title: 'Run Tests',
      description: 'Execute API tests',
      icon: Play,
      href: '/execution',
      color: 'text-purple-600 bg-purple-100',
    },
  ];

  return (
    <PageContainer
      title="Dashboard"
      description="Health check and overview"
      actions={
        <Button
          variant="outline"
          onClick={checkHealth}
          loading={isLoading}
          icon={<RefreshCw className="h-4 w-4" />}
        >
          Refresh
        </Button>
      }
    >
      {/* Health Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>API Health Status</CardTitle>
                <CardDescription>
                  Backend service status and uptime
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner label="Checking health..." />
            </div>
          ) : error ? (
            <ErrorMessage
              title="Health Check Failed"
              message={error}
              onRetry={checkHealth}
            />
          ) : health ? (
            <div className="grid gap-4 md:grid-cols-3">
              {/* Status */}
              <div className="flex items-center gap-3 rounded-lg border p-4">
                {health.status === 'healthy' ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-500" />
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-semibold capitalize">{health.status}</p>
                </div>
              </div>

              {/* Uptime */}
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <Clock className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Uptime</p>
                  <p className="font-semibold">
                    {formatDuration(health.uptime * 1000)}
                  </p>
                </div>
              </div>

              {/* Last Checked */}
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <RefreshCw className="h-8 w-8 text-gray-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Last Checked</p>
                  <p className="font-semibold">
                    {lastChecked?.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} to={action.href}>
              <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`rounded-lg p-3 ${action.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Imported Specs Overview */}
      <h2 className="text-lg font-semibold mb-4">Imported Specifications</h2>
      <Card>
        <CardContent className="pt-6">
          {specs.length === 0 ? (
            <div className="text-center py-8">
              <FileCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No specifications imported yet</p>
              <Link to="/import">
                <Button variant="outline" className="mt-4">
                  Import your first spec
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {specs.slice(0, 5).map((spec) => (
                <Link
                  key={spec.id}
                  to={`/operations/${spec.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div>
                    <p className="font-medium">{spec.title}</p>
                    <p className="text-sm text-muted-foreground">
                      v{spec.version} • {spec.operationCount} operations
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </Link>
              ))}
              {specs.length > 5 && (
                <Link to="/operations" className="block text-center">
                  <Button variant="outline" className="w-full">
                    View all {specs.length} specifications
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default Dashboard;
