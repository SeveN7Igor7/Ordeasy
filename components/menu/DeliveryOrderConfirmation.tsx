"use client"

import { useState, useEffect } from "react"
import { database } from "@/lib/firebase"
import { ref, push } from "firebase/database"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Truck, Home, X, Loader2, CreditCard, Wallet, QrCode, Banknote, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useCustomerAuth } from "@/lib/customer-auth-context"

interface DeliveryOrderConfirmationProps {
  restaurantId: string
  items: any[]
  totalAmount: number
  onClose: () => void
  onSuccess: (orderId: string) => void
}

export default function DeliveryOrderConfirmation({
  restaurantId,
  items,
  totalAmount,
  onClose,
  onSuccess
}: DeliveryOrderConfirmationProps) {
  const { user: customerUser, loading: customerLoading, addAddress } = useCustomerAuth()
  const [activeTab, setActiveTab] = useState<"delivery" | "pickup">("delivery")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Informações do cliente
  const [customerName, setCustomerName] = useState(customerUser?.name || "")
  const [customerPhone, setCustomerPhone] = useState(customerUser?.phone || "+55 ")
  const [additionalInfo, setAdditionalInfo] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  
  // Informações de endereço
  const [cep, setCep] = useState("")
  const [street, setStreet] = useState("")
  const [number, setNumber] = useState("")
  const [complement, setComplement] = useState("")
  const [neighborhood, setNeighborhood] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [saveAsDefault, setSaveAsDefault] = useState(false)
  const [showSaveAddressOption, setShowSaveAddressOption] = useState(false)

  useEffect(() => {
    if (customerUser && customerUser.addresses && customerUser.addresses.length > 0) {
      const defaultAddress = customerUser.addresses.find(addr => addr.isDefault) || customerUser.addresses[0]
      setSelectedAddressId(defaultAddress.id)
      setCep(defaultAddress.cep)
      setStreet(defaultAddress.street)
      setNumber(defaultAddress.number)
      setComplement(defaultAddress.complement || "")
      setNeighborhood(defaultAddress.neighborhood)
      setCity(defaultAddress.city)
      setState(defaultAddress.state)
    }
  }, [customerUser])

  const handleAddressChange = (addressId: string) => {
    setSelectedAddressId(addressId)
    const selectedAddress = customerUser?.addresses.find(addr => addr.id === addressId)
    if (selectedAddress) {
      setCep(selectedAddress.cep)
      setStreet(selectedAddress.street)
      setNumber(selectedAddress.number)
      setComplement(selectedAddress.complement || "")
      setNeighborhood(selectedAddress.neighborhood)
      setCity(selectedAddress.city)
      setState(selectedAddress.state)
    }
  }
  
  // Formatar CEP
  const formatCep = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 9)
  }
  
  // Buscar endereço automaticamente quando o CEP tiver 8 dígitos
  const fetchAddressByCep = async (cep: string) => {
    if (cep.replace(/\D/g, '').length !== 8) return
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, '')}/json/`)
      const data = await response.json()
      
      if (!data.erro) {
        setStreet(data.logradouro || "")
        setNeighborhood(data.bairro || "")
        setCity(data.localidade || "")
        setState(data.uf || "")
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error)
    }
  }
  
  // Formatar telefone
  const formatPhone = (value: string) => {
    if (!value.startsWith('+55 ')) {
      value = '+55 ' + value.replace(/^\+55\s?/, '')
    }
    
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '+$1 $2')
      .replace(/(\d{2})(\d)/, '$1 $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 17)
  }
  
  // Formatar valor monetário
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value)
  }
  
  // Verificar se pode enviar o pedido
  const canSubmitOrder = () => {
    // Verificações comuns para ambos os tipos de pedido
    const commonValidation = 
      customerName.trim() !== "" && 
      customerPhone.replace(/\D/g, '').length >= 13 &&
      paymentMethod !== "";
    
    // Verificações específicas para delivery
    if (activeTab === "delivery") {
      return commonValidation && 
        cep.replace(/\D/g, '').length === 8 &&
        street.trim() !== "" &&
        number.trim() !== "" &&
        neighborhood.trim() !== "" &&
        city.trim() !== "" &&
        state.trim() !== "";
    }
    
    // Para retirada, apenas as verificações comuns são necessárias
    return commonValidation;
  }
  
  // Enviar pedido
  const submitOrder = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const orderData = {
        customerName,
        customerPhone,
        items,
        totalAmount,
        orderType: activeTab,
        paymentMethod,
        additionalInfo: additionalInfo.trim() || null,
        timestamp: Date.now(),
        status: "pending",
        visto: false,
        customerId: customerUser?.id || null
      }
      
      if (activeTab === "delivery") {
        orderData.address = {
          cep: cep.replace(/\D/g, ''),
          street,
          number,
          complement: complement.trim() || null,
          neighborhood,
          city,
          state
        }
        
        // Se o usuário está logado e escolheu salvar o endereço
        if (customerUser && saveAsDefault && selectedAddressId === "new") {
          try {
            await addAddress({
              name: "Endereço Principal",
              cep: cep.replace(/\D/g, ''),
              street,
              number,
              complement: complement.trim() || "",
              neighborhood,
              city,
              state,
              isDefault: true
            })
          } catch (error) {
            console.error("Erro ao salvar endereço:", error)
            // Não impedir o pedido se falhar ao salvar o endereço
          }
        }
      }
      
      const ordersRef = ref(database, `restaurants/${restaurantId}/deliveryOrders`)
      const newOrderRef = await push(ordersRef, orderData)
      
      onSuccess(newOrderRef.key as string)
    } catch (error) {
      console.error("Erro ao enviar pedido:", error)
      setError("Erro ao enviar pedido. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Cabeçalho fixo */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-white">
          <h1 className="text-xl font-bold text-gray-900">Finalizar Pedido</h1>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Tabs para escolher entre delivery e retirada */}
          <Tabs defaultValue="delivery" className="w-full" onValueChange={(value) => setActiveTab(value as "delivery" | "pickup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="delivery" className="flex items-center text-sm">
                <Truck className="h-4 w-4 mr-2" />
                Delivery
              </TabsTrigger>
              <TabsTrigger value="pickup" className="flex items-center text-sm">
                <Home className="h-4 w-4 mr-2" />
                Retirada
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="delivery" className="mt-4 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome completo*
                  </label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="h-10"
                    disabled={!!customerUser}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp*
                  </label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
                    placeholder="+55 00 00000-0000"
                    className="h-10"
                    disabled={!!customerUser}
                  />
                </div>
                
                {customerUser && customerUser.addresses && customerUser.addresses.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Selecione um endereço salvo
                    </label>
                    <Select value={selectedAddressId || ""} onValueChange={handleAddressChange}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selecione um endereço" />
                      </SelectTrigger>
                      <SelectContent>
                        {customerUser.addresses.map(addr => (
                          <SelectItem key={addr.id} value={addr.id}>
                            {addr.name} - {addr.street}, {addr.number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(!customerUser || !customerUser.addresses || customerUser.addresses.length === 0 || selectedAddressId === "new") && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CEP*
                        </label>
                        <Input
                          value={cep}
                          onChange={(e) => {
                            const formattedCep = formatCep(e.target.value)
                            setCep(formattedCep)
                            if (formattedCep.replace(/\D/g, '').length === 8) {
                              fetchAddressByCep(formattedCep)
                            }
                          }}
                          placeholder="00000-000"
                          className="h-10"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Número*
                        </label>
                        <Input
                          value={number}
                          onChange={(e) => setNumber(e.target.value)}
                          placeholder="123"
                          className="h-10"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rua*
                      </label>
                      <Input
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="Nome da rua"
                        className="h-10"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bairro*
                        </label>
                        <Input
                          value={neighborhood}
                          onChange={(e) => setNeighborhood(e.target.value)}
                          placeholder="Bairro"
                          className="h-10"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Complemento
                        </label>
                        <Input
                          value={complement}
                          onChange={(e) => setComplement(e.target.value)}
                          placeholder="Apto, bloco"
                          className="h-10"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cidade*
                        </label>
                        <Input
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Cidade"
                          className="h-10"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Estado*
                        </label>
                        <Input
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          placeholder="UF"
                          className="h-10"
                        />
                      </div>
                    </div>
                    
                    {customerUser && selectedAddressId === "new" && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="saveAsDefault"
                          checked={saveAsDefault}
                          onChange={(e) => setSaveAsDefault(e.target.checked)}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <label htmlFor="saveAsDefault" className="text-sm text-gray-700">
                          Salvar este endereço como principal
                        </label>
                      </div>
                    )}
                  </>
                )}

                {customerUser && customerUser.addresses && customerUser.addresses.length > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedAddressId("new")}
                    className="w-full"
                  >
                    Adicionar novo endereço
                  </Button>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="pickup" className="mt-4 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome completo*
                  </label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="h-10"
                    disabled={!!customerUser}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp*
                  </label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
                    placeholder="+55 00 00000-0000"
                    className="h-10"
                    disabled={!!customerUser}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Forma de pagamento como dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Forma de pagamento*
            </label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecione a forma de pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2 text-orange-600" />
                    Cartão de Crédito
                  </div>
                </SelectItem>
                <SelectItem value="debit">
                  <div className="flex items-center">
                    <Wallet className="h-4 w-4 mr-2 text-orange-600" />
                    Cartão de Débito
                  </div>
                </SelectItem>
                <SelectItem value="pix">
                  <div className="flex items-center">
                    <QrCode className="h-4 w-4 mr-2 text-orange-600" />
                    PIX
                  </div>
                </SelectItem>
                <SelectItem value="cash">
                  <div className="flex items-center">
                    <Banknote className="h-4 w-4 mr-2 text-orange-600" />
                    Dinheiro
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Informações adicionais */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <Textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Instruções especiais, ponto de referência, etc."
              rows={2}
              className="resize-none"
            />
          </div>
          
          {/* Resumo do pedido compacto */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2 text-sm">Resumo do pedido</h3>
            <div className="space-y-1">
              {items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.quantity}x {item.name}</span>
                  <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold">
              <span>Total</span>
              <span className="text-orange-600">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
          
          {/* Erro */}
          {error && (
            <div className="bg-red-50 text-red-800 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
        </div>
        
        {/* Rodapé fixo com botões */}
        <div className="border-t border-gray-200 p-6 bg-white">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            
            <Button
              onClick={submitOrder}
              disabled={!canSubmitOrder() || loading}
              className="flex-1 bg-orange-500 hover:bg-orange-600"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Finalizar Pedido"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


