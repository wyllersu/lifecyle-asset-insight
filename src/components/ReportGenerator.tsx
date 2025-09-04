import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, FileText, TrendingUp, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

interface ChartData {
  name: string;
  value: number;
  total?: number;
}

interface ReportMetadata {
  title: string;
  insights: string[];
}

const ReportGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [reportMetadata, setReportMetadata] = useState<ReportMetadata>({
    title: '',
    insights: []
  });
  const { toast } = useToast();
  const { user } = useAuth();

  const handleGenerateReport = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt obrigatório",
        description: "Por favor, descreva o relatório que deseja gerar",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para gerar relatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      console.log('Generating report with AI...');
      
      const { data, error } = await supabase.functions.invoke('ai-report-generator', {
        body: { 
          prompt: prompt.trim(),
          userToken: user.id 
        },
      });

      if (error) {
        console.error('Function error:', error);
        throw new Error('Erro ao chamar função de geração de relatório');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro desconhecido na geração do relatório');
      }

      console.log('Report generated successfully:', data);
      
      setChartData(data.data || []);
      setReportMetadata({
        title: data.title || 'Relatório Gerado',
        insights: data.insights || []
      });
      
      toast({
        title: "Relatório gerado!",
        description: "Dados carregados com sucesso usando IA",
      });
      
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Erro ao gerar relatório",
        description: error instanceof Error ? error.message : "Não foi possível processar a solicitação",
        variant: "destructive",
      });
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-foreground">Gerador de Relatórios</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="w-4 h-4" />
          Powered by AI
        </div>
      </div>

      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Descrição do Relatório
          </CardTitle>
          <CardDescription>
            Descreva o tipo de relatório que deseja gerar. Por exemplo: "Mostrar o valor total de compra dos ativos por categoria"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-prompt">Solicitar Relatório</Label>
            <Textarea
              id="report-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Mostrar a depreciação acumulada por categoria de ativos nos últimos 12 meses..."
              rows={4}
              className="resize-none"
            />
          </div>
          
          <Button 
            onClick={handleGenerateReport}
            disabled={loading || !prompt.trim()}
            className="w-full bg-gradient-primary hover:bg-gradient-primary/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Gerando Relatório...' : 'Gerar Relatório'}
          </Button>
        </CardContent>
      </Card>

      {chartData.length > 0 && (
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">{reportMetadata.title}</CardTitle>
            <CardDescription>
              Relatório gerado baseado na sua solicitação usando IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(Number(value)), 'Valor Total']}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--primary))" 
                    name="Valor Total"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Summary Statistics */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border border-border rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(chartData.reduce((sum, item) => sum + item.value, 0))}
                </div>
                <div className="text-sm text-muted-foreground">Valor Total</div>
              </div>
              <div className="text-center p-4 border border-border rounded-lg">
                <div className="text-2xl font-bold text-success">
                  {chartData.reduce((sum, item) => sum + (item.total || 0), 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total de Itens</div>
              </div>
              <div className="text-center p-4 border border-border rounded-lg">
                <div className="text-2xl font-bold text-accent">
                  {chartData.length}
                </div>
                <div className="text-sm text-muted-foreground">Categorias</div>
              </div>
            </div>
            
            {/* AI Insights */}
            {reportMetadata.insights.length > 0 && (
              <div className="mt-6 p-4 border border-border rounded-lg bg-muted/50">
                <h4 className="flex items-center gap-2 font-semibold mb-3">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  Insights da IA
                </h4>
                <ul className="space-y-2">
                  {reportMetadata.insights.map((insight, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportGenerator;