import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { Dashboard } from './pages/dashboard/Dashboard';
import { AddStock } from './pages/stock/AddStock';
import { FeedEntry } from './pages/feed/FeedEntry';
import { Logs } from './pages/logs/Logs';
import { Settings } from './pages/settings/Settings';
import { InventoryHistory } from './pages/inventory/InventoryHistory';
import { TankManagement } from './pages/tanks/TankManagement';
import { FeedTypeManagement } from './pages/feeds/FeedTypeManagement';
import { Reports } from './pages/reports/Reports';
import { AuditTrail } from './pages/audit/AuditTrail';

import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RoleGuard } from './components/auth/RoleGuard';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Protected Application Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                {/* Pages accessible to both viewer and admin */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="/history" element={<InventoryHistory />} />

                {/* Admin-only pages */}
                <Route element={<RoleGuard allowedRoles={['admin']} />}>
                  <Route path="/add-stock" element={<AddStock />} />
                  <Route path="/feed-entry" element={<FeedEntry />} />
                  <Route path="/tanks" element={<TankManagement />} />
                  <Route path="/feed-types" element={<FeedTypeManagement />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/audit" element={<AuditTrail />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
