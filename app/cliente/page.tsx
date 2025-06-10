"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCustomerAuth } from "@/lib/customer-auth-context"
import { User, Mail, Lock, Phone, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function CustomerAuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "+55 ",
    password: "",
    confirmPassword: ""
  })

  const { signIn, signUp } = useCustomerAuth()
  const router = useRouter()

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isLogin) {
        await signIn(formData.email, formData.password)
        router.back() // Voltar para a página anterior
      } else {
        // Validações para cadastro
        if (formData.password !== formData.confirmPassword) {
          throw new Error("As senhas não coincidem")
        }
        
        if (formData.password.length < 6) {
          throw new Error("A senha deve ter pelo menos 6 caracteres")
        }
        
        if (formData.phone.replace(/\D/g, '').length < 13) {
          throw new Error("Telefone inválido")
        }

        await signUp({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password
        })
        router.back() // Voltar para a página anterior
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Botão voltar */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="bg-orange-500 p-3 rounded-full w-fit mx-auto mb-4">
            <User className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isLogin ? "Entrar" : "Criar Conta"}
          </h1>
          <p className="text-gray-600 mt-2">
            {isLogin ? "Acesse sua conta de cliente" : "Cadastre-se para fazer pedidos"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md border border-red-100 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="h-4 w-4 inline mr-2" />
                Nome completo
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Seu nome completo"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail className="h-4 w-4 inline mr-2" />
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="seu@email.com"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="h-4 w-4 inline mr-2" />
                WhatsApp
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="+55 00 00000-0000"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Lock className="h-4 w-4 inline mr-2" />
              Senha
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Lock className="h-4 w-4 inline mr-2" />
                Confirmar senha
              </label>
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white mr-2"></div>
                Processando...
              </div>
            ) : isLogin ? (
              "Entrar"
            ) : (
              "Criar Conta"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => {
              setIsLogin(!isLogin)
              setError(null)
              setFormData({
                name: "",
                email: "",
                phone: "+55 ",
                password: "",
                confirmPassword: ""
              })
            }} 
            className="text-orange-500 hover:text-orange-600 font-medium"
          >
            {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Entre"}
          </button>
        </div>

        {/* Credenciais de teste */}
        {isLogin && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center mb-2">Para testar, use:</p>
            <p className="text-xs text-gray-700 text-center">
              <strong>Email:</strong> cliente@teste.com
              <br />
              <strong>Senha:</strong> 123456
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

