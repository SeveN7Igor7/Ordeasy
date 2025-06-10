import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { AuthProvider } from "@/lib/auth-context"
import { CustomerAuthProvider } from "@/lib/customer-auth-context"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "OrdEasy - Sistema de Pedidos Profissional",
  description: "Plataforma completa para gestão de restaurantes com QR Code",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <AuthProvider>
          <CustomerAuthProvider>
            {children}
          </CustomerAuthProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
