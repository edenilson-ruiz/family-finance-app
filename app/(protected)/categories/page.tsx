"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { CategoryForm } from "@/components/category-form"
import { Plus, Edit, Trash2 } from "lucide-react"
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from "@tanstack/react-query"



function CategoriesPageContent() {
  const { user } = useAuth()
  const [openDialog, setOpenDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)  
  const queryClient = useQueryClient()

  // Query for fetching categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("name")
      
      if (error) throw error
      return data || []
    },
    enabled: !!user,
    // Si no quieres que refetchee al volver a la ventana
    refetchOnWindowFocus: false,
    // Si no quieres que refetchee al reconectar
    refetchOnReconnect: false,
    // Para que no intente refetchear cuando el cache está “stale” en el montaje
    refetchOnMount: false,
    // Evita que los datos se marquen como ‘stale’ a los pocos minutos
    staleTime: Infinity,
    // Mantiene los datos anteriores aunque se haga un nuevo fetch
    keepPreviousData: true,
  })

  // Mutation for creating a new category
  const createMutation = useMutation({
    mutationFn: async (formData: any) => {
      const { error } = await supabase.from("categories").insert({
        name: formData.name,
        color: formData.color,
        user_id: user?.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', user?.id] })
      setOpenDialog(false)
      setEditingCategory(null)
    }
  })

  // Mutation for updating a category
  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string, formData: any }) => {
      const { error } = await supabase
        .from("categories")
        .update({
          name: formData.name,
          color: formData.color,
        })
        .eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', user?.id] })
      setOpenDialog(false)
      setEditingCategory(null)
    }
  })

  // Mutation for deleting a category
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', user?.id] })
    }
  })

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return
    deleteMutation.mutate(id)
  }

  const handleEdit = (category: any) => {
    setEditingCategory(category)
    setOpenDialog(true)
  }

  const handleFormSubmit = async (formData: any) => {
    if (editingCategory) {
      // Update existing category
      updateMutation.mutate({ id: editingCategory.id, formData })
    } else {
      // Create new category
      createMutation.mutate(formData)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Categories</h1>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingCategory(null)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
              <DialogDescription>
                {editingCategory ? "Update the category details below." : "Fill in the category details below."}
              </DialogDescription>
            </DialogHeader>
            <CategoryForm 
              onSubmit={handleFormSubmit} 
              initialData={editingCategory} 
              isSubmitting={createMutation.isPending || updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(category.id)}
                      disabled={deleteMutation.isPending}
                    >
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

const queryClient = new QueryClient()

export default function CategoriesPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <CategoriesPageContent />
    </QueryClientProvider>
  )
}