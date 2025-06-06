"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { database } from "@/lib/firebase"
import { ref, onValue, update } from "firebase/database"
import { useRouter } from "next/navigation"
import DashboardStats from "@/components/dashboard/DashboardStats"
import TableManagement from "@/components/dashboard/TableManagement"
import NotificationCenter from "@/components/notifications/NotificationCenter"
import { 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Bell
} from "lucide-react"

export default function Dashboard() {
  const { user, restaurantId } = useAuth()
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notificationCount, setNotificationCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    // Verificar se o usuário tem permissão para acessar este dashboard
    if (user && !user.qrcodemode) {
      if (user.deliverymode) {
        router.push("/dashboard/delivery");
      } else {
        // Se nenhum modo estiver ativo, redirecionar para configurações
        router.push("/dashboard/settings");
      }
      return;
    }

    if (!restaurantId) return

    setLoading(true)

    // Carregar pedidos recentes
    const ordersRef = ref(database, `restaurants/${restaurantId}/orders`)
    const unsubscribeOrders = onValue(ordersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const ordersList = Object.entries(data).map(([id, order]: [string, any]) => ({
          id,
          ...order
        }))
        
        // Ordenar por timestamp (mais recentes primeiro)
        ordersList.sort((a, b) => b.timestamp - a.timestamp)
        
        // Filtrar apenas os pedidos recentes (últimas 24 horas)
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
        const recentOrdersList = ordersList.filter(order => order.timestamp > oneDayAgo)
        
        // Limitar a 5 pedidos recentes
        setRecentOrders(recentOrdersList.slice(0, 5))
        
        // Contar notificações (pedidos pendentes)
        const pendingCount = ordersList.filter(order => order.status === "pending").length
        setNotificationCount(pendingCount)
      } else {
        setRecentOrders([])
        setNotificationCount(0)
      }
      
      setLoading(false)
    })

    return () => {
      unsubscribeOrders()
    }
  }, [restaurantId])

  // Formatar timestamp para data/hora local
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Formatar valor monetário
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  // Obter cor e ícone com base no status do pedido
  const getOrderStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return { 
          color: "bg-yellow-100 text-yellow-800 border-yellow-200", 
          icon: <Clock className="h-4 w-4 mr-1" />,
          text: "Pendente"
        }
      case "confirmed":
        return { 
          color: "bg-blue-100 text-blue-800 border-blue-200", 
          icon: <ShoppingCart className="h-4 w-4 mr-1" />,
          text: "Confirmado"
        }
      case "preparing":
        return { 
          color: "bg-purple-100 text-purple-800 border-purple-200", 
          icon: <Clock className="h-4 w-4 mr-1" />,
          text: "Preparando"
        }
      case "ready":
        return { 
          color: "bg-indigo-100 text-indigo-800 border-indigo-200", 
          icon: <CheckCircle className="h-4 w-4 mr-1" />,
          text: "Pronto"
        }
      case "completed":
        return { 
          color: "bg-green-100 text-green-800 border-green-200", 
          icon: <CheckCircle className="h-4 w-4 mr-1" />,
          text: "Entregue"
        }
      case "rejected":
        return { 
          color: "bg-red-100 text-red-800 border-red-200", 
          icon: <XCircle className="h-4 w-4 mr-1" />,
          text: "Rejeitado"
        }
      default:
        return { 
          color: "bg-gray-100 text-gray-800 border-gray-200", 
          icon: <AlertTriangle className="h-4 w-4 mr-1" />,
          text: "Desconhecido"
        }
    }
  }

  // Handler para ações de notificação
  const handleNotificationAction = (type: string, orderId: string, data?: any) => {
    console.log(`Notification action: ${type} for order ${orderId}`, data)
    // Aqui você pode adicionar lógica adicional se necessário
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      {/* Centro de Notificações (invisível, mas funcional) */}
      <NotificationCenter onNotificationAction={handleNotificationAction} />
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600">Bem-vindo de volta! Aqui está o resumo do seu restaurante.</p>
        </div>
        
        {/* Indicador de notificações */}
        {notificationCount > 0 && (
          <div className="mt-4 md:mt-0 flex items-center bg-orange-100 text-orange-800 px-4 py-2 rounded-lg">
            <Bell className="h-5 w-5 mr-2" />
            <span className="font-medium">{notificationCount} pedido(s) pendente(s)</span>
          </div>
        )}
      </div>
      
      {/* Estatísticas */}
      <div className="mb-8">
        <DashboardStats />
      </div>
      
      {/* Gestão de Mesas */}
      <div className="mb-8">
        <TableManagement />
      </div>
      
      {/* Pedidos Recentes */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Pedidos Recentes</h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-500">Carregando pedidos recentes...</p>
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="p-8 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum pedido recente</h3>
            <p className="text-gray-500">
              Os pedidos recentes aparecerão aqui quando forem realizados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mesa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data/Hora
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Itens
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentOrders.map((order) => {
                  const statusInfo = getOrderStatusInfo(order.status)
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        Mesa {order.tableNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatTimestamp(order.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-center">
                        {order.items?.length || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {formatCurrency(order.totalAmount || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.icon}
                          {statusInfo.text}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
