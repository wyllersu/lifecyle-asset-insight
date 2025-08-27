import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Search, Filter, Package, Building2, Wrench, XCircle, Trash2, QrCode, History, Eye, Edit } from 'lucide-react';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import AssetHistory from '@/components/AssetHistory';
import { useToast } from '@/hooks/use-toast';

interface Asset {
  id: string;
  name: string;
  code: string;
  serial_number: string;
  description: string;
  purchase_value: number;
  purchase_date: string;
  residual_value: number;
  useful_life_years: number;
  current_location: string;
  status: string;
  created_at: string;
  categories: {
    name: string;
  } | null;
}

interface Category {
  id: string;
  name: string;
}

const AssetList = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchAssets();
    fetchCategories();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          categories (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast({
        title: "Erro ao carregar ativos",
        description: "Não foi possível carregar a lista de ativos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
    }
  };

  const calculateBookValue = (asset: Asset) => {
    const purchaseDate = new Date(asset.purchase_date);
    const now = new Date();
    const yearsPassed = (now.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 3600 * 1000);
    const annualDepreciation = (asset.purchase_value - asset.residual_value) / asset.useful_life_years;
    const totalDepreciation = annualDepreciation * Math.min(yearsPassed, asset.useful_life_years);
    const bookValue = asset.purchase_value - totalDepreciation;
    return Math.max(asset.residual_value, bookValue);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Package className="h-4 w-4" />;
      case 'maintenance':
        return <Wrench className="h-4 w-4" />;
      case 'inactive':
        return <XCircle className="h-4 w-4" />;
      case 'disposed':
        return <Trash2 className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success text-success-foreground';
      case 'maintenance':
        return 'bg-warning text-warning-foreground';
      case 'inactive':
        return 'bg-muted text-muted-foreground';
      case 'disposed':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'maintenance':
        return 'Manutenção';
      case 'inactive':
        return 'Inativo';
      case 'disposed':
        return 'Descartado';
      default:
        return status;
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.serial_number && asset.serial_number.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = filterCategory === 'all' || 
      (asset.categories && asset.categories.name === filterCategory);
    
    const matchesStatus = filterStatus === 'all' || asset.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-foreground">Inventário de Ativos</h2>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="bg-gradient-card animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-6 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-foreground">Inventário de Ativos</h2>
        <div className="text-sm text-muted-foreground">
          {filteredAssets.length} de {assets.length} ativos
        </div>
      </div>

      {/* Filtros */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome, código ou número de série..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="maintenance">Manutenção</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="disposed">Descartado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Ativos */}
      <div className="space-y-4">
        {filteredAssets.length === 0 ? (
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Nenhum ativo encontrado
              </h3>
              <p className="text-muted-foreground text-center">
                {assets.length === 0 
                  ? 'Cadastre o primeiro ativo para começar'
                  : 'Tente ajustar os filtros para encontrar o que procura'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAssets.map((asset) => (
            <Card key={asset.id} className="bg-gradient-card border-border/50 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold text-foreground">{asset.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {asset.code}
                      </Badge>
                      <Badge className={getStatusColor(asset.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(asset.status)}
                          {getStatusLabel(asset.status)}
                        </div>
                      </Badge>
                    </div>
                    
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Categoria:</span>
                        <div className="font-medium text-foreground">
                          {asset.categories?.name || 'Não categorizado'}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor de Compra:</span>
                        <div className="font-medium text-success">
                          {formatCurrency(asset.purchase_value)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor Atual:</span>
                        <div className="font-medium text-primary">
                          {formatCurrency(calculateBookValue(asset))}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Localização:</span>
                        <div className="font-medium text-foreground">
                          {asset.current_location || 'Não informado'}
                        </div>
                      </div>
                    </div>

                    {asset.serial_number && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Nº Série:</span>
                        <span className="ml-2 font-mono text-foreground">{asset.serial_number}</span>
                      </div>
                    )}

                    {asset.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {asset.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <QrCode className="h-4 w-4 mr-1" />
                          QR Code
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <QRCodeGenerator 
                          assetCode={asset.code} 
                          assetName={asset.name} 
                        />
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <History className="h-4 w-4 mr-1" />
                          Histórico
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <AssetHistory 
                          assetId={asset.id} 
                          assetName={asset.name} 
                        />
                      </DialogContent>
                    </Dialog>

                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      Detalhes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AssetList;