"use client"

import type React from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"
import { Store, LogOut, Globe, Copy, ShoppingCart, Package, Settings, BarChart3, Truck } from "lucide-react"

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
    } else {
      // Redirecionar com base nas chaves qrcodemode e deliverymode
      const path = router.pathname;
      if (path === "/dashboard") {
        if (user.qrcodemode) {
          // Se qrcodemode está ativo, mostrar dashboard QR
          // Já estamos na página correta
        } else if (user.deliverymode) {
          // Se apenas deliverymode está ativo, redirecionar para dashboard de delivery
          router.push("/dashboard/delivery");
        }
      }
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
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

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="bg-white w-16 md:w-64 border-r shadow-sm hidden sm:block">
          <nav className="p-4 space-y-2">
            <Link 
              href="/dashboard" 
              className={`flex items-center space-x-3 p-3 rounded-lg hover:bg-orange-50 text-gray-700 hover:text-orange-600 transition-colors ${!user?.qrcodemode && 'hidden'}`}
            >
              <BarChart3 className="h-5 w-5 flex-shrink-0" />
              <span className="hidden md:inline font-medium">Dashboard QR</span>
            </Link>
            
            <Link 
              href="/dashboard/delivery" 
              className={`flex items-center space-x-3 p-3 rounded-lg hover:bg-orange-50 text-gray-700 hover:text-orange-600 transition-colors ${!user?.deliverymode && 'hidden'}`}
            >
              <Truck className="h-5 w-5 flex-shrink-0" />
              <span className="hidden md:inline font-medium">Dashboard Delivery</span>
            </Link>
            
            <Link 
              href="/dashboard/orders" 
              className={`flex items-center space-x-3 p-3 rounded-lg hover:bg-orange-50 text-gray-700 hover:text-orange-600 transition-colors ${!user?.qrcodemode && 'hidden'}`}
            >
              <ShoppingCart className="h-5 w-5 flex-shrink-0" />
              <span className="hidden md:inline font-medium">Pedidos QR</span>
            </Link>
            
            <Link 
              href="/dashboard/menu" 
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-orange-50 text-gray-700 hover:text-orange-600 transition-colors"
            >
              <Package className="h-5 w-5 flex-shrink-0" />
              <span className="hidden md:inline font-medium">Cardápio</span>
            </Link>
            
            <Link 
              href="/dashboard/reports" 
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-orange-50 text-gray-700 hover:text-orange-600 transition-colors"
            >
              <BarChart3 className="h-5 w-5 flex-shrink-0" />
              <span className="hidden md:inline font-medium">Relatórios</span>
            </Link>
            
            <Link 
              href="/dashboard/inventory" 
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-orange-50 text-gray-700 hover:text-orange-600 transition-colors"
            >
              <Store className="h-5 w-5 flex-shrink-0" />
              <span className="hidden md:inline font-medium">Estoque</span>
            </Link>
            
            <Link 
              href="/dashboard/settings" 
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-orange-50 text-gray-700 hover:text-orange-600 transition-colors"
            >
              <Settings className="h-5 w-5 flex-shrink-0" />
              <span className="hidden md:inline font-medium">Configurações</span>
            </Link>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
