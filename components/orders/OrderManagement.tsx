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

  // Variável para controlar a reprodução contínua do alarme
  let alarmAudio = null;
  let alarmInterval = null;

  const playNotificationSound = () => {
    try {
      console.log("🔔 [ORDERS] INICIANDO REPRODUÇÃO DO SOM DE NOTIFICAÇÃO...");
      console.log("🔍 [AUDIO DEBUG] Verificando ambiente de áudio...");
      console.log("🔍 [AUDIO DEBUG] Navegador suporta áudio:", typeof Audio !== 'undefined' ? "SIM" : "NÃO");
      console.log("🔍 [AUDIO DEBUG] Contexto de janela disponível:", typeof window !== 'undefined' ? "SIM" : "NÃO");
      
      // Parar qualquer alarme anterior que possa estar tocando
      console.log("🔄 [AUDIO DEBUG] Parando qualquer som anterior em reprodução...");
      stopNotificationSound();
      
      // Criar novo elemento de áudio com o som de alarme forte (level-up-191997.mp3)
      console.log("🔄 [AUDIO DEBUG] Criando novo elemento de áudio...");
      alarmAudio = new Audio(
        "data:audio/mp3;base64,//vQZAAIxttpqbMvZfJV7RMSACV8ZumozlW8AAGDvlJCgFAAACAgrJFJgp1J0p1F/QSQaCIvOfaJvNBctQ5kLcnBcZpi5Gis6bVznNc9miu23aY1+AKGgjr/PY0w5157GetytTZxqCHeSCxKFBmWWxfZnBXog3TGHmWBRvL1hK1LnGhkO2ryPXbnEv8VhRXNVskOmZJWJZPBRqxjbFypkNNck5oMcmcZxWbet0ftjC5LbI/pfHrGcosaLGesSGmuScnCLbnsaLPEiXpekNqetK24R5o0VyWUeH5MX9ZaqND99yYYFp8am5bPF6xtIXSUMQgHcwvzRyJQYAYEdjRiwKtfppgGTX9rzEkMB/aaem007O36oUeLkOiopmIf/s9CmHCguRf/qjM7fs7O2ZhQXIqf1RRIOhoOHDp926KZiH/p/9FQaJBgED9v/XKhaN/Vkh/85OWAAZjKgYUPDsPA8hqM8TAiAKwsHAhiBca6umwooCBiQFMFATFSkePzEAZHucGSjRi9CZBmIrlM8wIBVzLk8hUwjhgQHAUAVIt5OhGQ2SOTgchLxYplONBNMzeVCtIxNSWQAwSGKduAIIDkPxDj7rIAS0F1UE+HTf4v4vSckr3lzC7DqUlVrciQYNjgVB5KkGhUJnGx9/4fylCVBaRXlylaOpe3MuGmu2AvAyFAGgpGZqMhUIOG5aEttlN4AVnLNo/vU4Jd9FNKyJugp2im7QIAq1s7N34LzgI7btbrMrRkVrWEf1l7"
      );
      console.log("✅ [AUDIO DEBUG] Elemento de áudio criado com sucesso!");
      
      // Configurar volume máximo
      console.log("🔄 [AUDIO DEBUG] Configurando volume para máximo (1.0)...");
      alarmAudio.volume = 1.0;
      console.log("✅ [AUDIO DEBUG] Volume configurado:", alarmAudio.volume);
      
      // Adicionar eventos para monitorar o áudio
      alarmAudio.addEventListener('canplaythrough', () => {
        console.log("✅ [AUDIO DEBUG] Áudio carregado e pronto para reprodução!");
      });
      
      alarmAudio.addEventListener('play', () => {
        console.log("▶️ [AUDIO DEBUG] Reprodução iniciada!");
      });
      
      alarmAudio.addEventListener('ended', () => {
        console.log("⏹️ [AUDIO DEBUG] Reprodução finalizada!");
      });
      
      alarmAudio.addEventListener('error', (e) => {
        console.error("❌ [AUDIO DEBUG] Erro no elemento de áudio:", e);
      });
      
      // Reproduzir o som
      console.log("🔄 [AUDIO DEBUG] Tentando iniciar reprodução...");
      const playPromise = alarmAudio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("✅ [AUDIO DEBUG] Reprodução iniciada com sucesso!");
          })
          .catch((err) => {
            console.error("❌ [AUDIO DEBUG] Não foi possível tocar o som:", err);
            console.error("❌ [AUDIO DEBUG] Código de erro:", err.code);
            console.error("❌ [AUDIO DEBUG] Mensagem de erro:", err.message);
            console.error("❌ [AUDIO DEBUG] Nome do erro:", err.name);
            
            // Verificar erros comuns
            if (err.name === "NotAllowedError") {
              console.error("❌ [AUDIO DEBUG] Erro de permissão: O navegador bloqueou a reprodução automática");
            } else if (err.name === "NotSupportedError") {
              console.error("❌ [AUDIO DEBUG] Formato de áudio não suportado pelo navegador");
            }
          });
      } else {
        console.log("⚠️ [AUDIO DEBUG] Play promise indefinido - comportamento antigo do navegador");
      }
      
      // Configurar reprodução contínua
      console.log("🔄 [AUDIO DEBUG] Configurando reprodução contínua a cada 2 segundos...");
      alarmInterval = setInterval(() => {
        if (alarmAudio) {
          console.log("🔄 [AUDIO DEBUG] Reiniciando reprodução contínua...");
          alarmAudio.currentTime = 0;
          
          const loopPromise = alarmAudio.play();
          if (loopPromise !== undefined) {
            loopPromise
              .then(() => {
                console.log("✅ [AUDIO DEBUG] Loop de reprodução iniciado com sucesso!");
              })
              .catch((err) => {
                console.error("❌ [AUDIO DEBUG] Erro no loop de reprodução:", err);
              });
          }
        }
      }, 2000); // Repetir a cada 2 segundos
      
      // Adicionar listener para evento personalizado para parar o alarme
      if (window && typeof window !== 'undefined') {
        console.log("🔄 [AUDIO DEBUG] Adicionando listener para evento de parada...");
        window.addEventListener('stopNotificationAlarm', stopNotificationSound);
        console.log("✅ [AUDIO DEBUG] Listener adicionado com sucesso!");
      }
      
      console.log("🔊 [ORDERS] ALARME SONORO CONTÍNUO INICIADO COM SUCESSO!");
    } catch (error) {
      console.error("❌ [AUDIO DEBUG] ERRO CRÍTICO NA REPRODUÇÃO:", error);
      console.error("❌ [AUDIO DEBUG] Tipo de erro:", typeof error);
      console.error("❌ [AUDIO DEBUG] Stack trace:", error.stack);
    }
  }
  
  const stopNotificationSound = () => {
    try {
      console.log("🔄 [AUDIO DEBUG] Iniciando processo de parada do alarme sonoro...");
      
      if (alarmInterval) {
        console.log("🔄 [AUDIO DEBUG] Limpando intervalo de repetição...");
        clearInterval(alarmInterval);
        alarmInterval = null;
        console.log("✅ [AUDIO DEBUG] Intervalo de repetição removido com sucesso!");
      } else {
        console.log("ℹ️ [AUDIO DEBUG] Nenhum intervalo de repetição ativo para remover.");
      }
      
      if (alarmAudio) {
        console.log("🔄 [AUDIO DEBUG] Pausando reprodução de áudio...");
        alarmAudio.pause();
        console.log("✅ [AUDIO DEBUG] Reprodução de áudio pausada com sucesso!");
        
        // Remover listeners de eventos
        console.log("🔄 [AUDIO DEBUG] Removendo event listeners do elemento de áudio...");
        alarmAudio.removeEventListener('canplaythrough', () => {});
        alarmAudio.removeEventListener('play', () => {});
        alarmAudio.removeEventListener('ended', () => {});
        alarmAudio.removeEventListener('error', () => {});
        
        alarmAudio = null;
        console.log("✅ [AUDIO DEBUG] Elemento de áudio liberado da memória!");
      } else {
        console.log("ℹ️ [AUDIO DEBUG] Nenhum elemento de áudio ativo para pausar.");
      }
      
      // Remover o listener do evento
      if (window && typeof window !== 'undefined') {
        console.log("🔄 [AUDIO DEBUG] Removendo listener do evento de parada...");
        window.removeEventListener('stopNotificationAlarm', stopNotificationSound);
        console.log("✅ [AUDIO DEBUG] Listener removido com sucesso!");
      }
      
      console.log("🔇 [ORDERS] ALARME SONORO INTERROMPIDO COM SUCESSO!");
    } catch (error) {
      console.error("❌ [AUDIO DEBUG] ERRO AO INTERROMPER SOM:", error);
      console.error("❌ [AUDIO DEBUG] Tipo de erro:", typeof error);
      console.error("❌ [AUDIO DEBUG] Stack trace:", error.stack);
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
                  className={`py-2 px-2 hover:bg-gray-50 cursor-pointer ${
                    selectedOrder?.id === order.id ? "bg-orange-50" : ""
                  }`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900 text-sm">M{order.tableNumber}</span>
                      <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status).substring(0, 3)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1 text-xs">
                    <span className="truncate max-w-[120px]">{order.customerName}</span>
                    <span className="font-medium">R$ {(order.total || 0).toFixed(2)}</span>
                  </div>
                  {order.estimatedTime && (
                    <div className="flex items-center text-xs text-orange-600 mt-0.5">
                      <Clock className="h-2.5 w-2.5 mr-0.5" />
                      <span>{order.estimatedTime} min</span>
                    </div>
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
                      {(selectedOrder.total || 0).toFixed(2)}
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
                            R$ {(item.price || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            R$ {((item.price || 0) * (item.quantity || 0)).toFixed(2)}
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
                          R$ {(selectedOrder.total || 0).toFixed(2)}
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
