"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { database } from "./firebase"
import { ref, set, get } from "firebase/database"

interface User {
  id: string
  email: string
  restaurantId: string
  restaurantSlug: string
  qrcodemode: boolean
  deliverymode: boolean
}

interface AuthContextType {
  user: User | null
  restaurantId: string | null
  restaurantSlug: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, restaurantData: any) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function useAuth() {
  return useContext(AuthContext)
}

// Função para criar slug do restaurante
const createRestaurantSlug = (name: string): string => {
  console.log("🏷️ [SLUG] Criando slug para:", name)

  const slug = name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9\s-]/g, "") // Remove caracteres especiais
    .replace(/\s+/g, "-") // Substitui espaços por hífens
    .replace(/-+/g, "-") // Remove hífens duplicados
    .replace(/^-|-$/g, "") // Remove hífens do início e fim

  console.log("🏷️ [SLUG] Slug criado:", slug)
  return slug
}

// Funções para gerenciar cookies
const setCookie = (name: string, value: string, days = 7) => {
  if (typeof document === "undefined") {
    console.log("🍪 [COOKIE] Tentativa de salvar cookie no servidor (ignorado):", name)
    return
  }

  console.log("🍪 [COOKIE] Salvando cookie:", name, "=", value)
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
  console.log("🍪 [COOKIE] Cookie salvo com sucesso:", name)
}

const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") {
    console.log("🍪 [COOKIE] Tentativa de ler cookie no servidor (retornando null):", name)
    return null
  }

  console.log("🍪 [COOKIE] Buscando cookie:", name)
  const nameEQ = name + "="
  const ca = document.cookie.split(";")

  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === " ") c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) {
      const value = c.substring(nameEQ.length, c.length)
      console.log("🍪 [COOKIE] Cookie encontrado:", name, "=", value)
      return value
    }
  }

  console.log("🍪 [COOKIE] Cookie não encontrado:", name)
  return null
}

const deleteCookie = (name: string) => {
  if (typeof document === "undefined") {
    console.log("🍪 [COOKIE] Tentativa de deletar cookie no servidor (ignorado):", name)
    return
  }

  console.log("🍪 [COOKIE] Deletando cookie:", name)
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
  console.log("🍪 [COOKIE] Cookie deletado:", name)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [restaurantSlug, setRestaurantSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log("🔄 [AUTH] Iniciando verificação de sessão...")

    const checkSession = async () => {
      try {
        console.log("🔍 [AUTH] Verificando cookies salvos...")

        const savedUserId = getCookie("ordeasy_user_id")
        const savedRestaurantId = getCookie("ordeasy_restaurant_id")
        const savedRestaurantSlug = getCookie("ordeasy_restaurant_slug")

        console.log("🔍 [AUTH] Cookies encontrados:", {
          userId: savedUserId,
          restaurantId: savedRestaurantId,
          restaurantSlug: savedRestaurantSlug,
        })

        if (savedUserId && savedRestaurantId && savedRestaurantSlug) {
          console.log("✅ [AUTH] Todos os cookies necessários encontrados, verificando no Firebase...")

          // Verificar se o usuário ainda existe
          console.log("👤 [AUTH] Buscando usuário no Firebase:", savedUserId)
          const userRef = ref(database, `users/${savedUserId}`)
          const userSnapshot = await get(userRef)

          if (userSnapshot.exists()) {
            const userData = userSnapshot.val()
            console.log("✅ [AUTH] Usuário encontrado no Firebase:", userData)

            // Verificar se o restaurante ainda existe
            console.log("🏪 [AUTH] Buscando restaurante no Firebase:", savedRestaurantId)
            const restaurantRef = ref(database, `restaurants/${savedRestaurantId}`)
            const restaurantSnapshot = await get(restaurantRef)

            if (restaurantSnapshot.exists()) {
              const restaurantData = restaurantSnapshot.val()
              console.log("✅ [AUTH] Restaurante encontrado no Firebase:", restaurantData)

              console.log("🎉 [AUTH] Sessão válida! Restaurando estado do usuário...")

              setUser({
                id: savedUserId,
                email: userData.email,
                restaurantId: savedRestaurantId,
                restaurantSlug: savedRestaurantSlug,
                qrcodemode: restaurantData.qrcodemode || false,
                deliverymode: restaurantData.deliverymode || false,
              })
              setRestaurantId(savedRestaurantId)
              setRestaurantSlug(savedRestaurantSlug)

              console.log("✅ [AUTH] Estado do usuário restaurado com sucesso!")
            } else {
              console.error("❌ [AUTH] Restaurante não encontrado no Firebase:", savedRestaurantId)
              console.log("🧹 [AUTH] Limpando cookies inválidos...")
              deleteCookie("ordeasy_user_id")
              deleteCookie("ordeasy_restaurant_id")
              deleteCookie("ordeasy_restaurant_slug")
            }
          } else {
            console.error("❌ [AUTH] Usuário não encontrado no Firebase:", savedUserId)
            console.log("🧹 [AUTH] Limpando cookies inválidos...")
            deleteCookie("ordeasy_user_id")
            deleteCookie("ordeasy_restaurant_id")
            deleteCookie("ordeasy_restaurant_slug")
          }
        } else {
          console.log("ℹ️ [AUTH] Nenhuma sessão salva encontrada")
        }
      } catch (error) {
        console.error("💥 [AUTH] Erro ao verificar sessão:", error)
        console.log("🧹 [AUTH] Limpando cookies por segurança...")
        deleteCookie("ordeasy_user_id")
        deleteCookie("ordeasy_restaurant_id")
        deleteCookie("ordeasy_restaurant_slug")
      } finally {
        console.log("🏁 [AUTH] Verificação de sessão concluída")
        setLoading(false)
      }
    }

    checkSession()
  }, [])

  const signIn = async (email: string, password: string) => {
    console.log("🔐 [LOGIN] Iniciando processo de login para:", email)

    try {
      console.log("🔍 [LOGIN] Buscando usuários no Firebase...")
      const usersRef = ref(database, "users")
      const snapshot = await get(usersRef)

      if (snapshot.exists()) {
        const users = snapshot.val()
        console.log("📋 [LOGIN] Usuários encontrados no Firebase:", Object.keys(users).length, "usuários")
        console.log("📋 [LOGIN] IDs dos usuários:", Object.keys(users))

        const userEntry = Object.entries(users).find(([_, userData]: [string, any]) => {
          console.log("🔍 [LOGIN] Verificando usuário:", userData.email)
          return userData.email === email && userData.password === password
        })

        if (userEntry) {
          const [userId, userData] = userEntry as [string, any]
          console.log("✅ [LOGIN] Credenciais válidas! Usuário encontrado:", userId)
          console.log("📄 [LOGIN] Dados do usuário:", userData)

          // Verificar se o restaurante existe
          console.log("🏪 [LOGIN] Verificando se restaurante existe:", userData.restaurantId)
          const restaurantRef = ref(database, `restaurants/${userData.restaurantId}`)
          const restaurantSnapshot = await get(restaurantRef)

          if (!restaurantSnapshot.exists()) {
            console.error("❌ [LOGIN] Restaurante não encontrado:", userData.restaurantId)
            throw new Error("Restaurante não encontrado. Entre em contato com o suporte.")
          }

          const restaurantData = restaurantSnapshot.val()
          console.log("✅ [LOGIN] Restaurante encontrado:", restaurantData.name)

          // Salvar cookies
          console.log("🍪 [LOGIN] Salvando cookies de sessão...")
          setCookie("ordeasy_user_id", userId)
          setCookie("ordeasy_restaurant_id", userData.restaurantId)
          setCookie("ordeasy_restaurant_slug", userData.restaurantSlug || restaurantData.slug)

          // Atualizar estado
          console.log("🔄 [LOGIN] Atualizando estado da aplicação...")
          const userState = {
            id: userId,
            email: userData.email,
            restaurantId: userData.restaurantId,
            restaurantSlug: userData.restaurantSlug || restaurantData.slug,
            qrcodemode: restaurantData.qrcodemode || false,
            deliverymode: restaurantData.deliverymode || false,
          }

          setUser(userState)
          setRestaurantId(userData.restaurantId)
          setRestaurantSlug(userData.restaurantSlug || restaurantData.slug)

          console.log("🎉 [LOGIN] Login realizado com sucesso!")
          console.log("📊 [LOGIN] Estado final:", userState)
        } else {
          console.error("❌ [LOGIN] Credenciais inválidas para:", email)
          throw new Error("Email ou senha incorretos")
        }
      } else {
        console.error("❌ [LOGIN] Nenhum usuário encontrado no Firebase")
        throw new Error("Nenhum usuário encontrado no sistema")
      }
    } catch (error: any) {
      console.error("💥 [LOGIN] Erro no processo de login:", error)
      throw new Error(error.message || "Erro ao fazer login")
    }
  }

  const signUp = async (email: string, password: string, restaurantData: any) => {
    console.log("📝 [CADASTRO] Iniciando processo de cadastro...")
    console.log("📝 [CADASTRO] Email:", email)
    console.log("📝 [CADASTRO] Dados do restaurante:", restaurantData)

    try {
      // Verificar se email já existe
      console.log("🔍 [CADASTRO] Verificando se email já existe...")
      const usersRef = ref(database, "users")
      const snapshot = await get(usersRef)

      if (snapshot.exists()) {
        const users = snapshot.val()
        console.log("📋 [CADASTRO] Verificando", Object.keys(users).length, "usuários existentes...")

        const emailExists = Object.values(users).some((userData: any) => {
          console.log("🔍 [CADASTRO] Verificando email:", userData.email)
          return userData.email === email
        })

        if (emailExists) {
          console.error("❌ [CADASTRO] Email já existe:", email)
          throw new Error("Este email já está em uso")
        }
      }

      console.log("✅ [CADASTRO] Email disponível!")

      // Criar slug do restaurante
      const restaurantSlug = createRestaurantSlug(restaurantData.name)

      // Verificar se slug já existe
      console.log("🔍 [CADASTRO] Verificando se slug já existe...")
      const restaurantsRef = ref(database, "restaurants")
      const restaurantsSnapshot = await get(restaurantsRef)

      if (restaurantsSnapshot.exists()) {
        const restaurants = restaurantsSnapshot.val()
        console.log("📋 [CADASTRO] Verificando", Object.keys(restaurants).length, "restaurantes existentes...")

        const slugExists = Object.values(restaurants).some((restaurant: any) => {
          console.log("🔍 [CADASTRO] Verificando slug:", restaurant.slug)
          return restaurant.slug === restaurantSlug
        })

        if (slugExists) {
          console.error("❌ [CADASTRO] Slug já existe:", restaurantSlug)
          throw new Error("Já existe um restaurante com este nome. Tente um nome diferente.")
        }
      }

      console.log("✅ [CADASTRO] Slug disponível!")

      // Criar IDs únicos
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substr(2, 9)
      const userId = `user_${timestamp}_${randomId}`
      const restaurantId = `rest_${timestamp}_${randomId}`

      console.log("🆔 [CADASTRO] IDs gerados:")
      console.log("👤 [CADASTRO] User ID:", userId)
      console.log("🏪 [CADASTRO] Restaurant ID:", restaurantId)
      console.log("🏷️ [CADASTRO] Restaurant Slug:", restaurantSlug)

      // Preparar dados do restaurante
      const restaurantToSave = {
        ...restaurantData,
        slug: restaurantSlug,
        ownerId: userId,
        createdAt: timestamp,
        settings: {
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
        qrcodemode: true,
        deliverymode: true,
        },
        tables: {
          table1: { number: 1, status: "available", capacity: 2 },
          table2: { number: 2, status: "available", capacity: 4 },
          table3: { number: 3, status: "available", capacity: 6 },
          table4: { number: 4, status: "available", capacity: 2 },
          table5: { number: 5, status: "available", capacity: 4 },
        },
        categories: {},
        menu: {},
        orders: {},
      }

      console.log("💾 [CADASTRO] Salvando restaurante no Firebase...")
      await set(ref(database, `restaurants/${restaurantId}`), restaurantToSave)
      console.log("✅ [CADASTRO] Restaurante salvo com sucesso!")

      // Preparar dados do usuário
      const userToSave = {
        email: email,
        password: password,
        restaurantId: restaurantId,
        restaurantSlug: restaurantSlug,
        createdAt: timestamp,
      }

      console.log("💾 [CADASTRO] Salvando usuário no Firebase...")
      await set(ref(database, `users/${userId}`), userToSave)
      console.log("✅ [CADASTRO] Usuário salvo com sucesso!")

      // Salvar sessão nos cookies
      console.log("🍪 [CADASTRO] Salvando cookies de sessão...")
      setCookie("ordeasy_user_id", userId)
      setCookie("ordeasy_restaurant_id", restaurantId)
      setCookie("ordeasy_restaurant_slug", restaurantSlug)

      // Atualizar estado
      console.log("🔄 [CADASTRO] Atualizando estado da aplicação...")
      const userState = {
        id: userId,
        email: email,
        restaurantId: restaurantId,
        restaurantSlug: restaurantSlug,
      }

      setUser(userState)
      setRestaurantId(restaurantId)
      setRestaurantSlug(restaurantSlug)

      console.log("🎉 [CADASTRO] Cadastro realizado com sucesso!")
      console.log("📊 [CADASTRO] Estado final:", userState)
    } catch (error: any) {
      console.error("💥 [CADASTRO] Erro no processo de cadastro:", error)
      throw new Error(error.message || "Erro ao criar conta")
    }
  }

  const logout = () => {
    console.log("🚪 [LOGOUT] Iniciando processo de logout...")

    deleteCookie("ordeasy_user_id")
    deleteCookie("ordeasy_restaurant_id")
    deleteCookie("ordeasy_restaurant_slug")

    setUser(null)
    setRestaurantId(null)
    setRestaurantSlug(null)

    console.log("✅ [LOGOUT] Logout realizado com sucesso!")
  }

  const value = {
    user,
    restaurantId,
    restaurantSlug,
    loading,
    signIn,
    signUp,
    logout,
  }

  console.log("🔄 [AUTH] Estado atual do contexto:", {
    user: user ? `${user.email} (${user.id})` : null,
    restaurantId,
    restaurantSlug,
    loading,
  })

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
