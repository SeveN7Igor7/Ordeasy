"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, MapPin } from "lucide-react"

interface DeliveryAddressFormProps {
  onAddressComplete: (address: DeliveryAddress) => void
  deliveryFee: number
}

export interface DeliveryAddress {
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  additionalInfo: string
  deliveryFee: number
}

export default function DeliveryAddressForm({ onAddressComplete, deliveryFee }: DeliveryAddressFormProps) {
  const [address, setAddress] = useState<DeliveryAddress>({
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    additionalInfo: "",
    deliveryFee: deliveryFee
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '')
    setAddress({ ...address, cep })
    
    // Limpar erro quando o usuário começa a digitar novamente
    if (error) setError(null)
    
    // Buscar endereço automaticamente quando o CEP tiver 8 dígitos
    if (cep.length === 8) {
      lookupAddress(cep)
    }
  }
  
  const lookupAddress = async (cep: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await response.json()
      
      if (data.erro) {
        setError("CEP não encontrado")
        return
      }
      
      setAddress({
        ...address,
        cep,
        street: data.logradouro,
        neighborhood: data.bairro,
        city: data.localidade,
        state: data.uf
      })
    } catch (error) {
      console.error("Erro ao buscar CEP:", error)
      setError("Erro ao buscar endereço. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validação básica
    if (!address.cep || !address.street || !address.number || !address.city) {
      setError("Preencha os campos obrigatórios")
      return
    }
    
    onAddressComplete(address)
  }
  
  const formatCep = (cep: string) => {
    if (!cep) return ""
    cep = cep.replace(/\D/g, '')
    if (cep.length > 5) {
      return `${cep.slice(0, 5)}-${cep.slice(5, 8)}`
    }
    return cep
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-orange-50 p-4 rounded-lg mb-4 flex items-start">
        <MapPin className="h-5 w-5 text-orange-500 mt-0.5 mr-2 flex-shrink-0" />
        <p className="text-sm text-orange-800">
          Informe seu CEP para calcularmos a taxa de entrega e o tempo estimado.
        </p>
      </div>
      
      {error && (
        <div className="bg-red-50 p-3 rounded-md text-sm text-red-800">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="cep">CEP *</Label>
          <div className="mt-1 relative">
            <Input
              id="cep"
              value={formatCep(address.cep)}
              onChange={handleCepChange}
              placeholder="00000-000"
              required
              className={error && !address.cep ? "border-red-300" : ""}
            />
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        </div>
        
        <div className="col-span-2">
          <Label htmlFor="street">Rua/Avenida *</Label>
          <Input
            id="street"
            value={address.street}
            onChange={(e) => setAddress({ ...address, street: e.target.value })}
            placeholder="Nome da rua"
            required
            className={error && !address.street ? "border-red-300" : ""}
          />
        </div>
        
        <div>
          <Label htmlFor="number">Número *</Label>
          <Input
            id="number"
            value={address.number}
            onChange={(e) => setAddress({ ...address, number: e.target.value })}
            placeholder="123"
            required
            className={error && !address.number ? "border-red-300" : ""}
          />
        </div>
        
        <div>
          <Label htmlFor="complement">Complemento</Label>
          <Input
            id="complement"
            value={address.complement}
            onChange={(e) => setAddress({ ...address, complement: e.target.value })}
            placeholder="Apto, Bloco, etc."
          />
        </div>
        
        <div>
          <Label htmlFor="neighborhood">Bairro *</Label>
          <Input
            id="neighborhood"
            value={address.neighborhood}
            onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
            placeholder="Bairro"
            required
            className={error && !address.neighborhood ? "border-red-300" : ""}
          />
        </div>
        
        <div>
          <Label htmlFor="city">Cidade *</Label>
          <Input
            id="city"
            value={address.city}
            onChange={(e) => setAddress({ ...address, city: e.target.value })}
            placeholder="Cidade"
            required
            className={error && !address.city ? "border-red-300" : ""}
          />
        </div>
        
        <div>
          <Label htmlFor="state">Estado *</Label>
          <Input
            id="state"
            value={address.state}
            onChange={(e) => setAddress({ ...address, state: e.target.value })}
            placeholder="UF"
            required
            className={error && !address.state ? "border-red-300" : ""}
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="additionalInfo">Informações adicionais</Label>
        <textarea
          id="additionalInfo"
          value={address.additionalInfo}
          onChange={(e) => setAddress({ ...address, additionalInfo: e.target.value })}
          placeholder="Ponto de referência, instruções para entrega, etc."
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          rows={2}
        />
      </div>
      
      <div className="pt-4">
        <Button type="submit" className="w-full">
          Continuar
        </Button>
      </div>
    </form>
  )
}

