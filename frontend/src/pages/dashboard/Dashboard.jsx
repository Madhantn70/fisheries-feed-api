import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { dashboardService, feedLogsService, feedTypesService, tanksService } from '../../services/api';
import { Package, AlertTriangle, ThermometerSun, Info, TrendingUp } from 'lucide-react';
import { cn, formatDateTime, getISTDateString } from '../../lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { CardSkeleton, ChartSkeleton, TableSkeleton } from '../../components/ui/Skeleton';
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function Dashboard() {
  const [stats, setStats] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [feedTypes, setFeedTypes] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardService.getStats(),
      dashboardService.getLowStock(),
      feedLogsService.getAll(),
      feedTypesService.getAll(),
      tanksService.getAll()
    ])
      .then(([statsData, lowStockData, logsData, typesData, tanksData]) => {
        setStats(statsData || []);
        setLowStock(lowStockData || []);
        setRecentLogs(logsData?.slice(0, 5) || []);
        setFeedTypes(typesData || []);
        setTanks(tanksData || []);

        // Aggregate daily consumption trend from logs
        if (logsData && logsData.length > 0) {
          const dailyMap = {};
          logsData.forEach(log => {
            const dateStr = getISTDateString(log.feed_time);
            const qty = Math.abs(parseFloat(log.quantity_used)) || 0;
            dailyMap[dateStr] = (dailyMap[dateStr] || 0) + qty;
          });
          const sortedTrend = Object.keys(dailyMap)
            .sort()
            .map(date => {
              const [yy, mm, dd] = date.split('-');
              return {
                date: `${dd}/${mm}`,
                consumption: parseFloat(dailyMap[date].toFixed(1))
              };
            })
            .slice(-7); // Last 7 days
          setTrendData(sortedTrend);
        }
      })
      .catch((err) => console.error("Error fetching dashboard data:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => <ChartSkeleton key={i} />)}
        </div>
        <TableSkeleton rows={5} cols={4} />
      </div>
    );
  }

  // Prep stock distribution pie chart data
  const pieData = stats
    .map(item => ({
      name: item.name,
      value: Math.max(0, parseFloat(item.current_stock) || 0)
    }))
    .filter(item => item.value > 0);

  const globalThreshold = parseFloat(localStorage.getItem('threshold') || '200');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Dashboard Overview</h1>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-red-100 dark:bg-red-900/40 p-3 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-red-800 dark:text-red-200 font-semibold text-sm uppercase tracking-wide">Low Stock Alert</h3>
              <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                {lowStock.map(item => item.name).join(', ')} stock is running below the alert threshold ({globalThreshold} kg). Please restock immediately.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const currentStock = parseFloat(stat.current_stock) || 0;
          let statusText = "Healthy";
          let statusColor = "text-green-600 dark:text-green-400";
          let progressColor = "bg-green-500";
          let borderColor = "border-green-100 dark:border-green-800/40";
          let statusBg = "bg-green-50 dark:bg-green-950/10";

          if (currentStock < 200) {
            statusText = "Low Stock";
            statusColor = "text-red-600 dark:text-red-400";
            progressColor = "bg-red-500";
            borderColor = "border-red-200 dark:border-red-800/40";
            statusBg = "bg-red-50 dark:bg-red-950/10";
          } else if (currentStock < 300) {
            statusText = "Warning";
            statusColor = "text-yellow-600 dark:text-yellow-400";
            progressColor = "bg-yellow-500";
            borderColor = "border-yellow-200 dark:border-yellow-850/40";
            statusBg = "bg-yellow-50 dark:bg-yellow-950/10";
          }

          return (
            <Card key={idx} className={cn("border transition-shadow hover:shadow-md", borderColor)}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 truncate">{stat.name}</p>
                  <span className={cn("px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider text-nowrap", statusBg, statusColor)}>
                    {statusText}
                  </span>
                </div>
                <div className="flex items-baseline text-3xl font-bold text-gray-900 dark:text-white">
                  {currentStock.toFixed(1)}
                  <span className="ml-1 text-sm font-medium text-gray-500 dark:text-gray-400">kg</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Usage percentage</span>
                    <span>{Math.round((stat.total_used / (stat.total_added || 1)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-150 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={cn("h-2 rounded-full", progressColor)}
                      style={{ width: `${Math.min((stat.total_used / (stat.total_added || 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 pt-1">
                    <span>Total Added: {parseFloat(stat.total_added || 0).toFixed(0)} kg</span>
                    <span>Threshold: 200 kg</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {stats.length === 0 && (
          <div className="col-span-1 md:col-span-2 lg:col-span-4 p-8 text-center bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 flex flex-col items-center gap-2">
            <Package className="h-8 w-8 text-gray-400" />
            <p className="font-semibold text-sm">No feed stock inventory logged yet.</p>
          </div>
        )}
      </div>

      {/* Recharts Charts Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart: Stock Distribution */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Feed Stock Distribution</CardTitle>
            <ThermometerSun className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent className="h-72">
            {pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No active stock to display in distribution chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Line Chart: Feed Consumption Trend */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Feed Consumption Trend (Daily)</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent className="h-72">
            {trendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No feeding logs to compute trend lines.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                  <Line
                    name="Consumption (kg)"
                    type="monotone"
                    dataKey="consumption"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    activeDot={{ r: 6 }}
                    dot={{ strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Feeding Activities</CardTitle>
          <Info className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Feed Type</TableHead>
                <TableHead>Tank</TableHead>
                <TableHead className="text-right">Quantity Used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLogs.map((log) => {
                const ft = feedTypes.find(t => t.id === log.feed_type_id);
                const tank = tanks.find(t => t.id === log.tank_id);
                const feedTypeName = ft ? ft.name : `Type ${log.feed_type_id}`;
                const tankName = tank ? tank.tank_name : `Tank ${log.tank_id}`;
                const quantity = Math.abs(parseFloat(log.quantity_used));
                return (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {formatDateTime(log.feed_time)}
                    </TableCell>
                    <TableCell>{feedTypeName}</TableCell>
                    <TableCell>{tankName}</TableCell>
                    <TableCell className="text-right text-blue-600 dark:text-blue-400 font-semibold">
                      {quantity} kg consumed
                    </TableCell>
                  </TableRow>
                );
              })}
              {recentLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500 h-24 dark:text-gray-400">
                    No recent feeding logs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
