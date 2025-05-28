"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { database } from "@/lib/firebase"
import { ref, onValue, update } from "firebase/database"
import { Search, Filter, Clock, RefreshCw, Bell } from "lucide-react"
import OrderStatusFlow from "./OrderStatusFlow"

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
  estimatedTime?: number
}

export default function OrderManagement() {
  const { user, restaurantId } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
    timeRange: "today",
  })
  const [newOrderAlert, setNewOrderAlert] = useState<boolean>(false)

  useEffect(() => {
    if (!restaurantId) return

    setLoading(true)
    setError(null)

    // Carregar pedidos
    console.log("🔍 [ORDERS] Buscando pedidos do restaurante...")
    const ordersRef = ref(database, `restaurants/${restaurantId}/orders`)
    const unsubscribeOrders = onValue(
      ordersRef,
      (snapshot) => {
        console.log("📡 [ORDERS] Resposta do Firebase para pedidos:")
        console.log("📡 [ORDERS] Snapshot de pedidos existe:", snapshot.exists())

        const data = snapshot.val()

        if (data) {
          console.log("📋 [ORDERS] Pedidos encontrados:", Object.keys(data).length)

          const ordersList = Object.entries(data)
            .map(([id, order]: [string, any]) => ({
              id,
              ...order,
            }))
            .sort((a, b) => b.timestamp - a.timestamp)

          setOrders(ordersList)
          
          // Verificar se há novos pedidos pendentes
          const hasPendingOrders = ordersList.some(order => order.status === "pending")
          if (hasPendingOrders) {
            setNewOrderAlert(true)
            playNotificationSound()
          }
        } else {
          console.log("📋 [ORDERS] Nenhum pedido encontrado")
          setOrders([])
        }
        setLoading(false)
      },
      (error) => {
        console.error("💥 [ORDERS] Erro ao carregar pedidos:", error)
        setError(`Erro ao carregar dados: ${error.message}`)
        setLoading(false)
      }
    )

    return () => {
      unsubscribeOrders()
    }
  }, [restaurantId])

  const playNotificationSound = () => {
    try {
      console.log("🔔 [ORDERS] Tocando som de notificação...")
      const audio = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmkeBzuG0fPTfSsFJn/M7+GNPQ0UVKTW68tgFQwvfsPwrG8fDjiD1/LNdSgFIHTC6d2QQAw",
      )
      audio.play().catch(() => {
        console.log("🔇 [ORDERS] Não foi possível tocar o som")
      })
    } catch (error) {
      console.log("🔇 [ORDERS] Erro ao tocar som:", error)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
    try {
      console.log("🔄 [ORDERS] Atualizando status do pedido:", orderId, "para", newStatus)

      // Buscar dados do pedido antes da atualização
      const order = orders.find((o) => o.id === orderId)

      const orderRef = ref(database, `restaurants/${restaurantId}/orders/${orderId}`)
      await update(orderRef, { status: newStatus })

      // Se o pedido foi entregue ou cancelado, liberar a mesa
      if ((newStatus === "delivered" || newStatus === "cancelled") && order) {
        console.log("🪑 [ORDERS] Liberando mesa:", order.tableNumber)
        const tableId = `table${order.tableNumber}`
        const tableRef = ref(database, `restaurants/${restaurantId}/tables/${tableId}`)
        await update(tableRef, { status: "available" })
        console.log("✅ [ORDERS] Mesa liberada com sucesso!")
      }

      console.log("✅ [ORDERS] Status atualizado com sucesso!")
      
      // Atualizar o pedido selecionado se estiver visualizando
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          status: newStatus
        })
      }
    } catch (error) {
      console.error("💥 [ORDERS] Erro ao atualizar status:", error)
    }
  }

  const updateEstimatedTime = async (orderId: string, minutes: number) => {
    try {
      console.log("⏱️ [ORDERS] Atualizando tempo estimado do pedido:", orderId, "para", minutes, "minutos")
      
      const orderRef = ref(database, `restaurants/${restaurantId}/orders/${orderId}`)
      await update(orderRef, { estimatedTime: minutes })
      
      console.log("✅ [ORDERS] Tempo estimado atualizado com sucesso!")
      
      // Atualizar o pedido selecionado se estiver visualizando
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          estimatedTime: minutes
        })
      }
    } catch (error) {
      console.error("💥 [ORDERS] Erro ao atualizar tempo estimado:", error)
    }
  }

  const getFilteredOrders = () => {
    return orders.filter((order) => {
      // Filtro por status
      if (filters.status !== "all" && order.status !== filters.status) return false
      
      // Filtro por busca
      if (
        filters.search &&
        !order.id.toLowerCase().includes(filters.search.toLowerCase()) &&
        !order.customerName.toLowerCase().includes(filters.search.toLowerCase()) &&
        !order.tableNumber.includes(filters.search)
      ) return false
      
      // Filtro por período
      if (filters.timeRange !== "all") {
        const now = new Date()
        const orderDate = new Date(order.timestamp)
        
        if (filters.timeRange === "today") {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          if (orderDate < today) return false
        } else if (filters.timeRange === "week") {
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - 7)
          if (orderDate < weekStart) return false
        }
      }
      
      return true
    })
  }

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

  const filteredOrders = getFilteredOrders()

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full p-4 bg-red-50 text-red-700 rounded-lg">
        <p className="font-medium">Erro ao carregar pedidos</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Filtros e busca */}
      <div className="p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar pedidos..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center">
            <Filter className="h-4 w-4 text-gray-500 mr-2" />
            <select
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="all">Todos os status</option>
              <option value="pending">Pendentes</option>
              <option value="confirmed">Confirmados</option>
              <option value="preparing">Em preparo</option>
              <option value="ready">Prontos</option>
              <option value="delivered">Entregues</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <Clock className="h-4 w-4 text-gray-500 mr-2" />
            <select
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={filters.timeRange}
              onChange={(e) => setFilters({ ...filters, timeRange: e.target.value })}
            >
              <option value="today">Hoje</option>
              <option value="week">Últimos 7 dias</option>
              <option value="all">Todos</option>
            </select>
          </div>
          
          <button
            className="flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md"
            onClick={() => setFilters({ status: "all", search: "", timeRange: "today" })}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Limpar
          </button>
        </div>
      </div>

      {/* Alerta de novos pedidos */}
      {newOrderAlert && (
        <div className="p-3 bg-orange-100 border-b border-orange-200 flex justify-between items-center">
          <div className="flex items-center text-orange-800">
            <Bell className="h-5 w-5 mr-2 animate-pulse" />
            <span className="font-medium">Novos pedidos pendentes!</span>
          </div>
          <button
            className="text-orange-800 hover:text-orange-900 text-sm font-medium"
            onClick={() => setNewOrderAlert(false)}
          >
            Dispensar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
        {/* Lista de pedidos */}
        <div className="col-span-1 border-r overflow-y-auto max-h-[calc(100vh-250px)]">
          {filteredOrders.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>Nenhum pedido encontrado</p>
            </div>
          ) : (
            <ul className="divide-y">
              {filteredOrders.map((order) => (
                <li
                  key={order.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${
                    selectedOrder?.id === order.id ? "bg-orange-50" : ""
                  }`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-medium text-gray-900">Mesa {order.tableNumber}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        {new Date(order.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">
                    <span className="font-medium">Cliente:</span> {order.customerName}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Total:</span> R$ {order.total.toFixed(2)}
                  </p>
                  {order.estimatedTime && (
                    <p className="text-xs text-orange-600 mt-1">
                      <Clock className="h-3 w-3 inline mr-1" />
                      Tempo estimado: {order.estimatedTime} min
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Detalhes do pedido */}
        <div className="col-span-2 p-6">
          {selectedOrder ? (
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Pedido #{selectedOrder.id.slice(-6)}</h2>
                  <p className="text-gray-500">
                    {new Date(selectedOrder.timestamp).toLocaleString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full ${getStatusColor(selectedOrder.status)}`}>
                  {getStatusText(selectedOrder.status)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Informações do Cliente</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="mb-2">
                      <span className="font-medium">Nome:</span> {selectedOrder.customerName}
                    </p>
                    {selectedOrder.customerPhone && (
                      <p className="mb-2">
                        <span className="font-medium">Telefone:</span> {selectedOrder.customerPhone}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Mesa:</span> {selectedOrder.tableNumber}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Resumo do Pedido</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="mb-2">
                      <span className="font-medium">Total de itens:</span>{" "}
                      {selectedOrder.items.reduce((sum, item) => sum + item.quantity, 0)}
                    </p>
                    <p className="mb-2">
                      <span className="font-medium">Valor total:</span> R${" "}
                      {selectedOrder.total.toFixed(2)}
                    </p>
                    {selectedOrder.customerNote && (
                      <p>
                        <span className="font-medium">Observação:</span>{" "}
                        {selectedOrder.customerNote}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Itens do Pedido</h3>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Qtd
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Preço
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedOrder.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-center">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            R$ {item.price.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            R$ {(item.price * item.quantity).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                          Total
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                          R$ {selectedOrder.total.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <OrderStatusFlow
                currentStatus={selectedOrder.status}
                onStatusChange={(newStatus) => updateOrderStatus(selectedOrder.id, newStatus)}
                estimatedTime={selectedOrder.estimatedTime}
                setEstimatedTime={(minutes) => updateEstimatedTime(selectedOrder.id, minutes)}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 p-10">
              <div className="bg-gray-100 p-4 rounded-full mb-4">
                <Bell className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-medium mb-2">Nenhum pedido selecionado</h3>
              <p className="text-center">
                Selecione um pedido da lista para visualizar os detalhes e gerenciar o status.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
