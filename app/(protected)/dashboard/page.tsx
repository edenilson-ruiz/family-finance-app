"use client"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowUpRight, ArrowDownRight, DollarSign, Calendar } from "lucide-react"
import { FinancialChart } from "@/components/financial-chart"
import { useQuery } from "@tanstack/react-query"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { CategoryStackedChart } from "@/components/category-stacked-chart"

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [timeframe, setTimeframe] = useState('month');
  
  // Add state for dropdown open/closed
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Ref for detecting clicks outside the dropdown
  const dropdownRef = useRef(null);
  
  // Add effect to handle clicks outside the dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    
    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      // Remove event listener on cleanup
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Add state for date range selection
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Generate available months (last 12 months)
  const availableMonths = Array(12).fill(0).map((_, i) => {
    const month = (currentMonth - 11 + i + 12) % 12;
    const year = currentYear - (month > currentMonth ? 1 : 0);
    return {
      value: `${year}-${month + 1}`,
      label: new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
    };
  });
  
  // Default to current month
  const [selectedMonths, setSelectedMonths] = useState([
    `${currentYear}-${currentMonth + 1}`
  ]);

  // Fetch summary and chart data with TanStack Query
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', user?.id, isAdmin, selectedMonths],
    queryFn: async () => {
      if (!user) return { summary: { totalIncome: 0, totalExpense: 0, balance: 0 }, chartData: [], categoryData: [] };

      // Parse selected months into date ranges
      const dateRanges = selectedMonths.map(monthStr => {
        const [year, month] = monthStr.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of month
        return {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        };
      });
      
      // Fetch summary data for selected date ranges
      let query = supabase.from('transactions').select(`
        type, amount, date, category_id,
        categories (id, name, color)
      `);
      
      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }
      
      // Add date filter
      if (dateRanges.length === 1) {
        query = query
          .gte('date', dateRanges[0].start)
          .lte('date', dateRanges[0].end);
      } else if (dateRanges.length > 1) {
        // For multiple months, use OR filter
        const dateFilter = dateRanges.map(range => 
          `date.gte.${range.start},date.lte.${range.end}`
        ).join(',');
        query = query.or(dateFilter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const totalIncome = data
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number.parseFloat(t.amount), 0);
        
      const totalExpense = data
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number.parseFloat(t.amount), 0);
        
      const summary = {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
      };
      
      // Fetch chart data for last 12 months
      const startDate = new Date(currentYear - 1, currentMonth, 1);
      
      let chartQuery = supabase
        .from('transactions')
        .select(`
          amount, type, date, category_id,
          categories (id, name, color)
        `)
        .gte('date', startDate.toISOString().split('T')[0]);
        
      if (!isAdmin) {
        chartQuery = chartQuery.eq('user_id', user.id);
      }
      
      const { data: chartData, error: chartError } = await chartQuery;
      
      if (chartError) throw chartError;
      
      // Process chart data by month
      const monthlyData = Array(12).fill(0).map((_, i) => {
        const month = (currentMonth - 11 + i + 12) % 12;
        const year = currentYear - (month > currentMonth ? 1 : 0);
        const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'short' });
        
        const monthTransactions = chartData.filter(t => {
          const date = new Date(t.date);
          return date.getMonth() === month && date.getFullYear() === year;
        });
        
        const income = monthTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + Number.parseFloat(t.amount), 0);
          
        const expense = monthTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + Number.parseFloat(t.amount), 0);
          
        return {
          name: monthName,
          income,
          expense,
          balance: income - expense,
        };
      });
      
      // Process category data by month for expenses
      const categoryMonthlyData = Array(12).fill(0).map((_, i) => {
        const month = (currentMonth - 11 + i + 12) % 12;
        const year = currentYear - (month > currentMonth ? 1 : 0);
        const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'short' });
        
        const monthTransactions = chartData.filter(t => {
          const date = new Date(t.date);
          return date.getMonth() === month && date.getFullYear() === year && t.type === 'expense';
        });
        
        // Group expenses by category
        const categorized = monthTransactions.reduce((acc, t) => {
          // Get category name from the joined categories table
          const categoryName = t.categories?.name || 'Uncategorized';
          acc[categoryName] = (acc[categoryName] || 0) + Number.parseFloat(t.amount);
          return acc;
        }, {});
        
        return {
          name: monthName,
          ...categorized
        };
      });
      
      return { summary, chartData: monthlyData, categoryData: categoryMonthlyData };
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const summary = data?.summary || { totalIncome: 0, totalExpense: 0, balance: 0 };
  const chartData = data?.chartData || [];
  const categoryData = data?.categoryData || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">{isAdmin ? 'Family' : 'Personal'} Finance Dashboard</h1>
      
      {/* Date range selector with collapsible dropdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date Range Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border rounded-md relative" ref={dropdownRef}>
              <div 
                className="p-2 flex flex-wrap gap-1 cursor-pointer"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {selectedMonths.length > 0 ? (
                  selectedMonths.map(month => {
                    const monthLabel = availableMonths.find(m => m.value === month)?.label || month;
                    return (
                      <div 
                        key={month} 
                        className="bg-secondary text-secondary-foreground px-2 py-1 rounded-sm text-xs flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent toggling dropdown when removing item
                          setSelectedMonths(prev => prev.filter(m => m !== month));
                        }}
                      >
                        {monthLabel}
                        <span className="text-muted-foreground hover:text-foreground">
                          ×
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-muted-foreground text-sm">Select months...</span>
                )}
              </div>
              
              {isDropdownOpen && (
                <div className="border-t p-2 max-h-48 overflow-y-auto absolute w-full bg-background z-10 shadow-md rounded-b-md">
                  {availableMonths.map((month) => (
                    <div 
                      key={month.value} 
                      className={`px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-secondary ${
                        selectedMonths.includes(month.value) ? 'bg-secondary' : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent toggling dropdown when selecting
                        if (selectedMonths.includes(month.value)) {
                          setSelectedMonths(prev => prev.filter(m => m !== month.value));
                        } else {
                          setSelectedMonths(prev => [...prev, month.value]);
                        }
                      }}
                    >
                      {month.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground">
              {selectedMonths.length === 0 ? (
                "Please select at least one month"
              ) : selectedMonths.length === 1 ? (
                `Showing data for ${availableMonths.find(m => m.value === selectedMonths[0])?.label}`
              ) : (
                `Showing consolidated data for ${selectedMonths.length} selected months`
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalIncome.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalExpense.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <DollarSign className={`h-4 w-4 ${summary.balance >= 0 ? 'text-green-500' : 'text-red-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.balance.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
          <Tabs defaultValue="month" onValueChange={setTimeframe}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="month">Monthly</TabsTrigger>
              <TabsTrigger value="quarter">Quarterly</TabsTrigger>
              <TabsTrigger value="year">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="h-[300px] md:h-96">
          <FinancialChart data={chartData} timeframe={timeframe} />
        </CardContent>
      </Card>
      
      {/* New Card for Category Expenses Stacked Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Expense Categories</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] md:h-96">
          <CategoryStackedChart data={categoryData} />
        </CardContent>
      </Card>
    </div>
  );
}
