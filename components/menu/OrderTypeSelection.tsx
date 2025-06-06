"use client"

import { useState } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Truck, Home } from "lucide-react"

interface OrderTypeSelectionProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (type: "qrcode" | "delivery" | "pickup") => void
  qrcodeEnabled: boolean
  deliveryEnabled: boolean
}

export default function OrderTypeSelection({
  isOpen,
  onClose,
  onSelect,
  qrcodeEnabled,
  deliveryEnabled
}: OrderTypeSelectionProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in duration-300">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Como você deseja fazer seu pedido?
          </h2>
          
          <div className="grid grid-cols-1 gap-4 mb-6">
            {qrcodeEnabled && (
              <button
                onClick={() => onSelect("qrcode")}
                className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors"
              >
                <div className="bg-orange-100 p-3 rounded-full mr-4">
                  <ShoppingCart className="h-6 w-6 text-orange-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">Pedido na Mesa</h3>
                  <p className="text-sm text-gray-500">
                    Faça seu pedido diretamente na mesa do restaurante
                  </p>
                </div>
              </button>
            )}
            
            {deliveryEnabled && (
              <button
                onClick={() => onSelect("delivery")}
                className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors"
              >
                <div className="bg-orange-100 p-3 rounded-full mr-4">
                  <Truck className="h-6 w-6 text-orange-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">Delivery / Retirada</h3>
                  <p className="text-sm text-gray-500">
                    Receba seu pedido em casa ou retire no restaurante
                  </p>
                </div>
              </button>
            )}
          </div>
          
          <div className="text-center">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

