import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, Info, CheckCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  created_at: string;
  asset_id?: string;
  maintenance_id?: string;
}

const NotificationSystem = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkOverdueMaintenance();
    checkDepreciationAlerts();
    
    // Check notifications every 5 minutes
    const interval = setInterval(() => {
      checkOverdueMaintenance();
      checkDepreciationAlerts();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const checkOverdueMaintenance = async () => {
    try {
      const { data: maintenances, error } = await supabase
        .from('asset_maintenance')
        .select(`
          id,
          scheduled_date,
          status,
          assets(name)
        `)
        .eq('status', 'agendada')
        .lt('scheduled_date', new Date().toISOString().split('T')[0]);

      if (error) throw error;

      if (maintenances && maintenances.length > 0) {
        const overdueNotifications = maintenances.map(maintenance => ({
          id: `overdue-${maintenance.id}`,
          title: 'Manutenção em Atraso',
          message: `Manutenção do ativo "${maintenance.assets?.name}" está atrasada desde ${new Date(maintenance.scheduled_date).toLocaleDateString('pt-BR')}`,
          type: 'warning' as const,
          read: false,
          created_at: new Date().toISOString(),
          maintenance_id: maintenance.id
        }));

        setNotifications(prev => {
          const existingIds = prev.map(n => n.id);
          const newNotifications = overdueNotifications.filter(n => !existingIds.includes(n.id));
          return [...prev, ...newNotifications];
        });
      }
    } catch (error) {
      console.error('Error checking overdue maintenance:', error);
    }
  };

  const checkDepreciationAlerts = async () => {
    try {
      const { data: assets, error } = await supabase
        .from('assets')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;

      const depreciationAlerts = assets?.filter(asset => {
        const purchaseDate = new Date(asset.purchase_date);
        const yearsOld = (Date.now() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        const depreciationRate = yearsOld / asset.useful_life_years;
        return depreciationRate > 0.8; // Alert when 80% depreciated
      }).map(asset => ({
        id: `depreciation-${asset.id}`,
        title: 'Ativo Altamente Depreciado',
        message: `O ativo "${asset.name}" está com alta depreciação. Considere substituição.`,
        type: 'info' as const,
        read: false,
        created_at: new Date().toISOString(),
        asset_id: asset.id
      }));

      if (depreciationAlerts && depreciationAlerts.length > 0) {
        setNotifications(prev => {
          const existingIds = prev.map(n => n.id);
          const newNotifications = depreciationAlerts.filter(n => !existingIds.includes(n.id));
          return [...prev, ...newNotifications];
        });
      }
    } catch (error) {
      console.error('Error checking depreciation alerts:', error);
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev =>
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const filteredNotifications = showUnreadOnly
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
          >
            {showUnreadOnly ? 'Mostrar Todas' : 'Não Lidas'}
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              Marcar Todas como Lidas
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            {showUnreadOnly ? 'Nenhuma notificação não lida' : 'Nenhuma notificação'}
          </p>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border ${
                notification.read ? 'bg-muted/30' : 'bg-background'
              } transition-colors`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  {getIcon(notification.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      {!notification.read && (
                        <Badge variant="secondary" className="h-2 w-2 rounded-full p-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                      className="h-8 w-8 p-0"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissNotification(notification.id)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationSystem;