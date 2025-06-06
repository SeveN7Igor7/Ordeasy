"use client"

import { useState, useEffect } from "react"
import { database } from "@/lib/firebase"
import { ref, push, serverTimestamp } from "firebase/database"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Truck, Home, X, Check, Loader2, CreditCard, Wallet, QrCode, Banknote } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

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
  const [activeTab, setActiveTab] = useState<"delivery" | "pickup">("delivery")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Informações do cliente
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("+55 ")
  const [additionalInfo, setAdditionalInfo] = useState("")
  
  // Informações de endereço
  const [cep, setCep] = useState("")
  const [street, setStreet] = useState("")
  const [number, setNumber] = useState("")
  const [complement, setComplement] = useState("")
  const [neighborhood, setNeighborhood] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  
  // Forma de pagamento
  const [paymentMethod, setPaymentMethod] = useState<"credit" | "debit" | "pix" | "cash" | null>(null)
  
  // Buscar endereço pelo CEP
  const fetchAddressByCep = async () => {
    if (cep.length < 8) return
    
    try {
      setLoading(true)
      const response = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, '')}/json/`)
      const data = await response.json()
      
      if (data.erro) {
        setError("CEP não encontrado")
      } else {
        setStreet(data.logradouro || "")
        setNeighborhood(data.bairro || "")
        setCity(data.localidade || "")
        setState(data.uf || "")
        setError(null)
      }
    } catch (error) {
      setError("Erro ao buscar CEP")
      console.error("Erro ao buscar CEP:", error)
    } finally {
      setLoading(false)
    }
  }
  
  // Efeito para buscar CEP quando digitado
  useEffect(() => {
    if (cep.replace(/\D/g, '').length === 8) {
      fetchAddressByCep()
    }
  }, [cep])
  
  // Formatar CEP
  const formatCep = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 9)
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
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }
  
  // Verificar se pode enviar o pedido
  const canSubmitOrder = () => {
    // Verificações comuns para ambos os tipos de pedido
    const commonValidation = 
      customerName.trim() !== "" && 
      customerPhone.replace(/\D/g, '').length >= 13 &&
      paymentMethod !== null;
    
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
        visto: false
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
    <Dialog open={true} onOpenChange={onClose}>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in duration-300">
          {/* Cabeçalho */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Finalizar Pedido</h1>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Fechar</span>
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Tabs para escolher entre delivery e retirada */}
          <Tabs defaultValue="delivery" className="w-full mb-6" onValueChange={(value) => setActiveTab(value as "delivery" | "pickup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="delivery" className="flex items-center">
                <Truck className="h-4 w-4 mr-2" />
                Delivery
              </TabsTrigger>
              <TabsTrigger value="pickup" className="flex items-center">
                <Home className="h-4 w-4 mr-2" />
                Retirada
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="delivery" className="mt-4 space-y-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="customer-name-delivery" className="block text-sm font-medium text-gray-700 mb-1">
                    Nome completo*
                  </label>
                  <Input
                    id="customer-name-delivery"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="customer-phone-delivery" className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp / Telefone*
                  </label>
                  <Input
                    id="customer-phone-delivery"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
                    placeholder="+55 00 00000-0000"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Você será notificado sobre o status do seu pedido por WhatsApp
                  </p>
                </div>
                
                <div>
                  <label htmlFor="cep" className="block text-sm font-medium text-gray-700 mb-1">
                    CEP*
                  </label>
                  <div className="flex">
                    <Input
                      id="cep"
                      value={cep}
                      onChange={(e) => setCep(formatCep(e.target.value))}
                      placeholder="00000-000"
                      required
                    />
                    {loading && (
                      <div className="ml-2 flex items-center">
                        <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                      </div>
                    )}
                  </div>
                  {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
                      Rua*
                    </label>
                    <Input
                      id="street"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Nome da rua"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-1">
                      Número*
                    </label>
                    <Input
                      id="number"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="123"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="complement" className="block text-sm font-medium text-gray-700 mb-1">
                    Complemento
                  </label>
                  <Input
                    id="complement"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    placeholder="Apto, bloco, referência, etc."
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="neighborhood" className="block text-sm font-medium text-gray-700 mb-1">
                      Bairro*
                    </label>
                    <Input
                      id="neighborhood"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Bairro"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                      Cidade*
                    </label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Cidade"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                      Estado*
                    </label>
                    <Input
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="UF"
                      required
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="pickup" className="mt-4 space-y-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="customer-name-pickup" className="block text-sm font-medium text-gray-700 mb-1">
                    Nome completo*
                  </label>
                  <Input
                    id="customer-name-pickup"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="customer-phone-pickup" className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp / Telefone*
                  </label>
                  <Input
                    id="customer-phone-pickup"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
                    placeholder="+55 00 00000-0000"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Você será notificado sobre o status do seu pedido por WhatsApp
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Forma de pagamento */}
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3">Forma de pagamento*</h2>
            
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setPaymentMethod("credit")}
                className={`flex items-center p-3 border-2 rounded-lg transition-colors ${
                  paymentMethod === "credit"
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-orange-500 hover:bg-orange-50"
                }`}
              >
                <div className="bg-orange-100 p-2 rounded-full mr-3">
                  <CreditCard className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">Maquininha Crédito</h3>
                </div>
              </button>
              
              <button
                onClick={() => setPaymentMethod("debit")}
                className={`flex items-center p-3 border-2 rounded-lg transition-colors ${
                  paymentMethod === "debit"
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-orange-500 hover:bg-orange-50"
                }`}
              >
                <div className="bg-orange-100 p-2 rounded-full mr-3">
                  <Wallet className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">Maquininha Débito</h3>
                </div>
              </button>
              
              <button
                onClick={() => setPaymentMethod("pix")}
                className={`flex items-center p-3 border-2 rounded-lg transition-colors ${
                  paymentMethod === "pix"
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-orange-500 hover:bg-orange-50"
                }`}
              >
                <div className="bg-orange-100 p-2 rounded-full mr-3">
                  <QrCode className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">Pix</h3>
                </div>
              </button>
              
              <button
                onClick={() => setPaymentMethod("cash")}
                className={`flex items-center p-3 border-2 rounded-lg transition-colors ${
                  paymentMethod === "cash"
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-orange-500 hover:bg-orange-50"
                }`}
              >
                <div className="bg-orange-100 p-2 rounded-full mr-3">
                  <Banknote className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">Dinheiro</h3>
                </div>
              </button>
            </div>
          </div>
          
          {/* Informações adicionais */}
          <div className="mb-6">
            <label htmlFor="additional-info" className="block text-sm font-medium text-gray-700 mb-1">
              Informações adicionais
            </label>
            <Textarea
              id="additional-info"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Instruções especiais para entrega, ponto de referência, etc."
              rows={3}
            />
          </div>
          
          {/* Resumo do pedido */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Resumo do pedido</h3>
            <ul className="space-y-2">
              {items.map((item, index) => (
                <li key={index} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span>{formatCurrency(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold">
              <span>Total</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>
          
          {/* Erro */}
          {error && (
            <div className="bg-red-50 text-red-800 p-3 rounded-md text-sm mb-6">
              {error}
            </div>
          )}
          
          {/* Botões */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            
            <Button
              onClick={submitOrder}
              disabled={!canSubmitOrder() || loading}
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
    </Dialog>
  )
}

