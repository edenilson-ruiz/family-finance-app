"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { TransactionForm } from "@/components/transaction-form"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Plus, Download, Edit, Trash2, Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { useDebounce } from "@/hooks/use-debounce"

interface SearchParams {
  description: string
  type: string
  category: string
  dateRange: {
    from: Date | null
    to: Date | null
  }
}

const formatLocalDate = (dateString: string) => {
  const date = new Date(dateString)
  return format(date, "MMM dd, yyyy")
}

export default function TransactionsPage() {
  const { user, isAdmin } = useAuth()
  const [transactions, setTransactions] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<any>(null)
  
  // Search and filter states
  const [searchParams, setSearchParams] = useState<SearchParams>({
    description: "",
    type: "all",
    category: "all",
    dateRange: { from: null, to: null }
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10

  const [tempSearchParams, setTempSearchParams] = useState<SearchParams>({
    description: "",
    type: "all",
    category: "all",
    dateRange: { from: null, to: null }
  })

  const debouncedDescription = useDebounce(tempSearchParams.description, 500)

  // Update searchParams when debounced description changes
  useEffect(() => {
    setSearchParams(prev => ({
      ...prev,
      description: debouncedDescription
    }))
  }, [debouncedDescription])

  const handleTempSearch = (field: keyof SearchParams, value: any) => {
    setTempSearchParams(prev => ({ ...prev, [field]: value }))
  }

  const handleApplyFilters = () => {
    setSearchParams(tempSearchParams)
    setCurrentPage(1)
  }

  const fetchTransactions = async () => {
    if (!user) return

    try {
      setLoading(true)
      let query = supabase
        .from("transactions")
        .select(`
          *,
          categories (id, name, color),
          profiles (id, full_name, email)
        `, { count: 'exact' })
        .order("date", { ascending: false })

      // Apply filters
      if (!isAdmin) {
        query = query.eq("user_id", user.id)
      }

      // Search by description
      if (searchParams.description && searchParams.description.trim() !== "") {
        query = query.ilike("description", `%${searchParams.description.trim()}%`)
      }

      // Filter by type
      if (searchParams.type && searchParams.type !== "all") {
        query = query.eq("type", searchParams.type)
      }

      // Filter by category
      if (searchParams.category && searchParams.category !== "all") {
        query = query.eq("category_id", searchParams.category)
      }

      // Filter by date range
      if (searchParams.dateRange.from) {
        const fromDate = new Date(searchParams.dateRange.from)
        fromDate.setUTCHours(0, 0, 0, 0)
        query = query.gte("date", fromDate.toISOString())
      }

      if (searchParams.dateRange.to) {
        const toDate = new Date(searchParams.dateRange.to)
        toDate.setUTCHours(23, 59, 59, 999)
        query = query.lte("date", toDate.toISOString())
      }

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      setTransactions(data || [])
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error("Error fetching transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    if (!user) return

    try {
      let query = supabase.from("categories").select("*")

      if (!isAdmin) {
        query = query.eq("user_id", user.id)
      }

      const { data, error } = await query

      if (error) throw error

      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  // Initialize data when component mounts or user changes
  useEffect(() => {
    let mounted = true

    const initializeData = async () => {
      if (user && mounted) {
        try {
          setLoading(true)
          await Promise.all([fetchTransactions(), fetchCategories()])
        } catch (error) {
          console.error("Error initializing data:", error)
        } finally {
          if (mounted) {
            setLoading(false)
          }
        }
      }
    }

    initializeData()

    return () => {
      mounted = false
    }
  }, [user, isAdmin])

  // Separate effect for search params and pagination
  useEffect(() => {
    let mounted = true

    const fetchData = async () => {
      if (user && mounted) {
        try {
          setLoading(true)
          await fetchTransactions()
        } catch (error) {
          console.error("Error fetching transactions:", error)
        } finally {
          if (mounted) {
            setLoading(false)
          }
        }
      }
    }

    fetchData()

    return () => {
      mounted = false
    }
  }, [searchParams, currentPage])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return

    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id)

      if (error) throw error

      setTransactions(transactions.filter((t) => t.id !== id))
    } catch (error) {
      console.error("Error deleting transaction:", error)
    }
  }

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction)
    setOpenDialog(true)
  }

  const handleExportCSV = () => {
    // Convert transactions to CSV
    const headers = ["Date", "Description", "Amount", "Type", "Category"]
    const csvRows = [headers.join(",")]

    transactions.forEach((t) => {
      const row = [
        t.date,
        `"${t.description.replace(/"/g, '""')}"`,
        t.amount,
        t.type,
        t.categories?.name || "Uncategorized",
      ]
      csvRows.push(row.join(","))
    })

    const csvContent = csvRows.join("\n")

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `transactions_${format(new Date(), "yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFormSubmit = async (formData: any) => {
    try {
      if (editingTransaction) {
        // Update existing transaction
        const { error } = await supabase
          .from("transactions")
          .update({
            description: formData.description,
            amount: formData.amount,
            type: formData.type,
            date: formData.date,
            category_id: formData.category_id,
          })
          .eq("id", editingTransaction.id)

        if (error) throw error
      } else {
        // Create new transaction
        const { error } = await supabase.from("transactions").insert({
          description: formData.description,
          amount: formData.amount,
          type: formData.type,
          date: formData.date,
          category_id: formData.category_id,
          user_id: user?.id,
        })

        if (error) throw error
      }

      setOpenDialog(false)
      setEditingTransaction(null)
      fetchTransactions()
    } catch (error) {
      console.error("Error saving transaction:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Transactions</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingTransaction(null)} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingTransaction ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
                <DialogDescription>
                  {editingTransaction ? "Update the transaction details below." : "Fill in the transaction details below."}
                </DialogDescription>
              </DialogHeader>
              <TransactionForm categories={categories} onSubmit={handleFormSubmit} initialData={editingTransaction} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <CardTitle>Recent Transactions</CardTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search description..."
                  value={tempSearchParams.description}
                  onChange={(e) => handleTempSearch("description", e.target.value)}
                  className="w-full"
                />
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <Select value={tempSearchParams.type} onValueChange={(value) => handleTempSearch("type", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tempSearchParams.category} onValueChange={(value) => handleTempSearch("category", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <DateRangePicker
                  value={tempSearchParams.dateRange.from ? {
                    from: tempSearchParams.dateRange.from,
                    to: tempSearchParams.dateRange.to || undefined
                  } : undefined}
                  onChange={(range) => handleTempSearch("dateRange", {
                    from: range?.from || null,
                    to: range?.to || null
                  })}
                />
                <Button onClick={handleApplyFilters} size="icon" variant="outline">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <p className="text-muted-foreground">No transactions found</p>
              <Button variant="link" onClick={() => setOpenDialog(true)} className="mt-2">
                Add your first transaction
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="hidden sm:table-cell">Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="hidden sm:table-cell">Category</TableHead>
                      {isAdmin && <TableHead className="hidden sm:table-cell">User</TableHead>}
                      <TableHead>Amount</TableHead>
                      <TableHead className="hidden sm:table-cell">Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="hidden sm:table-cell">
                          {formatLocalDate(transaction.date)}
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" style={{ backgroundColor: transaction.categories?.color }}>
                            {transaction.categories?.name}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="hidden sm:table-cell">
                            {transaction.profiles?.full_name || transaction.profiles?.email}
                          </TableCell>
                        )}
                        <TableCell className={`font-medium ${transaction.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                          ${Number.parseFloat(transaction.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}>
                            {transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(transaction)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(transaction.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
