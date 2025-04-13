"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowUpRight, ArrowDownRight, DollarSign } from "lucide-react"
import { FinancialChart } from "@/components/financial-chart"

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState('month');

  useEffect(() => {
    if (!user) return;

    const fetchSummary = async () => {
      setLoading(true);
      try {
        // Fetch summary data
        let query = supabase
          .from('transactions')
          .select('type, amount');
        
        if (!isAdmin) {
          query = query.eq('user_id', user.id);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        const totalIncome = data
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + Number.parseFloat(t.amount), 0);
          
        const totalExpense = data
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + Number.parseFloat(t.amount), 0);
          
        setSummary({
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
        });
        
        // Fetch chart data
        const now = new Date();
        const startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        
        let chartQuery = supabase
          .from('transactions')
          .select('amount, type, date')
          .gte('date', startDate.toISOString().split('T')[0]);
          
        if (!isAdmin) {
          chartQuery = chartQuery.eq('user_id', user.id);
        }
        
        const { data: chartData, error: chartError } = await chartQuery;
        
        if (chartError) throw chartError;
        
        // Process chart data by month
        const monthlyData = Array(12).fill(0).map((_, i) => {
          const month = (now.getMonth() - 11 + i + 12) % 12;
          const year = now.getFullYear() - (month > now.getMonth() ? 1 : 0);
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
        
        setChartData(monthlyData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [user, isAdmin]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">{isAdmin ? 'Family' : 'Personal'} Finance Dashboard</h1>
      
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
    </div>
  );
}
