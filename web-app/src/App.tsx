import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import { ToastContainer } from '@/components/common';
import { Dashboard, SwaggerImport, Operations, TestExecution, TestReport, Specs, TestLab, Settings } from '@/pages';
import { useSettingsStore, selectResolvedTheme } from '@/stores';

function App() {
  const theme = useSettingsStore(selectResolvedTheme);

  // Apply theme class to document root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <BrowserRouter>
      {/* Toast Notifications */}
      <ToastContainer position="top-right" />
      
      <Routes>
        {/* All routes wrapped in MainLayout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          
          {/* New unified routes */}
          <Route path="/specs" element={<Specs />} />
          <Route path="/test-lab" element={<TestLab />} />
          <Route path="/settings" element={<Settings />} />
          
          {/* Legacy routes - kept for backward compatibility */}
          <Route path="/import" element={<SwaggerImport />} />
          <Route path="/operations" element={<Operations />} />
          <Route path="/operations/:specId" element={<Operations />} />
          <Route path="/execution" element={<TestExecution />} />
          <Route path="/report/:runId" element={<TestReport />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
