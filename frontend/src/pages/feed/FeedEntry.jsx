import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { feedTypesService, tanksService, feedLogsService } from '../../services/api';
import toast from 'react-hot-toast';

export function FeedEntry() {
  const [feedTypes, setFeedTypes] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    feed_type_id: '',
    tank_id: '',
    quantity_used: '',
  });

  useEffect(() => {
    Promise.all([
      feedTypesService.getAll(),
      tanksService.getAll()
    ])
      .then(([typesData, tanksData]) => {
        setFeedTypes(typesData || []);
        const validTanks = (tanksData || []).filter(t => {
          if (!t || !t.tank_name) return false;
          const nameStr = t.tank_name.toString().trim();
          return (
            nameStr !== '' &&
            nameStr !== '0.0' &&
            nameStr !== '0' &&
            nameStr.toLowerCase() !== 'null' &&
            nameStr.toLowerCase() !== 'undefined' &&
            isNaN(Number(nameStr))
          );
        });
        setTanks(validTanks);
      })
      .catch(() => toast.error("Failed to load form data"));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.feed_type_id || !formData.tank_id || !formData.quantity_used) {
      return toast.error("Please fill in all fields");
    }

    setLoading(true);
    try {
      await feedLogsService.add({
        feed_type_id: parseInt(formData.feed_type_id),
        tank_id: parseInt(formData.tank_id),
        quantity_used: parseFloat(formData.quantity_used)
      });
      toast.success("Feed entry logged successfully!");
      setFormData({ ...formData, quantity_used: '' }); // keep type/tank selected
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to log feed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Log Feed Usage</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feeding Event Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Select Tank"
                value={formData.tank_id}
                onChange={(e) => setFormData({ ...formData, tank_id: e.target.value })}
                options={tanks.map(t => ({ label: t.tank_name, value: t.id }))}
                required
              />

              <Select
                label="Select Feed Type"
                value={formData.feed_type_id}
                onChange={(e) => setFormData({ ...formData, feed_type_id: e.target.value })}
                options={feedTypes.map(ft => ({ label: ft.name, value: ft.id }))}
                required
              />
            </div>

            <Input
              label="Quantity Used (kg)"
              type="number"
              min="0.1"
              step="0.1"
              placeholder="0.0"
              value={formData.quantity_used}
              onChange={(e) => setFormData({ ...formData, quantity_used: e.target.value })}
              required
            />

            <div className="pt-4">
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? "Logging..." : "Submit Feed Log"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
