import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Wrench, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Asset {
  id: string;
  name: string;
  code: string;
}

interface MaintenanceFormProps {
  assetId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface MaintenanceFormData {
  asset_id: string;
  maintenance_type: 'preventiva' | 'corretiva' | 'emergencial' | '';
  description: string;
  cost: string;
  scheduled_date: Date | undefined;
  labor_hours: string;
  company_id: string;
  unit_id: string;
}

const MaintenanceForm: React.FC<MaintenanceFormProps> = ({ assetId, onSuccess, onCancel }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [formData, setFormData] = useState<MaintenanceFormData>({
    asset_id: assetId || '',
    maintenance_type: '',
    description: '',
    cost: '',
    scheduled_date: undefined,
    labor_hours: '',
    company_id: '',
    unit_id: '',
  });

  useEffect(() => {
    fetchAssets();
  }, []);

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
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de ativos",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.asset_id || !formData.maintenance_type || !formData.description || !formData.scheduled_date) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('asset_maintenance')
        .insert({
          asset_id: formData.asset_id,
          maintenance_type: formData.maintenance_type,
          description: formData.description,
          cost: formData.cost ? parseFloat(formData.cost) : 0,
          scheduled_date: format(formData.scheduled_date, 'yyyy-MM-dd'),
          labor_hours: formData.labor_hours ? parseFloat(formData.labor_hours) : 0,
          performed_by: user.id,
          status: 'agendada',
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Manutenção agendada com sucesso!",
      });

      // Reset form
      setFormData({
        asset_id: assetId || '',
        maintenance_type: '',
        description: '',
        cost: '',
        scheduled_date: undefined,
        labor_hours: '',
      });

      onSuccess?.();
    } catch (error) {
      console.error('Erro ao agendar manutenção:', error);
      toast({
        title: "Erro",
        description: "Erro ao agendar manutenção",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Agendar Manutenção
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset_id">Ativo *</Label>
              <Select 
                value={formData.asset_id} 
                onValueChange={(value) => setFormData({...formData, asset_id: value})}
                disabled={!!assetId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um ativo" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.code} - {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance_type">Tipo de Manutenção *</Label>
              <Select 
                value={formData.maintenance_type} 
                onValueChange={(value: 'preventiva' | 'corretiva' | 'emergencial') => 
                  setFormData({...formData, maintenance_type: value})
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventiva">Preventiva</SelectItem>
                  <SelectItem value="corretiva">Corretiva</SelectItem>
                  <SelectItem value="emergencial">Emergencial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              placeholder="Descreva a manutenção a ser realizada..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_date">Data Agendada *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.scheduled_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.scheduled_date ? (
                      format(formData.scheduled_date, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span>Selecione a data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.scheduled_date}
                    onSelect={(date) => setFormData({...formData, scheduled_date: date})}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Custo Estimado (R$)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.cost}
                onChange={(e) => setFormData({...formData, cost: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="labor_hours">Horas de Trabalho</Label>
              <Input
                id="labor_hours"
                type="number"
                step="0.5"
                placeholder="0"
                value={formData.labor_hours}
                onChange={(e) => setFormData({...formData, labor_hours: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Agendar Manutenção
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default MaintenanceForm;