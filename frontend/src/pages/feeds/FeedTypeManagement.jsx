import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { feedTypesService } from '../../services/api';
import { Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function FeedTypeManagement() {
  const [feedTypes, setFeedTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [feedTypeToDelete, setFeedTypeToDelete] = useState(null);

  useEffect(() => {
    fetchFeedTypes();
  }, []);

  const fetchFeedTypes = () => {
    setLoading(true);
    feedTypesService.getAll()
      .then(data => setFeedTypes(data || []))
      .catch(() => toast.error("Failed to load feed types"))
      .finally(() => setLoading(false));
  };

  const validateName = (val) => {
    if (!val || val.trim() === "") return "Feed type name cannot be empty.";
    const lower = val.trim().toLowerCase();
    if (lower === 'null' || lower === 'undefined') {
      return "Invalid name. Reserved keywords are not allowed.";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errorMsg = validateName(name);
    if (errorMsg) {
      toast.error(errorMsg);
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await feedTypesService.update(editingId, { name: name.trim() });
        toast.success("Feed type updated successfully!");
        setEditingId(null);
      } else {
        await feedTypesService.add({ name: name.trim() });
        toast.success("Feed type added successfully!");
      }
      setName('');
      fetchFeedTypes();
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to save feed type";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (feed) => {
    setEditingId(feed.id);
    setName(feed.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
  };

  const handleDeleteClick = (feed) => {
    setFeedTypeToDelete(feed);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!feedTypeToDelete) return;
    try {
      await feedTypesService.delete(feedTypeToDelete.id);
      toast.success("Feed type deleted successfully!");
      fetchFeedTypes();
    } catch (err) {
      toast.error("Failed to delete feed type");
    } finally {
      setIsDeleteModalOpen(false);
      setFeedTypeToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Feed Type Management</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Create, edit, and delete fish feed products and inventories.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>{editingId ? "Edit Feed Type" : "Add New Feed Type"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Feed Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pellet 2mm, Starter Feed"
                required
              />
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 flex items-center justify-center gap-2" disabled={submitting}>
                  {!editingId && <Plus className="h-4 w-4" />}
                  {submitting ? "Saving..." : editingId ? "Save Changes" : "Add Feed Type"}
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
            <CardTitle>Feed Types List</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={4} cols={2} />
            ) : feedTypes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400 space-y-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <AlertCircle className="h-10 w-10 text-gray-400" />
                <p className="font-medium text-base">No feed types available.</p>
                <p className="text-sm text-gray-400">Use the form on the left to add your first feed type.</p>
              </div>
            ) : (
              <Table className="min-w-[400px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Feed Type Name</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedTypes.map((feed) => (
                    <TableRow key={feed.id}>
                      <TableCell className="font-semibold text-gray-900 dark:text-white">
                        {feed.name}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="p-1.5"
                            onClick={() => handleEditClick(feed)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            className="p-1.5"
                            onClick={() => handleDeleteClick(feed)}
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
        title="Delete Feed Type"
        message={`Are you sure you want to delete "${feedTypeToDelete?.name}"? This will cascadingly delete all related stock additions and feed logs.`}
      />
    </div>
  );
}
