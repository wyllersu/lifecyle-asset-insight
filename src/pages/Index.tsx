import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Dashboard from '@/components/Dashboard';
import AssetForm from '@/components/AssetForm';
import AssetList from '@/components/AssetList';
import ReportGenerator from '@/components/ReportGenerator';
import MaintenanceDashboard from '@/components/MaintenanceDashboard';
import AssetMap from '@/components/AssetMap';
import QRCodeScanner from '@/components/QRCodeScanner';
import { Building2, Package, Plus, List, BarChart3, LogOut, User, Wrench, MapPin, Users, Tag, FileText } from 'lucide-react';
import UserManagement from '@/components/UserManagement';
import CategoryManager from '@/components/CategoryManager';

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg mx-auto animate-pulse">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-md">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">AssetFlow</h1>
                <p className="text-sm text-muted-foreground">Gestão de Ativos e Inventário</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                {user.email}
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-auto grid-cols-8 bg-card/50 backdrop-blur-sm">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="inventory" className="flex items-center gap-2">
                <List className="w-4 h-4" />
                Inventário
              </TabsTrigger>
              <TabsTrigger value="add-asset" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Novo Ativo
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                Manutenção
              </TabsTrigger>
              <TabsTrigger value="tracking" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Rastreamento
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Relatórios
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Usuários
              </TabsTrigger>
              <TabsTrigger value="categories" className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Categorias
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-6">
            <Dashboard setActiveTab={setActiveTab} />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <AssetList />
          </TabsContent>

          <TabsContent value="add-asset" className="space-y-6">
            <AssetForm 
              onSuccess={() => setActiveTab('inventory')}
            />
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-6">
            <MaintenanceDashboard />
          </TabsContent>

          <TabsContent value="tracking" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AssetMap height="500px" />
              <div className="space-y-6">
                <QRCodeScanner 
                  onScan={(result) => console.log('QR Scanned:', result)}
                  onAssetFound={(assetCode) => {
                    console.log('Asset found:', assetCode);
                    // Here you could redirect to asset details or show asset info
                  }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <ReportGenerator />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <CategoryManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
