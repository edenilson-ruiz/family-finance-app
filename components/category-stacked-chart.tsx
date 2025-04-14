"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{
          top: 20,
          right: 30,
          left: 20,
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
      </BarChart>
    </ResponsiveContainer>
  );
} 