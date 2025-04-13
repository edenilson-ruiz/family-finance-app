"use client"

import { useEffect, useRef } from "react"
import { Chart, registerables } from "chart.js"

Chart.register(...registerables)

interface FinancialChartProps {
  data: any[]
  timeframe: string
}

export function FinancialChart({ data, timeframe }: FinancialChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    // Process data based on timeframe
    let chartData = data

    if (timeframe === "quarter") {
      // Group by quarter
      chartData = Array(4)
        .fill(0)
        .map((_, i) => {
          const quarterMonths = data.slice(i * 3, (i + 1) * 3)
          const quarterName = `Q${i + 1}`

          return {
            name: quarterName,
            income: quarterMonths.reduce((sum, month) => sum + month.income, 0),
            expense: quarterMonths.reduce((sum, month) => sum + month.expense, 0),
            balance: quarterMonths.reduce((sum, month) => sum + month.balance, 0),
          }
        })
    } else if (timeframe === "year") {
      // Aggregate for the year
      chartData = [
        {
          name: "Year",
          income: data.reduce((sum, month) => sum + month.income, 0),
          expense: data.reduce((sum, month) => sum + month.expense, 0),
          balance: data.reduce((sum, month) => sum + month.balance, 0),
        },
      ]
    }

    // Create new chart
    const ctx = chartRef.current.getContext("2d")

    if (ctx) {
      chartInstance.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels: chartData.map((d) => d.name),
          datasets: [
            {
              label: "Income",
              data: chartData.map((d) => d.income),
              backgroundColor: "rgba(34, 197, 94, 0.5)",
              borderColor: "rgb(34, 197, 94)",
              borderWidth: 1,
            },
            {
              label: "Expense",
              data: chartData.map((d) => d.expense),
              backgroundColor: "rgba(239, 68, 68, 0.5)",
              borderColor: "rgb(239, 68, 68)",
              borderWidth: 1,
            },
            {
              label: "Balance",
              data: chartData.map((d) => d.balance),
              type: "line",
              borderColor: "rgb(59, 130, 246)",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              borderWidth: 2,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      })
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [data, timeframe])

  return <canvas ref={chartRef} />
}
