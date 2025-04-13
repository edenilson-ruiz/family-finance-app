"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface CategoryFormProps {
  onSubmit: (data: any) => void
  initialData?: any
}

export function CategoryForm({ onSubmit, initialData }: CategoryFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    color: "#3b82f6",
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        color: initialData.color || "#3b82f6",
      })
    }
  }, [initialData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Category Name</Label>
        <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="color">Color</Label>
        <div className="flex gap-2">
          <Input
            id="color"
            name="color"
            type="color"
            value={formData.color}
            onChange={handleChange}
            className="h-10 w-10 cursor-pointer p-1"
          />
          <Input value={formData.color} onChange={handleChange} name="color" className="flex-1" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit">{initialData ? "Update" : "Create"} Category</Button>
      </div>
    </form>
  )
}
