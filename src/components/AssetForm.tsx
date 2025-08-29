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
import { CalendarIcon, Loader2, Plus, X, Camera, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  description: string;
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

interface AssetFormData {
  name: string;
  code: string;
  serial_number: string;
  description: string;
  category_id: string;
  department_id: string;
  unit_id: string;
  purchase_value: string;
  purchase_date: Date | undefined;
  residual_value: string;
  useful_life_years: string;
  location_type: 'manual' | 'rfid' | 'gps';
  current_location: string;
  latitude: string;
  longitude: string;
  status: 'active' | 'maintenance' | 'inactive' | 'disposed';
  rfid_id: string;
  assigned_to: string;
  photo: File | null;
  document: File | null;
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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  
  const [formData, setFormData] = useState<AssetFormData>({
    name: '',
    code: '',
    serial_number: '',
    description: '',
    category_id: '',
    department_id: '',
    unit_id: '',
    purchase_value: '',
    purchase_date: undefined,
    residual_value: '0',
    useful_life_years: '5',
    location_type: 'manual',
    current_location: '',
    latitude: '',
    longitude: '',
    status: 'active',
    rfid_id: '',
    assigned_to: '',
    photo: null,
    document: null,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesResult, departmentsResult, unitsResult, profilesResult] = await Promise.all([
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('departments').select('id, name').order('name'),
        supabase.from('units').select('id, name, department_id, departments(name)').order('name'),
        supabase.from('profiles').select('user_id, full_name').order('full_name')
      ]);

      if (categoriesResult.data) setCategories(categoriesResult.data.map(cat => ({ ...cat, description: '' })));
      if (departmentsResult.data) setDepartments(departmentsResult.data);
      if (unitsResult.data) setUnits(unitsResult.data);
      if (profilesResult.data) setProfiles(profilesResult.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .order('full_name');
    
    if (data) {
      setProfiles(data);
    }
  };

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

  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from('asset_documents')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;
    return data;
  };

  const createAuditLog = async (assetId: string, action: string, newData: any) => {
    const { error } = await supabase
      .from('asset_audit_log')
      .insert({
        asset_id: assetId,
        user_id: user?.id,
        action,
        old_data: null,
        new_data: newData
      });

    if (error) {
      console.error('Error creating audit log:', error);
    }
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
        category_id: formData.category_id === "unassigned" ? null : formData.category_id || null,
        department_id: formData.department_id === "unassigned" ? null : formData.department_id || null,
        unit_id: formData.unit_id === "unassigned" ? null : formData.unit_id || null,
        purchase_value: parseFloat(formData.purchase_value),
        purchase_date: formData.purchase_date?.toISOString().split('T')[0],
        residual_value: parseFloat(formData.residual_value),
        useful_life_years: parseInt(formData.useful_life_years),
        location_type: formData.location_type,
        current_location: formData.current_location || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        status: formData.status,
        rfid_id: formData.rfid_id || null,
        assigned_to: formData.assigned_to === "unassigned" ? null : formData.assigned_to || null,
        created_by: user.id,
      };

      const { data: asset, error } = await supabase
        .from('assets')
        .insert([assetData])
        .select()
        .single();

      if (error) throw error;

      // Upload files if provided
      if (formData.photo) {
        try {
          const photoPath = `${asset.id}/photo_${Date.now()}.${formData.photo.name.split('.').pop()}`;
          await uploadFile(formData.photo, photoPath);
          
          const { data: { publicUrl } } = supabase.storage
            .from('asset_documents')
            .getPublicUrl(photoPath);

          await supabase.from('documents').insert({
            asset_id: asset.id,
            name: formData.photo.name,
            type: 'photo',
            file_url: publicUrl,
            file_size: formData.photo.size,
            mime_type: formData.photo.type,
            uploaded_by: user.id
          });
        } catch (photoError) {
          console.error('Error uploading photo:', photoError);
          toast({
            title: "Aviso",
            description: "Ativo cadastrado, mas erro ao enviar foto",
            variant: "destructive",
          });
        }
      }

      if (formData.document) {
        try {
          const docPath = `${asset.id}/document_${Date.now()}.${formData.document.name.split('.').pop()}`;
          await uploadFile(formData.document, docPath);
          
          const { data: { publicUrl } } = supabase.storage
            .from('asset_documents')
            .getPublicUrl(docPath);

          await supabase.from('documents').insert({
            asset_id: asset.id,
            name: formData.document.name,
            type: 'document',
            file_url: publicUrl,
            file_size: formData.document.size,
            mime_type: formData.document.type,
            uploaded_by: user.id
          });
        } catch (docError) {
          console.error('Error uploading document:', docError);
          toast({
            title: "Aviso",
            description: "Ativo cadastrado, mas erro ao enviar documento",
            variant: "destructive",
          });
        }
      }

      // Create audit log
      await createAuditLog(asset.id, 'create', assetData);

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
        department_id: '',
        unit_id: '',
        purchase_value: '',
        purchase_date: undefined,
        residual_value: '0',
        useful_life_years: '5',
        location_type: 'manual',
        current_location: '',
        latitude: '',
        longitude: '',
        status: 'active',
        rfid_id: '',
        assigned_to: '',
        photo: null,
        document: null,
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

          {/* Upload de Arquivos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
              Documentos e Fotos
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="photo">Foto do Ativo</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      photo: e.target.files?.[0] || null 
                    }))}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" disabled>
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                {formData.photo && (
                  <p className="text-xs text-muted-foreground">
                    Arquivo selecionado: {formData.photo.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="document">Documento (Ex: Nota Fiscal)</Label>
                <Input
                  id="document"
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    document: e.target.files?.[0] || null 
                  }))}
                />
                {formData.document && (
                  <p className="text-xs text-muted-foreground">
                    Arquivo selecionado: {formData.document.name}
                  </p>
                )}
              </div>
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
                  onValueChange={(value: any) => setFormData(prev => ({ 
                    ...prev, 
                    location_type: value,
                    rfid_id: value !== 'rfid' ? '' : prev.rfid_id 
                  }))}
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
            {formData.location_type === 'rfid' && (
              <div className="space-y-2">
                <Label htmlFor="rfid_id">ID RFID</Label>
                <Input
                  id="rfid_id"
                  value={formData.rfid_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, rfid_id: e.target.value }))}
                  placeholder="Ex: RFID123456789"
                />
              </div>
            )}
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

          {/* Organização */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
              Organização e Responsabilidade
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department_id">Departamento</Label>
                <Select 
                  value={formData.department_id} 
                  onValueChange={(value) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      department_id: value,
                      unit_id: 'unassigned'
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Não atribuir departamento</SelectItem>
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
                    <SelectItem value="unassigned">Não atribuir unidade</SelectItem>
                    {units
                      .filter(unit => 
                        formData.department_id === 'unassigned' || formData.department_id === '' ? 
                        true : unit.department_id === formData.department_id
                      )
                      .map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name} ({unit.departments?.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assigned_to">Responsável pelo Ativo</Label>
              <Select 
                value={formData.assigned_to} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um responsável (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Não atribuir responsável</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.full_name || profile.user_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AssetForm;