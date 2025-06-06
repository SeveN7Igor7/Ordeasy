"use client"

import { useState, useEffect, useRef } from "react"
import { X, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"

interface OrderNotificationProps {
  order: any
  onAccept: (orderId: string) => void
  onReject: (orderId: string) => void
  onClose: () => void
}

export default function OrderNotification({
  order,
  onAccept,
  onReject,
  onClose
}: OrderNotificationProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  useEffect(() => {
    // Criar elemento de áudio
    audioRef.current = new Audio("/notification-sound.mp3")
    
    // Reproduzir som
    const playSound = async () => {
      try {
        console.log("REPRODUZINDO SOM DE NOTIFICAÇÃO")
        await audioRef.current?.play()
      } catch (error) {
        console.error("Erro ao reproduzir som:", error)
      }
    }
    
    playSound()
    
    // Limpar ao desmontar
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])
  
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
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <Bell className="h-6 w-6 text-orange-500 mr-2" />
            <h2 className="text-xl font-bold text-gray-900">Novo Pedido!</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Fechar</span>
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="mb-6">
          <div className="bg-orange-50 p-4 rounded-lg mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-gray-900">
                {order.orderType === "delivery" ? "Delivery" : "Retirada"}
              </h3>
              <span className="text-sm text-gray-500">
                {formatDate(order.timestamp)}
              </span>
            </div>
            
            <div className="mb-3">
              <p className="font-medium text-gray-900">{order.customerName}</p>
              <p className="text-gray-700">{order.customerPhone}</p>
            </div>
            
            {order.orderType === "delivery" && order.address && (
              <div className="mb-3">
                <h4 className="text-sm font-medium text-gray-700">Endereço:</h4>
                <p className="text-sm text-gray-600">
                  {order.address.street}, {order.address.number}
                  {order.address.complement && `, ${order.address.complement}`}
                </p>
                <p className="text-sm text-gray-600">
                  {order.address.neighborhood}, {order.address.city} - {order.address.state}
                </p>
                <p className="text-sm text-gray-600">
                  CEP: {order.address.cep}
                </p>
              </div>
            )}
            
            <div className="mb-3">
              <h4 className="text-sm font-medium text-gray-700">Forma de pagamento:</h4>
              <p className="text-sm text-gray-600">
                {order.paymentMethod === "credit" && "Maquininha Crédito"}
                {order.paymentMethod === "debit" && "Maquininha Débito"}
                {order.paymentMethod === "pix" && "Pix"}
                {order.paymentMethod === "cash" && "Dinheiro"}
              </p>
            </div>
            
            {order.additionalInfo && (
              <div className="mb-3">
                <h4 className="text-sm font-medium text-gray-700">Informações adicionais:</h4>
                <p className="text-sm text-gray-600">{order.additionalInfo}</p>
              </div>
            )}
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Itens do pedido:</h3>
            <ul className="space-y-2 mb-3">
              {order.items.map((item, index) => (
                <li key={index} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span>{formatCurrency(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
              <span>Total</span>
              <span>{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="outline"
            className="flex-1 bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700"
            onClick={() => onReject(order.id)}
          >
            Rejeitar
          </Button>
          <Button
            className="flex-1"
            onClick={() => onAccept(order.id)}
          >
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  )
}

