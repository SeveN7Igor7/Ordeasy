"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { database } from "@/lib/firebase"
import { ref, onValue, get } from "firebase/database"
import OrderConfirmation from "@/components/menu/OrderConfirmation"
import OrderStatusFeedback from "@/components/menu/OrderStatusFeedback"
import OrderTypeSelection from "@/components/menu/OrderTypeSelection"
import DeliveryOrderConfirmation from "@/components/menu/DeliveryOrderConfirmation"
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Search,
  Filter,
  ChevronDown,
  ChevronUp
} from "lucide-react"

export default function RestaurantMenu() {
  const params = useParams()
  const restaurantSlug = params.restaurante as string
  
  const [restaurant, setRestaurant] = useState<any>(null)
  const [menu, setMenu] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [cart, setCart] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showDeliveryConfirmation, setShowDeliveryConfirmation] = useState(false)
  const [tableNumber, setTableNumber] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [expandedCategories, setExpandedCategories] = useState<{[key: string]: boolean}>({})
  const [lastOrderId, setLastOrderId] = useState<string | null>(null)
  const [showOrderStatus, setShowOrderStatus] = useState(false)
  const [showOrderTypeSelection, setShowOrderTypeSelection] = useState(true)
  const [orderType, setOrderType] = useState<"qrcode" | "delivery" | "pickup" | null>(null)
  
  // Carregar dados do restaurante e cardápio
  useEffect(() => {
    if (!restaurantSlug) return
    
    setLoading(true)
    setError(null)
    
    // Buscar restaurante pelo slug
    const restaurantsRef = ref(database, "restaurants")
    
    get(restaurantsRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        let foundRestaurant = null
        let restaurantId = null
        
        // Encontrar o restaurante pelo slug
        Object.entries(data).forEach(([id, restaurant]: [string, any]) => {
          if (restaurant.slug === restaurantSlug) {
            foundRestaurant = { id, ...restaurant }
            restaurantId = id
          }
        })
        
        if (foundRestaurant) {
          setRestaurant(foundRestaurant)
          
          // Carregar cardápio
          const menuRef = ref(database, `restaurants/${restaurantId}/menu`)
          onValue(menuRef, (snapshot) => {
            if (snapshot.exists()) {
              const menuData = snapshot.val()
              const menuItems = Object.entries(menuData).map(([id, item]: [string, any]) => ({
                id,
                ...item
              }))
              
              setMenu(menuItems)
              
              // Extrair categorias únicas
              const uniqueCategories = Array.from(
                new Set(menuItems.map((item: any) => item.category))
              ).filter(Boolean) as string[]
              
              setCategories(uniqueCategories)
              
              // Inicializar categorias expandidas
              const initialExpandedState: {[key: string]: boolean} = {}
              uniqueCategories.forEach(category => {
                initialExpandedState[category] = true
              })
              setExpandedCategories(initialExpandedState)
            }
            setLoading(false)
          }, (error) => {
            console.error("Erro ao carregar cardápio:", error)
            setError("Não foi possível carregar o cardápio. Tente novamente mais tarde.")
            setLoading(false)
          })
        } else {
          setError("Restaurante não encontrado")
          setLoading(false)
        }
      } else {
        setError("Nenhum restaurante encontrado")
        setLoading(false)
      }
    }).catch((error) => {
      console.error("Erro ao buscar restaurante:", error)
      setError("Erro ao buscar dados do restaurante")
      setLoading(false)
    })
    
    // Verificar mesa na URL
    const urlParams = new URLSearchParams(window.location.search)
    const table = urlParams.get("mesa")
    if (table) {
      setTableNumber(table)
      setOrderType("qrcode")
      setShowOrderTypeSelection(false)
    }
  }, [restaurantSlug])
  
  // Adicionar item ao carrinho
  const addToCart = (item: any) => {
    setCart(prevCart => {
      // Verificar se o item já está no carrinho
      const existingItemIndex = prevCart.findIndex(cartItem => cartItem.id === item.id)
      
      if (existingItemIndex >= 0) {
        // Incrementar quantidade
        const updatedCart = [...prevCart]
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: updatedCart[existingItemIndex].quantity + 1
        }
        return updatedCart
      } else {
        // Adicionar novo item
        return [...prevCart, { ...item, quantity: 1 }]
      }
    })
  }
  
  // Remover item do carrinho
  const removeFromCart = (itemId: string) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.id === itemId)
      
      if (existingItemIndex >= 0) {
        const item = prevCart[existingItemIndex]
        
        if (item.quantity > 1) {
          // Decrementar quantidade
          const updatedCart = [...prevCart]
          updatedCart[existingItemIndex] = {
            ...item,
            quantity: item.quantity - 1
          }
          return updatedCart
        } else {
          // Remover item
          return prevCart.filter(item => item.id !== itemId)
        }
      }
      
      return prevCart
    })
  }
  
  // Calcular total do carrinho
  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  }
  
  // Formatar valor monetário
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }
  
  // Filtrar itens do menu
  const filteredMenu = menu.filter(item => {
    // Filtro de categoria
    const categoryMatch = selectedCategory === "all" || item.category === selectedCategory
    
    // Filtro de busca
    const searchMatch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return categoryMatch && searchMatch
  })
  
  // Agrupar itens por categoria
  const menuByCategory: {[key: string]: any[]} = {}
  
  filteredMenu.forEach(item => {
    const category = item.category || "Sem categoria"
    
    if (!menuByCategory[category]) {
      menuByCategory[category] = []
    }
    
    menuByCategory[category].push(item)
  })
  
  // Alternar expansão de categoria
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }
  
  // Verificar se o carrinho tem itens
  const hasItems = cart.length > 0
  
  // Verificar se a mesa foi informada
  const tableIsSet = tableNumber.trim() !== ""
  
  // Verificar se pode fazer pedido
  const canOrder = hasItems && (orderType === "qrcode" ? tableIsSet : true)
  
  // Lidar com confirmação de pedido
  const handleOrderSuccess = (orderId: string) => {
    setCart([])
    setLastOrderId(orderId)
    setShowConfirmation(false)
    setShowDeliveryConfirmation(false)
    setShowOrderStatus(true)
  }
  
  // Lidar com seleção de tipo de pedido
  const handleOrderTypeSelect = (type: "qrcode" | "delivery" | "pickup") => {
    if (type === "delivery" || type === "pickup") {
      // Ambos os tipos agora são tratados como "delivery" inicialmente
      setOrderType("delivery")
    } else {
      setOrderType(type)
    }
    setShowOrderTypeSelection(false)
  }
  
  // Lidar com clique no botão de fazer pedido
  const handleOrderButtonClick = () => {
    if (!canOrder) return
    
    if (orderType === "qrcode") {
      setShowConfirmation(true)
    } else {
      setShowDeliveryConfirmation(true)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    )
  }
  
  if (error || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-red-500 text-5xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Oops!</h1>
          <p className="text-gray-600 mb-6">{error || "Ocorreu um erro ao carregar o restaurante"}</p>
          <a href="/" className="inline-block bg-orange-500 text-white px-6 py-3 rounded-lg font-medium">
            Voltar para a página inicial
          </a>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabeçalho */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{restaurant.name}</h1>
              {restaurant.description && (
                <p className="text-sm text-gray-500">{restaurant.description}</p>
              )}
            </div>
            
            <div className="relative">
              <button
                className="relative bg-orange-500 text-white p-3 rounded-full shadow-md hover:bg-orange-600 transition-colors"
                onClick={handleOrderButtonClick}
                disabled={!canOrder}
              >
                <ShoppingCart className="h-6 w-6" />
                {hasItems && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cart.reduce((total, item) => total + item.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Mesa (apenas para pedidos na mesa) */}
      {orderType === "qrcode" && (
        <div className="bg-orange-50 border-b border-orange-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center">
              <label htmlFor="table-number" className="block text-sm font-medium text-gray-700 mr-3">
                Mesa:
              </label>
              <input
                type="text"
                id="table-number"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder="Número da mesa"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Tipo de pedido */}
      {orderType && (
        <div className="bg-orange-50 border-b border-orange-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">
                Modo: <span className="text-orange-600 font-semibold">
                  {orderType === "qrcode" ? "Pedido na Mesa" : 
                   orderType === "delivery" ? "Delivery" : "Retirada"}
                </span>
              </div>
              <button
                onClick={() => setShowOrderTypeSelection(true)}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                Alterar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Busca e filtros */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder="Buscar no cardápio"
              />
            </div>
            
            <div className="flex items-center">
              <Filter className="h-4 w-4 text-gray-500 mr-2" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
              >
                <option value="all">Todas as categorias</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Conteúdo principal */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Cardápio */}
        {Object.keys(menuByCategory).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhum item encontrado</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(menuByCategory).map(([category, items]) => (
              <div key={category} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div 
                  className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center cursor-pointer"
                  onClick={() => toggleCategory(category)}
                >
                  <h2 className="text-lg font-medium text-gray-900">{category}</h2>
                  {expandedCategories[category] ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>
                
                {expandedCategories[category] && (
                  <ul className="divide-y divide-gray-200">
                    {items.map(item => (
                      <li key={item.id} className="p-4">
                        <div className="flex justify-between">
                          <div className="flex-1 pr-4">
                            <h3 className="text-base font-medium text-gray-900">{item.name}</h3>
                            {item.description && (
                              <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                            )}
                            <p className="mt-1 text-sm font-medium text-gray-900">
                              {formatCurrency(item.price || 0)}
                            </p>
                            {item.image && (
                              <div className="mt-2">
                                <img 
                                  src={item.image} 
                                  alt={item.name}
                                  className="h-20 w-20 object-cover rounded-md"
                                  onError={(e) => {
                                    console.log("🖼️ [MENU] Erro ao carregar imagem do produto:", item.id);
                                    e.currentTarget.src = "/placeholder.svg?height=80&width=80";
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {cart.some(cartItem => cartItem.id === item.id) ? (
                              <>
                                <button
                                  onClick={() => removeFromCart(item.id)}
                                  className="p-1 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="text-gray-700 w-6 text-center">
                                  {cart.find(cartItem => cartItem.id === item.id)?.quantity || 0}
                                </span>
                                <button
                                  onClick={() => addToCart(item)}
                                  className="p-1 rounded-full bg-orange-500 text-white hover:bg-orange-600"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => addToCart(item)}
                                className="p-2 rounded-full bg-orange-500 text-white hover:bg-orange-600"
                              >
                                <Plus className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      
      {/* Rodapé com resumo do carrinho */}
      {hasItems && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t shadow-md py-3 px-4">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">
                {cart.reduce((total, item) => total + item.quantity, 0)} itens
              </p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(calculateTotal())}
              </p>
            </div>
            
            <button
              onClick={handleOrderButtonClick}
              disabled={!canOrder}
              className={`px-6 py-3 rounded-lg font-medium ${
                canOrder
                  ? "bg-orange-500 text-white hover:bg-orange-600"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {orderType === "qrcode" && !tableIsSet 
                ? "Informe a mesa" 
                : "Fazer Pedido"}
            </button>
          </div>
        </div>
      )}
      
      {/* Modal de seleção de tipo de pedido */}
      {showOrderTypeSelection && (
        <OrderTypeSelection
          isOpen={showOrderTypeSelection}
          onClose={() => {
            // Se já tiver um tipo de pedido selecionado, não fecha o modal
            if (orderType) {
              setShowOrderTypeSelection(false)
            }
          }}
          onSelect={handleOrderTypeSelect}
          qrcodeEnabled={restaurant.qrcodemode || false}
          deliveryEnabled={restaurant.deliverymode || false}
        />
      )}
      
      {/* Modal de confirmação de pedido na mesa */}
      {showConfirmation && (
        <OrderConfirmation
          restaurantId={restaurant.id}
          tableNumber={tableNumber}
          items={cart}
          totalAmount={calculateTotal()}
          onClose={() => setShowConfirmation(false)}
          onSuccess={handleOrderSuccess}
        />
      )}
      
      {/* Modal de confirmação de pedido delivery/retirada */}
      {showDeliveryConfirmation && (
        <DeliveryOrderConfirmation
          restaurantId={restaurant.id}
          items={cart}
          totalAmount={calculateTotal()}
          onClose={() => setShowDeliveryConfirmation(false)}
          onSuccess={handleOrderSuccess}
        />
      )}
      
      {/* Feedback de status do pedido */}
      {showOrderStatus && lastOrderId && (
        <OrderStatusFeedback
          orderId={lastOrderId}
          tableNumber={orderType === "qrcode" ? tableNumber : undefined}
          onClose={() => setShowOrderStatus(false)}
        />
      )}
    </div>
  )
}

