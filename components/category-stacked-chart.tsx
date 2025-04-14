"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { useMemo } from 'react';

// Define the colors for different categories
const CATEGORY_COLORS = {
  "Food": "#8884d8",
  "Transportation": "#82ca9d",
  "Housing": "#ffc658",
  "Entertainment": "#ff8042",
  "Utilities": "#0088fe",
  "Healthcare": "#00C49F",
  "Education": "#FFBB28",
  "Shopping": "#FF8042",
  "Travel": "#a4de6c",
  "Uncategorized": "#d0d0d0",
  // Add more categories as needed
};

export function CategoryStackedChart({ data }) {
  // Get all unique categories from the data
  const categories = useMemo(() => {
    const allCategories = new Set();
    data.forEach(month => {
      Object.keys(month).forEach(key => {
        if (key !== 'name') {
          allCategories.add(key);
        }
      });
    });
    return Array.from(allCategories);
  }, [data]);

  // Calculate total expenses for all months
  const totalExpenses = useMemo(() => {
    let total = 0;
    data.forEach(month => {
      Object.keys(month).forEach(key => {
        if (key !== 'name' && typeof month[key] === 'number') {
          total += month[key];
        }
      });
    });
    return total;
  }, [data]);

  // Calculate monthly totals
  const dataWithMonthlyTotals = useMemo(() => {
    return data.map(month => {
      let monthlyTotal = 0;
      Object.keys(month).forEach(key => {
        if (key !== 'name' && typeof month[key] === 'number') {
          monthlyTotal += month[key];
        }
      });
      return {
        ...month,
        monthlyTotal
      };
    });
  }, [data]);

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dataWithMonthlyTotals}
            margin={{
              top: 20,
              right: 5,
              left: 5,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              formatter={(value, name) => [`$${value.toFixed(2)}`, name]}
              labelFormatter={(label) => `Month: ${label}`}
            />
            <Legend />
            {categories.map((category, index) => (
              <Bar 
                key={category}
                dataKey={category} 
                stackId="a" 
                fill={CATEGORY_COLORS[category] || `hsl(${index * 30 % 360}, 70%, 50%)`} 
                name={category}
              />
            ))}
            <Bar 
              dataKey="monthlyTotal" 
              stackId="b" 
              fill="transparent" 
              isAnimationActive={false}
            >
              <LabelList 
                dataKey="monthlyTotal" 
                position="top" 
                offset={10} // Added offset to position labels higher
                formatter={(value) => value > 0 ? `$${value.toFixed(2)}` : ''}
                style={{ fontWeight: 'bold', textAnchor: 'middle' }} //
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 