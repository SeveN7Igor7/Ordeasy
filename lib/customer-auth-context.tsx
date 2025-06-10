"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { database } from "@/lib/firebase"
import { ref, onValue, push, set, get } from "firebase/database"

interface CustomerUser {
  id: string
  name: string
  email: string
  phone: string
  addresses: CustomerAddress[]
  createdAt: number
}

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

interface CustomerAuthContextType {
  user: CustomerUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (userData: {
    name: string
    email: string
    phone: string
    password: string
  }) => Promise<void>
  signOut: () => void
  addAddress: (address: Omit<CustomerAddress, 'id'>) => Promise<void>
  updateAddress: (addressId: string, address: Partial<CustomerAddress>) => Promise<void>
  deleteAddress: (addressId: string) => Promise<void>
  getOrderHistory: () => Promise<any[]>
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined)

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar se há usuário logado no localStorage
    const savedUser = localStorage.getItem('customer_user')
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        // Garantir que addresses seja sempre um array
        userData.addresses = userData.addresses || []
        setUser(userData)
      } catch (error) {
        console.error('Erro ao carregar usuário salvo:', error)
        localStorage.removeItem('customer_user')
      }
    }
    setLoading(false)
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      
      // Buscar usuário no banco de dados
      const customersRef = ref(database, 'customers')
      const snapshot = await get(customersRef)
      
      if (snapshot.exists()) {
        const customers = snapshot.val()
        let foundUser = null
        
        // Procurar usuário por email
        Object.entries(customers).forEach(([id, customer]: [string, any]) => {
          if (customer.email === email && customer.password === password) {
            foundUser = { id, ...customer }
          }
        })
        
        if (foundUser) {
          // Remover senha do objeto do usuário e garantir que addresses seja um array
          const { password: _, ...userWithoutPassword } = foundUser
          userWithoutPassword.addresses = userWithoutPassword.addresses || []
          setUser(userWithoutPassword)
          localStorage.setItem('customer_user', JSON.stringify(userWithoutPassword))
        } else {
          throw new Error('Email ou senha incorretos')
        }
      } else {
        throw new Error('Email ou senha incorretos')
      }
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (userData: {
    name: string
    email: string
    phone: string
    password: string
  }) => {
    try {
      setLoading(true)
      
      // Verificar se email já existe
      const customersRef = ref(database, 'customers')
      const snapshot = await get(customersRef)
      
      if (snapshot.exists()) {
        const customers = snapshot.val()
        const emailExists = Object.values(customers).some((customer: any) => customer.email === userData.email)
        
        if (emailExists) {
          throw new Error('Este email já está cadastrado')
        }
      }
      
      // Criar novo usuário
      const newUserRef = push(customersRef)
      const newUserId = newUserRef.key as string
      
      const newUser = {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        password: userData.password, // Em produção, seria necessário hash
        addresses: [],        createdAt: Date.now()
      }
      
      await set(newUserRef, newUser)
      
      // Fazer login automaticamente
      const { password: _, ...userWithoutPassword } = { id: newUserId, ...newUser }
      userWithoutPassword.addresses = userWithoutPassword.addresses || []
      setUser(userWithoutPassword)
      localStorage.setItem('customer_user', JSON.stringify(userWithoutPassword))
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  const signOut = () => {
    setUser(null)
    localStorage.removeItem('customer_user')
  }

  const addAddress = async (address: Omit<CustomerAddress, 'id'>) => {
    if (!user) throw new Error('Usuário não logado')
    
    try {
      const addressesRef = ref(database, `customers/${user.id}/addresses`)
      const newAddressRef = push(addressesRef)
      const addressId = newAddressRef.key as string
      
      const newAddress = {
        ...address,
        id: addressId
      }
      
      await set(newAddressRef, newAddress)
      
      // Atualizar usuário local
      const updatedUser = {
        ...user,
        addresses: [...(user.addresses || []), newAddress]
      }
      setUser(updatedUser)
      localStorage.setItem('customer_user', JSON.stringify(updatedUser))
    } catch (error: any) {
      throw new Error('Erro ao adicionar endereço')
    }
  }

  const updateAddress = async (addressId: string, addressData: Partial<CustomerAddress>) => {
    if (!user) throw new Error('Usuário não logado')
    
    try {
      const addressRef = ref(database, `customers/${user.id}/addresses/${addressId}`)
      await set(addressRef, { ...addressData, id: addressId })
      
      // Atualizar usuário local
      const updatedAddresses = user.addresses.map(addr => 
        addr.id === addressId ? { ...addr, ...addressData } : addr
      )
      const updatedUser = { ...user, addresses: updatedAddresses }
      setUser(updatedUser)
      localStorage.setItem('customer_user', JSON.stringify(updatedUser))
    } catch (error: any) {
      throw new Error('Erro ao atualizar endereço')
    }
  }

  const deleteAddress = async (addressId: string) => {
    if (!user) throw new Error('Usuário não logado')
    
    try {
      const addressRef = ref(database, `customers/${user.id}/addresses/${addressId}`)
      await set(addressRef, null)
      
      // Atualizar usuário local
      const updatedAddresses = user.addresses.filter(addr => addr.id !== addressId)
      const updatedUser = { ...user, addresses: updatedAddresses }
      setUser(updatedUser)
      localStorage.setItem('customer_user', JSON.stringify(updatedUser))
    } catch (error: any) {
      throw new Error('Erro ao remover endereço')
    }
  }

  const getOrderHistory = async (): Promise<any[]> => {
    if (!user) return []
    
    try {
      // Buscar pedidos do usuário em todos os restaurantes
      const restaurantsRef = ref(database, 'restaurants')
      const snapshot = await get(restaurantsRef)
      
      const orders: any[] = []
      
      if (snapshot.exists()) {
        const restaurants = snapshot.val()
        
        Object.entries(restaurants).forEach(([restaurantId, restaurant]: [string, any]) => {
          if (restaurant.deliveryOrders) {
            Object.entries(restaurant.deliveryOrders).forEach(([orderId, order]: [string, any]) => {
              // Filtrar pedidos por customerId (mais preciso) ou por telefone/email (fallback)
              const isUserOrder = 
                (order.customerId && order.customerId === user.id) ||
                (order.customerPhone === user.phone) ||
                (order.customerEmail === user.email)
              
              if (isUserOrder) {
                orders.push({
                  id: orderId,
                  restaurantId,
                  restaurantName: restaurant.name,
                  ...order
                })
              }
            })
          }
        })
      }
      
      // Ordenar por data (mais recente primeiro)
      return orders.sort((a, b) => b.timestamp - a.timestamp)
    } catch (error) {
      console.error('Erro ao buscar histórico de pedidos:', error)
      return []
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    addAddress,
    updateAddress,
    deleteAddress,
    getOrderHistory
  }

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  )
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext)
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider')
  }
  return context
}

