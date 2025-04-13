"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { format } from "date-fns"
import { Download } from "lucide-react"

export default function ExportPage() {
  const { user, isAdmin } = useAuth()
  const [exportType, setExportType] = useState("transactions")
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    if (!user) return

    setLoading(true)
    try {
      let data
      let headers
      let filename

      if (exportType === "transactions") {
        let query = supabase
          .from("transactions")
          .select(`
            *,
            categories (id, name, color),
            profiles (id, full_name, email)
          `)
          .order("date", { ascending: false })

        if (!isAdmin) {
          query = query.eq("user_id", user.id)
        }

        const { data: transactions, error } = await query

        if (error) throw error

        headers = ["Date", "Description", "Amount", "Type", "Category", "User"]
        data = transactions.map((t) => [
          t.date,
          `"${t.description.replace(/"/g, '""')}"`,
          t.amount,
          t.type,
          t.categories?.name || "Uncategorized",
          t.profiles?.full_name || t.profiles?.email || "Unknown",
        ])
        filename = `transactions_${format(new Date(), "yyyy-MM-dd")}.csv`
      } else if (exportType === "categories") {
        let query = supabase
          .from("categories")
          .select(`
            *,
            profiles (id, full_name, email)
          `)
          .order("name")

        if (!isAdmin) {
          query = query.eq("user_id", user.id)
        }

        const { data: categories, error } = await query

        if (error) throw error

        headers = ["Name", "Color", "User"]
        data = categories.map((c) => [
          `"${c.name.replace(/"/g, '""')}"`,
          c.color,
          c.profiles?.full_name || c.profiles?.email || "Unknown",
        ])
        filename = `categories_${format(new Date(), "yyyy-MM-dd")}.csv`
      }

      // Create CSV content
      const csvRows = [headers.join(",")]
      data.forEach((row) => {
        csvRows.push(row.join(","))
      })

      const csvContent = csvRows.join("\n")

      // Create download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", filename)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error exporting data:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Export Data</h1>

      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
          <CardDescription>
            Export your financial data as CSV files for use in spreadsheet applications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>Select data to export</Label>
            <RadioGroup value={exportType} onValueChange={setExportType} className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="transactions" id="transactions" />
                <Label htmlFor="transactions" className="cursor-pointer">
                  Transactions
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="categories" id="categories" />
                <Label htmlFor="categories" className="cursor-pointer">
                  Categories
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Button onClick={handleExport} disabled={loading}>
            <Download className="mr-2 h-4 w-4" />
            {loading ? "Exporting..." : "Export as CSV"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
