import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  description: string;
}

interface AssetFormData {
  name: string;
  code: string;
  serial_number: string;
  description: string;
  category_id: string;
  purchase_value: string;
  purchase_date: Date | undefined;
  residual_value: string;
  useful_life_years: string;
  location_type: 'manual' | 'rfid' | 'gps';
  current_location: string;
  latitude: string;
  longitude: string;
  status: 'active' | 'maintenance' | 'inactive' | 'disposed';
}

interface AssetFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const AssetForm: React.FC<AssetFormProps> = ({ onSuccess, onCancel }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [formData, setFormData] = useState<AssetFormData>({
    name: '',
    code: '',
    serial_number: '',
    description: '',
    category_id: '',
    purchase_value: '',
    purchase_date: undefined,
    residual_value: '0',
    useful_life_years: '5',
    location_type: 'manual',
    current_location: '',
    latitude: '',
    longitude: '',
    status: 'active',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Erro ao carregar categorias",
        description: "Não foi possível carregar as categorias",
        variant: "destructive",
      });
    }
  };

  const generateCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    setFormData(prev => ({ ...prev, code: `AST${timestamp}${random}` }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const assetData = {
        name: formData.name,
        code: formData.code,
        serial_number: formData.serial_number || null,
        description: formData.description || null,
        category_id: formData.category_id || null,
        purchase_value: parseFloat(formData.purchase_value),
        purchase_date: formData.purchase_date?.toISOString().split('T')[0],
        residual_value: parseFloat(formData.residual_value),
        useful_life_years: parseInt(formData.useful_life_years),
        location_type: formData.location_type,
        current_location: formData.current_location || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        status: formData.status,
        created_by: user.id,
      };

      const { error } = await supabase
        .from('assets')
        .insert([assetData]);

      if (error) throw error;

      toast({
        title: "Ativo cadastrado com sucesso!",
        description: `O ativo "${formData.name}" foi criado`,
      });

      // Reset form
      setFormData({
        name: '',
        code: '',
        serial_number: '',
        description: '',
        category_id: '',
        purchase_value: '',
        purchase_date: undefined,
        residual_value: '0',
        useful_life_years: '5',
        location_type: 'manual',
        current_location: '',
        latitude: '',
        longitude: '',
        status: 'active',
      });

      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating asset:', error);
      toast({
        title: "Erro ao cadastrar ativo",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center justify-between">
          Cadastrar Novo Ativo
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Preencha os dados do ativo para cadastrá-lo no sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identificação */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
              Identificação
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Item *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Notebook Dell Inspiron"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Código (SKU) *</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="Ex: AST001"
                    required
                  />
                  <Button type="button" variant="outline" onClick={generateCode}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serial_number">Número de Série</Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                  placeholder="Ex: SN123456789"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select 
                  value={formData.category_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição detalhada do item..."
                rows={3}
              />
            </div>
          </div>

          {/* Financeiro */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
              Informações Financeiras
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchase_value">Valor de Compra (R$) *</Label>
                <Input
                  id="purchase_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.purchase_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, purchase_value: e.target.value }))}
                  placeholder="0,00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Compra *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.purchase_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.purchase_date ? (
                        format(formData.purchase_date, "PPP", { locale: ptBR })
                      ) : (
                        <span>Selecione uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.purchase_date}
                      onSelect={(date) => setFormData(prev => ({ ...prev, purchase_date: date }))}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="residual_value">Valor Residual (R$)</Label>
                <Input
                  id="residual_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.residual_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, residual_value: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="useful_life_years">Vida Útil (anos)</Label>
                <Input
                  id="useful_life_years"
                  type="number"
                  min="1"
                  value={formData.useful_life_years}
                  onChange={(e) => setFormData(prev => ({ ...prev, useful_life_years: e.target.value }))}
                  placeholder="5"
                />
              </div>
            </div>
          </div>

          {/* Localização */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
              Localização
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Rastreamento</Label>
                <Select 
                  value={formData.location_type} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, location_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="rfid">RFID</SelectItem>
                    <SelectItem value="gps">GPS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="maintenance">Manutenção</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="disposed">Descartado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_location">Localização Atual</Label>
              <Input
                id="current_location"
                value={formData.current_location}
                onChange={(e) => setFormData(prev => ({ ...prev, current_location: e.target.value }))}
                placeholder="Ex: Sala 101, 2º andar"
              />
            </div>
            {formData.location_type === 'gps' && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                    placeholder="-23.5505"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                    placeholder="-46.6333"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-6">
            <Button 
              type="submit" 
              className="flex-1 bg-gradient-primary hover:bg-gradient-primary/90"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cadastrar Ativo
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AssetForm;