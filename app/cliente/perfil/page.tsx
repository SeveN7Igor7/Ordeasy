"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCustomerAuth } from "@/lib/customer-auth-context"
import { 
  User, 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  ArrowLeft,
  LogOut,
  Package,
  Star,
  Phone,
  Mail
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface CustomerAddress {
  id: string
  name: string
  cep: string
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  isDefault: boolean
}

export default function CustomerProfilePage() {
  const { user, signOut, addAddress, updateAddress, deleteAddress, getOrderHistory } = useCustomerAuth()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState<"profile" | "addresses" | "orders">("profile")
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null)
  const [orderHistory, setOrderHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const [addressForm, setAddressForm] = useState({
    name: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    isDefault: false
  })

  // Redirecionar se não estiver logado
  useEffect(() => {
    if (!user) {
      router.push('/cliente')
    }
  }, [user, router])

  // Carregar histórico de pedidos
  useEffect(() => {
    if (user && activeTab === "orders") {
      loadOrderHistory()
    }
  }, [user, activeTab])

  const loadOrderHistory = async () => {
    try {
      setLoading(true)
      const orders = await getOrderHistory()
      setOrderHistory(orders)
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCep = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 9)
  }

  const fetchAddressByCep = async (cep: string) => {
    if (cep.length < 8) return
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, '')}/json/`)
      const data = await response.json()
      
      if (!data.erro) {
        setAddressForm(prev => ({
          ...prev,
          street: data.logradouro || "",
          neighborhood: data.bairro || "",
          city: data.localidade || "",
          state: data.uf || ""
        }))
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error)
    }
  }

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingAddress) {
        await updateAddress(editingAddress.id, addressForm)
      } else {
        await addAddress(addressForm)
      }
      
      setShowAddressForm(false)
      setEditingAddress(null)
      setAddressForm({
        name: "",
        cep: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        isDefault: false
      })
    } catch (error: any) {
      alert(error.message)
    }
  }

  const handleEditAddress = (address: CustomerAddress) => {
    setEditingAddress(address)
    setAddressForm(address)
    setShowAddressForm(true)
  }

  const handleDeleteAddress = async (addressId: string) => {
    if (confirm('Tem certeza que deseja remover este endereço?')) {
      try {
        await deleteAddress(addressId)
      } catch (error: any) {
        alert(error.message)
      }
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'preparing': return 'text-blue-600 bg-blue-50'
      case 'ready': return 'text-green-600 bg-green-50'
      case 'delivered': return 'text-green-700 bg-green-100'
      case 'cancelled': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente'
      case 'preparing': return 'Preparando'
      case 'ready': return 'Pronto'
      case 'delivered': return 'Entregue'
      case 'cancelled': return 'Cancelado'
      default: return status
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Meu Perfil</h1>
            </div>
            <button
              onClick={signOut}
              className="flex items-center text-red-600 hover:text-red-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab("profile")}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === "profile"
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <User className="h-4 w-4 inline mr-2" />
                Perfil
              </button>
              <button
                onClick={() => setActiveTab("addresses")}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === "addresses"
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <MapPin className="h-4 w-4 inline mr-2" />
                Endereços
              </button>
              <button
                onClick={() => setActiveTab("orders")}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === "orders"
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Package className="h-4 w-4 inline mr-2" />
                Pedidos
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Tab: Perfil */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="bg-orange-100 p-3 rounded-full">
                    <User className="h-8 w-8 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
                    <p className="text-gray-600">Cliente desde {new Date(user.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Mail className="h-4 w-4 inline mr-2" />
                        Email
                      </label>
                      <Input value={user.email} disabled className="bg-gray-50" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Phone className="h-4 w-4 inline mr-2" />
                        WhatsApp
                      </label>
                      <Input value={user.phone} disabled className="bg-gray-50" />
                    </div>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h3 className="font-medium text-orange-900 mb-2">Estatísticas</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-orange-700">Endereços cadastrados:</span>
                        <span className="font-medium">{user.addresses?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-700">Total de pedidos:</span>
                        <span className="font-medium">{orderHistory.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Endereços */}
            {activeTab === "addresses" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Meus Endereços</h2>
                  <Button
                    onClick={() => setShowAddressForm(true)}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Endereço
                  </Button>
                </div>

                {showAddressForm && (
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium mb-4">
                      {editingAddress ? "Editar Endereço" : "Novo Endereço"}
                    </h3>
                    
                    <form onSubmit={handleAddressSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome do endereço
                        </label>
                        <Input
                          value={addressForm.name}
                          onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                          placeholder="Ex: Casa, Trabalho, Casa da mãe"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                          <Input
                            value={addressForm.cep}
                            onChange={(e) => {
                              const formattedCep = formatCep(e.target.value)
                              setAddressForm({ ...addressForm, cep: formattedCep })
                              if (formattedCep.replace(/\D/g, '').length === 8) {
                                fetchAddressByCep(formattedCep)
                              }
                            }}
                            placeholder="00000-000"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                          <Input
                            value={addressForm.number}
                            onChange={(e) => setAddressForm({ ...addressForm, number: e.target.value })}
                            placeholder="123"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rua</label>
                        <Input
                          value={addressForm.street}
                          onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                          placeholder="Nome da rua"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                          <Input
                            value={addressForm.neighborhood}
                            onChange={(e) => setAddressForm({ ...addressForm, neighborhood: e.target.value })}
                            placeholder="Bairro"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                          <Input
                            value={addressForm.complement}
                            onChange={(e) => setAddressForm({ ...addressForm, complement: e.target.value })}
                            placeholder="Apto, bloco, etc."
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                          <Input
                            value={addressForm.city}
                            onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                            placeholder="Cidade"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                          <Input
                            value={addressForm.state}
                            onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                            placeholder="UF"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="isDefault"
                          checked={addressForm.isDefault}
                          onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                          className="mr-2"
                        />
                        <label htmlFor="isDefault" className="text-sm text-gray-700">
                          Definir como endereço padrão
                        </label>
                      </div>

                      <div className="flex gap-3">
                        <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                          {editingAddress ? "Atualizar" : "Adicionar"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowAddressForm(false)
                            setEditingAddress(null)
                            setAddressForm({
                              name: "",
                              cep: "",
                              street: "",
                              number: "",
                              complement: "",
                              neighborhood: "",
                              city: "",
                              state: "",
                              isDefault: false
                            })
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="space-y-4">
                  {user.addresses?.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Nenhum endereço cadastrado</p>
                      <p className="text-sm">Adicione um endereço para facilitar seus pedidos</p>
                    </div>
                  ) : (
                    user.addresses?.map((address) => (
                      <div key={address.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <h3 className="font-medium text-gray-900">{address.name}</h3>
                              {address.isDefault && (
                                <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                                  Padrão
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm">
                              {address.street}, {address.number}
                              {address.complement && `, ${address.complement}`}
                            </p>
                            <p className="text-gray-600 text-sm">
                              {address.neighborhood}, {address.city} - {address.state}
                            </p>
                            <p className="text-gray-600 text-sm">CEP: {address.cep}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditAddress(address)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(address.id)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab: Pedidos */}
            {activeTab === "orders" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Histórico de Pedidos</h2>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Carregando pedidos...</p>
                  </div>
                ) : orderHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Nenhum pedido encontrado</p>
                    <p className="text-sm">Seus pedidos aparecerão aqui</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orderHistory.map((order) => (
                      <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-medium text-gray-900">{order.restaurantName}</h3>
                            <p className="text-sm text-gray-500">
                              <Clock className="h-4 w-4 inline mr-1" />
                              {formatDate(order.timestamp)}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                        </div>

                        <div className="space-y-1 mb-3">
                          {order.items.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-gray-600">{item.quantity}x {item.name}</span>
                              <span>{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                          <span className="text-sm text-gray-600">
                            {order.orderType === 'delivery' ? 'Delivery' : 'Retirada'} • {order.paymentMethod}
                          </span>
                          <span className="font-medium text-orange-600">
                            Total: {formatCurrency(order.totalAmount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

