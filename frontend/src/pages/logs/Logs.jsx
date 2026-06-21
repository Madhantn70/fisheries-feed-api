import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { feedLogsService, feedTypesService, tanksService } from '../../services/api';
import { formatDateTime, getISTDateString } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { Download, Trash2, ClipboardX } from 'lucide-react';
import toast from 'react-hot-toast';

export function Logs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [feedTypes, setFeedTypes] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterTank, setFilterTank] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);

  useEffect(() => {
    fetchLogsData();
  }, []);

  const fetchLogsData = () => {
    setLoading(true);
    Promise.all([
      feedLogsService.getAll(),
      feedTypesService.getAll(),
      tanksService.getAll()
    ])
      .then(([logsData, typesData, tanksData]) => {
        setLogs(logsData || []);
        setFeedTypes(typesData || []);
        setTanks(tanksData || []);
      })
      .catch(() => toast.error("Failed to load logs"))
      .finally(() => setLoading(false));
  };

  const getFeedName = (feedTypeId) => {
    const ft = feedTypes.find(t => t.id === feedTypeId);
    return ft ? ft.name : `Type ${feedTypeId}`;
  };

  const getTankName = (tankId) => {
    const t = tanks.find(x => x.id === tankId);
    return t ? t.tank_name : `Tank ${tankId}`;
  };

  const filteredLogs = logs.filter(log => {
    let match = true;
    if (filterType && log.feed_type_id.toString() !== filterType) match = false;
    if (filterTank && log.tank_id.toString() !== filterTank) match = false;
    if (filterDate) {
      const logDate = getISTDateString(log.feed_time);
      if (logDate !== filterDate) match = false;
    }
    return match;
  });

  const handleExport = () => {
    if (filteredLogs.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Date & Time", "Feed Type", "Tank", "Quantity Used (kg)"];
    const rows = filteredLogs.map(e => [
      formatDateTime(e.feed_time),
      getFeedName(e.feed_type_id),
      getTankName(e.tank_id),
      Math.abs(parseFloat(e.quantity_used))
    ]);

    const csvContent = [headers, ...rows].map(e => e.map(val => `"${val}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `feeding_logs_${getISTDateString(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Feeding logs exported successfully!");
  };

  const handleDeleteClick = (log) => {
    setLogToDelete(log);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!logToDelete) return;
    try {
      await feedLogsService.delete(logToDelete.id);
      toast.success("Feeding log deleted successfully!");
      fetchLogsData();
    } catch (err) {
      toast.error("Failed to delete log");
    } finally {
      setIsDeleteModalOpen(false);
      setLogToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Feeding Logs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review, filter, and manage historical feeding entries for all tanks.
          </p>
        </div>
        <Button onClick={handleExport} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 border-b border-gray-150 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 rounded-t-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Filter by Feed Type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              options={[{ label: 'All Feed Types', value: '' }, ...feedTypes.map(ft => ({ label: ft.name, value: ft.id.toString() }))]}
            />
            <Select
              label="Filter by Tank"
              value={filterTank}
              onChange={(e) => setFilterTank(e.target.value)}
              options={[{ label: 'All Tanks', value: '' }, ...tanks.map(t => ({ label: t.tank_name, value: t.id.toString() }))]}
            />
            <Input
              label="Filter by Date"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
        </CardContent>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={5} cols={5} />
            </div>
          ) : filteredLogs.length > 0 ? (
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Feed Type</TableHead>
                  <TableHead>Tank</TableHead>
                  <TableHead>Quantity Used</TableHead>
                  {user?.role === 'admin' && <TableHead className="w-[100px] text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const feedTypeName = getFeedName(log.feed_type_id);
                  const tankName = getTankName(log.tank_id);
                  const quantity = Math.abs(parseFloat(log.quantity_used));
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {formatDateTime(log.feed_time)}
                      </TableCell>
                      <TableCell>{feedTypeName}</TableCell>
                      <TableCell>{tankName}</TableCell>
                      <TableCell className="text-blue-600 dark:text-blue-400 font-semibold">
                        {quantity} kg consumed
                      </TableCell>
                      {user?.role === 'admin' && (
                        <TableCell className="text-right">
                          <Button
                            variant="danger"
                            size="sm"
                            className="p-1.5"
                            onClick={() => handleDeleteClick(log)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400 space-y-3">
              <ClipboardX className="h-10 w-10 text-gray-400" />
              <p className="font-semibold text-base">No matching feeding logs found.</p>
              <p className="text-sm text-gray-400">Try adjusting your active filters above.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Feeding Log"
        message="Are you sure you want to permanently delete this feeding activity log? This will release the stock calculation but not revert feed inventory totals."
      />
    </div>
  );
}
