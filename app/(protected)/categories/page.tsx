"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CategoryForm } from "@/components/category-form"
import { Plus, Edit, Trash2 } from "lucide-react"

export default function CategoriesPage() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)

  const fetchCategories = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase.from("categories").select("*").eq("user_id", user.id).order("name")

      if (error) throw error

      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    const initializeData = async () => {
      if (user && mounted) {
        try {
          setLoading(true)
          await fetchCategories()
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
  }, [user])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return

    try {
      const { error } = await supabase.from("categories").delete().eq("id", id)

      if (error) throw error

      setCategories(categories.filter((c) => c.id !== id))
    } catch (error) {
      console.error("Error deleting category:", error)
    }
  }

  const handleEdit = (category: any) => {
    setEditingCategory(category)
    setOpenDialog(true)
  }

  const handleFormSubmit = async (formData: any) => {
    try {
      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from("categories")
          .update({
            name: formData.name,
            color: formData.color,
          })
          .eq("id", editingCategory.id)

        if (error) throw error
      } else {
        // Create new category
        const { error } = await supabase.from("categories").insert({
          name: formData.name,
          color: formData.color,
          user_id: user?.id,
        })

        if (error) throw error
      }

      setOpenDialog(false)
      setEditingCategory(null)
      fetchCategories()
    } catch (error) {
      console.error("Error saving category:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Categories</h1>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingCategory(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            </DialogHeader>
            <CategoryForm onSubmit={handleFormSubmit} initialData={editingCategory} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : categories.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <p className="text-muted-foreground">No categories found</p>
              <Button variant="link" onClick={() => setOpenDialog(true)} className="mt-2">
                Add your first category
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full" style={{ backgroundColor: category.color }} />
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
