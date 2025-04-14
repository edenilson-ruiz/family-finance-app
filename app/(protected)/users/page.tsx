"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { UserForm } from "@/components/user-form"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Plus, Edit, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export default function UsersPage() {
  const { user, isAdmin } = useAuth()
  const [openDialog, setOpenDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const router = useRouter()
  const queryClient = useQueryClient()

  // Redirect non-admin users
  if (!isAdmin) {
    router.push("/dashboard")
    return null
  }

  // Query for fetching users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      if (!user || !isAdmin) return []
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!user && isAdmin
  })

  // Mutation for deleting a user
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.auth.admin.deleteUser(id)
      if (error) throw error
      return id
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(['users'], (old: any[] = []) => 
        old.filter(u => u.id !== deletedId)
      )
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })

  // Mutation for creating/updating a user
  const saveUserMutation = useMutation({
    mutationFn: async (formData: any) => {
      if (editingUser) {
        // Update existing user
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: formData.full_name,
            is_admin: formData.is_admin,
          })
          .eq("id", editingUser.id)

        if (error) throw error
        return { ...editingUser, ...formData }
      } else {
        // Create new user
        const { data, error } = await supabase.auth.admin.createUser({
          email: formData.email,
          password: formData.password,
          email_confirm: true,
          user_metadata: {
            full_name: formData.full_name,
          },
        })

        if (error) throw error

        // Set admin status in profiles
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ is_admin: formData.is_admin })
          .eq("id", data.user.id)

        if (profileError) throw profileError
        return data.user
      }
    },
    onSuccess: () => {
      setOpenDialog(false)
      setEditingUser(null)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })

  const handleDelete = async (id: string) => {
    if (id === user?.id) {
      alert("You cannot delete your own account")
      return
    }

    if (!confirm("Are you sure you want to delete this user?")) return
    deleteUserMutation.mutate(id)
  }

  const handleEdit = (user: any) => {
    setEditingUser(user)
    setOpenDialog(true)
  }

  const handleFormSubmit = (formData: any) => {
    saveUserMutation.mutate(formData)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Users Management</h1>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingUser(null)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
              <DialogDescription>
                {editingUser ? "Update the user details below." : "Fill in the user details below."}
              </DialogDescription>
            </DialogHeader>
            <UserForm 
              onSubmit={handleFormSubmit} 
              initialData={editingUser} 
              isSubmitting={saveUserMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <p className="text-muted-foreground">No users found</p>
              <Button variant="link" onClick={() => setOpenDialog(true)} className="mt-2">
                Add your first user
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="hidden sm:table-cell">Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="hidden sm:table-cell">Role</TableHead>
                    <TableHead className="hidden sm:table-cell">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="hidden sm:table-cell">{u.full_name || "N/A"}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={u.is_admin ? "default" : "outline"}>
                          {u.is_admin ? "Super Admin" : "User"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{format(new Date(u.created_at), "MMM dd, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(u)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(u.id)}
                            disabled={u.id === user?.id || deleteUserMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
