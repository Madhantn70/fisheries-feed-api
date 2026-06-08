import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { feedTypesService, feedStockService } from '../../services/api';
import toast from 'react-hot-toast';

export function AddStock() {
  const [feedTypes, setFeedTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    feed_type_id: '',
    quantity: '',
  });

  useEffect(() => {
    feedTypesService.getAll()
      .then(data => setFeedTypes(data || []))
      .catch(() => toast.error("Failed to load feed types"));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.feed_type_id || !formData.quantity) {
      return toast.error("Please fill in all fields");
    }

    setLoading(true);
    try {
      await feedStockService.add({
        feed_type_id: parseInt(formData.feed_type_id),
        quantity: parseFloat(formData.quantity)
      });
      toast.success("Stock added successfully!");
      setFormData({ feed_type_id: '', quantity: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to add stock");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Add New Stock</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Select
              label="Select Feed Type"
              value={formData.feed_type_id}
              onChange={(e) => setFormData({ ...formData, feed_type_id: e.target.value })}
              options={feedTypes.map(ft => ({ label: ft.name, value: ft.id }))}
              required
            />

            <Input
              label="Quantity (kg)"
              type="number"
              min="0.1"
              step="0.1"
              placeholder="0.0"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
            />

            <div className="pt-4">
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? "Adding..." : "Add Stock to Inventory"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
