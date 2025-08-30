import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Map, MapPin, Layers, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Asset {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  status: string;
  category?: {
    name: string;
  };
}

interface GoogleAssetMapProps {
  className?: string;
  height?: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

const center = {
  lat: -23.5505,
  lng: -46.6333
};

const GoogleAssetMap: React.FC<GoogleAssetMapProps> = ({ className, height = "400px" }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    // Check if API key is already stored
    const savedKey = localStorage.getItem('googleMapsApiKey');
    if (savedKey) {
      setGoogleMapsApiKey(savedKey);
    }
  }, []);

  useEffect(() => {
    if (googleMapsApiKey) {
      fetchAssets();
    }
  }, [statusFilter, googleMapsApiKey]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('assets')
        .select(`
          id,
          name,
          code,
          latitude,
          longitude,
          status,
          categories (
            name
          )
        `)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const validAssets = (data || []).filter(
        asset => asset.latitude && asset.longitude
      ) as Asset[];

      setAssets(validAssets);
      
      // Fit map to show all markers
      if (validAssets.length > 0 && map) {
        const bounds = new google.maps.LatLngBounds();
        validAssets.forEach(asset => {
          bounds.extend({ lat: asset.latitude, lng: asset.longitude });
        });
        map.fitBounds(bounds);
      }
    } catch (error) {
      console.error('Erro ao buscar ativos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeySubmit = (key: string) => {
    setGoogleMapsApiKey(key);
    localStorage.setItem('googleMapsApiKey', key);
  };

  const getMarkerIcon = (status: string) => {
    const color = getStatusColor(status);
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 8,
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10b981'; // green
      case 'maintenance':
        return '#f59e0b'; // amber
      case 'inactive':
        return '#6b7280'; // gray
      case 'disposed':
        return '#ef4444'; // red
      default:
        return '#3b82f6'; // blue
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'active': 'Ativo',
      'maintenance': 'Manutenção',
      'inactive': 'Inativo',
      'disposed': 'Descartado',
    };
    return labels[status] || status;
  };

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  if (!googleMapsApiKey) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Mapa de Ativos - Google Maps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                Para usar o mapa, você precisa configurar uma chave de API do Google Maps
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Obtenha sua chave em: 
                <a 
                  href="https://developers.google.com/maps/documentation/javascript/get-api-key" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline ml-1"
                >
                  Google Cloud Console
                </a>
              </p>
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Cole sua chave de API do Google Maps aqui"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleApiKeySubmit(e.currentTarget.value);
                  }
                }}
              />
              <Button 
                onClick={() => {
                  const input = document.querySelector('input[type="password"]') as HTMLInputElement;
                  if (input?.value) {
                    handleApiKeySubmit(input.value);
                  }
                }}
                className="w-full"
              >
                Configurar API Key
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5" />
          Mapa de Ativos - Google Maps
          <span className="text-sm font-normal text-muted-foreground">
            ({assets.length} {assets.length === 1 ? 'ativo' : 'ativos'})
          </span>
        </CardTitle>
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
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
          <Button 
            size="sm" 
            variant="outline" 
            onClick={fetchAssets}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full rounded-lg overflow-hidden border" style={{ height }}>
          <LoadScript googleMapsApiKey={googleMapsApiKey}>
            <GoogleMap
              mapContainerStyle={{ ...mapContainerStyle, height }}
              center={center}
              zoom={10}
              onLoad={onLoad}
            >
              {assets.map((asset) => (
                <Marker
                  key={asset.id}
                  position={{ lat: asset.latitude, lng: asset.longitude }}
                  icon={getMarkerIcon(asset.status)}
                  onClick={() => setSelectedAsset(asset)}
                />
              ))}
              
              {selectedAsset && (
                <InfoWindow
                  position={{ lat: selectedAsset.latitude, lng: selectedAsset.longitude }}
                  onCloseClick={() => setSelectedAsset(null)}
                >
                  <div className="p-3 min-w-[200px]">
                    <h3 className="font-semibold text-sm mb-1">{selectedAsset.name}</h3>
                    <p className="text-xs text-gray-600 mb-1">Código: {selectedAsset.code}</p>
                    <p className="text-xs text-gray-600 mb-1">Status: {getStatusLabel(selectedAsset.status)}</p>
                    {selectedAsset.category && (
                      <p className="text-xs text-gray-600">Categoria: {selectedAsset.category.name}</p>
                    )}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
        </div>
        
        <div className="mt-4 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Ativo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span>Manutenção</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span>Inativo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Descartado</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoogleAssetMap;