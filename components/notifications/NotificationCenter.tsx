"use client"

import { useState, useEffect } from "react"
import { database } from "@/lib/firebase"
import { ref, onValue, update, push, set } from "firebase/database"
import { useAuth } from "@/lib/auth-context"
import OrderNotificationPopup from "@/components/notifications/OrderNotificationPopup"

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
  const handleAcceptOrder = async (orderId: string, estimatedTime?: number, notes?: string) => {
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
    // Não altera o status, apenas remove da notificação atual
    await addNotificationToHistory(
      "order_hold",
      `Pedido da Mesa ${currentNotification?.tableNumber} colocado em espera.`
    )

    if (onNotificationAction) {
      onNotificationAction("hold", orderId)
    }

    setCurrentNotification(null)
  }

  const handleExpireOrder = async (orderId: string) => {
    // Quando o tempo expira, move para a área de pedidos
    await addNotificationToHistory(
      "order_expired",
      `Tempo de resposta para o pedido da Mesa ${currentNotification?.tableNumber} expirou.`
    )

    if (onNotificationAction) {
      onNotificationAction("expire", orderId)
    }

    setCurrentNotification(null)
  }

  // Renderizar o popup de notificação se houver uma notificação atual
  return (
    <>
      {currentNotification && (
        <OrderNotificationPopup
          order={currentNotification}
          onAccept={handleAcceptOrder}
          onReject={handleRejectOrder}
          onHold={handleHoldOrder}
          onExpire={handleExpireOrder}
        />
      )}
    </>
  )
}
