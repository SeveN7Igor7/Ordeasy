"use client"

import { useState, useEffect, useRef } from "react"
import { X, Check, Clock, AlertTriangle } from "lucide-react"

interface OrderNotificationPopupProps {
  order: {
    id: string
    tableNumber: string
    items: any[]
    totalAmount: number
    timestamp: number
    customerName?: string
  }
  onAccept: (orderId: string, estimatedTime?: number, notes?: string) => void
  onReject: (orderId: string, reason?: string) => void
  onHold: (orderId: string) => void
  onExpire: (orderId: string) => void
}

export default function OrderNotificationPopup({
  order,
  onAccept,
  onReject,
  onHold,
  onExpire
}: OrderNotificationPopupProps) {
  const [timeLeft, setTimeLeft] = useState(180) // 3 minutos em segundos
  const [estimatedTime, setEstimatedTime] = useState(15) // Tempo estimado em minutos
  const [notes, setNotes] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  const [showEstimatedTimeInput, setShowEstimatedTimeInput] = useState(false)
  const [showRejectReasonInput, setShowRejectReasonInput] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  // Verificar se o pedido já estava minimizado anteriormente
  const [isMinimized, setIsMinimized] = useState(() => {
    // Verificar no localStorage se este pedido estava minimizado
    if (typeof window !== 'undefined') {
      const minimizedState = localStorage.getItem(`order_minimized_${order.id}`)
      return minimizedState === 'true'
    }
    return false
  })

  // Formatar o tempo restante como MM:SS
  const formatTimeLeft = () => {
    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  // Lógica do cronômetro
  useEffect(() => {
    // Verificar se o pedido tem ID válido antes de iniciar o timer
    if (!order || !order.id) {
      console.log("⚠️ [TIMER] Pedido sem ID válido, timer não será iniciado");
      return;
    }
    
    console.log("⏱️ [TIMER] Iniciando timer para pedido:", order.id);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          console.log("⏱️ [TIMER] Tempo expirado para pedido:", order.id);
          onExpire(order.id)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      console.log("⏱️ [TIMER] Limpando timer para pedido:", order.id);
      clearInterval(timer)
    }
  }, [order?.id, onExpire])
  
  // Lógica de reprodução do áudio de alerta
  useEffect(() => {
    // Só reproduzir áudio se o popup não estiver minimizado e se o pedido tiver ID válido
    if (!isMinimized && order && order.id) {
      console.log("🔔 [POPUP] Popup de notificação exibido para o pedido:", order.id, "da mesa:", order.tableNumber);
      
      // Criar elemento de áudio
      if (typeof window !== 'undefined') {
        try {
          // Usar o arquivo MP3 enviado pelo usuário
          const audioUrl = '/upload/level-up-191997.mp3';
          
          // Criar novo elemento de áudio
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          
          // Configurar volume
          audio.volume = 1.0;
          
          // Configurar loop para continuar tocando até resposta
          audio.loop = true;
          
          // Adicionar logs para todos os eventos do áudio
          audio.onloadstart = () => console.log("🔊 [AUDIO] Iniciando carregamento do áudio para pedido:", order.id);
          audio.oncanplaythrough = () => console.log("🔊 [AUDIO] Áudio carregado e pronto para reprodução:", order.id);
          audio.onplay = () => console.log("🔊 [AUDIO] Reprodução iniciada para pedido:", order.id);
          audio.onpause = () => console.log("🔊 [AUDIO] Reprodução pausada para pedido:", order.id);
          audio.onended = () => console.log("🔊 [AUDIO] Reprodução finalizada para pedido:", order.id);
          audio.onerror = (e) => console.error("❌ [AUDIO] Erro na reprodução do áudio:", e, "para pedido:", order.id);
          
          // Iniciar reprodução
          console.log("🔊 [AUDIO] Tentando reproduzir áudio para pedido:", order.id);
          audio.play()
            .then(() => console.log("✅ [AUDIO] Reprodução iniciada com sucesso para pedido:", order.id))
            .catch(err => console.error("❌ [AUDIO] Falha ao iniciar reprodução:", err, "para pedido:", order.id));
          
          // Adicionar listener para o evento personalizado de parar o alarme
          const stopAlarmHandler = () => {
            console.log("🔇 [AUDIO] Recebido evento para parar alarme do pedido:", order.id);
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
              console.log("🔇 [AUDIO] Alarme parado para pedido:", order.id);
            }
          };
          
          window.addEventListener('stopNotificationAlarm', stopAlarmHandler);
          
          // Limpar quando o componente for desmontado
          return () => {
            console.log("🧹 [AUDIO] Limpando recursos de áudio para pedido:", order.id);
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.src = '';
            }
            window.removeEventListener('stopNotificationAlarm', stopAlarmHandler);
          };
        } catch (error) {
          console.error("❌ [AUDIO] Erro ao configurar áudio:", error);
        }
      }
    } else if (!isMinimized && order) {
      console.log("⚠️ [POPUP] Pedido sem ID válido, áudio não será reproduzido");
    } else if (order && order.id) {
      console.log("🔕 [POPUP] Popup está minimizado, áudio não será reproduzido para pedido:", order.id);
    }
  }, [isMinimized, order?.id, order?.tableNumber])

  // Calcular a porcentagem de tempo restante para a barra de progresso
  const timeLeftPercentage = (timeLeft / 180) * 100

  // Formatar o timestamp para hora local
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Formatar o valor total
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value)
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isMinimized ? '' : 'bg-black/50'}`}>
      {isMinimized ? (
        <div className="hidden">
          {/* Pedido minimizado - não renderizar aqui, será renderizado pelo NotificationCenter */}
        </div>
      ) : (
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-orange-500 text-white px-4 py-3 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Novo Pedido</h3>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span className="font-mono">{formatTimeLeft()}</span>
            </div>
          </div>

          <div className="w-full bg-gray-200 h-1">
            <div
              className="bg-orange-500 h-1 transition-all duration-1000 ease-linear"
              style={{ width: `${timeLeftPercentage}%` }}
            ></div>
          </div>

          <div className="p-4">
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Mesa:</span>
                <span className="font-semibold">{order.tableNumber}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Horário:</span>
                <span>{formatTimestamp(order.timestamp)}</span>
              </div>
              {order.customerName && (
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Cliente:</span>
                  <span>{order.customerName}</span>
                </div>
              )}
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold">{formatCurrency(order.totalAmount)}</span>
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
                  {order.items.map((item, index) => (
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

            {showEstimatedTimeInput && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tempo estimado de preparo (minutos)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(parseInt(e.target.value) || 15)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <label className="block text-sm font-medium text-gray-700 mt-2 mb-1">
                  Observações (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={2}
                  placeholder="Alguma observação para o cliente?"
                ></textarea>
              </div>
            )}

            {showRejectReasonInput && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo da recusa (opcional)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={2}
                  placeholder="Por que o pedido está sendo recusado?"
                ></textarea>
              </div>
            )}

            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              {!showEstimatedTimeInput && !showRejectReasonInput ? (
                <>
                  <button
                    onClick={() => setShowRejectReasonInput(true)}
                    className="flex-1 flex items-center justify-center px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Recusar
                  </button>
                  <button
                    onClick={() => {
                      setIsMinimized(true);
                      onHold(order.id);
                      // Garantir que o popup permaneça minimizado
                      localStorage.setItem(`order_minimized_${order.id}`, 'true');
                    }}
                    className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Um momento
                  </button>
                  <button
                    onClick={() => setShowEstimatedTimeInput(true)}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Aceitar
                  </button>
                </>
              ) : showEstimatedTimeInput ? (
                <>
                  <button
                    onClick={() => setShowEstimatedTimeInput(false)}
                    className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => onAccept(order.id, estimatedTime, notes)}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Confirmar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowRejectReasonInput(false)}
                    className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => onReject(order.id, rejectReason)}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Confirmar Recusa
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
