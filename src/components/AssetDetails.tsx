import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Globe, Tag, File, History, Calendar, DollarSign, MapPin, Edit, QrCode } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import EditAssetModal from './EditAssetModal';
import QRCodeGenerator from './QRCodeGenerator';

interface AssetDetailsProps {
  assetId: string;
  onClose: () => void;
}

interface Profile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

const AssetDetails: React.FC<AssetDetailsProps> = ({ assetId, onClose }) => {
  const [asset, setAsset] = useState<any>(null);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssetDetails();
    fetchAuditLog();
    fetchProfiles();
  }, [assetId]);

  const fetchAssetDetails = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('assets')
      .select(`
        *,
        categories (name),
        documents (*),
        profiles:assigned_to (user_id, full_name, avatar_url)
      `)
      .eq('id', assetId)
      .single();

    if (error) {
      console.error('Error fetching asset:', error);
      toast({
        title: "Erro ao carregar ativo",
        description: "Não foi possível carregar os detalhes do ativo.",
        variant: "destructive",
      });
    } else {
      setAsset(data);
    }
    setLoading(false);
  };

  const fetchAuditLog = async () => {
    const { data, error } = await supabase
      .from('asset_audit_log')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching audit log:', error);
    } else {
      setAuditLog(data || []);
    }
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url');
    
    if (error) {
      console.error('Error fetching profiles:', error);
    } else {
      setProfiles(data || []);
    }
  };

  const handleAssignResponsible = async (userId: string | null) => {
    setUpdating(true);
    try {
      const assignedValue = userId === "unassigned" ? null : userId;
      const { error } = await supabase
        .from('assets')
        .update({ assigned_to: assignedValue })
        .eq('id', assetId);

      if (error) throw error;

      // Create audit log
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.from('asset_audit_log').insert({
          asset_id: assetId,
          action: assignedValue ? 'assigned_responsible' : 'removed_responsible',
          user_id: userData.user.id,
          new_data: { assigned_to: assignedValue },
          old_data: { assigned_to: asset.assigned_to }
        });
      }

      // Refresh asset data
      await fetchAssetDetails();
      await fetchAuditLog();

      toast({
        title: "Responsável atualizado",
        description: assignedValue ? "Responsável atribuído com sucesso." : "Responsável removido com sucesso.",
      });
    } catch (error) {
      console.error('Error updating responsible:', error);
      toast({
        title: "Erro ao atualizar responsável",
        description: "Não foi possível atualizar o responsável.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const calculateBookValue = (asset: any) => {
    const yearsElapsed = (new Date().getTime() - new Date(asset.purchase_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
    const annualDepreciation = (asset.purchase_value - (asset.residual_value || 0)) / asset.useful_life_years;
    const totalDepreciation = Math.min(annualDepreciation * yearsElapsed, asset.purchase_value - (asset.residual_value || 0));
    return Math.max(asset.purchase_value - totalDepreciation, asset.residual_value || 0);
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

  if (loading) {
    return (
      <DialogContent className="max-w-4xl">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DialogContent>
    );
  }

  if (!asset) {
    return (
      <DialogContent className="max-w-4xl">
        <div className="text-center p-8">
          <p className="text-muted-foreground">Ativo não encontrado.</p>
        </div>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
          <Tag className="h-6 w-6" />
          {asset.name}
        </DialogTitle>
        <DialogDescription className="text-base">
          Código: <span className="font-medium">{asset.code}</span>
        </DialogDescription>
      </DialogHeader>
      
      <Tabs defaultValue="summary" className="mt-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <File className="h-4 w-4" />
            Resumo
          </TabsTrigger>
          <TabsTrigger value="edit" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Editar
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Trilha de Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-6 space-y-6">
          {/* Asset Status and Responsibility */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Status e Responsabilidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge className={getStatusColor(asset.status || 'active')}>
                    {getStatusLabel(asset.status || 'active')}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Responsável:</span>
                  {asset.profiles ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={asset.profiles.avatar_url} />
                        <AvatarFallback>
                          {asset.profiles.full_name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{asset.profiles.full_name || 'Usuário'}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">Não atribuído</span>
                  )}
                </div>

                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Atribuir responsável:</span>
                  <Select 
                    value={asset.assigned_to || "unassigned"} 
                    onValueChange={handleAssignResponsible}
                    disabled={updating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Remover responsável</SelectItem>
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Informações Financeiras
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor de Compra:</span>
                  <span className="font-semibold">{formatCurrency(asset.purchase_value)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor Residual:</span>
                  <span className="font-semibold">{formatCurrency(asset.residual_value || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor Contábil:</span>
                  <span className="font-semibold text-primary">{formatCurrency(calculateBookValue(asset))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Vida Útil:</span>
                  <span className="font-semibold">{asset.useful_life_years} anos</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Categoria</p>
                <p className="font-medium">{asset.categories?.name || 'Não categorizado'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Número de Série</p>
                <p className="font-medium">{asset.serial_number || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Data de Compra</p>
                <p className="font-medium">
                  {format(new Date(asset.purchase_date), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Localização Atual</p>
                <p className="font-medium">{asset.current_location || 'Não informado'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Tipo de Localização</p>
                <p className="font-medium capitalize">{asset.location_type || 'Manual'}</p>
              </div>
              {asset.rfid_id && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">RFID</p>
                  <p className="font-medium">{asset.rfid_id}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          {asset.description && (
            <Card>
              <CardHeader>
                <CardTitle>Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{asset.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          {asset.documents && asset.documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <File className="h-5 w-5" />
                  Documentos Anexados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {asset.documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <File className="h-8 w-8 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">{doc.type}</p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          Ver
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="edit" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Editar Ativo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={() => setShowEditModal(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Informações
                </Button>
                <Button variant="outline" onClick={() => setShowQRCode(true)}>
                  <QrCode className="h-4 w-4 mr-2" />
                  Gerar QR Code
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Auditoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLog.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum registro de auditoria encontrado.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ação</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Usuário</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLog.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.action}</TableCell>
                        <TableCell>
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>{log.user_id}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Asset Modal */}
      {showEditModal && asset && (
        <EditAssetModal 
          isOpen={showEditModal}
          onOpenChange={setShowEditModal}
          asset={asset}
          onAssetUpdated={() => {
            fetchAssetDetails();
            fetchAuditLog();
          }}
        />
      )}

      {/* QR Code Modal */}
      {showQRCode && asset && (
        <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>QR Code do Ativo</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              <QRCodeGenerator 
                assetCode={asset.code}
                assetName={asset.name}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DialogContent>
  );
};

export default AssetDetails;