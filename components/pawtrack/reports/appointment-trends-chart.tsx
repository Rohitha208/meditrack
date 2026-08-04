"use client"

import { useEffect, useRef } from "react"
import { Chart, registerables } from "chart.js"

Chart.register(...registerables)

interface AppointmentTrendsChartProps {
  data: {
    labels: string[]
    scheduled: number[]
    completed: number[]
  }
}

export function AppointmentTrendsChart({ data }: AppointmentTrendsChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    const ctx = chartRef.current.getContext("2d")
    if (!ctx) return

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Scheduled",
            data: data.scheduled,
            borderColor: "#4A89DC",
            backgroundColor: "#4A89DC",
            tension: 0.3,
            pointRadius: 4,
          },
          {
            label: "Completed",
            data: data.completed,
            borderColor: "#E9573F",
            backgroundColor: "#E9573F",
            tension: 0.3,
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    })

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [data])

  return (
    <div className="h-[300px]">
      <canvas ref={chartRef}></canvas>
    </div>
  )
}
