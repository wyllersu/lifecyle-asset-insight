import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { QrCode, Package, Calendar, DollarSign, User, MapPin, Tag } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AssetScanPopupProps {
  assetCode: string;
  onClose: () => void;
}

interface Asset {
  id: string;
  name: string;
  code: string;
  serial_number: string | null;
  purchase_value: number;
  purchase_date: string;
  status: string | null;
  current_location: string | null;
  categories: {
    name: string;
  } | null;
  profiles?: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

const AssetScanPopup: React.FC<AssetScanPopupProps> = ({ assetCode, onClose }) => {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssetByCode();
  }, [assetCode]);

  const fetchAssetByCode = async () => {
    setLoading(true);
    setNotFound(false);

    try {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          categories (name),
          profiles:assigned_to (user_id, full_name, avatar_url)
        `)
        .eq('code', assetCode)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setNotFound(true);
        } else {
          throw error;
        }
      } else {
        setAsset(data);
      }
    } catch (error) {
      console.error('Error fetching asset:', error);
      toast({
        title: "Erro ao buscar ativo",
        description: "Não foi possível carregar as informações do ativo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Ativo Escaneado
          </DialogTitle>
          <DialogDescription>
            Código: <span className="font-medium">{assetCode}</span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </CardContent>
          </Card>
        ) : notFound ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">Ativo não encontrado</h3>
              <p className="text-sm text-muted-foreground">
                Nenhum ativo foi encontrado com o código <span className="font-medium">{assetCode}</span>
              </p>
            </CardContent>
          </Card>
        ) : asset ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              {/* Asset Header */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">{asset.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    SKU: {asset.code}
                  </p>
                  <Badge className={getStatusColor(asset.status || 'active')} variant="outline">
                    {getStatusLabel(asset.status || 'active')}
                  </Badge>
                </div>
              </div>

              {/* Asset Details */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Categoria:</span>
                  <span className="font-medium">{asset.categories?.name || 'Não categorizado'}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-medium">{formatCurrency(asset.purchase_value)}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Data de Compra:</span>
                  <span className="font-medium">
                    {new Date(asset.purchase_date).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                {asset.current_location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Localização:</span>
                    <span className="font-medium">{asset.current_location}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Responsável:</span>
                  {asset.profiles ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={asset.profiles.avatar_url || ''} />
                        <AvatarFallback className="text-xs">
                          {asset.profiles.full_name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{asset.profiles.full_name || 'Usuário'}</span>
                    </div>
                  ) : (
                    <span className="italic text-muted-foreground">Não atribuído</span>
                  )}
                </div>

                {asset.serial_number && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Número de Série:</span>
                    <span className="font-medium">{asset.serial_number}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex justify-end">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssetScanPopup;