"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface UserFormProps {
  onSubmit: (data: any) => void
  initialData?: any
}

export function UserForm({ onSubmit, initialData }: UserFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    is_admin: false,
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        email: initialData.email || "",
        password: "",
        full_name: initialData.full_name || "",
        is_admin: initialData.is_admin || false,
      })
    }
  }, [initialData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, is_admin: checked }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!initialData && (
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required={!initialData}
          />
        </div>
      )}

      {!initialData && (
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required={!initialData}
            minLength={6}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="full_name">Full Name</Label>
        <Input id="full_name" name="full_name" value={formData.full_name} onChange={handleChange} />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox 
          id="is_admin" 
          checked={formData.is_admin} 
          onCheckedChange={handleCheckboxChange} 
        />
        <Label htmlFor="is_admin" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Super Admin
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit">{initialData ? "Update" : "Create"} User</Button>
      </div>
    </form>
  )
}
