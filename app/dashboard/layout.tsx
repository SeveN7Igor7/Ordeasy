"use client"

import type React from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"
import { Store, LogOut, Globe, Copy } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, restaurantId, restaurantSlug, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user || !restaurantId) {
      router.push("/auth")
    }
  }, [user, restaurantId, router])

  const copyMenuLink = () => {
    if (typeof window !== "undefined" && restaurantSlug) {
      const link = `${window.location.origin}/${restaurantSlug}`
      navigator.clipboard.writeText(link)
      alert("Link do cardápio copiado!")
    }
  }

  if (!user || !restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="bg-orange-500 p-2 rounded-lg">
                <Store className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">OrdEasy</h1>
                <p className="text-sm text-gray-500">Sistema de Pedidos</p>
              </div>
            </Link>

            <div className="flex items-center space-x-4">
              <button
                onClick={copyMenuLink}
                className="flex items-center space-x-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">Cardápio</span>
                <Copy className="h-4 w-4" />
              </button>

              <button
                onClick={logout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {children}
    </div>
  )
}
