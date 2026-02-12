/**
 * Dashboard Page - Modern Approach
 * Shows health status, quick stats, and unified navigation
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  FileCode,
  Sparkles,
  Beaker,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Zap,
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
import { cn } from '@/utils/cn';

export function Dashboard() {
  const navigate = useNavigate();
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

  // Modern workflow cards
  const workflowSteps = [
    {
      step: 1,
      title: 'Import Specs',
      description: 'Import your OpenAPI/Swagger specifications',
      icon: FileCode,
      href: '/specs?tab=import',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10',
      stats: `${specs.length} imported`,
    },
    {
      step: 2,
      title: 'Generate Tests',
      description: 'AI generates REST Assured tests autonomously',
      icon: Sparkles,
      href: '/test-lab',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-gradient-to-br from-purple-500/10 to-pink-500/10',
      stats: 'AI REST Assured',
    },
    {
      step: 3,
      title: 'Execute & Report',
      description: 'Run tests and view detailed reports',
      icon: Beaker,
      href: '/test-lab',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-gradient-to-br from-green-500/10 to-emerald-500/10',
      stats: 'Real-time results',
    },
  ];

  return (
    <PageContainer
      title="Dashboard"
      description="Welcome to Swagger AI Agent - Your automated API testing platform"
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
      <div className="space-y-6">
        {/* Health Status - Modern Gradient Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20" />
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-primary to-primary/80 p-3 shadow-lg">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">System Status</CardTitle>
                  <CardDescription>
                    Backend API health and performance
                  </CardDescription>
                </div>
              </div>
              {lastChecked && (
                <div className="text-right text-sm text-muted-foreground">
                  <div>Last checked</div>
                  <div className="font-medium">{lastChecked.toLocaleTimeString()}</div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner label="Checking system health..." />
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
                <div className="group relative overflow-hidden rounded-xl border bg-card p-6 transition-all hover:shadow-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Status</p>
                      <p className="text-2xl font-bold capitalize flex items-center gap-2">
                        {health.status === 'healthy' ? (
                          <>
                            <CheckCircle className="h-6 w-6 text-green-500" />
                            <span className="text-green-500">Healthy</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-6 w-6 text-red-500" />
                            <span className="text-red-500">Unhealthy</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="absolute bottom-0 right-0 opacity-10">
                    <TrendingUp className="h-20 w-20" />
                  </div>
                </div>

                {/* Uptime */}
                <div className="group relative overflow-hidden rounded-xl border bg-card p-6 transition-all hover:shadow-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Uptime</p>
                      <p className="text-2xl font-bold flex items-center gap-2">
                        <Clock className="h-6 w-6 text-blue-500" />
                        <span>{formatDuration(health.uptime * 1000)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="absolute bottom-0 right-0 opacity-10">
                    <Clock className="h-20 w-20" />
                  </div>
                </div>

                {/* Performance */}
                <div className="group relative overflow-hidden rounded-xl border bg-card p-6 transition-all hover:shadow-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Performance</p>
                      <p className="text-2xl font-bold flex items-center gap-2">
                        <Zap className="h-6 w-6 text-yellow-500" />
                        <span className="text-green-500">Optimal</span>
                      </p>
                    </div>
                  </div>
                  <div className="absolute bottom-0 right-0 opacity-10">
                    <Zap className="h-20 w-20" />
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Modern Workflow Steps */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Get Started</h2>
            <p className="text-muted-foreground">
              Follow these simple steps to test your APIs automatically
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            {workflowSteps.map((step) => {
              const Icon = step.icon;
              return (
                <Card
                  key={step.step}
                  className="group relative overflow-hidden border-2 transition-all hover:border-primary hover:shadow-xl cursor-pointer"
                  onClick={() => navigate(step.href)}
                >
                  <div className={cn("absolute inset-0 opacity-50", step.bgColor)} />
                  
                  <CardContent className="relative pt-6">
                    {/* Step Number */}
                    <div className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                      {step.step}
                    </div>

                    {/* Icon */}
                    <div className={cn(
                      "mb-4 inline-flex rounded-2xl p-4 bg-gradient-to-br shadow-lg",
                      step.color
                    )}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {step.description}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {step.stats}
                      </span>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Specs - Modern Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Recent Specifications</CardTitle>
                <CardDescription>
                  {specs.length === 0 
                    ? 'No specifications imported yet' 
                    : `${specs.length} specification${specs.length !== 1 ? 's' : ''} available`
                  }
                </CardDescription>
              </div>
              {specs.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => navigate('/specs?tab=browse')}
                >
                  View All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {specs.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex rounded-full bg-muted p-6 mb-4">
                  <FileCode className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">No Specifications Yet</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  Import your first OpenAPI/Swagger specification to get started with automated testing
                </p>
                <Button onClick={() => navigate('/specs?tab=import')}>
                  <FileCode className="mr-2 h-4 w-4" />
                  Import Specification
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {specs.slice(0, 5).map((spec) => (
                  <div
                    key={spec.id}
                    onClick={() => navigate(`/specs?tab=operations`)}
                    className="group flex items-center justify-between p-4 rounded-lg border hover:border-primary hover:bg-accent/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <FileCode className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold group-hover:text-primary transition-colors">
                          {spec.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          v{spec.version} • {spec.operationCount} operations
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
                {specs.length > 5 && (
                  <div className="text-center pt-4">
                    <Button
                      variant="ghost"
                      onClick={() => navigate('/specs?tab=browse')}
                    >
                      View all {specs.length} specifications
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

export default Dashboard;
