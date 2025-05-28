"use client"

import OrderManagement from "@/components/orders/OrderManagement"

export default function OrdersPage() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Gerenciamento de Pedidos</h1>
      <OrderManagement />
    </div>
  )
}
