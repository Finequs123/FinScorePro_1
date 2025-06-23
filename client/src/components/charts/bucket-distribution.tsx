import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface BucketDistributionProps {
  data: Array<{
    bucket: string;
    count: number;
    percentage: number;
  }>;
}

const COLORS = {
  A: "#4CAF50",
  B: "#2196F3", 
  C: "#FF9800",
  D: "#F44336"
};

export function BucketDistribution({ data }: BucketDistributionProps) {
  const chartData = data.map(item => ({
    name: `Bucket ${item.bucket} (${item.percentage}%)`,
    value: item.count,
    bucket: item.bucket
  }));

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={120}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.bucket as keyof typeof COLORS]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => [value, "Applications"]}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
