"use client"

import { useState, useEffect } from "react"
import { database } from "@/lib/firebase"
import { ref, onValue } from "firebase/database"
import { useAuth } from "@/lib/auth-context"
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Clock, 
  ShoppingCart 
} from "lucide-react"

export default function DashboardStats() {
  const { restaurantId } = useAuth()
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalSales: 0,
    averageOrderValue: 0,
    activeTables: 0,
    totalTables: 0,
    averagePreparationTime: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!restaurantId) return

    setLoading(true)

    // Carregar estatísticas de pedidos
    const ordersRef = ref(database, `restaurants/${restaurantId}/orders`)
    const unsubscribeOrders = onValue(ordersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const orders = Object.values(data) as any[]
        
        // Calcular estatísticas
        const totalOrders = orders.length
        const pendingOrders = orders.filter(order => 
          order.status === "pending" || order.status === "confirmed" || order.status === "preparing"
        ).length
        
        const completedOrders = orders.filter(order => order.status === "completed")
        const totalSales = completedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
        
        const averageOrderValue = completedOrders.length > 0 
          ? totalSales / completedOrders.length 
          : 0
        
        // Calcular tempo médio de preparo
        const ordersWithPreparationTime = completedOrders.filter(
          order => order.completedAt && order.confirmedAt
        )
        
        const totalPreparationTime = ordersWithPreparationTime.reduce(
          (sum, order) => sum + (order.completedAt - order.confirmedAt), 
          0
        )
        
        const averagePreparationTime = ordersWithPreparationTime.length > 0
          ? totalPreparationTime / ordersWithPreparationTime.length / 60000 // Converter para minutos
          : 0
        
        setStats(prev => ({
          ...prev,
          totalOrders,
          pendingOrders,
          totalSales,
          averageOrderValue,
          averagePreparationTime
        }))
      }
    })

    // Carregar estatísticas de mesas
    const tablesRef = ref(database, `restaurants/${restaurantId}/tables`)
    const unsubscribeTables = onValue(tablesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const tables = Object.values(data) as any[]
        
        const totalTables = tables.length
        const activeTables = tables.filter(table => table.status === "occupied").length
        
        setStats(prev => ({
          ...prev,
          totalTables,
          activeTables
        }))
      }
      
      setLoading(false)
    })

    return () => {
      unsubscribeOrders()
      unsubscribeTables()
    }
  }, [restaurantId])

  // Formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-md animate-pulse">
            <div className="h-10 bg-gray-200 rounded mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total de Vendas */}
      <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total de Vendas</p>
            <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalSales)}</h3>
          </div>
          <div className="p-2 bg-green-100 rounded-lg">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
        </div>
        <div className="mt-2">
          <p className="text-xs text-gray-500">
            Ticket Médio: {formatCurrency(stats.averageOrderValue)}
          </p>
        </div>
      </div>

      {/* Pedidos */}
      <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Pedidos</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalOrders}</h3>
          </div>
          <div className="p-2 bg-blue-100 rounded-lg">
            <ShoppingCart className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <div className="mt-2">
          <p className="text-xs text-gray-500">
            {stats.pendingOrders} pedidos em andamento
          </p>
        </div>
      </div>

      {/* Mesas Ativas */}
      <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Mesas Ativas</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.activeTables} / {stats.totalTables}</h3>
          </div>
          <div className="p-2 bg-purple-100 rounded-lg">
            <Users className="h-6 w-6 text-purple-600" />
          </div>
        </div>
        <div className="mt-2">
          <p className="text-xs text-gray-500">
            {Math.round((stats.activeTables / (stats.totalTables || 1)) * 100)}% de ocupação
          </p>
        </div>
      </div>

      {/* Tempo Médio de Preparo */}
      <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-500">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Tempo Médio de Preparo</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {stats.averagePreparationTime.toFixed(1)} min
            </h3>
          </div>
          <div className="p-2 bg-orange-100 rounded-lg">
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
        </div>
        <div className="mt-2">
          <p className="text-xs text-gray-500">
            Baseado em {stats.totalOrders - stats.pendingOrders} pedidos concluídos
          </p>
        </div>
      </div>
    </div>
  )
}
