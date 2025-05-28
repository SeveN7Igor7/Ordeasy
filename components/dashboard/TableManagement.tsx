"use client"

import { useState, useEffect } from "react"
import { database } from "@/lib/firebase"
import { ref, onValue, update } from "firebase/database"
import { useAuth } from "@/lib/auth-context"
import { 
  Grid, 
  Table as TableIcon, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Coffee
} from "lucide-react"

interface Table {
  id: string
  number: string
  status: "available" | "occupied" | "reserved" | "cleaning"
  capacity: number
  currentOrderId?: string
  lastUpdated?: number
}

interface TableManagementProps {
  onTableSelect?: (tableId: string) => void
}

export default function TableManagement({ onTableSelect }: TableManagementProps) {
  const { restaurantId } = useAuth()
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  useEffect(() => {
    if (!restaurantId) return

    setLoading(true)
    setError(null)

    const tablesRef = ref(database, `restaurants/${restaurantId}/tables`)
    const unsubscribe = onValue(
      tablesRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val()
          const tablesList = Object.entries(data).map(([id, table]: [string, any]) => ({
            id,
            ...table
          }))
          
          // Ordenar por número da mesa
          tablesList.sort((a, b) => {
            const numA = parseInt(a.number.replace(/\D/g, ""))
            const numB = parseInt(b.number.replace(/\D/g, ""))
            return numA - numB
          })
          
          setTables(tablesList)
        } else {
          setTables([])
        }
        setLoading(false)
      },
      (error) => {
        console.error("Erro ao carregar mesas:", error)
        setError(`Erro ao carregar dados: ${error.message}`)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [restaurantId])

  const handleTableStatusChange = async (tableId: string, newStatus: Table["status"]) => {
    if (!restaurantId) return
    
    try {
      const tableRef = ref(database, `restaurants/${restaurantId}/tables/${tableId}`)
      await update(tableRef, {
        status: newStatus,
        lastUpdated: Date.now()
      })
    } catch (error: any) {
      console.error("Erro ao atualizar status da mesa:", error)
      setError(`Erro ao atualizar mesa: ${error.message}`)
    }
  }

  const getStatusColor = (status: Table["status"]) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800 border-green-200"
      case "occupied":
        return "bg-red-100 text-red-800 border-red-200"
      case "reserved":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "cleaning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = (status: Table["status"]) => {
    switch (status) {
      case "available":
        return <CheckCircle className="h-4 w-4" />
      case "occupied":
        return <Users className="h-4 w-4" />
      case "reserved":
        return <Clock className="h-4 w-4" />
      case "cleaning":
        return <Coffee className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getStatusText = (status: Table["status"]) => {
    switch (status) {
      case "available":
        return "Disponível"
      case "occupied":
        return "Ocupada"
      case "reserved":
        return "Reservada"
      case "cleaning":
        return "Limpeza"
      default:
        return "Desconhecido"
    }
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
        <p className="font-medium">Erro ao carregar mesas</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Gestão de Mesas</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-md ${
              viewMode === "grid" ? "bg-orange-100 text-orange-600" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <Grid className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-md ${
              viewMode === "list" ? "bg-orange-100 text-orange-600" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <TableIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {tables.length === 0 ? (
        <div className="p-8 text-center">
          <TableIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma mesa cadastrada</h3>
          <p className="text-gray-500 mb-4">
            Adicione mesas para começar a gerenciar seu restaurante.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map((table) => (
            <div
              key={table.id}
              className={`border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                getStatusColor(table.status)
              }`}
              onClick={() => onTableSelect && onTableSelect(table.id)}
            >
              <div className="p-4 text-center">
                <div className="text-2xl font-bold mb-1">Mesa {table.number}</div>
                <div className="text-sm mb-2">{table.capacity} lugares</div>
                <div className="flex items-center justify-center space-x-1 text-xs font-medium">
                  {getStatusIcon(table.status)}
                  <span>{getStatusText(table.status)}</span>
                </div>
              </div>
              <div className="bg-white p-2 border-t flex justify-between">
                <button
                  className="text-xs px-2 py-1 rounded bg-green-50 text-green-600 hover:bg-green-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleTableStatusChange(table.id, "available")
                  }}
                >
                  Livre
                </button>
                <button
                  className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleTableStatusChange(table.id, "cleaning")
                  }}
                >
                  Limpeza
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mesa
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacidade
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
              {tables.map((table) => (
                <tr
                  key={table.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onTableSelect && onTableSelect(table.id)}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    Mesa {table.number}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-center">
                    {table.capacity} lugares
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        table.status
                      )}`}
                    >
                      {getStatusIcon(table.status)}
                      <span className="ml-1">{getStatusText(table.status)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        className="text-xs px-2 py-1 rounded bg-green-50 text-green-600 hover:bg-green-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTableStatusChange(table.id, "available")
                        }}
                      >
                        Livre
                      </button>
                      <button
                        className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTableStatusChange(table.id, "occupied")
                        }}
                      >
                        Ocupada
                      </button>
                      <button
                        className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTableStatusChange(table.id, "cleaning")
                        }}
                      >
                        Limpeza
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
