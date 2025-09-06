import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MapPin, Search, QrCode, Navigation, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import QRCodeScanner from './QRCodeScanner';
import AssetDetails from './AssetDetails';

interface Asset {
  id: string;
  name: string;
  code: string;
  current_location: string;
  latitude?: number;
  longitude?: number;
  location_type: string;
  status: string;
  categories?: { name: string };
  departments?: { name: string };
}

const ConsolidatedTrackingSystem = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssets();
  }, []);

  useEffect(() => {
    const filtered = assets.filter(asset =>
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.current_location?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAssets(filtered);
  }, [searchTerm, assets]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          id,
          name,
          code,
          current_location,
          latitude,
          longitude,
          location_type,
          status,
          categories(name),
          departments(name)
        `)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar ativos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQRCodeDetected = async (code: string) => {
    try {
      const { data: asset, error } = await supabase
        .from('assets')
        .select(`
          id,
          name,
          code,
          current_location,
          latitude,
          longitude,
          location_type,
          status,
          categories(name),
          departments(name)
        `)
        .eq('code', code)
        .single();

      if (error) throw error;

      if (asset) {
        setSelectedAsset(asset);
        setShowScanner(false);
        toast({
          title: "Ativo Encontrado",
          description: `${asset.name} - ${asset.code}`
        });
      }
    } catch (error) {
      toast({
        title: "Ativo Não Encontrado",
        description: "Nenhum ativo encontrado com este código QR",
        variant: "destructive"
      });
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          toast({
            title: "Localização Obtida",
            description: `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`
          });
        },
        (error) => {
          toast({
            title: "Erro de Localização",
            description: "Não foi possível obter sua localização",
            variant: "destructive"
          });
        }
      );
    } else {
      toast({
        title: "Geolocalização Não Suportada",
        description: "Seu navegador não suporta geolocalização",
        variant: "destructive"
      });
    }
  };

  const getLocationTypeColor = (type: string) => {
    switch (type) {
      case 'gps':
        return 'bg-green-100 text-green-800';
      case 'manual':
        return 'bg-blue-100 text-blue-800';
      case 'qr':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (showScanner) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Scanner QR Code</h3>
          <Button variant="outline" onClick={() => setShowScanner(false)}>
            Fechar Scanner
          </Button>
        </div>
        <QRCodeScanner onScan={handleQRCodeDetected} />
      </div>
    );
  }

  if (selectedAsset) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Detalhes do Ativo</h3>
          <Button variant="outline" onClick={() => setSelectedAsset(null)}>
            Voltar à Lista
          </Button>
        </div>
        <AssetDetails assetId={selectedAsset.id} onClose={() => setSelectedAsset(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Sistema de Rastreamento</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={getCurrentLocation}>
            <Navigation className="h-4 w-4 mr-2" />
            Minha Localização
          </Button>
          <Button onClick={() => setShowScanner(true)}>
            <QrCode className="h-4 w-4 mr-2" />
            Scanner QR
          </Button>
        </div>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Lista de Ativos</TabsTrigger>
          <TabsTrigger value="map">Mapa</TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, código ou localização..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={fetchAssets} disabled={loading}>
              Atualizar
            </Button>
          </div>

          <div className="grid gap-4">
            {loading ? (
              <div className="text-center py-8">Carregando ativos...</div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'Nenhum ativo encontrado' : 'Nenhum ativo cadastrado'}
              </div>
            ) : (
              filteredAssets.map((asset) => (
                <Card key={asset.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{asset.name}</h3>
                          <Badge className={getStatusColor(asset.status)}>
                            {asset.status}
                          </Badge>
                          <Badge className={getLocationTypeColor(asset.location_type)}>
                            {asset.location_type === 'gps' ? 'GPS' : 
                             asset.location_type === 'manual' ? 'Manual' : 'QR Code'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          <strong>Código:</strong> {asset.code}
                        </p>
                        <p className="text-sm text-muted-foreground mb-1">
                          <strong>Categoria:</strong> {asset.categories?.name || 'Sem categoria'}
                        </p>
                        <p className="text-sm text-muted-foreground mb-1">
                          <strong>Departamento:</strong> {asset.departments?.name || 'Sem departamento'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {asset.current_location || 'Localização não informada'}
                          {asset.latitude && asset.longitude && (
                            <span className="text-xs">
                              ({asset.latitude.toFixed(6)}, {asset.longitude.toFixed(6)})
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAsset(asset)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle>Mapa de Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">
                  Mapa de localização dos ativos (Implementação futura)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Localização</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(
                    assets.reduce((acc, asset) => {
                      const location = asset.current_location || 'Sem localização';
                      acc[location] = (acc[location] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([location, count]) => (
                    <div key={location} className="flex justify-between">
                      <span className="text-sm">{location}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tipos de Localização</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(
                    assets.reduce((acc, asset) => {
                      const type = asset.location_type || 'manual';
                      acc[type] = (acc[type] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([type, count]) => (
                    <div key={type} className="flex justify-between">
                      <span className="text-sm capitalize">{type}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConsolidatedTrackingSystem;