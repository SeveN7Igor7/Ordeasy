"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { database } from "@/lib/firebase"
import { ref, onValue, update, set } from "firebase/database"
import { 
  Package, 
  AlertTriangle, 
  Search, 
  Plus, 
  Edit, 
  Trash, 
  Save, 
  X,
  ArrowUpDown,
  Filter
} from "lucide-react"

interface InventoryItem {
  id: string
  productId: string
  productName: string
  currentStock: number
  minStockLevel: number
  unit: string
  lastUpdated: number
  category?: string
}

export default function InventoryManager() {
  const { user, restaurantId } = useAuth()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [newItem, setNewItem] = useState<Partial<InventoryItem> | null>(null)
  const [filters, setFilters] = useState({
    search: "",
    stockStatus: "all", // all, low, out
    category: "all"
  })
  const [sortConfig, setSortConfig] = useState({
    key: "productName",
    direction: "asc" as "asc" | "desc"
  })
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    if (!restaurantId) return

    setLoading(true)
    setError(null)

    // Carregar produtos
    const productsRef = ref(database, `restaurants/${restaurantId}/menu`)
    const unsubscribeProducts = onValue(
      productsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val()
          const productsList = Object.entries(data).map(([id, product]: [string, any]) => ({
            id,
            ...product
          }))
          setProducts(productsList)
          
          // Extrair categorias únicas
          const uniqueCategories = Array.from(
            new Set(productsList.map((product: any) => product.category))
          ).filter(Boolean) as string[]
          
          setCategories(uniqueCategories)
        } else {
          setProducts([])
          setCategories([])
        }
      },
      (error) => {
        console.error("Erro ao carregar produtos:", error)
      }
    )

    // Carregar inventário
    const inventoryRef = ref(database, `restaurants/${restaurantId}/inventory`)
    const unsubscribeInventory = onValue(
      inventoryRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val()
          const inventoryList = Object.entries(data).map(([id, item]: [string, any]) => ({
            id,
            ...item
          }))
          setInventory(inventoryList)
        } else {
          setInventory([])
        }
        setLoading(false)
      },
      (error) => {
        console.error("Erro ao carregar inventário:", error)
        setError(`Erro ao carregar dados: ${error.message}`)
        setLoading(false)
      }
    )

    return () => {
      unsubscribeProducts()
      unsubscribeInventory()
    }
  }, [restaurantId])

  const handleSort = (key: keyof InventoryItem) => {
    let direction: "asc" | "desc" = "asc"
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  const sortedInventory = [...inventory].sort((a, b) => {
    if (a[sortConfig.key as keyof InventoryItem] < b[sortConfig.key as keyof InventoryItem]) {
      return sortConfig.direction === "asc" ? -1 : 1
    }
    if (a[sortConfig.key as keyof InventoryItem] > b[sortConfig.key as keyof InventoryItem]) {
      return sortConfig.direction === "asc" ? 1 : -1
    }
    return 0
  })

  const filteredInventory = sortedInventory.filter(item => {
    // Filtro de busca
    if (filters.search && !item.productName.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }
    
    // Filtro de status de estoque
    if (filters.stockStatus === "low" && item.currentStock > item.minStockLevel) {
      return false
    }
    if (filters.stockStatus === "out" && item.currentStock > 0) {
      return false
    }
    
    // Filtro de categoria
    if (filters.category !== "all" && item.category !== filters.category) {
      return false
    }
    
    return true
  })

  const saveInventoryItem = async (item: Partial<InventoryItem>, isNew: boolean = false) => {
    if (!restaurantId) return
    
    try {
      const itemData = {
        ...item,
        lastUpdated: Date.now()
      }
      
      if (isNew) {
        // Gerar ID único para novo item
        const newItemId = `inv_${Date.now()}`
        const newItemRef = ref(database, `restaurants/${restaurantId}/inventory/${newItemId}`)
        await set(newItemRef, {
          ...itemData,
          id: newItemId
        })
        setNewItem(null)
      } else if (item.id) {
        // Atualizar item existente
        const itemRef = ref(database, `restaurants/${restaurantId}/inventory/${item.id}`)
        await update(itemRef, itemData)
        setEditingItem(null)
      }
    } catch (error: any) {
      console.error("Erro ao salvar item:", error)
      setError(`Erro ao salvar: ${error.message}`)
    }
  }

  const deleteInventoryItem = async (itemId: string) => {
    if (!restaurantId) return
    
    if (confirm("Tem certeza que deseja excluir este item do inventário?")) {
      try {
        const itemRef = ref(database, `restaurants/${restaurantId}/inventory/${itemId}`)
        await set(itemRef, null)
      } catch (error: any) {
        console.error("Erro ao excluir item:", error)
        setError(`Erro ao excluir: ${error.message}`)
      }
    }
  }

  const getStockStatusColor = (item: InventoryItem) => {
    if (item.currentStock <= 0) {
      return "bg-red-100 text-red-800"
    }
    if (item.currentStock <= item.minStockLevel) {
      return "bg-yellow-100 text-yellow-800"
    }
    return "bg-green-100 text-green-800"
  }

  const getStockStatusText = (item: InventoryItem) => {
    if (item.currentStock <= 0) {
      return "Esgotado"
    }
    if (item.currentStock <= item.minStockLevel) {
      return "Baixo"
    }
    return "Normal"
  }

  const renderInventoryForm = (item: Partial<InventoryItem>, isNew: boolean = false) => {
    return (
      <tr className="bg-orange-50">
        <td colSpan={7} className="px-4 py-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-orange-200">
            <h3 className="text-lg font-medium mb-4">
              {isNew ? "Adicionar Novo Item" : "Editar Item"}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Produto
                </label>
                {isNew ? (
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={item.productId || ""}
                    onChange={(e) => {
                      const selectedProduct = products.find(p => p.id === e.target.value)
                      if (isNew && selectedProduct) {
                        setNewItem({
                          ...newItem,
                          productId: selectedProduct.id,
                          productName: selectedProduct.name,
                          category: selectedProduct.category
                        })
                      }
                    }}
                  >
                    <option value="">Selecione um produto</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                    value={item.productName || ""}
                    disabled
                  />
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                  value={item.category || ""}
                  disabled
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estoque Atual
                </label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={item.currentStock || 0}
                  min={0}
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    if (isNew) {
                      setNewItem({...newItem, currentStock: isNaN(value) ? 0 : value})
                    } else {
                      setEditingItem({...editingItem!, currentStock: isNaN(value) ? 0 : value})
                    }
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estoque Mínimo
                </label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={item.minStockLevel || 0}
                  min={0}
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    if (isNew) {
                      setNewItem({...newItem, minStockLevel: isNaN(value) ? 0 : value})
                    } else {
                      setEditingItem({...editingItem!, minStockLevel: isNaN(value) ? 0 : value})
                    }
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidade
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={item.unit || "unidade"}
                  onChange={(e) => {
                    if (isNew) {
                      setNewItem({...newItem, unit: e.target.value})
                    } else {
                      setEditingItem({...editingItem!, unit: e.target.value})
                    }
                  }}
                >
                  <option value="unidade">Unidade</option>
                  <option value="kg">Quilograma (kg)</option>
                  <option value="g">Grama (g)</option>
                  <option value="l">Litro (l)</option>
                  <option value="ml">Mililitro (ml)</option>
                  <option value="porção">Porção</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 flex items-center"
                onClick={() => {
                  if (isNew) {
                    setNewItem(null)
                  } else {
                    setEditingItem(null)
                  }
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </button>
              
              <button
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                onClick={() => saveInventoryItem(isNew ? newItem! : editingItem!, isNew)}
                disabled={isNew && (!newItem?.productId || !newItem?.productName)}
              >
                <Save className="h-4 w-4 mr-1" />
                Salvar
              </button>
            </div>
          </div>
        </td>
      </tr>
    )
  }

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full p-4 bg-red-50 text-red-700 rounded-lg">
        <p className="font-medium">Erro ao carregar inventário</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar itens..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center">
            <Filter className="h-4 w-4 text-gray-500 mr-2" />
            <select
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={filters.stockStatus}
              onChange={(e) => setFilters({...filters, stockStatus: e.target.value})}
            >
              <option value="all">Todos os níveis</option>
              <option value="low">Estoque baixo</option>
              <option value="out">Esgotado</option>
            </select>
          </div>
          
          {categories.length > 0 && (
            <div className="flex items-center">
              <Filter className="h-4 w-4 text-gray-500 mr-2" />
              <select
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
              >
                <option value="all">Todas as categorias</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <button
            className="flex items-center bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-md ml-auto"
            onClick={() => setNewItem({
              currentStock: 0,
              minStockLevel: 5,
              unit: "unidade",
              lastUpdated: Date.now()
            })}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Item
          </button>
        </div>
      </div>
      
      {filteredInventory.length === 0 && !newItem ? (
        <div className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum item no inventário</h3>
          <p className="text-gray-500 mb-4">
            Adicione itens ao inventário para controlar o estoque dos seus produtos.
          </p>
          <button
            className="inline-flex items-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md"
            onClick={() => setNewItem({
              currentStock: 0,
              minStockLevel: 5,
              unit: "unidade",
              lastUpdated: Date.now()
            })}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Primeiro Item
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("productName")}
                >
                  <div className="flex items-center">
                    Produto
                    {sortConfig.key === "productName" && (
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th 
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("currentStock")}
                >
                  <div className="flex items-center justify-center">
                    Estoque Atual
                    {sortConfig.key === "currentStock" && (
                      <ArrowUpDown className="h-4 w-4 ml-1" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unidade
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estoque Mínimo
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {newItem && renderInventoryForm(newItem, true)}
              
              {filteredInventory.map(item => (
                <>
                  {editingItem?.id === item.id ? (
                    renderInventoryForm(editingItem)
                  ) : (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.productName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {item.category || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-center">
                        {item.currentStock}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-center">
                        {item.unit}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-center">
                        {item.minStockLevel}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStockStatusColor(item)}`}>
                          {getStockStatusText(item)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex justify-end space-x-2">
                          <button
                            className="text-blue-600 hover:text-blue-800"
                            onClick={() => setEditingItem(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            className="text-red-600 hover:text-red-800"
                            onClick={() => deleteInventoryItem(item.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Alerta de estoque baixo */}
      {inventory.some(item => item.currentStock <= item.minStockLevel) && (
        <div className="p-4 bg-yellow-50 border-t border-yellow-100">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Alerta de Estoque</h4>
              <p className="text-sm text-yellow-700">
                {inventory.filter(item => item.currentStock <= item.minStockLevel).length} itens 
                estão com estoque baixo ou esgotado. Considere reabastecer em breve.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
