"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { database } from "@/lib/firebase"
import { ref, onValue, update } from "firebase/database"
import { 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Bell,
  Timer
} from "lucide-react"

interface OrderStatusFeedbackProps {
  orderId: string
  tableNumber: string
  onClose: () => void
}

export default function OrderStatusFeedback({ 
  orderId, 
  tableNumber, 
  onClose 
}: OrderStatusFeedbackProps) {
  const { restaurantId } = useAuth()
  const [orderStatus, setOrderStatus] = useState<string>("pending")
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null)
  const [notes, setNotes] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(180) // 3 minutos em segundos
  const [showFeedback, setShowFeedback] = useState(true)

  useEffect(() => {
    if (!restaurantId || !orderId) return

    // Monitorar status do pedido
    const orderRef = ref(database, `restaurants/${restaurantId}/orders/${orderId}`)
    const unsubscribe = onValue(orderRef, (snapshot) => {
      if (snapshot.exists()) {
        const orderData = snapshot.val()
        setOrderStatus(orderData.status || "pending")
        setEstimatedTime(orderData.estimatedTime || null)
        setNotes(orderData.notes || null)
        setRejectionReason(orderData.rejectionReason || null)
        
        // Se o status mudou de pendente, podemos parar o cronômetro
        if (orderData.status !== "pending") {
          setTimeLeft(0)
        }
      }
    })

    return () => unsubscribe()
  }, [restaurantId, orderId])

  // Cronômetro regressivo
  useEffect(() => {
    // Só executar o cronômetro se o status for pendente
    if (orderStatus !== "pending" || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [orderStatus, timeLeft])

  // Formatar o tempo restante como MM:SS
  const formatTimeLeft = () => {
    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  // Calcular a porcentagem de tempo restante para a barra de progresso
  const timeLeftPercentage = (timeLeft / 180) * 100

  // Obter informações de status
  const getStatusInfo = () => {
    switch (orderStatus) {
      case "pending":
        return {
          title: "Aguardando confirmação",
          description: "Seu pedido foi enviado e está aguardando confirmação do restaurante.",
          icon: <Clock className="h-8 w-8 text-yellow-500" />,
          color: "bg-yellow-50 border-yellow-200"
        }
      case "confirmed":
        return {
          title: "Pedido confirmado!",
          description: `Seu pedido foi aceito e está sendo preparado. ${
            estimatedTime ? `Tempo estimado: ${estimatedTime} minutos.` : ""
          }`,
          icon: <CheckCircle className="h-8 w-8 text-green-500" />,
          color: "bg-green-50 border-green-200"
        }
      case "preparing":
        return {
          title: "Preparando seu pedido",
          description: "Seu pedido está sendo preparado na cozinha.",
          icon: <Timer className="h-8 w-8 text-blue-500" />,
          color: "bg-blue-50 border-blue-200"
        }
      case "ready":
        return {
          title: "Pedido pronto!",
          description: "Seu pedido está pronto e será entregue em instantes.",
          icon: <CheckCircle className="h-8 w-8 text-indigo-500" />,
          color: "bg-indigo-50 border-indigo-200"
        }
      case "completed":
        return {
          title: "Pedido entregue",
          description: "Seu pedido foi entregue. Bom apetite!",
          icon: <CheckCircle className="h-8 w-8 text-green-500" />,
          color: "bg-green-50 border-green-200"
        }
      case "rejected":
        return {
          title: "Pedido não aceito",
          description: rejectionReason 
            ? `Seu pedido não pôde ser aceito. Motivo: ${rejectionReason}` 
            : "Seu pedido não pôde ser aceito pelo restaurante.",
          icon: <XCircle className="h-8 w-8 text-red-500" />,
          color: "bg-red-50 border-red-200"
        }
      default:
        return {
          title: "Status desconhecido",
          description: "Não foi possível determinar o status do seu pedido.",
          icon: <AlertTriangle className="h-8 w-8 text-gray-500" />,
          color: "bg-gray-50 border-gray-200"
        }
    }
  }

  const statusInfo = getStatusInfo()

  if (!showFeedback) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Cabeçalho */}
        <div className={`px-6 py-4 border-b ${statusInfo.color}`}>
          <div className="flex items-center">
            {statusInfo.icon}
            <h3 className="ml-3 text-lg font-semibold">{statusInfo.title}</h3>
          </div>
        </div>

        {/* Barra de progresso do tempo (apenas para pedidos pendentes) */}
        {orderStatus === "pending" && timeLeft > 0 && (
          <>
            <div className="w-full bg-gray-200 h-1">
              <div
                className="bg-yellow-500 h-1 transition-all duration-1000 ease-linear"
                style={{ width: `${timeLeftPercentage}%` }}
              ></div>
            </div>
            <div className="px-6 py-2 bg-yellow-50 flex items-center justify-center">
              <Clock className="h-4 w-4 text-yellow-600 mr-2" />
              <span className="text-sm text-yellow-700">
                Aguardando resposta: {formatTimeLeft()}
              </span>
            </div>
          </>
        )}

        {/* Conteúdo */}
        <div className="p-6">
          <p className="text-gray-600 mb-4">{statusInfo.description}</p>
          
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Mesa:</span>
              <span className="font-semibold">{tableNumber}</span>
            </div>
            
            {estimatedTime && orderStatus === "confirmed" && (
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Tempo estimado:</span>
                <span className="font-semibold">{estimatedTime} minutos</span>
              </div>
            )}
          </div>
          
          {notes && (orderStatus === "confirmed" || orderStatus === "preparing") && (
            <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-100">
              <h4 className="text-sm font-medium text-blue-800 mb-1">Observações do restaurante:</h4>
              <p className="text-sm text-blue-700">{notes}</p>
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
