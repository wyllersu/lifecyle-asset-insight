import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  code: string;
  description: string | null;
  serial_number: string | null;
  category_id: string | null;
  department_id: string | null;
  unit_id: string | null;
  purchase_value: number;
  residual_value: number | null;
  useful_life_years: number;
  purchase_date: string;
  current_location: string | null;
  status: string | null;
  assigned_to: string | null;
  rfid_id: string | null;
  latitude: number | null;
  longitude: number | null;
  location_type: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  name: string;
  department_id: string;
  departments?: { name: string };
}

interface Profile {
  user_id: string;
  full_name: string | null;
}

interface EditAssetModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Asset | null;
  onAssetUpdated: () => void;
}

const EditAssetModal = ({ isOpen, onOpenChange, asset, onAssetUpdated }: EditAssetModalProps) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    serial_number: '',
    category_id: '',
    department_id: '',
    unit_id: '',
    purchase_value: '',
    residual_value: '',
    useful_life_years: '',
    purchase_date: '',
    current_location: '',
    status: '',
    assigned_to: '',
    rfid_id: '',
    latitude: '',
    longitude: '',
    location_type: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (asset && isOpen) {
      setFormData({
        name: asset.name || '',
        code: asset.code || '',
        description: asset.description || '',
        serial_number: asset.serial_number || '',
        category_id: asset.category_id || 'unassigned',
        department_id: asset.department_id || 'unassigned',
        unit_id: asset.unit_id || 'unassigned',
        purchase_value: asset.purchase_value?.toString() || '',
        residual_value: asset.residual_value?.toString() || '',
        useful_life_years: asset.useful_life_years?.toString() || '',
        purchase_date: asset.purchase_date || '',
        current_location: asset.current_location || '',
        status: asset.status || 'active',
        assigned_to: asset.assigned_to || 'unassigned',
        rfid_id: asset.rfid_id || '',
        latitude: asset.latitude?.toString() || '',
        longitude: asset.longitude?.toString() || '',
        location_type: asset.location_type || 'manual'
      });
    }
  }, [asset, isOpen]);

  const fetchData = async () => {
    try {
      const [categoriesResult, departmentsResult, unitsResult, profilesResult] = await Promise.all([
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('departments').select('id, name').order('name'),
        supabase.from('units').select('id, name, department_id, departments(name)').order('name'),
        supabase.from('profiles').select('user_id, full_name').order('full_name')
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (departmentsResult.error) throw departmentsResult.error;
      if (unitsResult.error) throw unitsResult.error;
      if (profilesResult.error) throw profilesResult.error;

      setCategories(categoriesResult.data || []);
      setDepartments(departmentsResult.data || []);
      setUnits(unitsResult.data || []);
      setProfiles(profilesResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do formulário.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset) return;

    if (!formData.name || !formData.code || !formData.purchase_value || !formData.purchase_date) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const updatedAsset = {
        name: formData.name,
        code: formData.code,
        description: formData.description || null,
        serial_number: formData.serial_number || null,
        category_id: formData.category_id === 'unassigned' ? null : formData.category_id || null,
        department_id: formData.department_id === 'unassigned' ? null : formData.department_id || null,
        unit_id: formData.unit_id === 'unassigned' ? null : formData.unit_id || null,
        purchase_value: parseFloat(formData.purchase_value),
        residual_value: formData.residual_value ? parseFloat(formData.residual_value) : null,
        useful_life_years: parseInt(formData.useful_life_years) || 5,
        purchase_date: formData.purchase_date,
        current_location: formData.current_location || null,
        status: formData.status,
        assigned_to: formData.assigned_to === 'unassigned' ? null : formData.assigned_to || null,
        rfid_id: formData.rfid_id || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        location_type: formData.location_type,
      };

      const { error } = await supabase
        .from('assets')
        .update(updatedAsset)
        .eq('id', asset.id);

      if (error) throw error;

      // Create audit log
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.from('asset_audit_log').insert({
          asset_id: asset.id,
          action: 'updated',
          user_id: userData.user.id,
          new_data: updatedAsset,
          old_data: {
            name: asset.name,
            code: asset.code,
            description: asset.description,
            serial_number: asset.serial_number,
            category_id: asset.category_id,
            department_id: asset.department_id,
            unit_id: asset.unit_id,
            purchase_value: asset.purchase_value,
            residual_value: asset.residual_value,
            useful_life_years: asset.useful_life_years,
            purchase_date: asset.purchase_date,
            current_location: asset.current_location,
            status: asset.status,
            assigned_to: asset.assigned_to,
            rfid_id: asset.rfid_id,
            latitude: asset.latitude,
            longitude: asset.longitude,
            location_type: asset.location_type
          }
        });
      }

      toast({
        title: "Sucesso",
        description: "Ativo atualizado com sucesso.",
      });

      onAssetUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating asset:', error);
      toast({
        title: "Erro",
        description: error.code === '23505' ? "Já existe um ativo com este código." : "Erro ao atualizar ativo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUnits = units.filter(unit => 
    formData.department_id === 'unassigned' ? true : unit.department_id === formData.department_id
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Ativo</DialogTitle>
          <DialogDescription>
            Modifique as informações do ativo {asset?.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Básicas</CardTitle>
                <CardDescription>Dados fundamentais do ativo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do ativo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Código *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="Código único do ativo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição detalhada do ativo"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serial_number">Número de Série</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                    placeholder="Número de série do ativo"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Categorização */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Categorização</CardTitle>
                <CardDescription>Classificação e organização</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category_id">Categoria</Label>
                  <Select value={formData.category_id} onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Sem categoria</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department_id">Departamento</Label>
                  <Select 
                    value={formData.department_id} 
                    onValueChange={(value) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        department_id: value,
                        unit_id: 'unassigned' // Reset unit when department changes
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Sem departamento</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_id">Unidade</Label>
                  <Select value={formData.unit_id} onValueChange={(value) => setFormData(prev => ({ ...prev, unit_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Sem unidade</SelectItem>
                      {filteredUnits.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name} ({unit.departments?.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Responsável</Label>
                  <Select value={formData.assigned_to} onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Sem responsável</SelectItem>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.user_id} value={profile.user_id}>
                          {profile.full_name || profile.user_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Informações Financeiras */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Financeiras</CardTitle>
                <CardDescription>Valores e depreciação</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="purchase_value">Valor de Compra *</Label>
                  <Input
                    id="purchase_value"
                    type="number"
                    step="0.01"
                    value={formData.purchase_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchase_value: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="residual_value">Valor Residual</Label>
                  <Input
                    id="residual_value"
                    type="number"
                    step="0.01"
                    value={formData.residual_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, residual_value: e.target.value }))}
                    placeholder="0.00"
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
                <div className="space-y-2">
                  <Label htmlFor="purchase_date">Data de Compra *</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Localização e Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Localização e Status</CardTitle>
                <CardDescription>Posição e estado atual</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="maintenance">Em Manutenção</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="disposed">Descartado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current_location">Localização Atual</Label>
                  <Input
                    id="current_location"
                    value={formData.current_location}
                    onChange={(e) => setFormData(prev => ({ ...prev, current_location: e.target.value }))}
                    placeholder="Ex: Sala 101, Prédio A"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rfid_id">ID RFID</Label>
                  <Input
                    id="rfid_id"
                    value={formData.rfid_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, rfid_id: e.target.value }))}
                    placeholder="Identificador RFID"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end space-x-2 pt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAssetModal;