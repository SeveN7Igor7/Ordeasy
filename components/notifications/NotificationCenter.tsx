"use client"

import { useState, useEffect } from "react"
import { database } from "@/lib/firebase"
import { ref, onValue, update, push, set } from "firebase/database"
import { useAuth } from "@/lib/auth-context"
import OrderNotificationPopup from "@/components/notifications/OrderNotificationPopup"
import { Clock } from "lucide-react"

interface NotificationCenterProps {
  onNotificationAction?: (type: string, orderId: string, data?: any) => void
}

interface Order {
  id: string
  tableNumber: string
  items: any[]
  totalAmount: number
  timestamp: number
  status: string
  customerName?: string
}

export default function NotificationCenter({ onNotificationAction }: NotificationCenterProps) {
  const { restaurantId } = useAuth()
  const [pendingOrders, setPendingOrders] = useState<Order[]>([])
  const [minimizedOrders, setMinimizedOrders] = useState<Order[]>([])
  const [currentNotification, setCurrentNotification] = useState<Order | null>(null)
  const [notificationHistory, setNotificationHistory] = useState<{
    id: string
    type: string
    message: string
    timestamp: number
    read: boolean
  }[]>([])

  // Carregar pedidos pendentes
  useEffect(() => {
    if (!restaurantId) return

    const ordersRef = ref(database, `restaurants/${restaurantId}/orders`)
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const ordersList = Object.entries(data)
          .map(([id, order]: [string, any]) => ({
            id,
            ...order
          }))
          .filter((order) => order.status === "pending")
          .sort((a, b) => b.timestamp - a.timestamp)

        setPendingOrders(ordersList)

        // Se não houver notificação atual e existirem pedidos pendentes, mostrar o primeiro
        if (!currentNotification && ordersList.length > 0) {
          setCurrentNotification(ordersList[0])
        }
      } else {
        setPendingOrders([])
      }
    })

    return () => unsubscribe()
  }, [restaurantId, currentNotification])

  // Carregar histórico de notificações
  useEffect(() => {
    if (!restaurantId) return

    const notificationsRef = ref(database, `restaurants/${restaurantId}/notifications`)
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const notificationsList = Object.entries(data)
          .map(([id, notification]: [string, any]) => ({
            id,
            ...notification
          }))
          .sort((a, b) => b.timestamp - a.timestamp)

        setNotificationHistory(notificationsList)
      } else {
        setNotificationHistory([])
      }
    })

    return () => unsubscribe()
  }, [restaurantId])

  // Adicionar notificação ao histórico
  const addNotificationToHistory = async (type: string, message: string) => {
    if (!restaurantId) return

    try {
      const notificationsRef = ref(database, `restaurants/${restaurantId}/notifications`)
      const newNotificationRef = push(notificationsRef)
      await set(newNotificationRef, {
        type,
        message,
        timestamp: Date.now(),
        read: false
      })
    } catch (error) {
      console.error("Erro ao adicionar notificação:", error)
    }
  }

  // Atualizar status do pedido
  const updateOrderStatus = async (orderId: string, status: string, additionalData?: any) => {
    if (!restaurantId) return

    try {
      const orderRef = ref(database, `restaurants/${restaurantId}/orders/${orderId}`)
      await update(orderRef, {
        status,
        lastUpdated: Date.now(),
        ...additionalData
      })
    } catch (error) {
      console.error("Erro ao atualizar status do pedido:", error)
    }
  }

  // Handlers para ações de notificação
  // Função para parar o alarme sonoro
  const stopAlarm = () => {
    if (window && typeof window !== 'undefined') {
      // Disparar evento personalizado para parar o alarme
      const stopAlarmEvent = new CustomEvent('stopNotificationAlarm');
      window.dispatchEvent(stopAlarmEvent);
      console.log("🔇 [NOTIFICATION] Evento para parar alarme disparado");
    }
  };

  const handleAcceptOrder = async (orderId: string, estimatedTime?: number, notes?: string) => {
    // Parar o alarme sonoro
    stopAlarm();
    
    await updateOrderStatus(orderId, "confirmed", {
      estimatedTime,
      notes,
      confirmedAt: Date.now()
    })

    await addNotificationToHistory(
      "order_accepted",
      `Pedido da Mesa ${currentNotification?.tableNumber} aceito. Tempo estimado: ${estimatedTime} minutos.`
    )

    if (onNotificationAction) {
      onNotificationAction("accept", orderId, { estimatedTime, notes })
    }

    setCurrentNotification(null)
  }

  const handleRejectOrder = async (orderId: string, reason?: string) => {
    // Parar o alarme sonoro
    stopAlarm();
    
    await updateOrderStatus(orderId, "rejected", {
      rejectionReason: reason,
      rejectedAt: Date.now()
    })

    await addNotificationToHistory(
      "order_rejected",
      `Pedido da Mesa ${currentNotification?.tableNumber} rejeitado.${
        reason ? ` Motivo: ${reason}` : ""
      }`
    )

    if (onNotificationAction) {
      onNotificationAction("reject", orderId, { reason })
    }

    setCurrentNotification(null)
  }

  const handleHoldOrder = async (orderId: string) => {
    // Parar o alarme sonoro (mesmo no "Um momento" paramos o alarme)
    stopAlarm();
    
    // Não altera o status, apenas remove da notificação atual
    await addNotificationToHistory(
      "order_hold",
      `Pedido da Mesa ${currentNotification?.tableNumber} colocado em espera.`
    )

    if (onNotificationAction) {
      onNotificationAction("hold", orderId)
    }

    // Adicionar o pedido atual à lista de pedidos minimizados
    if (currentNotification) {
      setMinimizedOrders(prev => [...prev, currentNotification]);
      console.log("🔄 [NOTIFICATION] Pedido minimizado:", currentNotification.id);
    }

    setCurrentNotification(null)
  }

  const handleExpireOrder = async (orderId: string) => {
    // Parar o alarme sonoro
    stopAlarm();
    
    // Quando o tempo expira, recusar automaticamente o pedido
    await updateOrderStatus(orderId, "rejected", {
      rejectionReason: "Tempo de resposta expirado",
      rejectedAt: Date.now()
    })
    
    await addNotificationToHistory(
      "order_expired",
      `Tempo de resposta para o pedido da Mesa ${currentNotification?.tableNumber} expirou. Pedido recusado automaticamente.`
    )

    if (onNotificationAction) {
      onNotificationAction("expire", orderId)
    }

    setCurrentNotification(null)
  }

  // Renderizar o popup de notificação se houver uma notificação atual
  // E renderizar todos os pedidos minimizados em uma pilha vertical
  return (
    <>
      {/* Overlay escuro apenas quando há um pedido não minimizado */}
      {currentNotification && (
        <OrderNotificationPopup
          order={currentNotification}
          onAccept={handleAcceptOrder}
          onReject={handleRejectOrder}
          onHold={handleHoldOrder}
          onExpire={handleExpireOrder}
        />
      )}
      
      {/* Pedidos minimizados empilhados verticalmente */}
      <div className="fixed bottom-4 right-4 flex flex-col-reverse space-y-reverse space-y-2 z-40">
        {minimizedOrders.map((order, index) => (
          <div 
            key={order.id}
            className="bg-white rounded-lg shadow-lg overflow-hidden w-64"
          >
            <div className="bg-orange-500 text-white px-4 py-3 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <h3 className="text-sm font-semibold">Mesa {order.tableNumber}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => {
                    // Remover da lista de minimizados
                    setMinimizedOrders(prev => prev.filter(o => o.id !== order.id));
                    // Mostrar como notificação atual
                    setCurrentNotification(order);
                    // Remover do localStorage
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem(`order_minimized_${order.id}`);
                    }
                  }}
                  className="text-white hover:text-gray-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="w-full bg-gray-200 h-1">
              <div
                className="bg-orange-500 h-1 transition-all duration-1000 ease-linear"
                style={{ width: '50%' }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
