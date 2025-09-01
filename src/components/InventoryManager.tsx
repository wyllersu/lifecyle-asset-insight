import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, Download, FileSpreadsheet } from 'lucide-react';
import AssetList from './AssetList';
import AssetForm from './AssetForm';
import ReportGenerator from './ReportGenerator';

const InventoryManager = () => {
  const [activeSubTab, setActiveSubTab] = useState('list');

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      doc.text('Relatório de Inventário - AssetFlow', 20, 20);
      doc.text('Data: ' + new Date().toLocaleDateString('pt-BR'), 20, 30);
      
      // TODO: Adicionar dados dos ativos
      doc.text('Lista de Ativos exportada em formato PDF', 20, 50);
      
      doc.save('inventario-assets.pdf');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    }
  };

  const handleExportCSV = () => {
    // TODO: Implementar exportação para CSV
    const csvContent = "data:text/csv;charset=utf-8,Nome,Código,Categoria,Valor\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "inventario-assets.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

        <TabsContent value="reports" className="space-y-6">
          <ReportGenerator />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryManager;