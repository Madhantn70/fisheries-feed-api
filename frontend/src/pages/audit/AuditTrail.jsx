import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { auditService } from '../../services/api';
import { formatDateTime } from '../../lib/utils';
import { ShieldCheck, Download, Search, X, ClipboardX, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const MODULE_COLORS = {
  Auth:         'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  Stock:        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'Feed Entry': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  Tanks:        'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  'Feed Types': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  Settings:     'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

const ACTION_COLORS = {
  'User Login':        'text-emerald-600 dark:text-emerald-400',
  'User Logout':       'text-gray-500 dark:text-gray-400',
  'Add Stock':         'text-blue-600 dark:text-blue-400',
  'Feed Entry':        'text-indigo-600 dark:text-indigo-400',
  'Tank Created':      'text-cyan-600 dark:text-cyan-400',
  'Tank Updated':      'text-amber-600 dark:text-amber-400',
  'Tank Deleted':      'text-red-600 dark:text-red-400',
  'Feed Type Created': 'text-teal-600 dark:text-teal-400',
  'Feed Type Updated': 'text-amber-600 dark:text-amber-400',
  'Feed Type Deleted': 'text-red-600 dark:text-red-400',
  'Delete Feed Log':   'text-red-600 dark:text-red-400',
  'Settings Updated':  'text-amber-600 dark:text-amber-400',
};

function ModuleBadge({ module }) {
  const cls = MODULE_COLORS[module] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {module}
    </span>
  );
}

export function AuditTrail() {
  const [logs, setLogs]         = useState([]);
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch]       = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [username, setUsername]   = useState('');

  // Load user dropdown once
  useEffect(() => {
    auditService.getUsers().then(d => setUsers(d || [])).catch(() => {});
  }, []);

  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const params = {};
      if (search)   params.search    = search;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo)   params.date_to   = dateTo;
      if (username) params.username  = username;
      const data = await auditService.getLogs(params);
      setLogs(data || []);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, dateFrom, dateTo, username]);

  // Initial load (no filters)
  useEffect(() => {
    auditService.getLogs({}).then(d => setLogs(d || [])).catch(() => {}).finally(() => setLoading(false));
    auditService.getUsers().then(d => setUsers(d || [])).catch(() => {});
  }, []);

  const handleApply = (e) => {
    e?.preventDefault();
    fetchLogs();
  };

  const handleClear = () => {
    setSearch(''); setDateFrom(''); setDateTo(''); setUsername('');
    auditService.getLogs({}).then(d => setLogs(d || [])).catch(() => {});
  };

  const handleRefresh = () => fetchLogs(true);

  const handleExportCSV = () => {
    if (logs.length === 0) { toast.error('No logs to export'); return; }
    const headers = ['Date & Time', 'Username', 'Action', 'Module', 'Description'];
    const rows = logs.map(l => [
      formatDateTime(l.created_at),
      l.username,
      l.action,
      l.module,
      l.description,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Audit logs exported successfully!');
  };

  const hasActiveFilters = search || dateFrom || dateTo || username;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Audit Trail
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Complete history of all user actions across the system. Admin-only view.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleExportCSV}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search &amp; Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleApply} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Input
                label="Search"
                placeholder="Action, module, description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Input
              label="Date From"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              label="Date To"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <Select
              label="User"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              options={[{ label: 'All Users', value: '' }, ...users.map(u => ({ label: u, value: u }))]}
            />
            <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-3">
              <Button type="submit" disabled={loading} className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Apply Filters
              </Button>
              {hasActiveFilters && (
                <Button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
              {!loading && (
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
                  {logs.length} {logs.length === 1 ? 'entry' : 'entries'} found
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Audit Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-4"><TableSkeleton rows={8} cols={5} /></div>
          ) : logs.length > 0 ? (
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Date &amp; Time</TableHead>
                  <TableHead className="w-28">Username</TableHead>
                  <TableHead className="w-40">Action</TableHead>
                  <TableHead className="w-28">Module</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center">
                          {log.username?.charAt(0).toUpperCase()}
                        </span>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {log.username}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm font-semibold ${ACTION_COLORS[log.action] || 'text-gray-700 dark:text-gray-300'}`}>
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ModuleBadge module={log.module} />
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-300 max-w-xs">
                      {log.description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 space-y-2">
              <ClipboardX className="h-10 w-10" />
              <p className="font-medium">No audit logs found</p>
              <p className="text-sm">
                {hasActiveFilters ? 'Try adjusting your search filters.' : 'Actions will appear here as they occur.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
