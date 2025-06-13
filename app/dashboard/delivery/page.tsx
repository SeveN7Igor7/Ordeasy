"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { database } from "@/lib/firebase"
import { ref, onValue, update } from "firebase/database"
import { useRouter } from "next/navigation"
import { 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Bell,
  Truck,
  Home,
  Calendar,
  CalendarDays,
  CalendarRange,
  BarChart3,
  Eye,
  Edit,
  Trash2,
  Plus,
  Minus,
  X
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import OrderNotification from "@/components/dashboard/OrderNotification"

export default function DeliveryDashboard() {
  const { user, restaurantId } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"all" | "delivery" | "pickup">("all")
  const [showNotification, setShowNotification] = useState(false)
  const [newOrder, setNewOrder] = useState<any>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [editingOrder, setEditingOrder] = useState<any>(null)
  const [stats, setStats] = useState({
    pendingCount: 0,
    todayCount: 0,
    todayRevenue: 0,
    deliveryCount: 0,
    pickupCount: 0
  })
  const router = useRouter()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousOrdersRef = useRef<any[]>([])

  useEffect(() => {
    // Verificar se o usuário tem permissão para acessar este dashboard
    if (user && !user.deliverymode) {
      // Se o modo delivery não estiver ativo, redirecionar para configurações
      router.push("/dashboard/settings");
      return;
    }

    if (!restaurantId) return

    // Criar elemento de áudio
    audioRef.current = new Audio("/notification-sound.mp3")

    setLoading(true)

    // Carregar pedidos de delivery e retirada
    const ordersRef = ref(database, `restaurants/${restaurantId}/deliveryOrders`)
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const ordersList = Object.entries(data).map(([id, order]: [string, any]) => ({
          id,
          ...order
        }))
        
        // Ordenar por timestamp (mais recentes primeiro)
        ordersList.sort((a, b) => b.timestamp - a.timestamp)
        
        // Verificar se há novos pedidos pendentes
        const pendingOrders = ordersList.filter(order => 
          order.status === "pending" && !order.visto
        )
        
        // Se houver novos pedidos e a lista anterior já estava carregada
        if (pendingOrders.length > 0 && previousOrdersRef.current.length > 0) {
          // Verificar se algum pedido é novo (não estava na lista anterior)
          const newPendingOrder = pendingOrders.find(order => 
            !previousOrdersRef.current.some(prevOrder => prevOrder.id === order.id)
          )
          
          if (newPendingOrder) {
            console.log("NOTIFICAÇÃO PEDIDO NOVO RECEBIDO, ABRINDO POP-UP")
            setNewOrder(newPendingOrder)
            setShowNotification(true)
            
            // Reproduzir som
            try {
              console.log("REPRODUZINDO SOM")
              audioRef.current?.play()
            } catch (error) {
              console.error("Erro ao reproduzir som:", error)
            }
          }
        }
        
        // Atualizar referência de pedidos anteriores
        previousOrdersRef.current = ordersList
        
        // Atualizar lista de pedidos
        setOrders(ordersList)
        
        // Calcular estatísticas
        calculateStats(ordersList)
        
        setLoading(false)
      } else {
        setOrders([])
        setLoading(false)
      }
    })

    return () => {
      unsubscribe()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [restaurantId, user, router])

  // Calcular estatísticas
  const calculateStats = (ordersList: any[]) => {
    const pendingCount = ordersList.filter(order => order.status === "pending").length
    
    // Pedidos de hoje
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTimestamp = today.getTime()
    
    const todayOrders = ordersList.filter(order => order.timestamp >= todayTimestamp)
    const todayCount = todayOrders.length
    const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
    
    // Contagem por tipo
    const deliveryCount = ordersList.filter(order => order.orderType === "delivery").length
    const pickupCount = ordersList.filter(order => order.orderType === "pickup").length
    
    setStats({
      pendingCount,
      todayCount,
      todayRevenue,
      deliveryCount,
      pickupCount
    })
  }

  // Filtrar pedidos com base na aba ativa
  const filteredOrders = activeTab === "all" 
    ? orders 
    : orders.filter(order => order.orderType === activeTab)

  // Formatar valor monetário
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  // Formatar data
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Atualizar status do pedido
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const orderRef = ref(database, `restaurants/${restaurantId}/deliveryOrders/${orderId}`)
      await update(orderRef, { 
        status,
        visto: true
      })
      
      // Fechar notificação se estiver aberta
      if (showNotification && newOrder?.id === orderId) {
        setShowNotification(false)
      }
    } catch (error) {
      console.error("Erro ao atualizar status do pedido:", error)
    }
  }

  // Atualizar pedido completo
  const updateOrder = async (orderId: string, updates: any) => {
    try {
      const orderRef = ref(database, `restaurants/${restaurantId}/deliveryOrders/${orderId}`)
      await update(orderRef, updates)
      setEditingOrder(null)
      setShowOrderDetails(false)
    } catch (error) {
      console.error("Erro ao atualizar pedido:", error)
    }
  }

  // Remover item do pedido
  const removeItemFromOrder = async (orderId: string, itemIndex: number) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    const updatedItems = order.items.filter((_: any, index: number) => index !== itemIndex)
    const newTotal = updatedItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)

    await updateOrder(orderId, {
      items: updatedItems,
      totalAmount: newTotal
    })
  }

  // Adicionar desconto
  const addDiscount = async (orderId: string, discountAmount: number) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    const newTotal = Math.max(0, order.totalAmount - discountAmount)

    await updateOrder(orderId, {
      totalAmount: newTotal,
      discount: discountAmount
    })
  }

  // Aceitar pedido
  const handleAcceptOrder = (orderId: string) => {
    updateOrderStatus(orderId, "confirmed")
  }

  // Rejeitar pedido
  const handleRejectOrder = (orderId: string) => {
    updateOrderStatus(orderId, "rejected")
  }

  // Marcar pedido como preparando
  const handlePreparing = (orderId: string) => {
    updateOrderStatus(orderId, "preparing")
  }

  // Marcar pedido como saiu para entrega
  const handleOutForDelivery = (orderId: string) => {
    updateOrderStatus(orderId, "out_for_delivery")
  }

  // Marcar pedido como completo
  const handleComplete = (orderId: string) => {
    updateOrderStatus(orderId, "completed")
  }

  // Fechar notificação
  const handleCloseNotification = () => {
    if (newOrder) {
      // Marcar como visto
      const orderRef = ref(database, `restaurants/${restaurantId}/deliveryOrders/${newOrder.id}`)
      update(orderRef, { visto: true })
    }
    setShowNotification(false)
  }

  // Ver detalhes do pedido
  const handleViewOrder = (order: any) => {
    setSelectedOrder(order)
    setShowOrderDetails(true)
  }

  // Editar pedido
  const handleEditOrder = (order: any) => {
    setEditingOrder({ ...order })
    setSelectedOrder(order)
    setShowOrderDetails(true)
  }

  // Dados para o gráfico de status dos pedidos
  const statusData = [
    { name: 'Pendentes', value: orders.filter(order => order.status === "pending").length, color: '#f59e0b' },
    { name: 'Confirmados', value: orders.filter(order => order.status === "confirmed").length, color: '#3b82f6' },
    { name: 'Preparando', value: orders.filter(order => order.status === "preparing").length, color: '#8b5cf6' },
    { name: 'Em Entrega', value: orders.filter(order => order.status === "out_for_delivery").length, color: '#f97316' },
    { name: 'Completos', value: orders.filter(order => order.status === "completed").length, color: '#10b981' },
    { name: 'Rejeitados', value: orders.filter(order => order.status === "rejected").length, color: '#ef4444' }
  ].filter(item => item.value > 0)

  // Dados para o gráfico de tipos de pedido
  const typeData = [
    { name: 'Delivery', value: stats.deliveryCount, color: '#f97316' },
    { name: 'Retirada', value: stats.pickupCount, color: '#3b82f6' }
  ].filter(item => item.value > 0)

  // Obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'preparing': return 'bg-purple-100 text-purple-800'
      case 'out_for_delivery': return 'bg-orange-100 text-orange-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Obter texto do status
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente'
      case 'confirmed': return 'Confirmado'
      case 'preparing': return 'Preparando'
      case 'out_for_delivery': return 'Em Entrega'
      case 'completed': return 'Completo'
      case 'rejected': return 'Rejeitado'
      default: return status
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      {/* Notificação de novo pedido */}
      {showNotification && newOrder && (
        <OrderNotification
          order={newOrder}
          onAccept={handleAcceptOrder}
          onReject={handleRejectOrder}
          onClose={handleCloseNotification}
        />
      )}

      {/* Modal de detalhes do pedido */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Cabeçalho */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingOrder ? 'Editar Pedido' : 'Detalhes do Pedido'}
              </h2>
              <div className="flex items-center space-x-2">
                {!editingOrder && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditOrder(selectedOrder)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
                <button
                  onClick={() => {
                    setShowOrderDetails(false)
                    setEditingOrder(null)
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Informações do cliente */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Informações do Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nome</label>
                    {editingOrder ? (
                      <Input
                        value={editingOrder.customerName}
                        onChange={(e) => setEditingOrder({
                          ...editingOrder,
                          customerName: e.target.value
                        })}
                      />
                    ) : (
                      <p className="text-gray-900">{selectedOrder.customerName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Telefone</label>
                    {editingOrder ? (
                      <Input
                        value={editingOrder.customerPhone}
                        onChange={(e) => setEditingOrder({
                          ...editingOrder,
                          customerPhone: e.target.value
                        })}
                      />
                    ) : (
                      <p className="text-gray-900">{selectedOrder.customerPhone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Endereço (se for delivery) */}
              {selectedOrder.orderType === 'delivery' && selectedOrder.address && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Endereço de Entrega</h3>
                  <p className="text-gray-900">
                    {selectedOrder.address.street}, {selectedOrder.address.number}
                    {selectedOrder.address.complement && `, ${selectedOrder.address.complement}`}
                  </p>
                  <p className="text-gray-900">
                    {selectedOrder.address.neighborhood}, {selectedOrder.address.city} - {selectedOrder.address.state}
                  </p>
                  <p className="text-gray-900">CEP: {selectedOrder.address.cep}</p>
                </div>
              )}

              {/* Itens do pedido */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Itens do Pedido</h3>
                <div className="space-y-2">
                  {(editingOrder || selectedOrder).items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <span className="font-medium">{item.quantity}x {item.name}</span>
                        {item.description && (
                          <p className="text-sm text-gray-600">{item.description}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                        {editingOrder && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeItemFromOrder(selectedOrder.id, index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Informações do pedido */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo de Pedido</label>
                  <p className="text-gray-900 capitalize">
                    {selectedOrder.orderType === 'delivery' ? 'Delivery' : 'Retirada'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Forma de Pagamento</label>
                  <p className="text-gray-900">{selectedOrder.paymentMethod}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(selectedOrder.status)}`}>
                    {getStatusText(selectedOrder.status)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data/Hora</label>
                  <p className="text-gray-900">{formatDate(selectedOrder.timestamp)}</p>
                </div>
              </div>

              {/* Observações */}
              {selectedOrder.additionalInfo && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  {editingOrder ? (
                    <Textarea
                      value={editingOrder.additionalInfo}
                      onChange={(e) => setEditingOrder({
                        ...editingOrder,
                        additionalInfo: e.target.value
                      })}
                      rows={3}
                    />
                  ) : (
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedOrder.additionalInfo}</p>
                  )}
                </div>
              )}

              {/* Total */}
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">Total</span>
                  <span className="text-xl font-bold text-orange-600">
                    {formatCurrency((editingOrder || selectedOrder).totalAmount)}
                  </span>
                </div>
                {selectedOrder.discount && (
                  <div className="flex justify-between items-center text-sm text-gray-600 mt-1">
                    <span>Desconto aplicado</span>
                    <span>-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
              </div>

              {/* Adicionar desconto */}
              {editingOrder && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Adicionar Desconto</h4>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      placeholder="Valor do desconto"
                      id="discount-input"
                    />
                    <Button
                      onClick={() => {
                        const input = document.getElementById('discount-input') as HTMLInputElement
                        const discount = parseFloat(input.value)
                        if (discount > 0) {
                          addDiscount(selectedOrder.id, discount)
                          input.value = ''
                        }
                      }}
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé */}
            <div className="border-t border-gray-200 p-6">
              <div className="flex justify-between">
                {editingOrder ? (
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setEditingOrder(null)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => updateOrder(selectedOrder.id, editingOrder)}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      Salvar Alterações
                    </Button>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    {selectedOrder.status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleRejectOrder(selectedOrder.id)}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          Rejeitar
                        </Button>
                        <Button
                          onClick={() => handleAcceptOrder(selectedOrder.id)}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          Aceitar
                        </Button>
                      </>
                    )}
                    {selectedOrder.status === 'confirmed' && (
                      <Button
                        onClick={() => handlePreparing(selectedOrder.id)}
                        className="bg-purple-500 hover:bg-purple-600"
                      >
                        Marcar como Preparando
                      </Button>
                    )}
                    {selectedOrder.status === 'preparing' && selectedOrder.orderType === 'delivery' && (
                      <Button
                        onClick={() => handleOutForDelivery(selectedOrder.id)}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        Saiu para Entrega
                      </Button>
                    )}
                    {(selectedOrder.status === 'preparing' && selectedOrder.orderType === 'pickup') ||
                     selectedOrder.status === 'out_for_delivery' && (
                      <Button
                        onClick={() => handleComplete(selectedOrder.id)}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        Marcar como Completo
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard de Delivery</h1>
          <p className="text-gray-600">Gerencie seus pedidos de delivery e retirada.</p>
        </div>
        
        <div className="mt-4 md:mt-0">
          <div className="flex items-center">
            {stats.pendingCount > 0 && (
              <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full flex items-center mr-3">
                <Bell className="h-4 w-4 mr-1" />
                <span className="font-medium">{stats.pendingCount} pedido(s) pendente(s)</span>
              </div>
            )}
            
            <Button
              variant="outline"
              className="flex items-center"
              onClick={() => router.push("/dashboard/reports")}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Ver Relatórios
            </Button>
          </div>
        </div>
      </div>
      
      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pedidos Hoje</p>
              <h3 className="text-2xl font-bold">{stats.todayCount}</h3>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Receita Hoje</p>
              <h3 className="text-2xl font-bold">{formatCurrency(stats.todayRevenue)}</h3>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Deliveries</p>
              <h3 className="text-2xl font-bold">{stats.deliveryCount}</h3>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Truck className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Retiradas</p>
              <h3 className="text-2xl font-bold">{stats.pickupCount}</h3>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Home className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>
      
      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Status dos Pedidos</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Quantidade']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        <Card className="p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tipos de Pedido</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Quantidade']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      
      {/* Tabs e lista de pedidos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">Pedidos</h2>
        </div>
        
        <Tabs defaultValue="all" className="w-full" onValueChange={(value) => setActiveTab(value as "all" | "delivery" | "pickup")}>
          <div className="px-4 pt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Todos
              </TabsTrigger>
              <TabsTrigger value="delivery" className="flex items-center justify-center">
                <Truck className="h-4 w-4 mr-2" />
                Delivery
              </TabsTrigger>
              <TabsTrigger value="pickup" className="flex items-center justify-center">
                <Home className="h-4 w-4 mr-2" />
                Retirada
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="all" className="p-0">
            {renderOrdersTable(filteredOrders)}
          </TabsContent>
          
          <TabsContent value="delivery" className="p-0">
            {renderOrdersTable(filteredOrders)}
          </TabsContent>
          
          <TabsContent value="pickup" className="p-0">
            {renderOrdersTable(filteredOrders)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
  
  // Renderizar tabela de pedidos
  function renderOrdersTable(orders: any[]) {
    if (loading) {
      return (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">Carregando pedidos...</p>
        </div>
      )
    }
    
    if (orders.length === 0) {
      return (
        <div className="p-8 text-center">
          <p className="text-gray-500">Nenhum pedido encontrado.</p>
        </div>
      )
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data/Hora
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                    <div className="text-sm text-gray-500">{order.customerPhone}</div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {order.orderType === 'delivery' ? (
                      <Truck className="h-4 w-4 text-orange-500 mr-2" />
                    ) : (
                      <Home className="h-4 w-4 text-blue-500 mr-2" />
                    )}
                    <span className="text-sm text-gray-900 capitalize">
                      {order.orderType === 'delivery' ? 'Delivery' : 'Retirada'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(order.totalAmount)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(order.timestamp)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewOrder(order)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    {order.status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRejectOrder(order.id)}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptOrder(order.id)}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    
                    {order.status === 'confirmed' && (
                      <Button
                        size="sm"
                        onClick={() => handlePreparing(order.id)}
                        className="bg-purple-500 hover:bg-purple-600"
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {order.status === 'preparing' && order.orderType === 'delivery' && (
                      <Button
                        size="sm"
                        onClick={() => handleOutForDelivery(order.id)}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        <Truck className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {((order.status === 'preparing' && order.orderType === 'pickup') ||
                      order.status === 'out_for_delivery') && (
                      <Button
                        size="sm"
                        onClick={() => handleComplete(order.id)}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
}

