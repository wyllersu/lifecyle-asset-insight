import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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
  TrendingUp,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import MaintenanceForm from '@/components/MaintenanceForm';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  maintenance_type: string;
  labor_hours: number;
  completed_date?: string;
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

const EnhancedMaintenanceDashboard: React.FC = () => {
  const { toast } = useToast();
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
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterAsset, setFilterAsset] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [assets, setAssets] = useState<Array<{id: string, name: string, code: string}>>([]);
  const [units, setUnits] = useState<Array<{id: string, name: string}>>([]);
  const [maintenanceDates, setMaintenanceDates] = useState<Date[]>([]);

  useEffect(() => {
    fetchData();
    fetchAssets();
    fetchUnits();
  }, []);

  useEffect(() => {
    if (filterAsset || filterUnit) {
      fetchFilteredMaintenances();
    } else {
      fetchRecentMaintenances();
    }
  }, [filterAsset, filterUnit]);

  const fetchData = async () => {
    await Promise.all([
      fetchMaintenanceStats(),
      fetchRecentMaintenances(),
      fetchChartData(),
      fetchMaintenanceDates()
    ]);
  };

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('id, name, code')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Erro ao buscar ativos:', error);
    }
  };

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Erro ao buscar unidades:', error);
    }
  };

  const fetchMaintenanceDates = async () => {
    try {
      const { data, error } = await supabase
        .from('asset_maintenance')
        .select('scheduled_date')
        .in('status', ['agendada', 'em_andamento']);
      
      if (error) throw error;
      
      const dates = data?.map(item => new Date(item.scheduled_date)) || [];
      setMaintenanceDates(dates);
    } catch (error) {
      console.error('Erro ao buscar datas de manutenção:', error);
    }
  };

  const fetchFilteredMaintenances = async () => {
    try {
      let query = supabase
        .from('asset_maintenance')
        .select(`
          *,
          assets (
            name,
            code,
            unit_id
          )
        `)
        .order('scheduled_date', { ascending: true });

      if (filterAsset) {
        query = query.eq('asset_id', filterAsset);
      }

      if (filterUnit) {
        query = query.eq('assets.unit_id', filterUnit);
      }

      const { data, error } = await query.limit(10);

      if (error) throw error;
      setRecentMaintenances(data || []);
    } catch (error) {
      console.error('Erro ao buscar manutenções filtradas:', error);
    }
  };

  const fetchMaintenanceStats = async () => {
    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const [pendingRes, inProgressRes, completedRes, overdueRes] = await Promise.all([
        supabase.from('asset_maintenance').select('*').eq('status', 'agendada'),
        supabase.from('asset_maintenance').select('*').eq('status', 'em_andamento'),
        supabase.from('asset_maintenance').select('cost').eq('status', 'concluída')
          .gte('completed_date', format(monthStart, 'yyyy-MM-dd'))
          .lte('completed_date', format(monthEnd, 'yyyy-MM-dd')),
        supabase.from('asset_maintenance').select('*').eq('status', 'agendada')
          .lt('scheduled_date', format(now, 'yyyy-MM-dd'))
      ]);

      const totalCost = completedRes.data?.reduce((sum, item) => sum + (item.cost || 0), 0) || 0;

      setStats({
        pendingCount: pendingRes.data?.length || 0,
        inProgressCount: inProgressRes.data?.length || 0,
        completedThisMonth: completedRes.data?.length || 0,
        totalCostThisMonth: totalCost,
        overdue: overdueRes.data?.length || 0,
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
        .limit(10);

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

  const handleStatusChange = async (maintenanceId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'concluída') {
        updateData.completed_date = format(new Date(), 'yyyy-MM-dd');
      }

      const { error } = await supabase
        .from('asset_maintenance')
        .update(updateData)
        .eq('id', maintenanceId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Status da manutenção atualizado com sucesso!",
      });

      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status da manutenção",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMaintenance = async (maintenanceId: string) => {
    try {
      const { error } = await supabase
        .from('asset_maintenance')
        .delete()
        .eq('id', maintenanceId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Manutenção excluída com sucesso!",
      });

      fetchData();
    } catch (error) {
      console.error('Erro ao excluir manutenção:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir manutenção",
        variant: "destructive",
      });
    }
  };

  const handleEditMaintenance = async (maintenance: MaintenanceItem, formData: any) => {
    try {
      const { error } = await supabase
        .from('asset_maintenance')
        .update({
          description: formData.description,
          cost: parseFloat(formData.cost) || 0,
          labor_hours: parseFloat(formData.labor_hours) || 0,
          maintenance_type: formData.maintenance_type,
          scheduled_date: format(new Date(formData.scheduled_date), 'yyyy-MM-dd'),
        })
        .eq('id', maintenance.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Manutenção editada com sucesso!",
      });

      setEditingMaintenance(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao editar manutenção:', error);
      toast({
        title: "Erro",
        description: "Erro ao editar manutenção",
        variant: "destructive",
      });
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

      {/* Chart and Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Calendário de Manutenções
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={ptBR}
              className="rounded-md border"
              modifiers={{
                maintenance: maintenanceDates,
              }}
              modifiersStyles={{
                maintenance: { backgroundColor: 'hsl(var(--primary))', color: 'white', fontWeight: 'bold' },
              }}
            />
            <div className="mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-primary"></div>
                <span>Dias com manutenções agendadas</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Lista de Manutenções */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Manutenções</CardTitle>
          <div className="flex items-center gap-4">
            {/* Filtros */}
            <div className="flex items-center gap-2">
              <Select value={filterAsset} onValueChange={setFilterAsset}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por ativo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os ativos</SelectItem>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.code} - {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterUnit} onValueChange={setFilterUnit}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as unidades</SelectItem>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Manutenção
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Nova Manutenção</DialogTitle>
                </DialogHeader>
                <MaintenanceForm 
                  onSuccess={() => {
                    setShowAddForm(false);
                    fetchData();
                  }}
                  onCancel={() => setShowAddForm(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentMaintenances.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhuma manutenção encontrada
              </p>
            ) : (
              recentMaintenances.map((maintenance) => (
                <div key={maintenance.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{maintenance.assets.name}</h4>
                      <Badge variant="outline">{maintenance.assets.code}</Badge>
                      <Badge variant="secondary">{maintenance.maintenance_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{maintenance.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Agendado: {format(new Date(maintenance.scheduled_date), 'dd/MM/yyyy', { locale: ptBR })}
                      {maintenance.completed_date && (
                        <span className="ml-2">
                          | Concluído: {format(new Date(maintenance.completed_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      )}
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
                    
                    {maintenance.status === 'agendada' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(maintenance.id, 'em_andamento')}
                      >
                        Iniciar
                      </Button>
                    )}
                    
                    {maintenance.status === 'em_andamento' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(maintenance.id, 'concluída')}
                      >
                        Concluir
                      </Button>
                    )}
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Editar Manutenção</DialogTitle>
                        </DialogHeader>
                        <EditMaintenanceForm 
                          maintenance={maintenance} 
                          onSave={handleEditMaintenance}
                        />
                      </DialogContent>
                    </Dialog>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Manutenção</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir esta manutenção? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteMaintenance(maintenance.id)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Edit Maintenance Form Component
interface EditMaintenanceFormProps {
  maintenance: MaintenanceItem;
  onSave: (maintenance: MaintenanceItem, formData: any) => void;
}

const EditMaintenanceForm: React.FC<EditMaintenanceFormProps> = ({ maintenance, onSave }) => {
  const [formData, setFormData] = useState({
    description: maintenance.description,
    cost: maintenance.cost.toString(),
    labor_hours: maintenance.labor_hours.toString(),
    maintenance_type: maintenance.maintenance_type,
    scheduled_date: maintenance.scheduled_date,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(maintenance, formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="maintenance_type">Tipo de Manutenção</Label>
          <Select 
            value={formData.maintenance_type} 
            onValueChange={(value) => setFormData({...formData, maintenance_type: value})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="preventiva">Preventiva</SelectItem>
              <SelectItem value="corretiva">Corretiva</SelectItem>
              <SelectItem value="emergencial">Emergencial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="scheduled_date">Data Agendada</Label>
          <Input
            type="date"
            value={formData.scheduled_date}
            onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          rows={3}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cost">Custo (R$)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.cost}
            onChange={(e) => setFormData({...formData, cost: e.target.value})}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="labor_hours">Horas de Trabalho</Label>
          <Input
            type="number"
            step="0.5"
            value={formData.labor_hours}
            onChange={(e) => setFormData({...formData, labor_hours: e.target.value})}
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit">Salvar Alterações</Button>
      </div>
    </form>
  );
};

export default EnhancedMaintenanceDashboard;