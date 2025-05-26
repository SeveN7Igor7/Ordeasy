"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { database } from "@/lib/firebase"
import { ref, onValue, push, get, update } from "firebase/database"
import { ShoppingCart, Plus, Minus, MapPin, Phone, AlertTriangle, RefreshCw, Home } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  image: string
  available: boolean
}

interface Restaurant {
  id: string
  name: string
  logo: string
  description: string
  address: string
  phone: string
  slug: string
  settings?: {
    theme?: {
      primaryColor: string
      secondaryColor: string
      backgroundColor: string
    }
    business?: {
      openTime: string
      closeTime: string
      deliveryFee: number
      minimumOrder: number
    }
  }
}

interface CartItem extends MenuItem {
  quantity: number
}

const validateTable = async (
  tableNumber: string,
  restaurantId: string,
): Promise<{ isValid: boolean; message: string; table?: any }> => {
  console.log("🪑 [CARDÁPIO] Validando mesa:", tableNumber)

  if (!tableNumber.trim()) {
    return { isValid: false, message: "Por favor, informe o número da mesa." }
  }

  try {
    // Buscar mesas do restaurante
    const tablesRef = ref(database, `restaurants/${restaurantId}/tables`)
    const tablesSnapshot = await get(tablesRef)

    if (!tablesSnapshot.exists()) {
      return {
        isValid: false,
        message: "Este restaurante ainda não configurou as mesas. Entre em contato com a equipe.",
      }
    }

    const tables = tablesSnapshot.val()
    const tableEntry = Object.entries(tables).find(
      ([_, table]: [string, any]) => table.number.toString() === tableNumber.toString(),
    )

    if (!tableEntry) {
      const availableTables = Object.values(tables)
        .map((t: any) => t.number)
        .sort((a, b) => a - b)
      return {
        isValid: false,
        message: `Mesa ${tableNumber} não existe. Mesas disponíveis: ${availableTables.join(", ")}`,
      }
    }

    const [tableId, table] = tableEntry

    // Verificar se mesa está ocupada
    if (table.status === "occupied") {
      return { isValid: false, message: `Mesa ${tableNumber} está ocupada. Escolha outra mesa ou aguarde a liberação.` }
    }

    if (table.status === "maintenance") {
      return { isValid: false, message: `Mesa ${tableNumber} está em manutenção. Escolha outra mesa.` }
    }

    // Verificar se há pedidos pendentes para esta mesa
    const ordersRef = ref(database, `restaurants/${restaurantId}/orders`)
    const ordersSnapshot = await get(ordersRef)

    if (ordersSnapshot.exists()) {
      const orders = ordersSnapshot.val()
      const pendingOrder = Object.values(orders).find(
        (order: any) =>
          order.tableNumber === tableNumber && ["pending", "confirmed", "preparing"].includes(order.status),
      )

      if (pendingOrder) {
        return {
          isValid: false,
          message: `Mesa ${tableNumber} já tem um pedido em andamento. Aguarde a finalização ou escolha outra mesa.`,
        }
      }
    }

    console.log("✅ [CARDÁPIO] Mesa validada com sucesso:", table)
    return { isValid: true, message: "Mesa disponível!", table }
  } catch (error) {
    console.error("💥 [CARDÁPIO] Erro ao validar mesa:", error)
    return { isValid: false, message: "Erro ao verificar disponibilidade da mesa. Tente novamente." }
  }
}

export default function RestaurantMenu() {
  const params = useParams()
  const searchParams = useSearchParams()
  const restaurantSlug = params.restaurante as string
  const tableNumber = searchParams.get("mesa") || ""

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [showCart, setShowCart] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    tableNumber: tableNumber,
    phone: "",
  })
  const [showCustomerForm, setShowCustomerForm] = useState(false)

  useEffect(() => {
    console.log("🍽️ [CARDÁPIO] Iniciando carregamento do cardápio...")
    console.log("🍽️ [CARDÁPIO] Parâmetros recebidos:")
    console.log("🏷️ [CARDÁPIO] Slug do restaurante:", restaurantSlug)
    console.log("🪑 [CARDÁPIO] Número da mesa:", tableNumber)

    // Atualizar informações de debug
    setDebugInfo({
      restaurantSlug,
      tableNumber,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    })

    if (!restaurantSlug) {
      console.error("❌ [CARDÁPIO] Slug do restaurante não fornecido!")
      setError("Slug do restaurante não fornecido")
      setLoading(false)
      return
    }

    console.log("🔍 [CARDÁPIO] Buscando restaurante no Firebase...")
    setLoading(true)
    setError(null)

    // Buscar restaurante pelo slug
    const restaurantsRef = ref(database, "restaurants")
    const unsubscribe = onValue(
      restaurantsRef,
      (snapshot) => {
        console.log("📡 [CARDÁPIO] Resposta do Firebase:")
        console.log("📡 [CARDÁPIO] Snapshot existe:", snapshot.exists())

        if (snapshot.exists()) {
          const data = snapshot.val()
          console.log("📋 [CARDÁPIO] Restaurantes encontrados:", Object.keys(data).length)
          console.log("📋 [CARDÁPIO] IDs dos restaurantes:", Object.keys(data))

          // Buscar restaurante pelo slug
          console.log("🔍 [CARDÁPIO] Procurando restaurante com slug:", restaurantSlug)

          const foundRestaurant = Object.entries(data).find(([id, restaurant]: [string, any]) => {
            console.log("🔍 [CARDÁPIO] Verificando restaurante:", id)
            console.log("🔍 [CARDÁPIO] - Nome:", restaurant.name)
            console.log("🔍 [CARDÁPIO] - Slug:", restaurant.slug)
            console.log("🔍 [CARDÁPIO] - Comparação:", restaurant.slug === restaurantSlug, "||", id === restaurantSlug)

            return restaurant.slug === restaurantSlug || id === restaurantSlug
          })

          if (foundRestaurant) {
            const [id, restaurantData] = foundRestaurant
            console.log("✅ [CARDÁPIO] Restaurante encontrado!")
            console.log("🏪 [CARDÁPIO] ID:", id)
            console.log("📄 [CARDÁPIO] Nome:", restaurantData.name)
            console.log("📄 [CARDÁPIO] Dados completos:", restaurantData)

            const restaurantWithId = { id, ...restaurantData }
            setRestaurant(restaurantWithId)

            // Carregar categorias
            console.log("🔍 [CARDÁPIO] Carregando categorias...")
            const categoriesRef = ref(database, `restaurants/${id}/categories`)
            onValue(categoriesRef, (categoriesSnapshot) => {
              console.log("📡 [CARDÁPIO] Resposta das categorias:", categoriesSnapshot.exists())

              if (categoriesSnapshot.exists()) {
                const categoriesData = categoriesSnapshot.val()
                console.log("📋 [CARDÁPIO] Categorias encontradas:", Object.keys(categoriesData).length)

                const categoriesList = Object.entries(categoriesData)
                  .map(([catId, category]: [string, any]) => ({
                    id: catId,
                    ...category,
                  }))
                  .sort((a, b) => a.order - b.order)

                console.log("📋 [CARDÁPIO] Categorias processadas:", categoriesList)
                setCategories(categoriesList)
              } else {
                console.log("📋 [CARDÁPIO] Nenhuma categoria encontrada")
                setCategories([])
              }
            })

            // Carregar cardápio
            console.log("🔍 [CARDÁPIO] Carregando itens do menu...")
            const menuRef = ref(database, `restaurants/${id}/menu`)
            onValue(menuRef, (menuSnapshot) => {
              console.log("📡 [CARDÁPIO] Resposta do menu:", menuSnapshot.exists())

              if (menuSnapshot.exists()) {
                const menuData = menuSnapshot.val()
                console.log("📋 [CARDÁPIO] Itens do menu encontrados:", Object.keys(menuData).length)

                const items = Object.entries(menuData).map(([itemId, item]: [string, any]) => ({
                  id: itemId,
                  ...item,
                }))

                console.log("📋 [CARDÁPIO] Itens processados:", items.length)
                console.log("📄 [CARDÁPIO] Primeiro item:", items[0])
                setMenuItems(items)
              } else {
                console.log("📋 [CARDÁPIO] Nenhum item do menu encontrado")
                setMenuItems([])
              }
            })

            setError(null)
          } else {
            console.error("❌ [CARDÁPIO] Restaurante não encontrado!")
            console.error("❌ [CARDÁPIO] Slug procurado:", restaurantSlug)
            console.error(
              "❌ [CARDÁPIO] Slugs disponíveis:",
              Object.values(data).map((r: any) => r.slug),
            )

            setError(`Restaurante não encontrado (Slug: ${restaurantSlug})`)

            // Listar todos os restaurantes para debug
            console.log("📋 [CARDÁPIO] Todos os restaurantes disponíveis:")
            Object.entries(data).forEach(([id, restaurant]: [string, any]) => {
              console.log(`- ID: ${id}, Nome: ${restaurant.name}, Slug: ${restaurant.slug}`)
            })
          }
        } else {
          console.error("❌ [CARDÁPIO] Nenhum restaurante encontrado no Firebase!")
          setError("Nenhum restaurante encontrado no sistema")
        }

        setLoading(false)
      },
      (error) => {
        console.error("💥 [CARDÁPIO] Erro ao carregar dados:", error)
        setError(`Erro ao carregar dados: ${error.message}`)
        setLoading(false)
      },
    )

    // Cleanup
    return () => {
      console.log("🧹 [CARDÁPIO] Limpando listeners...")
      unsubscribe()
    }
  }, [restaurantSlug])

  const addToCart = (item: MenuItem) => {
    console.log("🛒 [CARDÁPIO] Adicionando item ao carrinho:", item.name)

    setCart((prev) => {
      const existing = prev.find((cartItem) => cartItem.id === item.id)
      if (existing) {
        console.log("🛒 [CARDÁPIO] Item já existe, aumentando quantidade")
        return prev.map((cartItem) =>
          cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem,
        )
      }
      console.log("🛒 [CARDÁPIO] Novo item adicionado")
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const removeFromCart = (itemId: string) => {
    console.log("🛒 [CARDÁPIO] Removendo item do carrinho:", itemId)

    setCart((prev) => {
      const existing = prev.find((cartItem) => cartItem.id === itemId)
      if (existing && existing.quantity > 1) {
        console.log("🛒 [CARDÁPIO] Diminuindo quantidade")
        return prev.map((cartItem) =>
          cartItem.id === itemId ? { ...cartItem, quantity: cartItem.quantity - 1 } : cartItem,
        )
      }
      console.log("🛒 [CARDÁPIO] Removendo item completamente")
      return prev.filter((cartItem) => cartItem.id !== itemId)
    })
  }

  const getTotalPrice = () => {
    const total = cart.reduce((total, item) => total + item.price * item.quantity, 0)
    console.log("💰 [CARDÁPIO] Total calculado:", total)
    return total
  }

  const submitOrder = async () => {
    if (cart.length === 0) {
      console.log("🛒 [CARDÁPIO] Carrinho vazio, não é possível fazer pedido")
      return
    }
    console.log("📝 [CARDÁPIO] Iniciando processo de pedido")
    setShowCustomerForm(true)
  }

  const confirmOrder = async () => {
    console.log("📝 [CARDÁPIO] Confirmando pedido...")
    console.log("📝 [CARDÁPIO] Dados do cliente:", customerInfo)

    if (!customerInfo.name.trim()) {
      alert("Por favor, preencha seu nome")
      return
    }

    if (!customerInfo.tableNumber.trim()) {
      alert("Por favor, informe o número da mesa")
      return
    }

    // Validar mesa
    console.log("🪑 [CARDÁPIO] Validando mesa antes do pedido...")
    const validation = await validateTable(customerInfo.tableNumber, restaurant?.id || "")

    if (!validation.isValid) {
      alert(validation.message)
      return
    }

    const order = {
      restaurantId: restaurant?.id,
      tableNumber: customerInfo.tableNumber,
      customerName: customerInfo.name,
      customerPhone: customerInfo.phone,
      items: cart,
      total: getTotalPrice(),
      status: "pending",
      paymentStatus: "pending",
      timestamp: Date.now(),
      customerNote: "",
    }

    console.log("📝 [CARDÁPIO] Dados do pedido:", order)

    try {
      console.log("💾 [CARDÁPIO] Salvando pedido no Firebase...")

      // Salvar pedido
      const ordersRef = ref(database, `restaurants/${restaurant?.id}/orders`)
      await push(ordersRef, order)

      // Marcar mesa como ocupada
      if (validation.table) {
        console.log("🪑 [CARDÁPIO] Marcando mesa como ocupada...")
        const tableId = `table${customerInfo.tableNumber}`
        const tableRef = ref(database, `restaurants/${restaurant?.id}/tables/${tableId}`)
        await update(tableRef, { status: "occupied" })
      }

      console.log("✅ [CARDÁPIO] Pedido salvo com sucesso!")

      setCart([])
      setShowCart(false)
      setShowCustomerForm(false)
      setCustomerInfo({ name: "", tableNumber: "", phone: "" })

      alert(`Pedido enviado com sucesso para a Mesa ${customerInfo.tableNumber}! Aguarde a confirmação da equipe.`)
    } catch (error) {
      console.error("💥 [CARDÁPIO] Erro ao enviar pedido:", error)
      alert("Erro ao enviar pedido. Tente novamente.")
    }
  }

  const reloadPage = () => {
    console.log("🔄 [CARDÁPIO] Recarregando página...")
    window.location.reload()
  }

  const availableCategories = categories.filter((category) =>
    menuItems.some((item) => item.category === category.name && item.available),
  )

  const filteredItems =
    selectedCategory === "all"
      ? menuItems.filter((item) => item.available)
      : menuItems.filter((item) => item.category === selectedCategory && item.available)

  const primaryColor = restaurant?.settings?.theme?.primaryColor || "#f97316"

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div
            className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 mx-auto mb-4"
            style={{ borderColor: primaryColor }}
          ></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Carregando Cardápio</h2>
          <p className="text-gray-600 mb-4">Buscando informações do restaurante...</p>

          {/* Informações de Debug */}
          <div className="bg-gray-100 p-4 rounded-lg text-left text-sm">
            <h3 className="font-semibold mb-2">Informações de Debug:</h3>
            <div className="space-y-1 text-gray-700">
              <p>
                <strong>Slug:</strong> {restaurantSlug}
              </p>
              <p>
                <strong>Mesa:</strong> {tableNumber || "Não especificada"}
              </p>
              <p>
                <strong>URL:</strong> {typeof window !== "undefined" ? window.location.href : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-2xl mx-auto p-6">
          <div className="bg-red-100 p-4 rounded-full w-fit mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erro no Cardápio</h1>
          <p className="text-gray-600 mb-6">{error}</p>

          {/* Informações de Debug Detalhadas */}
          <div className="bg-gray-100 p-6 rounded-lg text-left mb-6">
            <h3 className="font-semibold mb-4 text-center">Informações de Debug:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Parâmetros da URL:</h4>
                <div className="space-y-1 text-gray-700">
                  <p>
                    <strong>Slug Procurado:</strong> {restaurantSlug}
                  </p>
                  <p>
                    <strong>Mesa:</strong> {tableNumber || "Não especificada"}
                  </p>
                  <p>
                    <strong>URL Completa:</strong> {typeof window !== "undefined" ? window.location.href : "N/A"}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Estado do Sistema:</h4>
                <div className="space-y-1 text-gray-700">
                  <p>
                    <strong>Loading:</strong> {loading ? "✅ Sim" : "❌ Não"}
                  </p>
                  <p>
                    <strong>Restaurante:</strong> {restaurant ? "✅ Carregado" : "❌ Não encontrado"}
                  </p>
                  <p>
                    <strong>Menu Items:</strong> {menuItems.length} itens
                  </p>
                  <p>
                    <strong>Categorias:</strong> {categories.length} categorias
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 rounded border">
              <h4 className="font-semibold text-yellow-800 mb-2">Debug Info Completo:</h4>
              <pre className="text-xs text-yellow-700 overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={reloadPage}
              className="w-full bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Recarregar Página</span>
            </button>
            <Link
              href="/"
              className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
            >
              <Home className="h-4 w-4" />
              <span>Voltar ao Início</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Restaurant not found
  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-yellow-100 p-4 rounded-full w-fit mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Restaurante Não Encontrado</h1>
          <p className="text-gray-600 mb-4">
            O restaurante "{restaurantSlug}" não foi encontrado. Verifique o QR Code e tente novamente.
          </p>
          <Link
            href="/"
            className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors inline-flex items-center space-x-2"
          >
            <Home className="h-4 w-4" />
            <span>Voltar ao Início</span>
          </Link>
        </div>
      </div>
    )
  }

  // Empty menu
  if (menuItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <Image
            src={restaurant.logo || "/placeholder.svg?height=80&width=80"}
            alt={restaurant.name}
            width={80}
            height={80}
            className="rounded-full mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900">{restaurant.name}</h1>
          <p className="text-gray-600">{restaurant.description}</p>
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              {restaurant.address}
            </div>
            <div className="flex items-center">
              <Phone className="h-4 w-4 mr-1" />
              {restaurant.phone}
            </div>
          </div>
          {tableNumber && (
            <div className="mt-2">
              <span
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Mesa {tableNumber}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{ backgroundColor: restaurant?.settings?.theme?.backgroundColor || "#fff7ed" }}
    >
      {/* Header do Restaurante */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <Image
              src={restaurant.logo || "/placeholder.svg?height=80&width=80"}
              alt={restaurant.name}
              width={80}
              height={80}
              className="rounded-full border-2"
              style={{ borderColor: primaryColor }}
            />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{restaurant.name}</h1>
              <p className="text-gray-600">{restaurant.description}</p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {restaurant.address}
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  {restaurant.phone}
                </div>
              </div>
              {tableNumber && (
                <div className="mt-2">
                  <span
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Mesa {tableNumber}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Categorias */}
      {availableCategories.length > 0 && (
        <div className="bg-white border-b sticky top-[140px] z-30">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex space-x-1 overflow-x-auto py-4">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === "all" ? "text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                style={{
                  backgroundColor: selectedCategory === "all" ? primaryColor : undefined,
                }}
              >
                Todos
              </button>
              {availableCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.name)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                    selectedCategory === category.name ? "text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  style={{
                    backgroundColor: selectedCategory === category.name ? category.color : undefined,
                  }}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-sm p-4 flex border hover:shadow-md transition-shadow"
            >
              <Image
                src={item.image || "/placeholder.svg?height=100&width=100"}
                alt={item.name}
                width={100}
                height={100}
                className="rounded-xl object-cover"
              />
              <div className="ml-4 flex-1">
                <h3 className="font-semibold text-gray-900">{item.name}</h3>
                <p className="text-gray-600 text-sm mt-1 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-lg font-bold" style={{ color: primaryColor }}>
                    R$ {item.price.toFixed(2)}
                  </span>
                  <button
                    onClick={() => addToCart(item)}
                    className="text-white px-4 py-2 rounded-lg hover:opacity-90 transition-colors flex items-center space-x-1"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhum item disponível nesta categoria.</p>
          </div>
        )}
      </div>

      {/* Carrinho Flutuante */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setShowCart(true)}
            className="text-white p-4 rounded-full shadow-lg hover:opacity-90 transition-colors relative"
            style={{ backgroundColor: primaryColor }}
          >
            <ShoppingCart className="h-6 w-6" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
              {cart.reduce((total, item) => total + item.quantity, 0)}
            </span>
          </button>
        </div>
      )}

      {/* Modal do Carrinho */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white w-full max-h-[80vh] rounded-t-xl overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Seu Pedido</h2>
                <button onClick={() => setShowCart(false)} className="text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b">
                  <div className="flex-1">
                    <h3 className="font-medium">{item.name}</h3>
                    <p style={{ color: primaryColor }} className="font-semibold">
                      R$ {item.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button onClick={() => removeFromCart(item.id)} className="text-gray-500 hover:text-red-500 p-1">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-medium min-w-[20px] text-center">{item.quantity}</span>
                    <button onClick={() => addToCart(item)} className="text-gray-500 hover:text-green-500 p-1">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-bold">Total:</span>
                <span className="text-xl font-bold" style={{ color: primaryColor }}>
                  R$ {getTotalPrice().toFixed(2)}
                </span>
              </div>

              <button
                onClick={submitOrder}
                className="w-full text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-colors"
                style={{ backgroundColor: primaryColor }}
              >
                Finalizar Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Informações do Cliente */}
      {showCustomerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Finalizar Pedido</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Seu nome"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número da Mesa *</label>
                <input
                  type="text"
                  value={customerInfo.tableNumber}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, tableNumber: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ex: 5"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone (opcional)</label>
                <input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total do Pedido:</span>
                  <span className="text-xl font-bold" style={{ color: primaryColor }}>
                    R$ {getTotalPrice().toFixed(2)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {cart.reduce((total, item) => total + item.quantity, 0)} item(s)
                </div>
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => setShowCustomerForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Voltar
              </button>
              <button
                onClick={confirmOrder}
                className="flex-1 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-colors"
                style={{ backgroundColor: primaryColor }}
              >
                Confirmar Pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
