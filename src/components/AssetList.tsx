import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, DollarSign, Calendar, Building2, MapPin, Activity, Edit, QrCode, History, Eye, Trash2, User, Scan } from 'lucide-react';
import QRCodeGenerator from './QRCodeGenerator';
import AssetHistory from './AssetHistory';
import AssetDetails from './AssetDetails';
import QRCodeScanner from './QRCodeScanner';
import GoogleAssetMap from './GoogleAssetMap';

interface Asset {
  id: string;
  name: string;
  code: string;
  serial_number: string | null;
  purchase_value: number;
  purchase_date: string;
  residual_value: number;
  useful_life_years: number;
  status: string | null;
  assigned_to: string | null;
  categories: {
    name: string;
  } | null;
  profiles?: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
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
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterResponsible, setFilterResponsible] = useState('all');
  const [selectedAssetForQR, setSelectedAssetForQR] = useState<Asset | null>(null);
  const [selectedAssetForHistory, setSelectedAssetForHistory] = useState<string | null>(null);
  const [selectedAssetForDetails, setSelectedAssetForDetails] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssets();
    fetchCategories();
    fetchProfiles();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('assets')
      .select(`
        *,
        categories (name),
        profiles:assigned_to (user_id, full_name, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching assets:', error);
      toast({
        title: "Erro ao carregar ativos",
        description: "Não foi possível carregar a lista de ativos.",
        variant: "destructive",
      });
    } else {
      setAssets(data || []);
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');
    
    if (data) {
      setCategories(data);
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

  const handleDeleteAsset = async (assetId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.from('assets').delete().eq('id', assetId);

      if (error) throw error;

      // Update local state
      setAssets(assets.filter(asset => asset.id !== assetId));

      toast({
        title: "Ativo excluído!",
        description: "O ativo foi removido com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast({
        title: "Erro ao excluir ativo",
        description: "Não foi possível remover o item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateBookValue = (asset: Asset) => {
    const yearsElapsed = (new Date().getTime() - new Date(asset.purchase_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
    const annualDepreciation = (asset.purchase_value - (asset.residual_value || 0)) / asset.useful_life_years;
    const totalDepreciation = Math.min(annualDepreciation * yearsElapsed, asset.purchase_value - (asset.residual_value || 0));
    return Math.max(asset.purchase_value - totalDepreciation, asset.residual_value || 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Activity className="h-4 w-4" />;
      case 'maintenance': return <MapPin className="h-4 w-4" />;
      case 'inactive': return <Calendar className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'maintenance': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'inactive': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'maintenance': return 'Manutenção';
      case 'inactive': return 'Inativo';
      default: return status;
    }
  };

  // Filter assets based on search term, category, status, and responsible
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.serial_number && asset.serial_number.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = filterCategory === 'all' || asset.categories?.name === filterCategory;
    const matchesStatus = filterStatus === 'all' || asset.status === filterStatus;
    const matchesResponsible = filterResponsible === 'all' || 
      (filterResponsible === 'unassigned' && !asset.assigned_to) ||
      (filterResponsible !== 'unassigned' && asset.assigned_to === filterResponsible);
    
    return matchesSearch && matchesCategory && matchesStatus && matchesResponsible;
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-3xl font-bold text-foreground">Lista de Ativos</h2>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
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
        <h2 className="text-3xl font-bold text-foreground">Lista de Ativos</h2>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2"
          >
            <Scan className="w-4 h-4" />
            Scanner QR
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowMap(true)}
            className="flex items-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            Mapa de Ativos
          </Button>
          <div className="text-sm text-muted-foreground">
            {filteredAssets.length} de {assets.length} ativos
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome, código ou número de série..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por categoria" />
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
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="maintenance">Manutenção</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterResponsible} onValueChange={setFilterResponsible}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os responsáveis</SelectItem>
                <SelectItem value="unassigned">Não atribuído</SelectItem>
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

      {/* Assets List */}
      <div className="space-y-4">
        {filteredAssets.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
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
            <Card key={asset.id} className="border-border/50 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold text-foreground">{asset.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {asset.code}
                      </Badge>
                      <Badge className={getStatusColor(asset.status || 'active')}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(asset.status || 'active')}
                          {getStatusLabel(asset.status || 'active')}
                        </div>
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <span className="font-medium">{formatCurrency(asset.purchase_value)}</span>
                        <Badge className={getStatusColor(asset.status)}>
                          {getStatusLabel(asset.status)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Valor contábil: {formatCurrency(calculateBookValue(asset))}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span>{asset.categories?.name || 'Sem categoria'}</span>
                      </div>

                      {/* Responsible */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        {asset.profiles ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={asset.profiles.avatar_url || ''} />
                              <AvatarFallback className="text-xs">
                                {asset.profiles.full_name?.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span>{asset.profiles.full_name || 'Usuário'}</span>
                          </div>
                        ) : (
                          <span className="italic">Não atribuído</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedAssetForDetails(asset.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Detalhes
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso removerá permanentemente o ativo "{asset.name}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteAsset(asset.id)}>
                            Continuar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>


      {/* Asset Details Modal */}
      {selectedAssetForDetails && (
        <Dialog open={!!selectedAssetForDetails} onOpenChange={() => setSelectedAssetForDetails(null)}>
          <AssetDetails 
            assetId={selectedAssetForDetails} 
            onClose={() => setSelectedAssetForDetails(null)} 
          />
        </Dialog>
      )}

      {/* QR Code Scanner Modal */}
      {showScanner && (
        <Dialog open={showScanner} onOpenChange={setShowScanner}>
          <QRCodeScanner 
            onScan={(result) => {
              console.log('QR Code scanned:', result);
              toast({
                title: "QR Code escaneado",
                description: `Código: ${result}`,
              });
            }}
            onAssetFound={(assetCode) => {
              console.log('Asset found:', assetCode);
              // Search for asset with this code
              const foundAsset = assets.find(asset => asset.code === assetCode);
              if (foundAsset) {
                setSelectedAssetForDetails(foundAsset.id);
                setShowScanner(false);
              }
            }}
          />
        </Dialog>
      )}

      {/* Asset Map Modal */}
      {showMap && (
        <Dialog open={showMap} onOpenChange={setShowMap}>
          <GoogleAssetMap />
        </Dialog>
      )}
    </div>
  );
};

export default AssetList;