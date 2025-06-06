"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { database } from "@/lib/firebase"
import { ref, onValue, update, remove, push } from "firebase/database"
import { Plus, Edit3, Trash2, Save, X, Eye, EyeOff, ImageIcon, Tag, ArrowLeft, Info } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { v2 as cloudinary } from 'cloudinary';

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  image: string
  available: boolean
}

interface Category {
  id: string
  name: string
  order: number
  color: string
}

export default function MenuManagement() {
  const { user, restaurantId } = useAuth()
  const router = useRouter()

  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showAddItem, setShowAddItem] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)

  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    price: 0,
    category: "",
    image: "",
    available: true,
  })

  const [newCategory, setNewCategory] = useState({
    name: "",
    color: "#f97316",
    order: 0,
  })

  const [imageUploading, setImageUploading] = useState(false)

  useEffect(() => {
    if (!user || !restaurantId) {
      router.push("/auth")
      return
    }

    // Carregar categorias
    const categoriesRef = ref(database, `restaurants/${restaurantId}/categories`)
    onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const categoriesList = Object.entries(data)
          .map(([id, category]: [string, any]) => ({
            id,
            ...category,
          }))
          .sort((a, b) => a.order - b.order)
        setCategories(categoriesList)
      } else {
        setCategories([])
      }
    })

    // Carregar itens do menu
    const menuRef = ref(database, `restaurants/${restaurantId}/menu`)
    onValue(menuRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const items = Object.entries(data).map(([id, item]: [string, any]) => ({
          id,
          ...item,
        }))
        setMenuItems(items)
      } else {
        setMenuItems([])
      }
    })
  }, [user, restaurantId, router])

  const uploadImage = async (file: File): Promise<string> => {
    setImageUploading(true)
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ordeasy_uploads'); // Use o upload preset que você configurou no Cloudinary

      const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("💥 [CLOUDINARY] Erro na resposta do Cloudinary:", errorData);
        throw new Error("Erro ao fazer upload da imagem para o Cloudinary");
      }

      const data = await response.json();
      setImageUploading(false);
      return data.secure_url;
    } catch (error) {
      setImageUploading(false);
      throw error;
    }
  };
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, isEditing = false) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione apenas arquivos de imagem")
      return
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Imagem muito grande. Máximo 5MB")
      return
    }

    try {
      const imageUrl = await uploadImage(file)

      if (isEditing && editingItem) {
        setEditingItem({ ...editingItem, image: imageUrl })
      } else {
        setNewItem({ ...newItem, image: imageUrl })
      }

      console.log("✅ [MENU] Imagem processada com sucesso:", imageUrl)
    } catch (error) {
      console.error("💥 [MENU] Erro ao processar imagem:", error)
      alert("Erro ao processar imagem. Tente novamente.")
    }
  }

  const addCategory = async () => {
    if (!newCategory.name.trim()) {
      alert("Por favor, digite o nome da categoria")
      return
    }

    try {
      const categoriesRef = ref(database, `restaurants/${restaurantId}/categories`)
      await push(categoriesRef, {
        ...newCategory,
        order: categories.length,
      })

      setNewCategory({ name: "", color: "#f97316", order: 0 })
      setShowAddCategory(false)
      alert("Categoria adicionada com sucesso!")
    } catch (error) {
      alert("Erro ao adicionar categoria")
    }
  }

  const updateCategory = async () => {
    if (!editingCategory) return

    try {
      const categoryRef = ref(database, `restaurants/${restaurantId}/categories/${editingCategory.id}`)
      await update(categoryRef, {
        name: editingCategory.name,
        color: editingCategory.color,
        order: editingCategory.order,
      })

      setEditingCategory(null)
      alert("Categoria atualizada com sucesso!")
    } catch (error) {
      alert("Erro ao atualizar categoria")
    }
  }

  const deleteCategory = async (categoryId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return

    try {
      const categoryRef = ref(database, `restaurants/${restaurantId}/categories/${categoryId}`)
      await remove(categoryRef)
      alert("Categoria excluída com sucesso!")
    } catch (error) {
      alert("Erro ao excluir categoria")
    }
  }

  const addMenuItem = async () => {
    if (!newItem.name.trim()) {
      alert("Por favor, digite o nome do produto")
      return
    }
    if (!newItem.category) {
      alert("Por favor, selecione uma categoria")
      return
    }
    if (newItem.price <= 0) {
      alert("Por favor, digite um preço válido")
      return
    }

    try {
      const menuRef = ref(database, `restaurants/${restaurantId}/menu`)
      await push(menuRef, newItem)

      setNewItem({
        name: "",
        description: "",
        price: 0,
        category: "",
        image: "",
        available: true,
      })
      setShowAddItem(false)
      alert("Produto adicionado com sucesso!")
    } catch (error) {
      alert("Erro ao adicionar produto")
    }
  }

  const updateMenuItem = async () => {
    if (!editingItem) return

    try {
      const itemRef = ref(database, `restaurants/${restaurantId}/menu/${editingItem.id}`)
      await update(itemRef, {
        name: editingItem.name,
        description: editingItem.description,
        price: editingItem.price,
        category: editingItem.category,
        image: editingItem.image,
        available: editingItem.available,
      })

      setEditingItem(null)
      alert("Produto atualizado com sucesso!")
    } catch (error) {
      alert("Erro ao atualizar produto")
    }
  }

  const deleteMenuItem = async (itemId: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return

    try {
      const itemRef = ref(database, `restaurants/${restaurantId}/menu/${itemId}`)
      await remove(itemRef)
      alert("Produto excluído com sucesso!")
    } catch (error) {
      alert("Erro ao excluir produto")
    }
  }

  const toggleItemAvailability = async (itemId: string, available: boolean) => {
    try {
      const itemRef = ref(database, `restaurants/${restaurantId}/menu/${itemId}`)
      await update(itemRef, { available })
    } catch (error) {
      alert("Erro ao atualizar disponibilidade")
    }
  }

  const filteredItems =
    selectedCategory === "all" ? menuItems : menuItems.filter((item) => item.category === selectedCategory)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Voltar ao Dashboard</span>
            </Link>
          </div>
          <button
            onClick={() => setShowInstructions(true)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Info className="h-4 w-4" />
            <span>Como usar</span>
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão do Cardápio</h1>
          <p className="text-gray-600">Gerencie produtos e categorias do seu restaurante</p>
        </div>

        {/* Instruções Iniciais */}
        {categories.length === 0 && menuItems.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <div className="flex items-start space-x-3">
              <Info className="h-6 w-6 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Bem-vindo ao seu cardápio!</h3>
                <p className="text-blue-800 mb-4">
                  Para começar, você precisa criar categorias e adicionar produtos. Siga estes passos:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-blue-800">
                  <li>Primeiro, crie categorias (ex: Lanches, Bebidas, Sobremesas)</li>
                  <li>Depois, adicione produtos em cada categoria</li>
                  <li>Configure preços, descrições e imagens</li>
                  <li>Ative/desative produtos conforme disponibilidade</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Ações Principais */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={() => setShowAddCategory(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Tag className="h-5 w-5" />
            <span>Nova Categoria</span>
          </button>
          <button
            onClick={() => {
              if (categories.length === 0) {
                alert("Primeiro crie uma categoria antes de adicionar produtos!")
                return
              }
              setShowAddItem(true)
            }}
            className="flex items-center space-x-2 bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Novo Produto</span>
          </button>
        </div>

        {/* Gestão de Categorias */}
        {categories.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Categorias ({categories.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="border rounded-lg p-4 flex items-center justify-between"
                  style={{ borderColor: category.color }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => setEditingCategory(category)} className="text-blue-600 hover:text-blue-800">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteCategory(category.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filtros */}
        {categories.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
            <div className="flex items-center space-x-4">
              <span className="font-medium text-gray-700">Filtrar por categoria:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedCategory === "all"
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Todas ({menuItems.length})
                </button>
                {categories.map((category) => {
                  const itemCount = menuItems.filter((item) => item.category === category.name).length
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.name)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        selectedCategory === category.name
                          ? "text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      style={{
                        backgroundColor: selectedCategory === category.name ? category.color : undefined,
                      }}
                    >
                      {category.name} ({itemCount})
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Lista de Produtos */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Produtos ({filteredItems.length}){selectedCategory !== "all" && ` - ${selectedCategory}`}
            </h3>
          </div>

          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {menuItems.length === 0 ? "Nenhum produto cadastrado" : "Nenhum produto nesta categoria"}
              </h3>
              <p className="text-gray-500 mb-4">
                {categories.length === 0
                  ? "Primeiro crie uma categoria, depois adicione produtos."
                  : "Adicione produtos para começar a vender."}
              </p>
              {categories.length > 0 && (
                <button
                  onClick={() => setShowAddItem(true)}
                  className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Adicionar Primeiro Produto
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredItems.map((item) => (
                <div key={item.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="relative mb-4">
                    <Image
                      src={item.image || "/placeholder.svg?height=200&width=200"}
                      alt={item.name}
                      width={200}
                      height={200}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <div className="absolute top-2 right-2 flex space-x-2">
                      <button
                        onClick={() => toggleItemAvailability(item.id, !item.available)}
                        className={`p-2 rounded-full ${
                          item.available ? "bg-green-500 text-white" : "bg-gray-500 text-white"
                        }`}
                        title={item.available ? "Disponível" : "Indisponível"}
                      >
                        {item.available ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 truncate">{item.name}</h4>
                      <span className="text-lg font-bold text-orange-500">R$ {item.price.toFixed(2)}</span>
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>

                    <div className="flex items-center justify-between">
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: categories.find((c) => c.name === item.category)?.color + "20",
                          color: categories.find((c) => c.name === item.category)?.color,
                        }}
                      >
                        {item.category}
                      </span>

                      <div className="flex space-x-2">
                        <button onClick={() => setEditingItem(item)} className="text-blue-600 hover:text-blue-800">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteMenuItem(item.id)} className="text-red-600 hover:text-red-800">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Instruções */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Como usar o Cardápio Digital</h3>
              <button onClick={() => setShowInstructions(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-lg mb-2">1. Criando Categorias</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Clique em "Nova Categoria"</li>
                  <li>Digite o nome (ex: Lanches, Bebidas, Sobremesas)</li>
                  <li>Escolha uma cor para identificar a categoria</li>
                  <li>Salve a categoria</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-2">2. Adicionando Produtos</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Clique em "Novo Produto"</li>
                  <li>Preencha nome, descrição e preço</li>
                  <li>Selecione uma categoria</li>
                  <li>Adicione uma imagem (opcional)</li>
                  <li>Marque se está disponível</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-2">3. Gerenciando Produtos</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Use o ícone do olho para ativar/desativar produtos</li>
                  <li>Clique no lápis para editar informações</li>
                  <li>Use a lixeira para excluir produtos</li>
                  <li>Filtre por categoria para organizar melhor</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-2">4. Compartilhando o Cardápio</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>No dashboard, clique em "Compartilhar Cardápio"</li>
                  <li>Copie o link e compartilhe com os clientes</li>
                  <li>Gere QR Codes para as mesas</li>
                  <li>Os clientes acessam pelo celular e fazem pedidos</li>
                </ul>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-semibold text-orange-800 mb-2">💡 Dicas Importantes</h4>
                <ul className="list-disc list-inside space-y-1 text-orange-700 text-sm">
                  <li>Sempre crie categorias antes de adicionar produtos</li>
                  <li>Use descrições claras e preços corretos</li>
                  <li>Imagens atraem mais clientes</li>
                  <li>Desative produtos em falta temporariamente</li>
                  <li>Organize categorias por ordem de popularidade</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar Categoria */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Adicionar Categoria</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Categoria *</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ex: Lanches, Bebidas, Sobremesas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor da Categoria</label>
                <input
                  type="color"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                  className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => setShowAddCategory(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={addCategory}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Categoria */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Editar Categoria</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Categoria</label>
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor da Categoria</label>
                <input
                  type="color"
                  value={editingCategory.color}
                  onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                  className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => setEditingCategory(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={updateCategory}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar/Editar Produto */}
      {(showAddItem || editingItem) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold mb-4">{editingItem ? "Editar Produto" : "Adicionar Produto"}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Upload de Imagem */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Imagem do Produto</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {editingItem?.image || newItem.image ? (
                    <div className="relative">
                      <Image
                        src={editingItem?.image || newItem.image}
                        alt="Preview"
                        width={200}
                        height={200}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => {
                          if (editingItem) {
                            setEditingItem({ ...editingItem, image: "" })
                          } else {
                            setNewItem({ ...newItem, image: "" })
                          }
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 mb-2">Adicionar imagem</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, !!editingItem)}
                        className="hidden"
                        id="image-upload"
                        disabled={imageUploading}
                      />
                      <label
                        htmlFor="image-upload"
                        className={`bg-orange-500 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-orange-600 transition-colors ${
                          imageUploading ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        {imageUploading ? "Enviando..." : "Escolher Arquivo"}
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Formulário */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto *</label>
                  <input
                    type="text"
                    value={editingItem?.name || newItem.name}
                    onChange={(e) => {
                      if (editingItem) {
                        setEditingItem({ ...editingItem, name: e.target.value })
                      } else {
                        setNewItem({ ...newItem, name: e.target.value })
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Ex: Hambúrguer Artesanal"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea
                    value={editingItem?.description || newItem.description}
                    onChange={(e) => {
                      if (editingItem) {
                        setEditingItem({ ...editingItem, description: e.target.value })
                      } else {
                        setNewItem({ ...newItem, description: e.target.value })
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Descreva o produto..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingItem?.price || newItem.price}
                    onChange={(e) => {
                      if (editingItem) {
                        setEditingItem({ ...editingItem, price: Number.parseFloat(e.target.value) || 0 })
                      } else {
                        setNewItem({ ...newItem, price: Number.parseFloat(e.target.value) || 0 })
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                  <select
                    value={editingItem?.category || newItem.category}
                    onChange={(e) => {
                      if (editingItem) {
                        setEditingItem({ ...editingItem, category: e.target.value })
                      } else {
                        setNewItem({ ...newItem, category: e.target.value })
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Selecionar categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingItem?.available ?? newItem.available}
                    onChange={(e) => {
                      if (editingItem) {
                        setEditingItem({ ...editingItem, available: e.target.checked })
                      } else {
                        setNewItem({ ...newItem, available: e.target.checked })
                      }
                    }}
                    className="mr-2 h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">Produto disponível</label>
                </div>
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowAddItem(false)
                  setEditingItem(null)
                  setNewItem({
                    name: "",
                    description: "",
                    price: 0,
                    category: "",
                    image: "",
                    available: true,
                  })
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={editingItem ? updateMenuItem : addMenuItem}
                disabled={imageUploading}
                className="flex-1 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{editingItem ? "Atualizar" : "Adicionar"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
