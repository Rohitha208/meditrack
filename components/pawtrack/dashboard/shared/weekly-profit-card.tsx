// Top-level imports
"use client";

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useGetClinicWeeklyProfit } from "@/queries/dashboard/get-clinic-weekly-profit";

type WeeklyProfitCardProps = {
  clinicId: string;
  fromDate?: string;
  toDate?: string;
  className?: string;
};

export function WeeklyProfitCard({ clinicId, fromDate, toDate, className }: WeeklyProfitCardProps) {
  const { data, isLoading, error } = useGetClinicWeeklyProfit(
    { clinicId, fromDate, toDate },
    { enabled: !!clinicId }
  );

  const chartData = (data?.weeklyData || []).map((item) => ({
    weekLabel: item.weekLabel || String(item.monthYear ?? ""),
    serviceProfit: Number(item.serviceProfit ?? 0),
    productProfit: Number(item.productProfit ?? 0),
  }));

  const chartConfig = {
    serviceProfit: {
      label: "Service Profit",
      color: "#1E3D3D",
    },
    productProfit: {
      label: "Product Profit",
      color: "#1E3D3D",
    },
  } satisfies ChartConfig;

  const descriptionText =
    fromDate && toDate ? `${fromDate} - ${toDate}` : "Selected date range";

  const last = chartData[chartData.length - 1];
  const prev = chartData[chartData.length - 2];
  const lastTotal = last ? last.serviceProfit + last.productProfit : 0;
  const prevTotal = prev ? prev.serviceProfit + prev.productProfit : 0;
  const percentChange =
    prevTotal > 0 ? (((lastTotal - prevTotal) / prevTotal) * 100).toFixed(1) : "0.0";

  const hasAnyValue = chartData.some(
    (d) => (d.serviceProfit ?? 0) !== 0 || (d.productProfit ?? 0) !== 0
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Weekly Profit</CardTitle>
        <CardDescription>{descriptionText}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Loading...
          </div>
        )}
        {error && (
          <div className="h-[300px] flex items-center justify-center text-destructive">
            Failed to load weekly profit
          </div>
        )}
        {!isLoading && !error && hasAnyValue && (
          <ChartContainer className="h-[300px] w-full" config={chartConfig}>
            {/* ChartContainer already wraps children in ResponsiveContainer */}
            <BarChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="weekLabel"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => String(value)}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dashed" />}
              />
              <Bar dataKey="serviceProfit" fill="var(--color-serviceProfit)" radius={4} />
              <Bar dataKey="productProfit" fill="var(--color-productProfit)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
        {!isLoading && !error && !hasAnyValue && (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No profit data in selected range
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Trending {Number(percentChange) >= 0 ? "up" : "down"} by {percentChange}% this week{" "}
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Showing total profit per week
        </div>
      </CardFooter>
    </Card>
  );
}