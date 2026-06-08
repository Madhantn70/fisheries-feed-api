import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { feedStockService, feedTypesService } from '../../services/api';
import { formatDateTime } from '../../lib/utils';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { Download, Search, Calendar, PackageOpen } from 'lucide-react';
import toast from 'react-hot-toast';

export function InventoryHistory() {
  const [history, setHistory] = useState([]);
  const [feedTypes, setFeedTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    Promise.all([
      feedStockService.getAll(),
      feedTypesService.getAll()
    ])
      .then(([stockData, typesData]) => {
        setHistory(stockData || []);
        setFeedTypes(typesData || []);
      })
      .catch(() => toast.error("Failed to load inventory history"))
      .finally(() => setLoading(false));
  }, []);

  const getFeedName = (feedTypeId) => {
    const feed = feedTypes.find(f => f.id === feedTypeId);
    return feed ? feed.name : `Type ${feedTypeId}`;
  };

  const filteredHistory = history.filter(item => {
    const feedName = getFeedName(item.feed_type_id).toLowerCase();
    const matchesSearch = feedName.includes(searchTerm.toLowerCase());
    
    let matchesDate = true;
    if (filterDate) {
      const itemDate = new Date(item.date_added).toISOString().split('T')[0];
      matchesDate = itemDate === filterDate;
    }
    
    return matchesSearch && matchesDate;
  });

  const handleCSVExport = () => {
    if (filteredHistory.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ['Date', 'Feed Type', 'Quantity Added (kg)', 'User'];
    const rows = filteredHistory.map(item => [
      formatDateTime(item.date_added),
      getFeedName(item.feed_type_id),
      item.quantity,
      item.username || 'System'
    ]);

    const csvContent = [headers, ...rows].map(e => e.map(val => `"${val}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `inventory_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Inventory history exported successfully!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Inventory History</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track all historical stock additions and restock activities.
          </p>
        </div>
        <Button onClick={handleCSVExport} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by Feed Type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-gray-400 z-10" />
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Data List */}
          {loading ? (
            <TableSkeleton rows={5} cols={4} />
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400 space-y-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              <PackageOpen className="h-10 w-10 text-gray-400" />
              <p className="font-medium text-base">No stock additions found.</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Try adjusting your filters or add some stock first.</p>
            </div>
          ) : (
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Feed Type</TableHead>
                  <TableHead>Quantity Added</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {formatDateTime(item.date_added)}
                    </TableCell>
                    <TableCell>{getFeedName(item.feed_type_id)}</TableCell>
                    <TableCell className="text-green-600 dark:text-green-400 font-semibold">
                      +{item.quantity} kg
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        {item.username || 'System'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
