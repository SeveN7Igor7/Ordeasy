"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { database } from "@/lib/firebase"
import { ref, onValue, update } from "firebase/database"
import {
  ArrowLeft,
  Save,
  Palette,
  Clock,
  Store,
  Globe,
  Copy,
  QrCode,
  TableIcon,
  Plus,
  Trash2,
  Info,
  RefreshCw,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface RestaurantSettings {
  theme: {
    primaryColor: string
    secondaryColor: string
    backgroundColor: string
  }
  business: {
    openTime: string
    closeTime: string
    deliveryFee: number
    minimumOrder: number
  }
  features: {
    enableDelivery: boolean
    enablePickup: boolean
    enablePayment: boolean
    requireTableNumber: boolean
  }
}

interface RestaurantInfo {
  name: string
  description: string
  address: string
  phone: string
  logo: string
  ownerName: string
}

interface RestaurantTable {
  number: number
  status: "available" | "occupied" | "reserved" | "maintenance"
  capacity: number
}

export default function RestaurantSettings() {
  const { user, restaurantId, restaurantSlug } = useAuth()
  const router = useRouter()

  const [restaurant, setRestaurant] = useState<any>(null)
  const [settings, setSettings] = useState<RestaurantSettings>({
    theme: {
      primaryColor: "#f97316",
      secondaryColor: "#ea580c",
      backgroundColor: "#fff7ed",
    },
    business: {
      openTime: "08:00",
      closeTime: "22:00",
      deliveryFee: 5.0,
      minimumOrder: 20.0,
    },
    features: {
      enableDelivery: true,
      enablePickup: true,
      enablePayment: false,
      requireTableNumber: true,
    },
  })

  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo>({
    name: "",
    description: "",
    address: "",
    phone: "",
    logo: "",
    ownerName: "",
  })

  const [tables, setTables] = useState<Record<string, RestaurantTable>>({})
  const [newTable, setNewTable] = useState({ number: 1, capacity: 2 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("theme")
  const [showAddTable, setShowAddTable] = useState(false)

  useEffect(() => {
    console.log("⚙️ [CONFIGURAÇÕES] Iniciando carregamento das configurações...")
    console.log("⚙️ [CONFIGURAÇÕES] Restaurant ID:", restaurantId)
    console.log("⚙️ [CONFIGURAÇÕES] Restaurant Slug:", restaurantSlug)

    if (!user || !restaurantId) {
      console.log("🚫 [CONFIGURAÇÕES] Usuário não autenticado, redirecionando...")
      router.push("/auth")
      return
    }

    setLoading(true)
    setError(null)

    // Carregar dados do restaurante
    console.log("🔍 [CONFIGURAÇÕES] Buscando dados do restaurante...")
    const restaurantRef = ref(database, `restaurants/${restaurantId}`)

    const unsubscribe = onValue(
      restaurantRef,
      (snapshot) => {
        console.log("📡 [CONFIGURAÇÕES] Resposta do Firebase:", snapshot.exists())

        if (snapshot.exists()) {
          const data = snapshot.val()
          console.log("✅ [CONFIGURAÇÕES] Dados carregados:", data)

          setRestaurant(data)

          // Configurações
          if (data.settings) {
            console.log("⚙️ [CONFIGURAÇÕES] Configurações encontradas:", data.settings)
            setSettings({
              theme: data.settings.theme || settings.theme,
              business: data.settings.business || settings.business,
              features: data.settings.features || settings.features,
            })
          } else {
            console.log("⚙️ [CONFIGURAÇÕES] Usando configurações padrão")
          }

          // Informações do restaurante
          setRestaurantInfo({
            name: data.name || "",
            description: data.description || "",
            address: data.address || "",
            phone: data.phone || "",
            logo: data.logo || "",
            ownerName: data.ownerName || "",
          })

          // Mesas
          if (data.tables) {
            console.log("🪑 [CONFIGURAÇÕES] Mesas encontradas:", Object.keys(data.tables).length)
            setTables(data.tables)
          } else {
            console.log("🪑 [CONFIGURAÇÕES] Nenhuma mesa encontrada")
            setTables({})
          }

          setError(null)
        } else {
          console.error("❌ [CONFIGURAÇÕES] Restaurante não encontrado!")
          setError("Restaurante não encontrado")
        }

        setLoading(false)
      },
      (error) => {
        console.error("💥 [CONFIGURAÇÕES] Erro ao carregar dados:", error)
        setError(`Erro ao carregar dados: ${error.message}`)
        setLoading(false)
      },
    )

    return () => {
      console.log("🧹 [CONFIGURAÇÕES] Limpando listeners...")
      unsubscribe()
    }
  }, [user, restaurantId, router])

  const saveSettings = async () => {
    console.log("💾 [CONFIGURAÇÕES] Salvando configurações...")
    setSaving(true)

    try {
      const updates = {
        settings: settings,
        ...restaurantInfo,
      }

      console.log("💾 [CONFIGURAÇÕES] Dados para salvar:", updates)

      const restaurantRef = ref(database, `restaurants/${restaurantId}`)
      await update(restaurantRef, updates)

      console.log("✅ [CONFIGURAÇÕES] Configurações salvas com sucesso!")
      alert("Configurações salvas com sucesso!")
    } catch (error: any) {
      console.error("💥 [CONFIGURAÇÕES] Erro ao salvar:", error)
      alert(`Erro ao salvar configurações: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const addTable = async () => {
    console.log("🪑 [CONFIGURAÇÕES] Adicionando nova mesa:", newTable)

    if (newTable.number <= 0 || newTable.capacity <= 0) {
      alert("Por favor, digite números válidos")
      return
    }

    // Verificar se mesa já existe
    const existingTable = Object.values(tables).find((table) => table.number === newTable.number)
    if (existingTable) {
      alert("Já existe uma mesa com este número")
      return
    }

    try {
      const tableId = `table${newTable.number}`
      const tableData = {
        number: newTable.number,
        capacity: newTable.capacity,
        status: "available" as const,
      }

      console.log("💾 [CONFIGURAÇÕES] Salvando mesa:", tableId, tableData)

      const tableRef = ref(database, `restaurants/${restaurantId}/tables/${tableId}`)
      await update(tableRef, tableData)

      setNewTable({ number: newTable.number + 1, capacity: 2 })
      setShowAddTable(false)

      console.log("✅ [CONFIGURAÇÕES] Mesa adicionada com sucesso!")
      alert("Mesa adicionada com sucesso!")
    } catch (error: any) {
      console.error("💥 [CONFIGURAÇÕES] Erro ao adicionar mesa:", error)
      alert(`Erro ao adicionar mesa: ${error.message}`)
    }
  }

  const deleteTable = async (tableId: string) => {
    console.log("🗑️ [CONFIGURAÇÕES] Removendo mesa:", tableId)

    if (!confirm("Tem certeza que deseja remover esta mesa?")) return

    try {
      const tableRef = ref(database, `restaurants/${restaurantId}/tables/${tableId}`)
      await update(tableRef, null)

      console.log("✅ [CONFIGURAÇÕES] Mesa removida com sucesso!")
      alert("Mesa removida com sucesso!")
    } catch (error: any) {
      console.error("💥 [CONFIGURAÇÕES] Erro ao remover mesa:", error)
      alert(`Erro ao remover mesa: ${error.message}`)
    }
  }

  const copyMenuLink = () => {
    if (restaurantSlug) {
      const link = `${window.location.origin}/${restaurantSlug}`
      navigator.clipboard.writeText(link)
      console.log("📋 [CONFIGURAÇÕES] Link copiado:", link)
      alert("Link do cardápio copiado!")
    }
  }

  const generateQRCode = (tableNumber?: number) => {
    if (restaurantSlug) {
      const link = tableNumber
        ? `${window.location.origin}/${restaurantSlug}?mesa=${tableNumber}`
        : `${window.location.origin}/${restaurantSlug}`

      console.log("📱 [CONFIGURAÇÕES] Gerando QR Code:", link)
      window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`, "_blank")
    }
  }

  const reloadPage = () => {
    console.log("🔄 [CONFIGURAÇÕES] Recarregando página...")
    window.location.reload()
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Carregando Configurações</h2>
          <p className="text-gray-600">Buscando dados do restaurante...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 p-4 rounded-full w-fit mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erro nas Configurações</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={reloadPage}
              className="w-full bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Recarregar</span>
            </button>
            <Link
              href="/dashboard"
              className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar ao Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Voltar ao Dashboard</span>
            </Link>
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center space-x-2 bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Salvando..." : "Salvar Alterações"}</span>
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Configurações do Restaurante</h1>
          <p className="text-gray-600">Personalize seu restaurante e configure funcionalidades</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              {[
                { id: "theme", label: "Tema", icon: Palette },
                { id: "business", label: "Negócio", icon: Clock },
                { id: "info", label: "Informações", icon: Store },
                { id: "tables", label: "Mesas", icon: TableIcon },
                { id: "sharing", label: "Compartilhamento", icon: Globe },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Tema */}
            {activeTab === "theme" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Personalização do Tema</h3>
                  <p className="text-gray-600 mb-6">
                    Customize as cores do seu cardápio digital para combinar com a identidade visual do seu restaurante.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cor Principal</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={settings.theme.primaryColor}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            theme: { ...settings.theme, primaryColor: e.target.value },
                          })
                        }
                        className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.theme.primaryColor}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            theme: { ...settings.theme, primaryColor: e.target.value },
                          })
                        }
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="#f97316"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Cor dos botões e destaques</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cor Secundária</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={settings.theme.secondaryColor}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            theme: { ...settings.theme, secondaryColor: e.target.value },
                          })
                        }
                        className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.theme.secondaryColor}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            theme: { ...settings.theme, secondaryColor: e.target.value },
                          })
                        }
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="#ea580c"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Cor para elementos secundários</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cor de Fundo</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={settings.theme.backgroundColor}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            theme: { ...settings.theme, backgroundColor: e.target.value },
                          })
                        }
                        className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.theme.backgroundColor}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            theme: { ...settings.theme, backgroundColor: e.target.value },
                          })
                        }
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="#fff7ed"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Cor de fundo do cardápio</p>
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-8">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Pré-visualização</h4>
                  <div className="border rounded-xl p-6" style={{ backgroundColor: settings.theme.backgroundColor }}>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h5 className="font-semibold text-gray-900 mb-2">Exemplo de Item do Menu</h5>
                      <p className="text-gray-600 text-sm mb-3">Descrição do produto com detalhes saborosos</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold" style={{ color: settings.theme.primaryColor }}>
                          R$ 25,90
                        </span>
                        <button
                          className="text-white px-4 py-2 rounded-lg text-sm font-medium"
                          style={{ backgroundColor: settings.theme.primaryColor }}
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Negócio */}
            {activeTab === "business" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações do Negócio</h3>
                  {/* Presets de Configuração */}
                  <div className="bg-blue-50 p-4 rounded-lg mb-6">
                    <h4 className="font-medium text-blue-900 mb-3">Configurações Rápidas</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <button
                        onClick={() =>
                          setSettings({
                            ...settings,
                            business: {
                              openTime: "07:00",
                              closeTime: "15:00",
                              deliveryFee: 3.0,
                              minimumOrder: 15.0,
                            },
                          })
                        }
                        className="bg-white p-3 rounded border text-left hover:bg-blue-50 transition-colors"
                      >
                        <p className="font-medium text-sm">Café da Manhã</p>
                        <p className="text-xs text-gray-600">7h às 15h - Entrega R$3</p>
                      </button>

                      <button
                        onClick={() =>
                          setSettings({
                            ...settings,
                            business: {
                              openTime: "11:00",
                              closeTime: "23:00",
                              deliveryFee: 5.0,
                              minimumOrder: 25.0,
                            },
                          })
                        }
                        className="bg-white p-3 rounded border text-left hover:bg-blue-50 transition-colors"
                      >
                        <p className="font-medium text-sm">Restaurante</p>
                        <p className="text-xs text-gray-600">11h às 23h - Entrega R$5</p>
                      </button>

                      <button
                        onClick={() =>
                          setSettings({
                            ...settings,
                            business: {
                              openTime: "18:00",
                              closeTime: "02:00",
                              deliveryFee: 8.0,
                              minimumOrder: 30.0,
                            },
                          })
                        }
                        className="bg-white p-3 rounded border text-left hover:bg-blue-50 transition-colors"
                      >
                        <p className="font-medium text-sm">Delivery Noturno</p>
                        <p className="text-xs text-gray-600">18h às 2h - Entrega R$8</p>
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-6">
                    Configure horários de funcionamento, taxas e valores mínimos para seu restaurante.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Horário de Abertura</label>
                    <input
                      type="time"
                      value={settings.business.openTime}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          business: { ...settings.business, openTime: e.target.value },
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Horário de Fechamento</label>
                    <input
                      type="time"
                      value={settings.business.closeTime}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          business: { ...settings.business, closeTime: e.target.value },
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Taxa de Entrega (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={settings.business.deliveryFee}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          business: { ...settings.business, deliveryFee: Number.parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="5.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pedido Mínimo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={settings.business.minimumOrder}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          business: { ...settings.business, minimumOrder: Number.parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="20.00"
                    />
                  </div>
                </div>

                {/* Funcionalidades */}                  <div className="mt-8">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Funcionalidades</h4>
                  <div className="space-y-4">
                    {[
                      {
                        key: "enableDelivery",
                        label: "Habilitar Entrega",
                        description: "Permitir que clientes façam pedidos para entrega",
                      },
                      {
                        key: "enablePickup",
                        label: "Habilitar Retirada",
                        description: "Permitir que clientes façam pedidos para retirada",
                      },
                      {
                        key: "enablePayment",
                        label: "Habilitar Pagamento Online",
                        description: "Integração com gateway de pagamento (em desenvolvimento)",
                      },
                      {
                        key: "requireTableNumber",
                        label: "Exigir Número da Mesa",
                        description: "Obrigar clientes a informarem o número da mesa",
                      },
                    ].map((feature) => (
                      <div key={feature.key} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h5 className="font-medium text-gray-900">{feature.label}</h5>
                          <p className="text-sm text-gray-600">{feature.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.features[feature.key as keyof typeof settings.features]}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                features: {
                                  ...settings.features,
                                  [feature.key]: e.target.checked,
                                },
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                        </label>
                      </div>
                    ))}
                    
                    {/* Link para configurações avançadas de delivery */}
                    <div className="p-4 border rounded-lg bg-orange-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-gray-900">Configurações Avançadas de Delivery</h5>
                          <p className="text-sm text-gray-600">Configure taxas de entrega por distância e localização</p>
                        </div>
                        <Link
                          href="/dashboard/settings/delivery"
                          className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                        >
                          Configurar
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>              </div>
            )}

            {/* Informações */}
            {activeTab === "info" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Restaurante</h3>
                  <p className="text-gray-600 mb-6">
                    Atualize as informações básicas que aparecerão no seu cardápio digital.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Restaurante</label>
                    <input
                      type="text"
                      value={restaurantInfo.name}
                      onChange={(e) => setRestaurantInfo({ ...restaurantInfo, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Nome do seu restaurante"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Proprietário</label>
                    <input
                      type="text"
                      value={restaurantInfo.ownerName}
                      onChange={(e) => setRestaurantInfo({ ...restaurantInfo, ownerName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Seu nome"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                    <input
                      type="tel"
                      value={restaurantInfo.phone}
                      onChange={(e) => setRestaurantInfo({ ...restaurantInfo, phone: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Endereço</label>
                    <input
                      type="text"
                      value={restaurantInfo.address}
                      onChange={(e) => setRestaurantInfo({ ...restaurantInfo, address: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Rua, número, bairro"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                    <textarea
                      value={restaurantInfo.description}
                      onChange={(e) => setRestaurantInfo({ ...restaurantInfo, description: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Descreva seu restaurante..."
                      rows={3}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Logo do Restaurante</label>
                    <input
                      type="text"
                      value={restaurantInfo.logo}
                      onChange={(e) => setRestaurantInfo({ ...restaurantInfo, logo: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="https://exemplo.com/logo.png"
                    />
                    <p className="text-xs text-gray-500 mt-1">URL da imagem do logo (recomendado: 200x200px)</p>
                    {restaurantInfo.logo && (
                      <div className="mt-2">
                        <img
                          src={restaurantInfo.logo}
                          alt="Logo do restaurante"
                          className="h-24 w-24 object-contain rounded-md border"
                          onError={(e) => {
                            console.log("🖼️ [SETTINGS] Erro ao carregar logo do restaurante");
                            e.currentTarget.src = "/placeholder.svg?height=96&width=96";
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Mesas */}
            {activeTab === "tables" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestão de Mesas</h3>
                    {/* Ações em Lote para Mesas */}
                    {Object.keys(tables).length > 0 && (
                      <div className="bg-green-50 p-4 rounded-lg mb-6">
                        <h4 className="font-medium text-green-900 mb-3">Ações Rápidas</h4>
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={async () => {
                              if (!confirm("Gerar 10 mesas padrão (1-10, capacidade 4)?")) return
                              try {
                                for (let i = 1; i <= 10; i++) {
                                  const tableId = `table${i}`
                                  const tableData = {
                                    number: i,
                                    capacity: 4,
                                    status: "available" as const,
                                  }
                                  const tableRef = ref(database, `restaurants/${restaurantId}/tables/${tableId}`)
                                  await update(tableRef, tableData)
                                }
                                alert("10 mesas criadas com sucesso!")
                              } catch (error) {
                                alert("Erro ao criar mesas em lote")
                              }
                            }}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                          >
                            Criar 10 Mesas
                          </button>

                          <button
                            onClick={async () => {
                              if (!confirm("Marcar todas as mesas como disponíveis?")) return
                              try {
                                const updates: any = {}
                                Object.keys(tables).forEach((tableId) => {
                                  updates[`restaurants/${restaurantId}/tables/${tableId}/status`] = "available"
                                })
                                await update(ref(database), updates)
                                alert("Todas as mesas marcadas como disponíveis!")
                              } catch (error) {
                                alert("Erro ao atualizar mesas")
                              }
                            }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            Liberar Todas
                          </button>
                        </div>
                      </div>
                    )}
                    <p className="text-gray-600">
                      Configure as mesas do seu restaurante para gerar QR Codes específicos.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddTable(true)}
                    className="flex items-center space-x-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Adicionar Mesa</span>
                  </button>
                </div>

                {Object.keys(tables).length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <TableIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhuma mesa cadastrada</h4>
                    <p className="text-gray-500 mb-4">Adicione mesas para gerar QR Codes específicos para cada uma.</p>
                    <button
                      onClick={() => setShowAddTable(true)}
                      className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      Adicionar Primeira Mesa
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Object.entries(tables).map(([tableId, table]) => (
                      <div key={tableId} className="border rounded-lg p-4 bg-white">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">Mesa {table.number}</h4>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => generateQRCode(table.number)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Gerar QR Code"
                            >
                              <QrCode className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteTable(tableId)}
                              className="text-red-600 hover:text-red-800"
                              title="Remover mesa"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600">
                          <p>
                            <strong>Capacidade:</strong> {table.capacity} pessoas
                          </p>
                          <p>
                            <strong>Status:</strong>{" "}
                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                table.status === "available"
                                  ? "bg-green-100 text-green-800"
                                  : table.status === "occupied"
                                    ? "bg-red-100 text-red-800"
                                    : table.status === "reserved"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {table.status === "available"
                                ? "Disponível"
                                : table.status === "occupied"
                                  ? "Ocupada"
                                  : table.status === "reserved"
                                    ? "Reservada"
                                    : "Manutenção"}
                            </span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Modal Adicionar Mesa */}
                {showAddTable && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                      <h3 className="text-lg font-semibold mb-4">Adicionar Nova Mesa</h3>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Número da Mesa</label>
                          <input
                            type="number"
                            min="1"
                            value={newTable.number}
                            onChange={(e) => setNewTable({ ...newTable, number: Number.parseInt(e.target.value) || 1 })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="1"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Capacidade (pessoas)</label>
                          <input
                            type="number"
                            min="1"
                            value={newTable.capacity}
                            onChange={(e) =>
                              setNewTable({ ...newTable, capacity: Number.parseInt(e.target.value) || 2 })
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="2"
                          />
                        </div>
                      </div>

                      <div className="flex space-x-4 mt-6">
                        <button
                          onClick={() => setShowAddTable(false)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={addTable}
                          className="flex-1 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Compartilhamento */}
            {activeTab === "sharing" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Compartilhamento do Cardápio</h3>
                  <p className="text-gray-600 mb-6">
                    Compartilhe seu cardápio digital com clientes através de links e QR Codes.
                  </p>
                </div>

                {/* Link do Cardápio */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Link do Cardápio</h4>
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={`${window.location.origin}/${restaurantSlug}`}
                      readOnly
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    />
                    <button
                      onClick={copyMenuLink}
                      className="flex items-center space-x-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                      <span>Copiar</span>
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Compartilhe este link para que os clientes acessem seu cardápio digital.
                  </p>
                </div>

                {/* QR Codes */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">QR Codes</h4>
                  <div className="space-y-4">
                    <div>
                      <button
                        onClick={() => generateQRCode()}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <QrCode className="h-4 w-4" />
                        <span>QR Code Geral</span>
                      </button>
                      <p className="text-sm text-gray-600 mt-1">QR Code para acesso geral ao cardápio</p>
                    </div>

                    {Object.keys(tables).length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">QR Codes por Mesa:</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.values(tables)
                            .sort((a, b) => a.number - b.number)
                            .map((table) => (
                              <button
                                key={table.number}
                                onClick={() => generateQRCode(table.number)}
                                className="flex items-center space-x-1 bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                              >
                                <QrCode className="h-3 w-3" />
                                <span>Mesa {table.number}</span>
                              </button>
                            ))}
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          QR Codes específicos que já incluem o número da mesa
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instruções */}
                <div className="bg-blue-50 p-6 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-2">Como usar os QR Codes</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Imprima os QR Codes e coloque nas mesas do seu restaurante</li>
                        <li>• Clientes escaneiam com a câmera do celular</li>
                        <li>• Eles são redirecionados automaticamente para o cardápio</li>
                        <li>• QR Codes específicos já incluem o número da mesa</li>
                        <li>• Clientes podem fazer pedidos diretamente pelo celular</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
