import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { reportsService, feedTypesService, tanksService } from '../../services/api';
import { formatDate, cn, getISTDateString } from '../../lib/utils';
import {
  FileText, Download, BarChart2, Package, Droplets, Calendar,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

const REPORT_TYPES = [
  { id: 'stock',    label: 'Current Stock',     icon: Package,   color: 'blue'   },
  { id: 'consumption', label: 'Feed Consumption', icon: Droplets,  color: 'indigo' },
  { id: 'tank-usage',  label: 'Tank Usage',       icon: BarChart2, color: 'violet' },
  { id: 'monthly',     label: 'Monthly Summary',  icon: Calendar,  color: 'cyan'   },
];

const COLOR_MAP = {
  blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  violet: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  cyan:   'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
};

const ACTIVE_MAP = {
  blue:   'bg-blue-600 text-white shadow-lg shadow-blue-500/25',
  indigo: 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25',
  violet: 'bg-violet-600 text-white shadow-lg shadow-violet-500/25',
  cyan:   'bg-cyan-600 text-white shadow-lg shadow-cyan-500/25',
};

function StatusBadge({ status }) {
  const map = {
    Healthy:    { cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
    Warning:    { cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',         icon: AlertTriangle },
    'Low Stock':{ cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',                 icon: TrendingDown },
  };
  const cfg = map[status] || { cls: 'bg-gray-100 text-gray-600', icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
      <Icon className="h-3 w-3" />{status}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color = 'blue' }) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border ${COLOR_MAP[color]}`}>
      <div className="p-2.5 rounded-lg bg-white/60 dark:bg-black/20">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-medium opacity-70 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export function Reports() {
  const [activeType, setActiveType] = useState('stock');
  const [data, setData]             = useState([]);
  const [summary, setSummary]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [feedTypes, setFeedTypes]   = useState([]);
  const [tanks, setTanks]           = useState([]);

  const [filters, setFilters] = useState({
    date_from: '', date_to: '', feed_type_id: '', tank_id: '',
  });

  // Load dropdowns once
  useEffect(() => {
    feedTypesService.getAll().then(d => setFeedTypes(d || [])).catch(() => {});
    tanksService.getAll().then(d => setTanks(d || [])).catch(() => {});
  }, []);

  const buildParams = useCallback(() => {
    const p = {};
    if (filters.date_from) p.date_from = filters.date_from;
    if (filters.date_to)   p.date_to   = filters.date_to;
    if (filters.feed_type_id) p.feed_type_id = filters.feed_type_id;
    if (filters.tank_id)      p.tank_id      = filters.tank_id;
    return p;
  }, [filters]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setData([]);
    setSummary(null);
    try {
      const params = buildParams();
      if (activeType === 'stock') {
        setData(await reportsService.getStock());
      } else if (activeType === 'consumption') {
        setData(await reportsService.getConsumption(params));
      } else if (activeType === 'tank-usage') {
        setData(await reportsService.getTankUsage(params));
      } else if (activeType === 'monthly') {
        setSummary(await reportsService.getMonthlySummary(params));
      }
    } catch {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [activeType, buildParams]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTabChange = (id) => {
    setActiveType(id);
    setFilters({ date_from: '', date_to: '', feed_type_id: '', tank_id: '' });
  };

  const handleGeneratePDF = async () => {
    if (activeType === 'monthly' && !summary) return toast.error('No data to export');
    if (activeType !== 'monthly' && data.length === 0) return toast.error('No data to export');

    setPdfLoading(true);
    try {
      const filterParts = [];
      if (filters.date_from) filterParts.push(`From: ${formatDate(filters.date_from)}`);
      if (filters.date_to)   filterParts.push(`To: ${formatDate(filters.date_to)}`);
      const feedName = feedTypes.find(f => f.id.toString() === filters.feed_type_id)?.name;
      if (feedName) filterParts.push(`Feed: ${feedName}`);
      const tankName = tanks.find(t => t.id.toString() === filters.tank_id)?.tank_name;
      if (tankName) filterParts.push(`Tank: ${tankName}`);

      // Build summary object for PDF
      let pdfSummary = {};
      if (activeType === 'monthly' && summary) {
        pdfSummary = {
          'Total Feed Added (kg)':    summary.total_added,
          'Total Feed Consumed (kg)': summary.total_consumed,
          'Feeding Entries':          summary.entry_count,
          'Most Consumed Feed':       `${summary.most_consumed_feed} (${summary.most_consumed_qty} kg)`,
          'Lowest Stock Feed':        `${summary.lowest_stock_feed} (${summary.lowest_stock_qty} kg)`,
        };
      }

      const payload = {
        report_type: activeType,
        rows: activeType !== 'monthly' ? data : [],
        summary: pdfSummary,
        filters_text: filterParts.join(', '),
      };

      const res = await reportsService.generatePDF(payload);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a   = document.createElement('a');
      a.href    = url;
      const month = getISTDateString(new Date()).slice(0, 7);
      a.download  = `${activeType}-report-${month}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully!');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const activeConfig = REPORT_TYPES.find(r => r.id === activeType);
  const showFeedFilter = ['consumption', 'tank-usage'].includes(activeType);
  const showTankFilter = activeType === 'tank-usage';
  const showDateFilter = activeType !== 'stock';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Reports
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Generate and export professional PDF reports for feed data.
          </p>
        </div>
        <Button
          onClick={handleGeneratePDF}
          disabled={pdfLoading || loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Download className="h-4 w-4" />
          {pdfLoading ? 'Generating…' : 'Generate PDF'}
        </Button>
      </div>

      {/* Report Type Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {REPORT_TYPES.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => handleTabChange(id)}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 font-medium text-sm',
              activeType === id
                ? ACTIVE_MAP[color]
                : `${COLOR_MAP[color]} hover:opacity-80`
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {(showDateFilter || showFeedFilter || showTankFilter) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {showDateFilter && (
                <>
                  <Input
                    label="Start Date"
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => setFilters(f => ({ ...f, date_from: e.target.value }))}
                  />
                  <Input
                    label="End Date"
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => setFilters(f => ({ ...f, date_to: e.target.value }))}
                  />
                </>
              )}
              {showFeedFilter && (
                <Select
                  label="Feed Type"
                  value={filters.feed_type_id}
                  onChange={(e) => setFilters(f => ({ ...f, feed_type_id: e.target.value }))}
                  options={[{ label: 'All Feed Types', value: '' }, ...feedTypes.map(ft => ({ label: ft.name, value: ft.id.toString() }))]}
                />
              )}
              {showTankFilter && (
                <Select
                  label="Tank"
                  value={filters.tank_id}
                  onChange={(e) => setFilters(f => ({ ...f, tank_id: e.target.value }))}
                  options={[{ label: 'All Tanks', value: '' }, ...tanks.map(t => ({ label: t.tank_name, value: t.id.toString() }))]}
                />
              )}
              <div className="flex items-end">
                <Button onClick={fetchData} className="w-full" disabled={loading}>
                  {loading ? 'Loading…' : 'Apply Filters'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Summary Cards */}
      {activeType === 'monthly' && (
        <div>
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          ) : summary ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label="Total Feed Added"    value={`${summary.total_added} kg`}    icon={TrendingUp}   color="blue" />
              <StatCard label="Total Consumed"      value={`${summary.total_consumed} kg`}  icon={TrendingDown} color="indigo" />
              <StatCard label="Feeding Entries"     value={summary.entry_count}              icon={Calendar}     color="violet" />
              <StatCard label="Most Consumed Feed"  value={`${summary.most_consumed_feed} (${summary.most_consumed_qty} kg)`} icon={Package} color="cyan" />
              <StatCard label="Lowest Stock Feed"   value={`${summary.lowest_stock_feed} (${summary.lowest_stock_qty} kg)`}  icon={AlertTriangle} color="blue" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 space-y-2">
              <Calendar className="h-10 w-10" />
              <p className="font-medium">No summary data available</p>
            </div>
          )}
        </div>
      )}

      {/* Data Table */}
      {activeType !== 'monthly' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {activeConfig && <activeConfig.icon className="h-4 w-4 text-blue-600" />}
              {activeConfig?.label}
              {!loading && data.length > 0 && (
                <span className="ml-auto text-xs font-normal text-gray-500 dark:text-gray-400">
                  {data.length} {data.length === 1 ? 'row' : 'rows'}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="p-4"><TableSkeleton rows={5} cols={4} /></div>
            ) : data.length > 0 ? (
              <Table className="min-w-[600px]">
                {/* Current Stock Report */}
                {activeType === 'stock' && (
                  <>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Feed Type</TableHead>
                        <TableHead>Total Added (kg)</TableHead>
                        <TableHead>Total Used (kg)</TableHead>
                        <TableHead>Current Stock (kg)</TableHead>
                        <TableHead>Threshold (kg)</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{row.feed_type}</TableCell>
                          <TableCell>{Number(row.total_added).toFixed(2)}</TableCell>
                          <TableCell>{Number(row.total_used).toFixed(2)}</TableCell>
                          <TableCell className="font-semibold">{Number(row.current_stock).toFixed(2)}</TableCell>
                          <TableCell>{row.threshold}</TableCell>
                          <TableCell><StatusBadge status={row.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </>
                )}

                {/* Consumption Report */}
                {activeType === 'consumption' && (
                  <>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Feed Type</TableHead>
                        <TableHead>Total Consumed (kg)</TableHead>
                        <TableHead>Date From</TableHead>
                        <TableHead>Date To</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{row.feed_type}</TableCell>
                          <TableCell className="font-semibold text-blue-600 dark:text-blue-400">
                            {Number(row.total_consumed).toFixed(2)}
                          </TableCell>
                          <TableCell>{row.date_from ? formatDate(row.date_from) : '—'}</TableCell>
                          <TableCell>{row.date_to   ? formatDate(row.date_to)   : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </>
                )}

                {/* Tank Usage Report */}
                {activeType === 'tank-usage' && (
                  <>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tank Name</TableHead>
                        <TableHead>Feed Type</TableHead>
                        <TableHead>Quantity Used (kg)</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{row.tank_name}</TableCell>
                          <TableCell>{row.feed_type}</TableCell>
                          <TableCell className="font-semibold text-blue-600 dark:text-blue-400">
                            {Number(row.quantity_used).toFixed(2)}
                          </TableCell>
                          <TableCell>{row.feed_date ? formatDate(row.feed_date) : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </>
                )}
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 space-y-2">
                <FileText className="h-10 w-10" />
                <p className="font-medium">No report data found</p>
                <p className="text-sm">Try adjusting your filters and clicking Apply.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
