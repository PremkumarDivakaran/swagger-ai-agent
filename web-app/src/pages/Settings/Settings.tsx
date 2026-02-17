import { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  LoadingSpinner,
} from '@/components/common';
import { PageContainer } from '@/components/layout';
import { useToast } from '@/stores';
import { settingsService, type AppSettings, type UpdateSettingsRequest } from '@/services/settings.service';
import {
  Settings as SettingsIcon,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Cpu,
  Zap,
  Brain,
  Sparkles,
  GitBranch,
  CheckCircle2,
  Key,
  Box,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const LLM_PROVIDERS = [
  {
    value: 'groq',
    label: 'Groq',
    description: 'Fast inference with Llama models',
    icon: Zap,
    color: 'from-orange-500 to-amber-500',
    bgColor: 'bg-gradient-to-br from-orange-500/10 to-amber-500/10',
    borderActive: 'border-orange-500',
    badge: 'Fast',
  },
  {
    value: 'testleaf',
    label: 'TestLeaf',
    description: 'Custom GPT-based API',
    icon: Sparkles,
    color: 'from-violet-500 to-purple-500',
    bgColor: 'bg-gradient-to-br from-violet-500/10 to-purple-500/10',
    borderActive: 'border-violet-500',
    badge: 'Custom',
  },
  {
    value: 'openai',
    label: 'OpenAI',
    description: 'GPT-4o and GPT-4o-mini',
    icon: Brain,
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10',
    borderActive: 'border-emerald-500',
    badge: 'Popular',
  },
] as const;

export function Settings() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // LLM config
  const [provider, setProvider] = useState('groq');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [groqModel, setGroqModel] = useState('llama-3.3-70b-versatile');
  const [testleafApiKey, setTestleafApiKey] = useState('');
  const [testleafModel, setTestleafModel] = useState('gpt-4o-mini');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');

  // GitHub config
  const [githubToken, setGithubToken] = useState('');

  // Visibility toggles
  const [showApiKey, setShowApiKey] = useState(false);
  const [showGithubToken, setShowGithubToken] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settings: AppSettings = await settingsService.getSettings();
      setProvider(settings.llm.provider || 'groq');
      setGroqApiKey(settings.llm.groqApiKey || '');
      setGroqModel(settings.llm.groqModel || 'llama-3.3-70b-versatile');
      setTestleafApiKey(settings.llm.testleafApiKey || '');
      setTestleafModel(settings.llm.testleafModel || 'gpt-4o-mini');
      setOpenaiApiKey(settings.llm.openaiApiKey || '');
      setOpenaiModel(settings.llm.openaiModel || 'gpt-4o-mini');
      setGithubToken(settings.github.githubToken || '');
    } catch (error: any) {
      toast.error(error.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const request: UpdateSettingsRequest = {
        llm: { provider },
        github: {},
      };

      if (provider === 'groq') {
        if (groqApiKey && !groqApiKey.includes('...')) request.llm!.groqApiKey = groqApiKey;
        request.llm!.groqModel = groqModel;
      } else if (provider === 'testleaf') {
        if (testleafApiKey && !testleafApiKey.includes('...')) request.llm!.testleafApiKey = testleafApiKey;
        request.llm!.testleafModel = testleafModel;
      } else if (provider === 'openai') {
        if (openaiApiKey && !openaiApiKey.includes('...')) request.llm!.openaiApiKey = openaiApiKey;
        request.llm!.openaiModel = openaiModel;
      }

      if (githubToken && !githubToken.includes('...')) {
        request.github!.githubToken = githubToken;
      }

      await settingsService.updateSettings(request);
      toast.success('Settings saved successfully');
      loadSettings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const selectedProviderMeta = LLM_PROVIDERS.find((p) => p.value === provider) || LLM_PROVIDERS[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner label="Loading settings..." />
      </div>
    );
  }

  return (
    <PageContainer
      title="Settings"
      description="Configure LLM provider and GitHub integration"
      actions={
        <Button
          onClick={handleSave}
          disabled={saving}
          loading={saving}
          icon={<Save className="h-4 w-4" />}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      }
    >
      <div className="space-y-6">
        {/* LLM Configuration */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-primary to-primary/80 p-3 shadow-lg">
                <Cpu className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">LLM Provider</CardTitle>
                <CardDescription>
                  Choose which AI model powers test generation and self-healing
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            {/* Provider selection cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {LLM_PROVIDERS.map((p) => {
                const Icon = p.icon;
                const isSelected = provider === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => {
                      setProvider(p.value);
                      setShowApiKey(false);
                    }}
                    className={cn(
                      'group relative overflow-hidden rounded-xl border-2 p-5 text-left transition-all duration-200',
                      isSelected
                        ? `${p.borderActive} shadow-lg scale-[1.02]`
                        : 'border-border hover:border-muted-foreground/40 hover:shadow-md'
                    )}
                  >
                    <div className={cn('absolute inset-0 opacity-50 transition-opacity', p.bgColor, !isSelected && 'opacity-0 group-hover:opacity-30')} />

                    {/* Selected checkmark */}
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </div>
                    )}

                    <div className="relative">
                      {/* Icon */}
                      <div className={cn(
                        'mb-3 inline-flex rounded-lg p-2.5 bg-gradient-to-br shadow-md',
                        p.color
                      )}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>

                      {/* Label + description */}
                      <h3 className="font-bold text-base mb-1">{p.label}</h3>
                      <p className="text-xs text-muted-foreground">{p.description}</p>

                      {/* Badge */}
                      <span className={cn(
                        'mt-3 inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        isSelected
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {isSelected ? 'Active' : p.badge}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Provider config section */}
            <div className={cn(
              'rounded-xl border-2 p-6 transition-all',
              selectedProviderMeta.borderActive,
              selectedProviderMeta.bgColor,
              'bg-opacity-30'
            )}>
              <div className="flex items-center gap-2 mb-5">
                <selectedProviderMeta.icon className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-sm">
                  {selectedProviderMeta.label} Configuration
                </h3>
              </div>

              <div className="space-y-5 max-w-lg">
                {/* API Key field */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Key className="h-3.5 w-3.5 text-muted-foreground" />
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={
                        provider === 'groq' ? groqApiKey :
                        provider === 'testleaf' ? testleafApiKey :
                        openaiApiKey
                      }
                      onChange={(e) => {
                        if (provider === 'groq') setGroqApiKey(e.target.value);
                        else if (provider === 'testleaf') setTestleafApiKey(e.target.value);
                        else setOpenaiApiKey(e.target.value);
                      }}
                      placeholder={
                        provider === 'groq' ? 'gsk_...' :
                        provider === 'testleaf' ? 'Enter TestLeaf API key' :
                        'sk-...'
                      }
                      className="w-full px-4 py-2.5 border-2 rounded-lg bg-background pr-12 text-sm font-mono"
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-md transition-colors"
                      title={showApiKey ? 'Hide key' : 'Show key'}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>

                {/* Model field */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Box className="h-3.5 w-3.5 text-muted-foreground" />
                    Model
                  </label>
                  <input
                    type="text"
                    value={
                      provider === 'groq' ? groqModel :
                      provider === 'testleaf' ? testleafModel :
                      openaiModel
                    }
                    onChange={(e) => {
                      if (provider === 'groq') setGroqModel(e.target.value);
                      else if (provider === 'testleaf') setTestleafModel(e.target.value);
                      else setOpenaiModel(e.target.value);
                    }}
                    className="w-full px-4 py-2.5 border-2 rounded-lg bg-background text-sm"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GitHub Configuration */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 to-gray-500/10 dark:from-gray-400/5 dark:to-gray-400/10" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 dark:from-gray-500 dark:to-gray-700 p-3 shadow-lg">
                <GitBranch className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">GitHub Integration</CardTitle>
                <CardDescription>
                  Required for pushing generated tests and creating pull requests
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="max-w-lg space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Key className="h-3.5 w-3.5 text-muted-foreground" />
                Personal Access Token
              </label>
              <div className="relative">
                <input
                  type={showGithubToken ? 'text' : 'password'}
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full px-4 py-2.5 border-2 rounded-lg bg-background pr-12 text-sm font-mono"
                />
                <button
                  onClick={() => setShowGithubToken(!showGithubToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-md transition-colors"
                  title={showGithubToken ? 'Hide token' : 'Show token'}
                >
                  {showGithubToken ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Needs <code className="px-1.5 py-0.5 rounded bg-muted text-[11px]">repo</code> scope.
                Create at GitHub &rarr; Settings &rarr; Developer settings &rarr; Personal access tokens.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

export default Settings;
