"use client"

import { useState } from "react"
import InventoryManager from "@/components/inventory/InventoryManager"

export default function InventoryPage() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Gestão de Estoque</h1>
      <InventoryManager />
    </div>
  )
}
