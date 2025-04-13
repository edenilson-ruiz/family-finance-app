"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Receipt, Tag, Users, FileDown } from "lucide-react"

const routes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    color: "text-sky-500",
  },
  {
    label: "Transactions",
    icon: Receipt,
    href: "/transactions",
    color: "text-violet-500",
  },
  {
    label: "Categories",
    icon: Tag,
    href: "/categories",
    color: "text-pink-700",
  },
  {
    label: "Export Data",
    icon: FileDown,
    href: "/export",
    color: "text-emerald-500",
  },
  {
    label: "Users",
    icon: Users,
    href: "/users",
    color: "text-orange-500",
    adminOnly: true,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { isAdmin } = useAuth()

  return (
    <div className="flex h-full w-64 flex-col border-r bg-gray-50">
      <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
        <nav className="mt-5 flex-1 space-y-1 px-2">
          {routes
            .filter((route) => !route.adminOnly || isAdmin)
            .map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "group flex items-center rounded-md px-2 py-2 text-sm font-medium",
                  pathname === route.href
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                <route.icon className={cn("mr-3 h-5 w-5 flex-shrink-0", route.color)} />
                {route.label}
              </Link>
            ))}
        </nav>
      </div>
    </div>
  )
}
