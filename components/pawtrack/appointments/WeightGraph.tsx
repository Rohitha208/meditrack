import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useGetWeightHistory } from '@/queries/patients/get-weight-history';
import { Loader2, TrendingUp, Calendar } from 'lucide-react';

interface WeightGraphProps {
  patientId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface WeightData {
  date: string;
  weight: number;
  source: string;
  displayDate: string;
}

const WeightGraph: React.FC<WeightGraphProps> = ({ patientId, isOpen, onClose }) => {
  const { data: weightHistory, isLoading, error } = useGetWeightHistory(patientId);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const chartData =
    weightHistory?.weightHistory?.map((item: any) => ({
      date: item.date,
      weight: item.weightKg,
      source: item.source,
      displayDate: formatDate(item.date),
    })) || [];

  const dates = weightHistory?.weightHistory?.map((item: any) => item.date) || [];
  const startDate =
    dates.length > 0
      ? new Date(dates[0]).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";
  const endDate =
    dates.length > 0
      ? new Date(dates[dates.length - 1]).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";
  const dateRange = startDate && endDate ? `${startDate} - ${endDate}` : "";

  if (error) {
    console.error('Error loading weight history:', error);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Weight History
          </DialogTitle>

          {dateRange && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              {dateRange}
            </div>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center text-red-600 py-8">
            <p>Failed to load weight history</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-center text-gray-600 py-8">
            <p>No weight history available</p>
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="displayDate" stroke="#666" fontSize={12} />
                <YAxis
                  stroke="#666"
                  fontSize={12}
                  label={{ value: "Weight (kg)", angle: -90, position: "insideLeft" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    <div key="tooltip" className="space-y-1">
                      <div className="font-medium">{value} kg</div>
                      <div className="text-sm text-gray-500">Source: {props.payload.source}</div>
                    </div>,
                    'Weight'
                  ]}
                />
                <Legend />
                <Bar
                  dataKey="weight"
                  fill="#3b82f6"
                  name="Weight (kg)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WeightGraph;