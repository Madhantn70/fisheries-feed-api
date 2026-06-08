import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { tanksService } from '../../services/api';
import { Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function TankManagement() {
  const [tanks, setTanks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [tankName, setTankName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tankToDelete, setTankToDelete] = useState(null);

  useEffect(() => {
    fetchTanks();
  }, []);

  const fetchTanks = () => {
    setLoading(true);
    tanksService.getAll()
      .then(data => setTanks(data || []))
      .catch(() => toast.error("Failed to load tanks"))
      .finally(() => setLoading(false));
  };

  const validateTankName = (name) => {
    if (!name || name.trim() === "") return "Tank name cannot be empty.";
    const nameStr = name.trim().toLowerCase();
    if (nameStr === 'null' || nameStr === 'undefined' || nameStr === '0.0' || nameStr === '0') {
      return "Invalid tank name. Reserved keywords or numeric zeros are not allowed.";
    }
    if (!isNaN(Number(nameStr))) {
      return "Tank name cannot be numeric-only.";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errorMsg = validateTankName(tankName);
    if (errorMsg) {
      toast.error(errorMsg);
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await tanksService.update(editingId, { tank_name: tankName.trim() });
        toast.success("Tank updated successfully!");
        setEditingId(null);
      } else {
        await tanksService.add({ tank_name: tankName.trim() });
        toast.success("Tank added successfully!");
      }
      setTankName('');
      fetchTanks();
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to save tank";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (tank) => {
    setEditingId(tank.id);
    setTankName(tank.tank_name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTankName('');
  };

  const handleDeleteClick = (tank) => {
    setTankToDelete(tank);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!tankToDelete) return;
    try {
      await tanksService.delete(tankToDelete.id);
      toast.success("Tank deleted successfully!");
      fetchTanks();
    } catch (err) {
      toast.error("Failed to delete tank");
    } finally {
      setIsDeleteModalOpen(false);
      setTankToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Tank Management</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Create, edit, and delete fish tanks within your farm.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>{editingId ? "Edit Tank" : "Add New Tank"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Tank Name"
                value={tankName}
                onChange={(e) => setTankName(e.target.value)}
                placeholder="e.g. Tank C, Nursery"
                required
              />
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 flex items-center justify-center gap-2" disabled={submitting}>
                  {!editingId && <Plus className="h-4 w-4" />}
                  {submitting ? "Saving..." : editingId ? "Save Changes" : "Add Tank"}
                </Button>
                {editingId && (
                  <Button type="button" variant="secondary" onClick={handleCancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* List Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Tanks List</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={4} cols={2} />
            ) : tanks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400 space-y-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <AlertCircle className="h-10 w-10 text-gray-400" />
                <p className="font-medium text-base">No tanks available.</p>
                <p className="text-sm text-gray-400">Use the form on the left to add your first tank.</p>
              </div>
            ) : (
              <Table className="min-w-[400px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Tank Name</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tanks.map((tank) => (
                    <TableRow key={tank.id}>
                      <TableCell className="font-semibold text-gray-900 dark:text-white">
                        {tank.tank_name}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="p-1.5"
                            onClick={() => handleEditClick(tank)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            className="p-1.5"
                            onClick={() => handleDeleteClick(tank)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Tank"
        message={`Are you sure you want to delete "${tankToDelete?.tank_name}"? All associated feed logs will be permanently deleted as well.`}
      />
    </div>
  );
}
