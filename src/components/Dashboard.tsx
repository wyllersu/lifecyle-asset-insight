import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Package, TrendingDown, MapPin } from 'lucide-react';

interface DashboardStats {
  totalAssets: number;
  totalValue: number;
  totalDepreciation: number;
  totalBookValue: number;
}

interface DashboardProps {
  setActiveTab?: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalAssets: 0,
    totalValue: 0,
    totalDepreciation: 0,
    totalBookValue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Get total assets count
      const { count } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true });

      // Get assets with calculated values
      const { data: assets } = await supabase
        .from('assets')
        .select('purchase_value, residual_value, useful_life_years, purchase_date');

      if (assets) {
        const totalValue = assets.reduce((sum, asset) => sum + Number(asset.purchase_value), 0);
        
        // Calculate total depreciation and book value
        let totalDepreciation = 0;
        let totalBookValue = 0;

        for (const asset of assets) {
          const yearsPassed = (new Date().getTime() - new Date(asset.purchase_date).getTime()) / (365.25 * 24 * 3600 * 1000);
          const annualDepreciation = (Number(asset.purchase_value) - Number(asset.residual_value)) / asset.useful_life_years;
          const assetDepreciation = annualDepreciation * Math.min(yearsPassed, asset.useful_life_years);
          const assetBookValue = Number(asset.purchase_value) - assetDepreciation;

          totalDepreciation += Math.max(0, assetDepreciation);
          totalBookValue += Math.max(Number(asset.residual_value), assetBookValue);
        }

        setStats({
          totalAssets: count || 0,
          totalValue,
          totalDepreciation,
          totalBookValue,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const StatCard = ({ title, value, description, icon: Icon, valueColor = "text-foreground" }: {
    title: string;
    value: string | number;
    description: string;
    icon: any;
    valueColor?: string;
  }) => (
    <Card className="bg-gradient-card border-border/50 hover:shadow-lg transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueColor}`}>
          {title === "Total de Ativos" ? value : (typeof value === 'number' ? formatCurrency(value) : value)}
        </div>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-gradient-card animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
        <div className="text-sm text-muted-foreground">
          Atualizado em {new Date().toLocaleString('pt-BR')}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Ativos"
          value={stats.totalAssets.toString()}
          description="Itens cadastrados no sistema"
          icon={Package}
        />
        <StatCard
          title="Valor Total de Compra"
          value={stats.totalValue}
          description="Soma dos valores de aquisição"
          icon={Building2}
          valueColor="text-success"
        />
        <StatCard
          title="Depreciação Acumulada"
          value={stats.totalDepreciation}
          description="Total depreciado até hoje"
          icon={TrendingDown}
          valueColor="text-destructive"
        />
        <StatCard
          title="Valor Contábil Atual"
          value={stats.totalBookValue}
          description="Valor líquido dos ativos"
          icon={MapPin}
          valueColor="text-primary"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">Visão Geral</CardTitle>
            <CardDescription>
              Resumo executivo dos seus ativos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Taxa de Depreciação</span>
              <span className="font-semibold text-foreground">
                {stats.totalValue > 0 
                  ? ((stats.totalDepreciation / stats.totalValue) * 100).toFixed(1) + '%'
                  : '0%'
                }
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Valor Médio por Ativo</span>
              <span className="font-semibold text-foreground">
                {stats.totalAssets > 0 
                  ? formatCurrency(stats.totalValue / stats.totalAssets)
                  : formatCurrency(0)
                }
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Valor Líquido (%)</span>
              <span className="font-semibold text-primary">
                {stats.totalValue > 0 
                  ? ((stats.totalBookValue / stats.totalValue) * 100).toFixed(1) + '%'
                  : '0%'
                }
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">Ações Rápidas</CardTitle>
            <CardDescription>
              Acesso direto às funcionalidades principais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button 
                className="p-4 text-left border border-border rounded-lg hover:bg-accent/20 transition-colors"
                onClick={() => setActiveTab?.('add-asset')}
              >
                <div className="font-semibold text-foreground">Novo Ativo</div>
                <div className="text-sm text-muted-foreground">Cadastrar item</div>
              </button>
              <button 
                className="p-4 text-left border border-border rounded-lg hover:bg-accent/20 transition-colors"
                onClick={() => setActiveTab?.('reports')}
              >
                <div className="font-semibold text-foreground">Relatórios</div>
                <div className="text-sm text-muted-foreground">Gerar relatório</div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;