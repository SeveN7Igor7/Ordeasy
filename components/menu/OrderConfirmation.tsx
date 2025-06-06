"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { database } from "@/lib/firebase"
import { ref, onValue, update, push, set } from "firebase/database"
import OrderStatusFeedback from "@/components/menu/OrderStatusFeedback"
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash, 
  Clock,
  Send
} from "lucide-react"

interface OrderConfirmationProps {
  restaurantId: string
  tableNumber: string
  items: any[]
  totalAmount: number
  onClose: () => void
  onSuccess: () => void
}

export default function OrderConfirmation({
  restaurantId,
  tableNumber,
  items,
  totalAmount,
  onClose,
  onSuccess
}: OrderConfirmationProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState("")
  const [customerNotes, setCustomerNotes] = useState("")
  const [tableStatus, setTableStatus] = useState<string | null>(null)
  const [showStatusFeedback, setShowStatusFeedback] = useState(false)

  // Verificar status da mesa
  useEffect(() => {
    if (!restaurantId || !tableNumber) return

    const tablesRef = ref(database, `restaurants/${restaurantId}/tables`)
    const unsubscribe = onValue(tablesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        // Encontrar a mesa pelo número
        const tableEntry = Object.entries(data).find(
          ([_, table]: [string, any]) => table.number === tableNumber
        )
        
        if (tableEntry) {
          setTableStatus(tableEntry[1].status)
        }
      }
    })

    return () => unsubscribe()
  }, [restaurantId, tableNumber])

  // Formatar valor monetário
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const handleSubmitOrder = async () => {
    if (!restaurantId || !tableNumber || items.length === 0) {
      setError("Dados do pedido incompletos")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Criar novo pedido
      const ordersRef = ref(database, `restaurants/${restaurantId}/orders`)
      const newOrderRef = push(ordersRef)
      const newOrderId = newOrderRef.key

      const orderData = {
        tableNumber,
        items,
        totalAmount,
        status: "pending",
        timestamp: Date.now(),
        customerName: customerName.trim() || null,
        customerNotes: customerNotes.trim() || null
      }

      await set(newOrderRef, orderData)
      setOrderId(newOrderId)

      // Atualizar status da mesa para ocupada se ainda não estiver
      if (tableStatus !== "occupied") {
        // Encontrar o ID da mesa pelo número
        const tablesRef = ref(database, `restaurants/${restaurantId}/tables`)
        const snapshot = await new Promise<any>((resolve) => {
          onValue(tablesRef, resolve, { onlyOnce: true })
        })

        if (snapshot.exists()) {
          const data = snapshot.val()
          const tableEntry = Object.entries(data).find(
            ([_, table]: [string, any]) => table.number === tableNumber
          )

          if (tableEntry) {
            const tableId = tableEntry[0]
            const tableRef = ref(database, `restaurants/${restaurantId}/tables/${tableId}`)
            await update(tableRef, {
              status: "occupied",
              currentOrderId: newOrderId,
              lastUpdated: Date.now()
            })
          }
        }
      }

      setSuccess(true)
      setShowStatusFeedback(true)
      onSuccess()
    } catch (error: any) {
      console.error("Erro ao enviar pedido:", error)
      setError(`Erro ao enviar pedido: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Cabeçalho */}
          <div className="bg-orange-500 text-white px-4 py-3 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Confirmar Pedido</h3>
            </div>
            {tableStatus === "occupied" && (
              <span className="text-xs bg-white text-orange-600 px-2 py-1 rounded-full">
                Mesa já ocupada
              </span>
            )}
          </div>

          {/* Conteúdo */}
          <div className="p-4">
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Mesa:</span>
                <span className="font-semibold">{tableNumber}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <div className="max-h-40 overflow-y-auto mb-4 border rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qtd
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preço
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 text-sm text-gray-900">{item.name}</td>
                      <td className="px-3 py-2 text-sm text-gray-500 text-center">{item.quantity}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-right">
                        {formatCurrency(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Campos adicionais */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seu nome (opcional)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Para identificarmos seu pedido"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações (opcional)
              </label>
              <textarea
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={2}
                placeholder="Ex: Sem cebola, ponto da carne, etc."
              ></textarea>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md border border-red-100">
                {error}
              </div>
            )}

            {/* Botões de ação */}
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitOrder}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enviando...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Send className="h-4 w-4 mr-1" />
                    Enviar Pedido
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback de status do pedido */}
      {showStatusFeedback && orderId && (
        <OrderStatusFeedback
          orderId={orderId}
          tableNumber={tableNumber}
          onClose={() => setShowStatusFeedback(false)}
        />
      )}
    </>
  )
}
