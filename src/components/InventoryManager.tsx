import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, Download, FileSpreadsheet, MapPin } from 'lucide-react';
import AssetList from './AssetList';
import AssetForm from './AssetForm';
import ReportGenerator from './ReportGenerator';
import ConsolidatedTrackingSystem from './ConsolidatedTrackingSystem';

const InventoryManager = () => {
  const [activeSubTab, setActiveSubTab] = useState('list');

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const { supabase } = await import('@/integrations/supabase/client');
      const { toast } = await import('@/hooks/use-toast');
      
      // Buscar dados dos ativos
      const { data: assets, error } = await supabase
        .from('assets')
        .select(`
          *,
          categories(name),
          departments(name),
          units(name)
        `);

      if (error) {
        toast({ title: "Erro", description: "Erro ao buscar dados para exportação", variant: "destructive" });
        return;
      }

      const doc = new jsPDF();
      
      // Cabeçalho
      doc.setFontSize(20);
      doc.text('Relatório de Inventário - AssetFlow', 20, 20);
      doc.setFontSize(12);
      doc.text('Data: ' + new Date().toLocaleDateString('pt-BR'), 20, 30);
      
      // Dados dos ativos
      let yPosition = 50;
      doc.setFontSize(14);
      doc.text('Lista de Ativos:', 20, yPosition);
      yPosition += 15;

      doc.setFontSize(10);
      assets?.forEach((asset, index) => {
        if (yPosition > 280) {
          doc.addPage();
          yPosition = 20;
        }
        
        const category = asset.categories?.name || 'Sem categoria';
        const department = asset.departments?.name || 'Sem departamento';
        
        doc.text(`${index + 1}. ${asset.name}`, 20, yPosition);
        doc.text(`Código: ${asset.code}`, 30, yPosition + 8);
        doc.text(`Categoria: ${category}`, 30, yPosition + 16);
        doc.text(`Departamento: ${department}`, 30, yPosition + 24);
        doc.text(`Valor: R$ ${asset.purchase_value.toLocaleString('pt-BR')}`, 30, yPosition + 32);
        doc.text(`Status: ${asset.status}`, 30, yPosition + 40);
        
        yPosition += 50;
      });
      
      doc.save('inventario-assets.pdf');
      toast({ title: "Sucesso", description: "PDF exportado com sucesso!" });
    } catch (error) {
      const { toast } = await import('@/hooks/use-toast');
      toast({ title: "Erro", description: "Erro ao exportar PDF", variant: "destructive" });
    }
  };

  const handleExportCSV = async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { toast } = await import('@/hooks/use-toast');
      
      // Buscar dados dos ativos
      const { data: assets, error } = await supabase
        .from('assets')
        .select(`
          *,
          categories(name),
          departments(name),
          units(name)
        `);

      if (error) {
        toast({ title: "Erro", description: "Erro ao buscar dados para exportação", variant: "destructive" });
        return;
      }

      // Criar CSV
      const headers = ['Nome', 'Código', 'Categoria', 'Departamento', 'Valor', 'Status', 'Data de Compra'];
      const csvRows = [headers.join(',')];

      assets?.forEach(asset => {
        const category = asset.categories?.name || 'Sem categoria';
        const department = asset.departments?.name || 'Sem departamento';
        const purchaseDate = new Date(asset.purchase_date).toLocaleDateString('pt-BR');
        
        const row = [
          `"${asset.name}"`,
          `"${asset.code}"`,
          `"${category}"`,
          `"${department}"`,
          `"R$ ${asset.purchase_value.toLocaleString('pt-BR')}"`,
          `"${asset.status}"`,
          `"${purchaseDate}"`
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "inventario-assets.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ title: "Sucesso", description: "CSV exportado com sucesso!" });
    } catch (error) {
      const { toast } = await import('@/hooks/use-toast');
      toast({ title: "Erro", description: "Erro ao exportar CSV", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-foreground">Gestão de Inventário</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportPDF} size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
          <Button variant="outline" onClick={handleExportCSV} size="sm">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="list" className="flex items-center gap-2">
            Lista de Ativos
          </TabsTrigger>
          <TabsTrigger value="new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Ativo
          </TabsTrigger>
          <TabsTrigger value="tracking" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Rastreamento
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <AssetList />
        </TabsContent>

        <TabsContent value="new" className="space-y-6">
          <AssetForm />
        </TabsContent>

        <TabsContent value="tracking" className="space-y-6">
          <ConsolidatedTrackingSystem />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <ReportGenerator />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryManager;