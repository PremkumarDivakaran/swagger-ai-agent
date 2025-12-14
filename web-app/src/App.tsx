import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import { ToastContainer } from '@/components/common';
import { Dashboard, SwaggerImport, Operations, TestExecution, TestReport } from '@/pages';

function App() {
  return (
    <BrowserRouter>
      {/* Toast Notifications */}
      <ToastContainer position="top-right" />
      
      <Routes>
        {/* All routes wrapped in MainLayout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
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
