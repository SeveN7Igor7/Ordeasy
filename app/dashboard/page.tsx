"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { database } from "@/lib/firebase"
import { ref, onValue, update } from "firebase/database"
import {
  BarChart3,
  Clock,
  DollarSign,
  CheckCircle,
  Eye,
  QrCode,
  Copy,
  Search,
  Store,
  Globe,
  TableIcon,
  MenuIcon,
  Bell,
  X,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"

interface Order {
  id: string
  restaurantId: string
  tableNumber: string
  customerName: string
  customerPhone?: string
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>
  total: number
  status: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled"
  paymentStatus: "pending" | "paid" | "failed"
  timestamp: number
  customerNote?: string
}

interface RestaurantTable {
  number: number
  status: "available" | "occupied" | "reserved" | "maintenance"
  capacity: number
  currentOrder?: string
}

export default function Dashboard() {
  const { user, restaurantId, restaurantSlug, loading: authLoading } = useAuth()
  const router = useRouter()

  const [orders, setOrders] = useState<Order[]>([])
  const [tables, setTables] = useState<Record<string, RestaurantTable>>({})
  const [restaurant, setRestaurant] = useState<any>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
  })

  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    averageOrderValue: 0,
    tablesOccupied: 0,
    totalTables: 0,
  })

  const [lastOrderCount, setLastOrderCount] = useState(0)
  const [newOrderNotification, setNewOrderNotification] = useState<Order | null>(null)

  useEffect(() => {
    console.log("📊 [DASHBOARD] Iniciando carregamento do dashboard...")
    console.log("📊 [DASHBOARD] Estado da autenticação:", {
      user: user ? `${user.email} (${user.id})` : null,
      restaurantId,
      restaurantSlug,
      authLoading,
    })

    // Atualizar informações de debug
    setDebugInfo({
      user: user
        ? {
            id: user.id,
            email: user.email,
            restaurantId: user.restaurantId,
            restaurantSlug: user.restaurantSlug,
          }
        : null,
      contextRestaurantId: restaurantId,
      contextRestaurantSlug: restaurantSlug,
      authLoading,
      timestamp: new Date().toISOString(),
    })

    if (authLoading) {
      console.log("⏳ [DASHBOARD] Aguardando autenticação...")
      return
    }

    if (!user || !restaurantId) {
      console.log("🚫 [DASHBOARD] Usuário não autenticado, redirecionando para login...")
      router.push("/auth")
      return
    }

    console.log("✅ [DASHBOARD] Usuário autenticado, carregando dados...")
    console.log("🏪 [DASHBOARD] ID do restaurante:", restaurantId)
    console.log("🏷️ [DASHBOARD] Slug do restaurante:", restaurantSlug)

    setLoading(true)
    setError(null)

    // Carregar dados do restaurante
    console.log("🔍 [DASHBOARD] Buscando dados do restaurante no Firebase...")
    const restaurantRef = ref(database, `restaurants/${restaurantId}`)

    const unsubscribeRestaurant = onValue(
      restaurantRef,
      (snapshot) => {
        console.log("📡 [DASHBOARD] Resposta do Firebase para restaurante:")
        console.log("📡 [DASHBOARD] Snapshot existe:", snapshot.exists())

        if (snapshot.exists()) {
          const data = snapshot.val()
          console.log("✅ [DASHBOARD] Dados do restaurante carregados:")
          console.log("📄 [DASHBOARD] Nome:", data.name)
          console.log("📄 [DASHBOARD] Slug:", data.slug)
          console.log("📄 [DASHBOARD] Owner ID:", data.ownerId)
          console.log("📄 [DASHBOARD] Dados completos:", data)

          setRestaurant(data)
          setTables(data.tables || {})
          setError(null)

          console.log("🎉 [DASHBOARD] Restaurante carregado com sucesso!")
        } else {
          console.error("❌ [DASHBOARD] Restaurante não encontrado no Firebase!")
          console.error("❌ [DASHBOARD] ID buscado:", restaurantId)
          console.error("❌ [DASHBOARD] Caminho completo:", `restaurants/${restaurantId}`)

          setError(`Restaurante não encontrado (ID: ${restaurantId})`)

          // Tentar buscar todos os restaurantes para debug
          console.log("🔍 [DASHBOARD] Buscando todos os restaurantes para debug...")
          const allRestaurantsRef = ref(database, "restaurants")
          onValue(
            allRestaurantsRef,
            (allSnapshot) => {
              if (allSnapshot.exists()) {
                const allRestaurants = allSnapshot.val()
                console.log("📋 [DASHBOARD] Todos os restaurantes no Firebase:", Object.keys(allRestaurants))
                console.log("📋 [DASHBOARD] Detalhes dos restaurantes:", allRestaurants)
              } else {
                console.log("📋 [DASHBOARD] Nenhum restaurante encontrado no Firebase")
              }
            },
            { onlyOnce: true },
          )
        }
        setLoading(false)
      },
      (error) => {
        console.error("💥 [DASHBOARD] Erro ao carregar restaurante:", error)
        setError(`Erro ao carregar dados: ${error.message}`)
        setLoading(false)
      },
    )

    // Carregar pedidos
    console.log("🔍 [DASHBOARD] Buscando pedidos do restaurante...")
    const ordersRef = ref(database, `restaurants/${restaurantId}/orders`)
    const unsubscribeOrders = onValue(ordersRef, (snapshot) => {
      console.log("📡 [DASHBOARD] Resposta do Firebase para pedidos:")
      console.log("📡 [DASHBOARD] Snapshot de pedidos existe:", snapshot.exists())

      const data = snapshot.val()

      if (data) {
        console.log("📋 [DASHBOARD] Pedidos encontrados:", Object.keys(data).length)
        console.log("📄 [DASHBOARD] Dados dos pedidos:", data)

        const ordersList = Object.entries(data)
          .map(([id, order]: [string, any]) => ({
            id,
            ...order,
          }))
          .sort((a, b) => b.timestamp - a.timestamp)

        setOrders(ordersList)
        calculateStats(ordersList, tables)

        // Detectar novos pedidos
        if (ordersList.length > lastOrderCount && lastOrderCount > 0) {
          const newOrder = ordersList[0]
          console.log("🔔 [DASHBOARD] Novo pedido detectado:", newOrder)
          setNewOrderNotification(newOrder)
          playNotificationSound()
          setTimeout(() => setNewOrderNotification(null), 5000)
        }
        setLastOrderCount(ordersList.length)
      } else {
        console.log("📋 [DASHBOARD] Nenhum pedido encontrado")
        setOrders([])
        calculateStats([], tables)
      }
    })

    // Cleanup
    return () => {
      console.log("🧹 [DASHBOARD] Limpando listeners do Firebase...")
      unsubscribeRestaurant()
      unsubscribeOrders()
    }
  }, [user, restaurantId, authLoading, router, lastOrderCount])

  const calculateStats = (ordersList: Order[], tablesData: Record<string, RestaurantTable>) => {
    console.log("📊 [DASHBOARD] Calculando estatísticas...")

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayOrders = ordersList.filter((order) => new Date(order.timestamp) >= today)

    const totalOrders = todayOrders.length
    const totalRevenue = todayOrders
      .filter((order) => order.status !== "cancelled")
      .reduce((sum, order) => sum + order.total, 0)

    const pendingOrders = todayOrders.filter((order) =>
      ["pending", "confirmed", "preparing"].includes(order.status),
    ).length

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const tablesOccupied = Object.values(tablesData).filter((table) => table.status === "occupied").length
    const totalTables = Object.keys(tablesData).length

    const newStats = {
      totalOrders,
      totalRevenue,
      pendingOrders,
      averageOrderValue,
      tablesOccupied,
      totalTables,
    }

    console.log("📊 [DASHBOARD] Estatísticas calculadas:", newStats)
    setStats(newStats)
  }

  const playNotificationSound = () => {
    try {
      console.log("🔔 [DASHBOARD] Tocando som de notificação...")
      const audio = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmkeBzuG0fPTfSsFJn/M7+GNPQ0UVKTW68tgFQwvfsPwrG8fDjiD1/LNdSgFIHTC6d2QQAw",
      )
      audio.play().catch(() => {
        console.log("🔇 [DASHBOARD] Não foi possível tocar o som")
      })
    } catch (error) {
      console.log("🔇 [DASHBOARD] Erro ao tocar som:", error)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
    try {
      console.log("🔄 [DASHBOARD] Atualizando status do pedido:", orderId, "para", newStatus)

      // Buscar dados do pedido antes da atualização
      const order = orders.find((o) => o.id === orderId)

      const orderRef = ref(database, `restaurants/${restaurantId}/orders/${orderId}`)
      await update(orderRef, { status: newStatus })

      // Se o pedido foi entregue ou cancelado, liberar a mesa
      if ((newStatus === "delivered" || newStatus === "cancelled") && order) {
        console.log("🪑 [DASHBOARD] Liberando mesa:", order.tableNumber)
        const tableId = `table${order.tableNumber}`
        const tableRef = ref(database, `restaurants/${restaurantId}/tables/${tableId}`)
        await update(tableRef, { status: "available" })
        console.log("✅ [DASHBOARD] Mesa liberada com sucesso!")
      }

      console.log("✅ [DASHBOARD] Status atualizado com sucesso!")
    } catch (error) {
      console.error("💥 [DASHBOARD] Erro ao atualizar status:", error)
    }
  }

  const updatePaymentStatus = async (orderId: string, paymentStatus: "pending" | "paid" | "failed") => {
    try {
      console.log("💳 [DASHBOARD] Atualizando status de pagamento:", orderId, "para", paymentStatus)
      const orderRef = ref(database, `restaurants/${restaurantId}/orders/${orderId}`)
      await update(orderRef, { paymentStatus })
      console.log("✅ [DASHBOARD] Status de pagamento atualizado!")
    } catch (error) {
      console.error("💥 [DASHBOARD] Erro ao atualizar pagamento:", error)
    }
  }

  const copyMenuLink = () => {
    if (restaurantSlug) {
      const link = `${window.location.origin}/${restaurantSlug}`
      navigator.clipboard.writeText(link)
      console.log("📋 [DASHBOARD] Link do cardápio copiado:", link)
      alert("Link do cardápio copiado!")
    } else {
      console.error("❌ [DASHBOARD] Slug do restaurante não disponível")
      alert("Erro: Slug do restaurante não disponível")
    }
  }

  const generateQRCode = (tableNumber: number) => {
    if (restaurantSlug) {
      const link = `${window.location.origin}/${restaurantSlug}?mesa=${tableNumber}`
      console.log("📱 [DASHBOARD] Gerando QR Code para mesa", tableNumber, ":", link)
      window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`, "_blank")
    } else {
      console.error("❌ [DASHBOARD] Slug do restaurante não disponível para QR Code")
      alert("Erro: Slug do restaurante não disponível")
    }
  }

  const reloadPage = () => {
    console.log("🔄 [DASHBOARD] Recarregando página...")
    window.location.reload()
  }

  const filteredOrders = orders.filter((order) => {
    if (filters.status !== "all" && order.status !== filters.status) return false
    if (
      filters.search &&
      !order.id.toLowerCase().includes(filters.search.toLowerCase()) &&
      !order.customerName.toLowerCase().includes(filters.search.toLowerCase()) &&
      !order.tableNumber.includes(filters.search)
    )
      return false
    return true
  })

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "confirmed":
        return "bg-blue-100 text-blue-800"
      case "preparing":
        return "bg-orange-100 text-orange-800"
      case "ready":
        return "bg-green-100 text-green-800"
      case "delivered":
        return "bg-gray-100 text-gray-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "Pendente"
      case "confirmed":
        return "Confirmado"
      case "preparing":
        return "Preparando"
      case "ready":
        return "Pronto"
      case "delivered":
        return "Entregue"
      case "cancelled":
        return "Cancelado"
      default:
        return status
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case "paid":
        return "Pago"
      case "pending":
        return "Pendente"
      case "failed":
        return "Falhou"
      default:
        return status
    }
  }

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Carregando Dashboard</h2>
          <p className="text-gray-600 mb-4">
            {authLoading ? "Verificando autenticação..." : "Carregando dados do restaurante..."}
          </p>

          {/* Informações de Debug */}
          <div className="bg-gray-100 p-4 rounded-lg text-left text-sm">
            <h3 className="font-semibold mb-2">Informações de Debug:</h3>
            <div className="space-y-1 text-gray-700">
              <p>
                <strong>Auth Loading:</strong> {authLoading ? "Sim" : "Não"}
              </p>
              <p>
                <strong>Dashboard Loading:</strong> {loading ? "Sim" : "Não"}
              </p>
              <p>
                <strong>User ID:</strong> {user?.id || "Não definido"}
              </p>
              <p>
                <strong>Restaurant ID:</strong> {restaurantId || "Não definido"}
              </p>
              <p>
                <strong>Restaurant Slug:</strong> {restaurantSlug || "Não definido"}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-2xl mx-auto p-6">
          <div className="bg-red-100 p-4 rounded-full w-fit mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erro no Dashboard</h1>
          <p className="text-gray-600 mb-6">{error}</p>

          {/* Informações de Debug Detalhadas */}
          <div className="bg-gray-100 p-6 rounded-lg text-left mb-6">
            <h3 className="font-semibold mb-4 text-center">Informações de Debug Detalhadas:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Estado da Autenticação:</h4>
                <div className="space-y-1 text-gray-700">
                  <p>
                    <strong>User ID:</strong> {user?.id || "❌ Não definido"}
                  </p>
                  <p>
                    <strong>Email:</strong> {user?.email || "❌ Não definido"}
                  </p>
                  <p>
                    <strong>Restaurant ID (User):</strong> {user?.restaurantId || "❌ Não definido"}
                  </p>
                  <p>
                    <strong>Restaurant Slug (User):</strong> {user?.restaurantSlug || "❌ Não definido"}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Estado do Contexto:</h4>
                <div className="space-y-1 text-gray-700">
                  <p>
                    <strong>Restaurant ID (Context):</strong> {restaurantId || "❌ Não definido"}
                  </p>
                  <p>
                    <strong>Restaurant Slug (Context):</strong> {restaurantSlug || "❌ Não definido"}
                  </p>
                  <p>
                    <strong>Auth Loading:</strong> {authLoading ? "✅ Sim" : "❌ Não"}
                  </p>
                  <p>
                    <strong>Dashboard Loading:</strong> {loading ? "✅ Sim" : "❌ Não"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 rounded border">
              <h4 className="font-semibold text-yellow-800 mb-2">Debug Info Completo:</h4>
              <pre className="text-xs text-yellow-700 overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={reloadPage}
              className="w-full bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Recarregar Página</span>
            </button>
            <button
              onClick={() => router.push("/auth")}
              className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Voltar ao Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!user || !restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecionando para login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header com Estatísticas */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{restaurant?.name || "Dashboard"}</h1>
              <p className="text-gray-600">Painel de controle do restaurante</p>

              {/* Informações de Debug (apenas em desenvolvimento) */}
              <details className="mt-2">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                  Informações de Debug (clique para expandir)
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-600">
                  <p>
                    <strong>Restaurant ID:</strong> {restaurantId}
                  </p>
                  <p>
                    <strong>Restaurant Slug:</strong> {restaurantSlug}
                  </p>
                  <p>
                    <strong>User ID:</strong> {user?.id}
                  </p>
                  <p>
                    <strong>Owner ID:</strong> {restaurant?.ownerId}
                  </p>
                </div>
              </details>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={copyMenuLink}
                className="flex items-center space-x-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Globe className="h-4 w-4" />
                <span>Compartilhar Cardápio</span>
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pedidos Hoje</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Faturamento</p>
                  <p className="text-2xl font-bold text-gray-900">R$ {stats.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pedidos Pendentes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Mesas Ocupadas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.tablesOccupied}/{stats.totalTables}
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <TableIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/dashboard/menu"
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="bg-orange-100 p-2 rounded-lg">
                <MenuIcon className="h-5 w-5 text-orange-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Gerenciar Cardápio</p>
                <p className="text-sm text-gray-500">Adicionar produtos e categorias</p>
              </div>
            </Link>

            <button
              onClick={() => generateQRCode(1)}
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="bg-blue-100 p-2 rounded-lg">
                <QrCode className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Gerar QR Code</p>
                <p className="text-sm text-gray-500">QR Code para as mesas</p>
              </div>
            </button>

            <Link
              href="/dashboard/settings"
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="bg-green-100 p-2 rounded-lg">
                <Store className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Configurações</p>
                <p className="text-sm text-gray-500">Personalizar restaurante</p>
              </div>
            </Link>
            <button
              onClick={async () => {
                if (!confirm("Liberar todas as mesas ocupadas?")) return
                try {
                  const updates: any = {}
                  Object.entries(tables).forEach(([tableId, table]) => {
                    if (table.status === "occupied") {
                      updates[`restaurants/${restaurantId}/tables/${tableId}/status`] = "available"
                    }
                  })
                  await update(ref(database), updates)
                  alert("Todas as mesas foram liberadas!")
                } catch (error) {
                  alert("Erro ao liberar mesas")
                }
              }}
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="bg-purple-100 p-2 rounded-lg">
                <TableIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Liberar Mesas</p>
                <p className="text-sm text-gray-500">Marcar todas como disponíveis</p>
              </div>
            </button>
          </div>
        </div>

        {/* Pedidos Recentes */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Pedidos Recentes</h3>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    placeholder="Buscar pedidos..."
                    className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="all">Todos os Status</option>
                  <option value="pending">Pendente</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="preparing">Preparando</option>
                  <option value="ready">Pronto</option>
                  <option value="delivered">Entregue</option>
                </select>
              </div>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <MenuIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pedido encontrado</h3>
              <p className="text-gray-500">
                {orders.length === 0
                  ? "Quando os clientes fizerem pedidos, eles aparecerão aqui."
                  : "Tente ajustar os filtros para encontrar pedidos."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mesa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Horário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.slice(0, 10).map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                        <div className="text-sm text-gray-500">#{order.id.slice(-6)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">Mesa {order.tableNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                        >
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R$ {order.total.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.timestamp).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button onClick={() => setSelectedOrder(order)} className="text-blue-600 hover:text-blue-900">
                          <Eye className="h-4 w-4" />
                        </button>
                        {order.status === "pending" && (
                          <button
                            onClick={() => updateOrderStatus(order.id, "confirmed")}
                            className="text-green-600 hover:text-green-900"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Notificação de Novo Pedido */}
      {newOrderNotification && (
        <div className="fixed top-4 right-4 z-50 animate-bounce">
          <div className="bg-green-500 text-white p-4 rounded-xl shadow-lg max-w-sm">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold flex items-center">
                <Bell className="h-4 w-4 mr-2" />
                Novo Pedido!
              </h4>
              <button onClick={() => setNewOrderNotification(null)} className="text-white hover:text-gray-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="text-sm space-y-1">
              <p>
                <strong>Cliente:</strong> {newOrderNotification.customerName}
              </p>
              <p>
                <strong>Mesa:</strong> {newOrderNotification.tableNumber}
              </p>
              <p>
                <strong>Total:</strong> R$ {newOrderNotification.total.toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedOrder(newOrderNotification)
                setNewOrderNotification(null)
              }}
              className="mt-3 w-full bg-white text-green-500 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Ver Detalhes
            </button>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Pedido */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Detalhes do Pedido</h3>
                <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Cliente</p>
                    <p className="font-medium">{selectedOrder.customerName}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Mesa</p>
                    <p className="font-medium">{selectedOrder.tableNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status</p>
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}
                    >
                      {getStatusText(selectedOrder.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-600">Pagamento</p>
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(selectedOrder.paymentStatus || "pending")}`}
                    >
                      {getPaymentStatusText(selectedOrder.paymentStatus || "pending")}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Itens do Pedido:</h4>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>
                          {item.quantity}x {item.name}
                        </span>
                        <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>R$ {selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Atualizar Status</label>
                    <select
                      value={selectedOrder.status}
                      onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value as Order["status"])}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="pending">Pendente</option>
                      <option value="confirmed">Confirmado</option>
                      <option value="preparing">Preparando</option>
                      <option value="ready">Pronto</option>
                      <option value="delivered">Entregue</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status do Pagamento</label>
                    <select
                      value={selectedOrder.paymentStatus || "pending"}
                      onChange={(e) =>
                        updatePaymentStatus(selectedOrder.id, e.target.value as "pending" | "paid" | "failed")
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="pending">Pendente</option>
                      <option value="paid">Pago</option>
                      <option value="failed">Falhou</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
