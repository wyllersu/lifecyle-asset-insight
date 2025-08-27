import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Wrench, 
  Clock, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Calendar as CalendarIcon,
  TrendingUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MaintenanceStats {
  pendingCount: number;
  inProgressCount: number;
  completedThisMonth: number;
  totalCostThisMonth: number;
  overdue: number;
}

interface MaintenanceItem {
  id: string;
  asset_id: string;
  description: string;
  scheduled_date: string;
  status: string;
  cost: number;
  assets: {
    name: string;
    code: string;
  };
}

interface ChartData {
  month: string;
  preventiva: number;
  corretiva: number;
  emergencial: number;
}

const MaintenanceDashboard: React.FC = () => {
  const [stats, setStats] = useState<MaintenanceStats>({
    pendingCount: 0,
    inProgressCount: 0,
    completedThisMonth: 0,
    totalCostThisMonth: 0,
    overdue: 0,
  });
  const [recentMaintenances, setRecentMaintenances] = useState<MaintenanceItem[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaintenanceStats();
    fetchRecentMaintenances();
    fetchChartData();
  }, []);

  const fetchMaintenanceStats = async () => {
    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Get pending maintenances
      const { data: pending } = await supabase
        .from('asset_maintenance')
        .select('*')
        .eq('status', 'agendada');

      // Get in progress maintenances
      const { data: inProgress } = await supabase
        .from('asset_maintenance')
        .select('*')
        .eq('status', 'em_andamento');

      // Get completed this month
      const { data: completed } = await supabase
        .from('asset_maintenance')
        .select('cost')
        .eq('status', 'concluída')
        .gte('completed_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('completed_date', format(monthEnd, 'yyyy-MM-dd'));

      // Get overdue maintenances
      const { data: overdue } = await supabase
        .from('asset_maintenance')
        .select('*')
        .eq('status', 'agendada')
        .lt('scheduled_date', format(now, 'yyyy-MM-dd'));

      const totalCost = completed?.reduce((sum, item) => sum + (item.cost || 0), 0) || 0;

      setStats({
        pendingCount: pending?.length || 0,
        inProgressCount: inProgress?.length || 0,
        completedThisMonth: completed?.length || 0,
        totalCostThisMonth: totalCost,
        overdue: overdue?.length || 0,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  const fetchRecentMaintenances = async () => {
    try {
      const { data, error } = await supabase
        .from('asset_maintenance')
        .select(`
          *,
          assets (
            name,
            code
          )
        `)
        .order('scheduled_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      setRecentMaintenances(data || []);
    } catch (error) {
      console.error('Erro ao buscar manutenções recentes:', error);
    }
  };

  const fetchChartData = async () => {
    try {
      const { data, error } = await supabase
        .from('asset_maintenance')
        .select('maintenance_type, scheduled_date')
        .gte('scheduled_date', format(new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));

      if (error) throw error;

      // Process data for chart
      const monthlyData: Record<string, { preventiva: number; corretiva: number; emergencial: number }> = {};

      data?.forEach(item => {
        const month = format(new Date(item.scheduled_date), 'MMM', { locale: ptBR });
        if (!monthlyData[month]) {
          monthlyData[month] = { preventiva: 0, corretiva: 0, emergencial: 0 };
        }
        monthlyData[month][item.maintenance_type as keyof typeof monthlyData[string]]++;
      });

      const chartArray = Object.entries(monthlyData).map(([month, counts]) => ({
        month,
        ...counts,
      }));

      setChartData(chartArray);
    } catch (error) {
      console.error('Erro ao buscar dados do gráfico:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendada':
        return 'bg-blue-100 text-blue-800';
      case 'em_andamento':
        return 'bg-yellow-100 text-yellow-800';
      case 'concluída':
        return 'bg-green-100 text-green-800';
      case 'cancelada':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'agendada': 'Agendada',
      'em_andamento': 'Em Andamento',
      'concluída': 'Concluída',
      'cancelada': 'Cancelada',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{stats.pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Wrench className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Em Andamento</p>
                <p className="text-2xl font-bold">{stats.inProgressCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Concluídas (mês)</p>
                <p className="text-2xl font-bold">{stats.completedThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Custo (mês)</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalCostThisMonth)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Atrasadas</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Manutenções por Tipo (Últimos 6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="preventiva" fill="#10b981" name="Preventiva" />
                <Bar dataKey="corretiva" fill="#f59e0b" name="Corretiva" />
                <Bar dataKey="emergencial" fill="#ef4444" name="Emergencial" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Calendar and Recent Maintenances */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Calendário
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ptBR}
                className="rounded-md border"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Maintenances */}
      <Card>
        <CardHeader>
          <CardTitle>Próximas Manutenções</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentMaintenances.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhuma manutenção agendada
              </p>
            ) : (
              recentMaintenances.map((maintenance) => (
                <div key={maintenance.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{maintenance.assets.name}</h4>
                      <Badge variant="outline">{maintenance.assets.code}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{maintenance.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(maintenance.scheduled_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(maintenance.status)}>
                      {getStatusLabel(maintenance.status)}
                    </Badge>
                    {maintenance.cost > 0 && (
                      <span className="text-sm font-medium">
                        {formatCurrency(maintenance.cost)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" onClick={fetchRecentMaintenances}>
              Atualizar Lista
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MaintenanceDashboard;