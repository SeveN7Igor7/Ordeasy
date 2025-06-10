"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { QrCode, Smartphone, BarChart3, Store, Users, Zap, CheckCircle, ArrowRight } from "lucide-react"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="bg-orange-500 p-2 rounded-lg">
                <QrCode className="h-8 w-8 text-white" />
              </div>
              <h1 className="ml-3 text-2xl font-bold text-gray-900">OrdEasy</h1>
            </div>
            <nav className="flex space-x-4">
              <Link
                href="/auth"
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                Entrar (Restaurante)
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-6xl">
            Revolucione seu
            <span className="text-orange-500"> Restaurante</span>
          </h2>
          <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
            Sistema completo de pedidos digitais com QR Code. Seus clientes fazem pedidos direto da mesa, você gerencia
            tudo em tempo real com dashboard profissional.
          </p>
          <div className="mt-10 flex justify-center space-x-6">
            <Link
              href="/auth"
              className="bg-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors flex items-center space-x-2"
            >
              <span>Começar Agora</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/restaurante-exemplo?mesa=1"
              className="border border-orange-500 text-orange-500 px-8 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
            >
              Ver Demo
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-white rounded-xl shadow-sm">
            <div className="bg-orange-100 p-3 rounded-full w-fit mx-auto">
              <QrCode className="h-8 w-8 text-orange-500" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">QR Code Inteligente</h3>
            <p className="mt-2 text-gray-600">
              Cada mesa tem seu QR Code único. Cliente escaneia e acessa o cardápio personalizado instantaneamente.
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-xl shadow-sm">
            <div className="bg-orange-100 p-3 rounded-full w-fit mx-auto">
              <Smartphone className="h-8 w-8 text-orange-500" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">Cardápio Digital</h3>
            <p className="mt-2 text-gray-600">
              Interface moderna e responsiva. Cliente navega, seleciona e faz pedidos com tema personalizado.
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-xl shadow-sm">
            <div className="bg-orange-100 p-3 rounded-full w-fit mx-auto">
              <BarChart3 className="h-8 w-8 text-orange-500" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">Dashboard Profissional</h3>
            <p className="mt-2 text-gray-600">
              Gerencie pedidos, mesas, configurações e relatórios tudo em tempo real com filtros avançados.
            </p>
          </div>
        </div>

        {/* Advanced Features */}
        <div className="mt-20">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">Funcionalidades Profissionais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Store, title: "Multi-Restaurante", desc: "Gerencie múltiplos estabelecimentos" },
              { icon: Users, title: "Controle de Mesas", desc: "Status em tempo real de todas as mesas" },
              { icon: Zap, title: "Configurações Dinâmicas", desc: "Personalize cores, horários e funcionalidades" },
              { icon: CheckCircle, title: "Pagamentos", desc: "Controle de status de pagamento integrado" },
            ].map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="bg-orange-100 p-2 rounded-lg w-fit">
                  <feature.icon className="h-6 w-6 text-orange-500" />
                </div>
                <h4 className="mt-3 font-semibold text-gray-900">{feature.title}</h4>
                <p className="mt-1 text-sm text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 bg-white rounded-2xl shadow-xl p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Pronto para revolucionar seu restaurante?</h3>
          <p className="text-gray-600 mb-6">
            Cadastre-se agora e comece a usar o sistema mais completo de pedidos digitais do mercado.
          </p>
          <Link
            href="/auth"
            className="bg-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors inline-flex items-center space-x-2"
          >
            <span>Cadastrar Restaurante</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </div>
  )
}


