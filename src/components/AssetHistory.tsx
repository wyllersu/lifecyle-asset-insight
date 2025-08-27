import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, Clock, User, FileText, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuditLog {
  id: string;
  asset_id: string;
  user_id: string;
  action: string;
  old_data: any;
  new_data: any;
  created_at: string;
}

interface AssetHistoryProps {
  assetId: string;
  assetName?: string;
}

const AssetHistory: React.FC<AssetHistoryProps> = ({ assetId, assetName }) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('all');

  useEffect(() => {
    fetchAuditLogs();
  }, [assetId]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('asset_audit_log')
        .select('*')
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    const iconClass = "h-4 w-4";
    switch (action.toLowerCase()) {
      case 'create':
      case 'created':
        return <FileText className={cn(iconClass, "text-green-500")} />;
      case 'update':
      case 'updated':
        return <Clock className={cn(iconClass, "text-blue-500")} />;
      case 'delete':
      case 'deleted':
        return <History className={cn(iconClass, "text-red-500")} />;
      default:
        return <History className={cn(iconClass, "text-gray-500")} />;
    }
  };

  const getActionLabel = (action: string) => {
    const actionMap: Record<string, string> = {
      'create': 'Criado',
      'created': 'Criado',
      'update': 'Atualizado',
      'updated': 'Atualizado',
      'delete': 'Deletado',
      'deleted': 'Deletado',
      'status_change': 'Status Alterado',
      'location_update': 'Localização Atualizada',
      'maintenance_scheduled': 'Manutenção Agendada',
      'maintenance_completed': 'Manutenção Concluída',
    };
    return actionMap[action.toLowerCase()] || action;
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'created':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'update':
      case 'updated':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delete':
      case 'deleted':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'maintenance_scheduled':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'maintenance_completed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatChanges = (oldData: any, newData: any) => {
    if (!oldData || !newData) return null;

    const changes = [];
    const compareFields = ['status', 'current_location', 'name', 'description'];

    for (const field of compareFields) {
      if (oldData[field] !== newData[field]) {
        changes.push({
          field,
          old: oldData[field],
          new: newData[field],
        });
      }
    }

    return changes;
  };

  const filteredLogs = actionFilter === 'all' 
    ? auditLogs 
    : auditLogs.filter(log => log.action.toLowerCase().includes(actionFilter.toLowerCase()));

  const uniqueActions = [...new Set(auditLogs.map(log => log.action))];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico do Ativo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico do Ativo
          {assetName && <span className="text-sm font-normal text-muted-foreground">- {assetName}</span>}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              {uniqueActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {getActionLabel(action)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum histórico encontrado</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 bg-card">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getActionIcon(log.action)}
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={getActionColor(log.action)}
                          >
                            {getActionLabel(log.action)}
                          </Badge>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                        <div className="mt-2">
                          {formatChanges(log.old_data, log.new_data) && (
                            <div className="space-y-1">
                              {formatChanges(log.old_data, log.new_data)?.map((change, index) => (
                                <div key={index} className="text-sm">
                                  <span className="font-medium capitalize">{change.field}:</span>
                                  <span className="text-red-600 line-through ml-2">{change.old}</span>
                                  <span className="text-green-600 ml-2">→ {change.new}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {log.user_id.slice(0, 8)}...
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={fetchAuditLogs}>
            Atualizar Histórico
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssetHistory;