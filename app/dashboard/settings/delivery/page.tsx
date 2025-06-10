"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { database } from "@/lib/firebase"
import { ref, onValue, update } from "firebase/database"
import {
  ArrowLeft,
  Save,
  MapPin,
  Truck,
  Plus,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Info,
  Target,
  Home
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface DeliverySettings {
  enabled: boolean
  minimumOrder: number
  location: {
    address: string
    latitude: number
    longitude: number
    cep: string
  }
  deliveryRanges: DeliveryRange[]
}

interface DeliveryRange {
  id: string
  distance: number
  fee: number
}

export default function DeliverySettings() {
  const { user, restaurantId } = useAuth()
  const router = useRouter()

  const [settings, setSettings] = useState<DeliverySettings>({
    enabled: true,
    minimumOrder: 20.0,
    location: {
      address: "",
      latitude: 0,
      longitude: 0,
      cep: ""
    },
    deliveryRanges: [
      { id: "range1", distance: 3, fee: 5 },
      { id: "range2", distance: 5, fee: 8 }
    ]
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !restaurantId) {
      router.push("/auth")
      return
    }

    setLoading(true)
    setError(null)

    // Carregar configurações de delivery
    const settingsRef = ref(database, `restaurants/${restaurantId}/deliverySettings`)

    const unsubscribe = onValue(
      settingsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val()
          setSettings({
            enabled: data.enabled ?? true,
            minimumOrder: data.minimumOrder ?? 20.0,
            location: data.location ?? {
              address: "",
              latitude: 0,
              longitude: 0,
              cep: ""
            },
            deliveryRanges: data.deliveryRanges ?? [
              { id: "range1", distance: 3, fee: 5 },
              { id: "range2", distance: 5, fee: 8 }
            ]
          })
        }
        setLoading(false)
      },
      (error) => {
        console.error("Erro ao carregar configurações de delivery:", error)
        setError(`Erro ao carregar dados: ${error.message}`)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user, restaurantId, router])

  const saveSettings = async () => {
    setSaving(true)

    try {
      const settingsRef = ref(database, `restaurants/${restaurantId}/deliverySettings`)
      await update(settingsRef, settings)
      alert("Configurações salvas com sucesso!")
    } catch (error: any) {
      console.error("Erro ao salvar configurações de delivery:", error)
      alert(`Erro ao salvar configurações: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const addDeliveryRange = () => {
    const newId = `range${Date.now()}`
    const lastRange = settings.deliveryRanges[settings.deliveryRanges.length - 1]
    const newDistance = lastRange ? lastRange.distance + 2 : 3
    const newFee = lastRange ? lastRange.fee + 3 : 5

    setSettings({
      ...settings,
      deliveryRanges: [
        ...settings.deliveryRanges,
        { id: newId, distance: newDistance, fee: newFee }
      ]
    })
  }

  const removeDeliveryRange = (id: string) => {
    if (settings.deliveryRanges.length <= 1) {
      alert("Deve haver pelo menos uma faixa de entrega")
      return
    }
    
    setSettings({
      ...settings,
      deliveryRanges: settings.deliveryRanges.filter(range => range.id !== id)
    })
  }

  const updateDeliveryRange = (id: string, field: 'distance' | 'fee', value: number) => {
    setSettings({
      ...settings,
      deliveryRanges: settings.deliveryRanges.map(range => 
        range.id === id ? { ...range, [field]: value } : range
      )
    })
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setSettings({
            ...settings,
            location: {
              ...settings.location,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          })
          
          // Buscar endereço a partir das coordenadas
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`)
            .then(response => response.json())
            .then(data => {
              if (data.address) {
                const address = `${data.address.road || ''} ${data.address.house_number || ''}, ${data.address.suburb || data.address.neighbourhood || ''}, ${data.address.city || data.address.town || ''}`
                const cep = data.address.postcode || ''
                
                setSettings({
                  ...settings,
                  location: {
                    ...settings.location,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    address: address.trim(),
                    cep
                  }
                })
              }
            })
            .catch(error => {
              console.error("Erro ao buscar endereço:", error)
            })
        },
        (error) => {
          console.error("Erro ao obter localização:", error)
          alert(`Erro ao obter localização: ${error.message}`)
        }
      )
    } else {
      alert("Geolocalização não é suportada pelo seu navegador")
    }
  }

  const lookupAddressByCEP = () => {
    const cep = settings.location.cep.replace(/\D/g, '')
    
    if (cep.length !== 8) {
      alert("CEP inválido. Digite um CEP com 8 dígitos.")
      return
    }
    
    fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then(response => response.json())
      .then(data => {
        if (!data.erro) {
          const address = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`
          
          setSettings({
            ...settings,
            location: {
              ...settings.location,
              address,
              cep: data.cep
            }
          })
          
          // Buscar coordenadas a partir do endereço
          fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
            .then(response => response.json())
            .then(data => {
              if (data && data.length > 0) {
                setSettings({
                  ...settings,
                  location: {
                    ...settings.location,
                    latitude: parseFloat(data[0].lat),
                    longitude: parseFloat(data[0].lon),
                    address
                  }
                })
              }
            })
            .catch(error => {
              console.error("Erro ao buscar coordenadas:", error)
            })
        } else {
          alert("CEP não encontrado")
        }
      })
      .catch(error => {
        console.error("Erro ao buscar CEP:", error)
        alert(`Erro ao buscar CEP: ${error.message}`)
      })
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Carregando Configurações</h2>
          <p className="text-gray-600">Buscando configurações de delivery...</p>
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
              onClick={() => window.location.reload()}
              className="w-full bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Recarregar</span>
            </button>
            <Link
              href="/dashboard/settings"
              className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar às Configurações</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard/settings"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Voltar às Configurações</span>
            </Link>
          </div>
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Salvando..." : "Salvar Alterações"}</span>
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Configurações de Delivery</h1>
          <p className="text-gray-600">Configure as opções de entrega e taxas por distância</p>
        </div>

        <div className="space-y-6">
          {/* Configurações Gerais */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações Gerais</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h5 className="font-medium text-gray-900">Habilitar Delivery</h5>
                  <p className="text-sm text-gray-600">Permitir que clientes façam pedidos para entrega</p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
                />
              </div>

              <div className="p-4 border rounded-lg">
                <Label htmlFor="minimumOrder">Pedido Mínimo (R$)</Label>
                <div className="mt-1">
                  <Input
                    id="minimumOrder"
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.minimumOrder}
                    onChange={(e) => setSettings({ ...settings, minimumOrder: parseFloat(e.target.value) || 0 })}
                    placeholder="20.00"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Valor mínimo para pedidos de delivery
                </p>
              </div>
            </div>
          </Card>

          {/* Localização */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Localização do Restaurante</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="cep">CEP</Label>
                <div className="flex mt-1 space-x-2">
                  <Input
                    id="cep"
                    value={settings.location.cep}
                    onChange={(e) => setSettings({
                      ...settings,
                      location: { ...settings.location, cep: e.target.value }
                    })}
                    placeholder="00000-000"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={lookupAddressByCEP}
                    className="flex items-center space-x-2"
                  >
                    <MapPin className="h-4 w-4" />
                    <span>Buscar</span>
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={settings.location.address}
                  onChange={(e) => setSettings({
                    ...settings,
                    location: { ...settings.location, address: e.target.value }
                  })}
                  placeholder="Rua, número, bairro, cidade"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={settings.location.latitude}
                    onChange={(e) => setSettings({
                      ...settings,
                      location: { ...settings.location, latitude: parseFloat(e.target.value) || 0 }
                    })}
                    placeholder="0.000000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={settings.location.longitude}
                    onChange={(e) => setSettings({
                      ...settings,
                      location: { ...settings.location, longitude: parseFloat(e.target.value) || 0 }
                    })}
                    placeholder="0.000000"
                    className="mt-1"
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={getCurrentLocation}
                className="flex items-center space-x-2"
              >
                <Target className="h-4 w-4" />
                <span>Usar Localização Atual</span>
              </Button>
            </div>
          </Card>

          {/* Taxas de Entrega */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Taxas de Entrega por Distância</h3>
              <Button
                type="button"
                variant="outline"
                onClick={addDeliveryRange}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar Faixa</span>
              </Button>
            </div>

            <div className="space-y-3">
              {settings.deliveryRanges.map((range, index) => (
                <div key={range.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <Label>Até {range.distance} km</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={range.distance}
                      onChange={(e) => updateDeliveryRange(range.id, 'distance', parseFloat(e.target.value) || 0.1)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex-1">
                    <Label>Taxa (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={range.fee}
                      onChange={(e) => updateDeliveryRange(range.id, 'fee', parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeDeliveryRange(range.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 p-4 rounded-lg mt-4">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Como funciona</h4>
                  <p className="text-sm text-blue-800">
                    As taxas são calculadas automaticamente com base na distância entre o restaurante e o endereço do cliente.
                    Configure sua localização acima para habilitar o cálculo automático.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

