"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { database } from "@/lib/firebase"
import { ref, onValue } from "firebase/database"
import { useRouter } from "next/navigation"
import { 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Bell,
  Truck,
  Home,
  Calendar,
  CalendarDays,
  CalendarRange
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts'
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function ReportsDashboard() {
  const { user, restaurantId } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: subDays(new Date(), 7),
    to: new Date()
  })
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly">("daily")
  const [reportData, setReportData] = useState<any[]>([])
  const [orderTypeFilter, setOrderTypeFilter] = useState<"all" | "delivery" | "pickup">("all")
  const router = useRouter()

  useEffect(() => {
    // Verificar se o usuário tem permissão para acessar este dashboard
    if (user && !user.deliverymode && !user.qrcodemode) {
      // Se nenhum modo estiver ativo, redirecionar para configurações
      router.push("/dashboard/settings");
      return;
    }

    if (!restaurantId) return

    setLoading(true)

    // Carregar pedidos de delivery e retirada
    const deliveryOrdersRef = ref(database, `restaurants/${restaurantId}/deliveryOrders`)
    const unsubscribeDeliveryOrders = onValue(deliveryOrdersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const ordersList = Object.entries(data).map(([id, order]: [string, any]) => ({
          id,
          ...order,
          orderSource: "delivery"
        }))
        
        // Carregar pedidos QR Code
        const qrOrdersRef = ref(database, `restaurants/${restaurantId}/orders`)
        onValue(qrOrdersRef, (qrSnapshot) => {
          let allOrders = [...ordersList]
          
          if (qrSnapshot.exists()) {
            const qrData = qrSnapshot.val()
            const qrOrdersList = Object.entries(qrData).map(([id, order]: [string, any]) => ({
              id,
              ...order,
              orderSource: "qrcode"
            }))
            
            allOrders = [...ordersList, ...qrOrdersList]
          }
          
          // Ordenar por timestamp (mais recentes primeiro)
          allOrders.sort((a, b) => b.timestamp - a.timestamp)
          setOrders(allOrders)
          setLoading(false)
          
          // Processar dados para relatórios
          processReportData(allOrders, reportType, dateRange, orderTypeFilter)
        })
      } else {
        // Carregar apenas pedidos QR Code
        const qrOrdersRef = ref(database, `restaurants/${restaurantId}/orders`)
        onValue(qrOrdersRef, (qrSnapshot) => {
          if (qrSnapshot.exists()) {
            const qrData = qrSnapshot.val()
            const qrOrdersList = Object.entries(qrData).map(([id, order]: [string, any]) => ({
              id,
              ...order,
              orderSource: "qrcode"
            }))
            
            // Ordenar por timestamp (mais recentes primeiro)
            qrOrdersList.sort((a, b) => b.timestamp - a.timestamp)
            setOrders(qrOrdersList)
          } else {
            setOrders([])
          }
          
          setLoading(false)
          
          // Processar dados para relatórios
          processReportData(orders, reportType, dateRange, orderTypeFilter)
        })
      }
    })

    return () => {
      unsubscribeDeliveryOrders()
    }
  }, [restaurantId, user, router])

  // Processar dados quando os filtros mudarem
  useEffect(() => {
    processReportData(orders, reportType, dateRange, orderTypeFilter)
  }, [reportType, dateRange, orderTypeFilter, orders])

  // Processar dados para relatórios
  const processReportData = (
    orders: any[], 
    type: "daily" | "weekly" | "monthly",
    range: { from: Date; to: Date },
    orderTypeFilter: "all" | "delivery" | "pickup"
  ) => {
    if (!orders.length) {
      setReportData([])
      return
    }
    
    // Filtrar por intervalo de datas
    const filteredByDate = orders.filter(order => {
      const orderDate = new Date(order.timestamp)
      return isWithinInterval(orderDate, {
        start: startOfDay(range.from),
        end: endOfDay(range.to)
      })
    })
    
    // Filtrar por tipo de pedido
    const filteredOrders = filteredByDate.filter(order => {
      if (orderTypeFilter === "all") return true
      if (orderTypeFilter === "delivery") {
        return order.orderSource === "delivery" && order.orderType === "delivery"
      }
      if (orderTypeFilter === "pickup") {
        return order.orderSource === "delivery" && order.orderType === "pickup"
      }
      return true
    })
    
    // Agrupar dados com base no tipo de relatório
    let groupedData: {[key: string]: any} = {}
    
    if (type === "daily") {
      // Agrupar por dia
      filteredOrders.forEach(order => {
        const date = format(new Date(order.timestamp), 'dd/MM/yyyy')
        
        if (!groupedData[date]) {
          groupedData[date] = {
            date,
            orders: 0,
            revenue: 0,
            delivery: 0,
            pickup: 0,
            qrcode: 0,
            completed: 0,
            rejected: 0,
            pending: 0
          }
        }
        
        groupedData[date].orders++
        groupedData[date].revenue += order.totalAmount || 0
        
        if (order.orderSource === "delivery") {
          if (order.orderType === "delivery") {
            groupedData[date].delivery++
          } else if (order.orderType === "pickup") {
            groupedData[date].pickup++
          }
        } else {
          groupedData[date].qrcode++
        }
        
        if (order.status === "completed") {
          groupedData[date].completed++
        } else if (order.status === "rejected") {
          groupedData[date].rejected++
        } else if (order.status === "pending") {
          groupedData[date].pending++
        }
      })
    } else if (type === "weekly") {
      // Agrupar por semana
      filteredOrders.forEach(order => {
        const orderDate = new Date(order.timestamp)
        const weekStart = format(startOfWeek(orderDate, { locale: ptBR }), 'dd/MM')
        const weekEnd = format(endOfWeek(orderDate, { locale: ptBR }), 'dd/MM')
        const weekKey = `${weekStart} - ${weekEnd}`
        
        if (!groupedData[weekKey]) {
          groupedData[weekKey] = {
            date: weekKey,
            orders: 0,
            revenue: 0,
            delivery: 0,
            pickup: 0,
            qrcode: 0,
            completed: 0,
            rejected: 0,
            pending: 0
          }
        }
        
        groupedData[weekKey].orders++
        groupedData[weekKey].revenue += order.totalAmount || 0
        
        if (order.orderSource === "delivery") {
          if (order.orderType === "delivery") {
            groupedData[weekKey].delivery++
          } else if (order.orderType === "pickup") {
            groupedData[weekKey].pickup++
          }
        } else {
          groupedData[weekKey].qrcode++
        }
        
        if (order.status === "completed") {
          groupedData[weekKey].completed++
        } else if (order.status === "rejected") {
          groupedData[weekKey].rejected++
        } else if (order.status === "pending") {
          groupedData[weekKey].pending++
        }
      })
    } else if (type === "monthly") {
      // Agrupar por mês
      filteredOrders.forEach(order => {
        const month = format(new Date(order.timestamp), 'MM/yyyy')
        
        if (!groupedData[month]) {
          groupedData[month] = {
            date: month,
            orders: 0,
            revenue: 0,
            delivery: 0,
            pickup: 0,
            qrcode: 0,
            completed: 0,
            rejected: 0,
            pending: 0
          }
        }
        
        groupedData[month].orders++
        groupedData[month].revenue += order.totalAmount || 0
        
        if (order.orderSource === "delivery") {
          if (order.orderType === "delivery") {
            groupedData[month].delivery++
          } else if (order.orderType === "pickup") {
            groupedData[month].pickup++
          }
        } else {
          groupedData[month].qrcode++
        }
        
        if (order.status === "completed") {
          groupedData[month].completed++
        } else if (order.status === "rejected") {
          groupedData[month].rejected++
        } else if (order.status === "pending") {
          groupedData[month].pending++
        }
      })
    }
    
    // Converter para array e ordenar por data
    const dataArray = Object.values(groupedData)
    
    // Ordenar por data (mais antigas primeiro)
    if (type === "daily") {
      dataArray.sort((a, b) => {
        const [dayA, monthA, yearA] = a.date.split('/').map(Number)
        const [dayB, monthB, yearB] = b.date.split('/').map(Number)
        return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime()
      })
    } else if (type === "monthly") {
      dataArray.sort((a, b) => {
        const [monthA, yearA] = a.date.split('/').map(Number)
        const [monthB, yearB] = b.date.split('/').map(Number)
        return new Date(yearA, monthA - 1).getTime() - new Date(yearB, monthB - 1).getTime()
      })
    }
    
    setReportData(dataArray)
  }

  // Formatar valor monetário
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  // Calcular estatísticas gerais
  const calculateStats = () => {
    if (!reportData.length) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        deliveryCount: 0,
        pickupCount: 0,
        qrcodeCount: 0,
        completedCount: 0,
        rejectedCount: 0,
        pendingCount: 0
      }
    }
    
    const totalOrders = reportData.reduce((sum, day) => sum + day.orders, 0)
    const totalRevenue = reportData.reduce((sum, day) => sum + day.revenue, 0)
    const deliveryCount = reportData.reduce((sum, day) => sum + day.delivery, 0)
    const pickupCount = reportData.reduce((sum, day) => sum + day.pickup, 0)
    const qrcodeCount = reportData.reduce((sum, day) => sum + day.qrcode, 0)
    const completedCount = reportData.reduce((sum, day) => sum + day.completed, 0)
    const rejectedCount = reportData.reduce((sum, day) => sum + day.rejected, 0)
    const pendingCount = reportData.reduce((sum, day) => sum + day.pending, 0)
    
    return {
      totalOrders,
      totalRevenue,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      deliveryCount,
      pickupCount,
      qrcodeCount,
      completedCount,
      rejectedCount,
      pendingCount
    }
  }
  
  const stats = calculateStats()
  
  // Dados para o gráfico de pizza de tipos de pedido
  const orderTypeData = [
    { name: 'Delivery', value: stats.deliveryCount, color: '#f97316' },
    { name: 'Retirada', value: stats.pickupCount, color: '#3b82f6' },
    { name: 'QR Code', value: stats.qrcodeCount, color: '#8b5cf6' }
  ].filter(item => item.value > 0)
  
  // Dados para o gráfico de pizza de status
  const orderStatusData = [
    { name: 'Concluídos', value: stats.completedCount, color: '#10b981' },
    { name: 'Rejeitados', value: stats.rejectedCount, color: '#ef4444' },
    { name: 'Pendentes', value: stats.pendingCount, color: '#f59e0b' }
  ].filter(item => item.value > 0)

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Relatórios</h1>
          <p className="text-gray-600">Análise detalhada de pedidos e receita.</p>
        </div>
      </div>
      
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              locale={ptBR}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Relatório</label>
            <div className="flex space-x-2">
              <Button
                variant={reportType === "daily" ? "default" : "outline"}
                size="sm"
                onClick={() => setReportType("daily")}
                className="flex items-center"
              >
                <Calendar className="h-4 w-4 mr-1" />
                Diário
              </Button>
              <Button
                variant={reportType === "weekly" ? "default" : "outline"}
                size="sm"
                onClick={() => setReportType("weekly")}
                className="flex items-center"
              >
                <CalendarDays className="h-4 w-4 mr-1" />
                Semanal
              </Button>
              <Button
                variant={reportType === "monthly" ? "default" : "outline"}
                size="sm"
                onClick={() => setReportType("monthly")}
                className="flex items-center"
              >
                <CalendarRange className="h-4 w-4 mr-1" />
                Mensal
              </Button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Pedido</label>
            <div className="flex space-x-2">
              <Button
                variant={orderTypeFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setOrderTypeFilter("all")}
              >
                Todos
              </Button>
              <Button
                variant={orderTypeFilter === "delivery" ? "default" : "outline"}
                size="sm"
                onClick={() => setOrderTypeFilter("delivery")}
                className="flex items-center"
              >
                <Truck className="h-4 w-4 mr-1" />
                Delivery
              </Button>
              <Button
                variant={orderTypeFilter === "pickup" ? "default" : "outline"}
                size="sm"
                onClick={() => setOrderTypeFilter("pickup")}
                className="flex items-center"
              >
                <Home className="h-4 w-4 mr-1" />
                Retirada
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">Carregando dados...</p>
        </div>
      ) : (
        <>
          {/* Estatísticas Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500">Total de Pedidos</div>
              <div className="text-2xl font-bold mt-1">{stats.totalOrders}</div>
              <div className="mt-2 text-xs text-gray-500">
                No período selecionado
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500">Receita Total</div>
              <div className="text-2xl font-bold mt-1">{formatCurrency(stats.totalRevenue)}</div>
              <div className="mt-2 text-xs text-gray-500">
                Ticket médio: {formatCurrency(stats.averageOrderValue)}
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500">Pedidos por Tipo</div>
              <div className="text-2xl font-bold mt-1">{stats.deliveryCount + stats.pickupCount + stats.qrcodeCount}</div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>Delivery: {stats.deliveryCount}</span>
                <span>Retirada: {stats.pickupCount}</span>
                <span>QR Code: {stats.qrcodeCount}</span>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500">Status dos Pedidos</div>
              <div className="text-2xl font-bold mt-1">{stats.completedCount + stats.rejectedCount + stats.pendingCount}</div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span className="text-green-600">Concluídos: {stats.completedCount}</span>
                <span className="text-red-600">Rejeitados: {stats.rejectedCount}</span>
                <span className="text-yellow-600">Pendentes: {stats.pendingCount}</span>
              </div>
            </Card>
          </div>
          
          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Gráfico de Receita */}
            <Card className="p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Receita por Período</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={reportData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" name="Receita" fill="#f97316" stroke="#f97316" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
            {/* Gráfico de Pedidos */}
            <Card className="p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Pedidos por Período</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={reportData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="orders" name="Total de Pedidos" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
            {/* Gráfico de Tipos de Pedido */}
            <Card className="p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Tipos de Pedido</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={orderTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {orderTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Quantidade']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
            {/* Gráfico de Status dos Pedidos */}
            <Card className="p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Status dos Pedidos</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {orderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Quantidade']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
          
          {/* Tabela de Dados */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Dados Detalhados</h3>
            </div>
            
            {reportData.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">Nenhum dado encontrado para o período selecionado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Período
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pedidos
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Receita
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Delivery
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Retirada
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        QR Code
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Concluídos
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rejeitados
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pendentes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {item.date}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 text-center">
                          {item.orders}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {formatCurrency(item.revenue)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 text-center">
                          {item.delivery}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 text-center">
                          {item.pickup}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 text-center">
                          {item.qrcode}
                        </td>
                        <td className="px-4 py-3 text-sm text-green-600 text-center">
                          {item.completed}
                        </td>
                        <td className="px-4 py-3 text-sm text-red-600 text-center">
                          {item.rejected}
                        </td>
                        <td className="px-4 py-3 text-sm text-yellow-600 text-center">
                          {item.pending}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

