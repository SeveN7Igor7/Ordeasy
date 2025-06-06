"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DemoRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Simula o QR Code redirecionando para o cardápio com mesa
    router.push("/restaurante-exemplo?mesa=5")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecionando para o cardápio...</p>
      </div>
    </div>
  )
}
