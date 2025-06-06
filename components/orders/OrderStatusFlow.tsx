"use client"

import { useState } from "react"
import { Clock, CheckCircle, ChefHat, Coffee, Package, X } from "lucide-react"

interface OrderStatusFlowProps {
  currentStatus: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled"
  onStatusChange: (newStatus: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled") => void
  estimatedTime?: number // em minutos
  setEstimatedTime?: (minutes: number) => void
}

export default function OrderStatusFlow({
  currentStatus,
  onStatusChange,
  estimatedTime,
  setEstimatedTime,
}: OrderStatusFlowProps) {
  const [isEditingTime, setIsEditingTime] = useState(false)
  const [timeInput, setTimeInput] = useState(estimatedTime?.toString() || "")

  const statuses = [
    { id: "pending", label: "Pendente", icon: <Clock className="h-5 w-5" /> },
    { id: "confirmed", label: "Confirmado", icon: <CheckCircle className="h-5 w-5" /> },
    { id: "preparing", label: "Preparando", icon: <ChefHat className="h-5 w-5" /> },
    { id: "ready", label: "Pronto", icon: <Coffee className="h-5 w-5" /> },
    { id: "delivered", label: "Entregue", icon: <Package className="h-5 w-5" /> },
  ]

  const statusIndex = statuses.findIndex((s) => s.id === currentStatus)
  const isCancelled = currentStatus === "cancelled"

  const handleTimeSubmit = () => {
    const time = parseInt(timeInput)
    if (!isNaN(time) && time > 0 && setEstimatedTime) {
      setEstimatedTime(time)
    }
    setIsEditingTime(false)
  }

  return (
    <div className="w-full bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Status do Pedido</h3>
        {currentStatus !== "delivered" && currentStatus !== "cancelled" && (
          <button
            onClick={() => onStatusChange("cancelled")}
            className="text-red-500 hover:text-red-700 flex items-center text-sm"
          >
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </button>
        )}
      </div>

      {isCancelled ? (
        <div className="bg-red-50 text-red-700 p-3 rounded-md flex items-center">
          <X className="h-5 w-5 mr-2" />
          <span className="font-medium">Pedido Cancelado</span>
        </div>
      ) : (
        <>
          <div className="relative">
            {/* Linha de progresso */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2"></div>
            <div
              className="absolute top-1/2 left-0 h-1 bg-green-500 -translate-y-1/2 transition-all duration-300"
              style={{ width: `${(statusIndex / (statuses.length - 1)) * 100}%` }}
            ></div>

            {/* Ícones de status */}
            <div className="relative flex justify-between">
              {statuses.map((status, index) => {
                const isActive = index <= statusIndex
                const isCurrent = index === statusIndex

                return (
                  <div key={status.id} className="flex flex-col items-center">
                    <button
                      className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                        isActive
                          ? "bg-green-500 text-white"
                          : "bg-white border-2 border-gray-300 text-gray-400"
                      } ${isCurrent ? "ring-4 ring-green-100" : ""}`}
                      onClick={() => {
                        if (index <= statusIndex + 1) {
                          onStatusChange(status.id as any)
                        }
                      }}
                      disabled={index > statusIndex + 1}
                    >
                      {status.icon}
                    </button>
                    <span
                      className={`mt-2 text-xs font-medium ${
                        isActive ? "text-green-600" : "text-gray-500"
                      }`}
                    >
                      {status.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tempo estimado */}
          {currentStatus !== "delivered" && (
            <div className="mt-6 bg-orange-50 p-3 rounded-md">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-orange-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700">
                    Tempo estimado de preparo:
                  </span>
                </div>

                {isEditingTime ? (
                  <div className="flex items-center">
                    <input
                      type="number"
                      className="w-16 px-2 py-1 border border-gray-300 rounded mr-2 text-sm"
                      value={timeInput}
                      onChange={(e) => setTimeInput(e.target.value)}
                      min="1"
                    />
                    <span className="text-sm text-gray-600 mr-2">min</span>
                    <button
                      onClick={handleTimeSubmit}
                      className="text-xs bg-green-500 text-white px-2 py-1 rounded"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="text-sm font-semibold text-gray-800 mr-2">
                      {estimatedTime || "--"} min
                    </span>
                    {setEstimatedTime && (
                      <button
                        onClick={() => setIsEditingTime(true)}
                        className="text-xs text-blue-500 hover:text-blue-700"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
