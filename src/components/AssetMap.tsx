import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

interface AssetMapProps {
  className?: string;
  height?: string;
}

const AssetMap: React.FC<AssetMapProps> = ({ className, height = "400px" }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [mapboxToken, setMapboxToken] = useState<string>('');

  useEffect(() => {
    // For now, we'll use a placeholder token input
    // In production, this should come from Supabase Edge Function Secrets
    const token = prompt('Por favor, insira seu token público do Mapbox:');
    if (token) {
      setMapboxToken(token);
    }
  }, []);

  useEffect(() => {
    if (mapboxToken && mapContainer.current && !map.current) {
      initializeMap();
    }
  }, [mapboxToken]);

  useEffect(() => {
    if (map.current) {
      fetchAssets();
    }
  }, [statusFilter]);

  const initializeMap = () => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-46.6333, -23.5505], // São Paulo, Brazil
      zoom: 10,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    fetchAssets();
  };

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
      updateMapMarkers(validAssets);
    } catch (error) {
      console.error('Erro ao buscar ativos:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMapMarkers = (assets: Asset[]) => {
    if (!map.current) return;

    // Remove existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    assets.forEach(asset => {
      const el = document.createElement('div');
      el.className = 'asset-marker';
      el.style.cssText = `
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid white;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        background-color: ${getStatusColor(asset.status)};
      `;

      const popup = new mapboxgl.Popup({ 
        offset: 25,
        closeButton: true,
        closeOnClick: false 
      }).setHTML(`
        <div class="p-3 min-w-[200px]">
          <h3 class="font-semibold text-sm mb-1">${asset.name}</h3>
          <p class="text-xs text-gray-600 mb-1">Código: ${asset.code}</p>
          <p class="text-xs text-gray-600 mb-1">Status: ${getStatusLabel(asset.status)}</p>
          ${asset.category ? `<p class="text-xs text-gray-600">Categoria: ${asset.category.name}</p>` : ''}
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([asset.longitude, asset.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Fit map to show all markers
    if (assets.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      assets.forEach(asset => {
        bounds.extend([asset.longitude, asset.latitude]);
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }
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

  if (!mapboxToken) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Mapa de Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Para usar o mapa, você precisa configurar um token do Mapbox
            </p>
            <Button onClick={() => window.location.reload()}>
              Configurar Token
            </Button>
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
          Mapa de Ativos
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
        <div 
          ref={mapContainer} 
          className="w-full rounded-lg overflow-hidden border"
          style={{ height }}
        />
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

export default AssetMap;