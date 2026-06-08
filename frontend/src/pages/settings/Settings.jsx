import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

export function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  // Local settings states
  const [globalThreshold, setGlobalThreshold] = useState(() => localStorage.getItem('threshold') || '200');
  const [emailAlerts, setEmailAlerts] = useState(() => localStorage.getItem('emailAlerts') !== 'false');
  
  // Reset confirmation modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'thresholds', label: 'Feed Thresholds' },
    { id: 'preferences', label: 'System Preferences' },
  ];

  const handleSaveProfile = (e) => {
    e.preventDefault();
    toast.success("Profile saved successfully!");
  };

  const handleSaveThresholds = (e) => {
    e.preventDefault();
    localStorage.setItem('threshold', globalThreshold);
    localStorage.setItem('emailAlerts', String(emailAlerts));
    toast.success("Threshold settings saved successfully!");
  };

  const handleSavePreferences = (e) => {
    e.preventDefault();
    toast.success("Preferences saved successfully!");
  };

  const handleResetSettings = () => {
    setIsResetModalOpen(true);
  };

  const confirmResetSettings = () => {
    localStorage.removeItem('threshold');
    localStorage.removeItem('emailAlerts');
    setGlobalThreshold('200');
    setEmailAlerts(true);
    setTheme('system');
    setIsResetModalOpen(false);
    toast.success("Settings reset to defaults!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your account profiles, feed thresholds, and UI preferences.
          </p>
        </div>
        <Button variant="danger" onClick={handleResetSettings}>
          Reset Settings
        </Button>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-3 text-sm font-medium transition-colors border-b-2",
              activeTab === tab.id 
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400" 
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        {activeTab === 'profile' && (
          <>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4 max-w-md" onSubmit={handleSaveProfile}>
                <Input label="Username" value={user?.username || 'admin'} disabled />
                <Input label="Email Address" type="email" value={user?.email || 'admin@aquafeed.com'} disabled />
                <Input label="New Password" type="password" placeholder="••••••••" />
                <Button type="submit" className="mt-4">Save Profile</Button>
              </form>
            </CardContent>
          </>
        )}

        {activeTab === 'thresholds' && (
          <>
            <CardHeader>
              <CardTitle>Low Stock Alert Thresholds</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4 max-w-md" onSubmit={handleSaveThresholds}>
                <Input 
                  label="Global Minimum Threshold (kg)" 
                  type="number" 
                  value={globalThreshold} 
                  onChange={(e) => setGlobalThreshold(e.target.value)}
                />
                <div className="pt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Send Email Alerts</span>
                  <input 
                    type="checkbox" 
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600" 
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                  />
                </div>
                <Button type="submit" className="mt-4">Save Thresholds</Button>
              </form>
            </CardContent>
          </>
        )}

        {activeTab === 'preferences' && (
          <>
            <CardHeader>
              <CardTitle>System Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4 max-w-md" onSubmit={handleSavePreferences}>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Theme</label>
                  <select 
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date Format</label>
                  <select className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" disabled>
                    <option value="DD/MM/YYYY HH:mm:ss">DD/MM/YYYY HH:mm:ss (Standardized)</option>
                  </select>
                </div>
                <Button type="submit" className="mt-4">Save Preferences</Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>

      <ConfirmationModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={confirmResetSettings}
        title="Reset Settings"
        message="Are you sure you want to reset all threshold alerts and system theme preferences to defaults?"
      />
    </div>
  );
}
