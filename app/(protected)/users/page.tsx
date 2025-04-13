"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { UserForm } from "@/components/user-form"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Plus, Edit, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function UsersPage() {
  const { user, isAdmin } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const router = useRouter()

  const fetchUsers = async () => {
    if (!user || !isAdmin) return

    setLoading(true)
    try {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })

      if (error) throw error

      setUsers(data || [])
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAdmin) {
      router.push("/dashboard")
      return
    }

    fetchUsers()
  }, [user, isAdmin, router])

  const handleDelete = async (id: string) => {
    if (id === user?.id) {
      alert("You cannot delete your own account")
      return
    }

    if (!confirm("Are you sure you want to delete this user?")) return

    try {
      // Delete user from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(id)

      if (authError) throw authError

      // Profile will be deleted by cascade
      setUsers(users.filter((u) => u.id !== id))
    } catch (error) {
      console.error("Error deleting user:", error)
    }
  }

  const handleEdit = (user: any) => {
    setEditingUser(user)
    setOpenDialog(true)
  }

  const handleFormSubmit = async (formData: any) => {
    try {
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
      }

      setOpenDialog(false)
      setEditingUser(null)
      fetchUsers()
    } catch (error) {
      console.error("Error saving user:", error)
    }
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Users Management</h1>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingUser(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
            </DialogHeader>
            <UserForm onSubmit={handleFormSubmit} initialData={editingUser} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
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
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.full_name || "N/A"}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.is_admin ? "default" : "outline"}>
                          {u.is_admin ? "Super Admin" : "User"}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(u.created_at), "MMM dd, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(u)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(u.id)}
                            disabled={u.id === user?.id}
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
