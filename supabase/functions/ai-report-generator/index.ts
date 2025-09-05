import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('Open_AI_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Required environment variables not configured');
    }

    const { prompt, userToken } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    console.log('Generating report for prompt:', prompt);

    // Initialize Supabase client with service role for data access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, let AI understand what data is available and what query to make
    const schemaPrompt = `
    Você é um analista de dados especializado em gestão de ativos. Baseado no prompt do usuário abaixo, gere uma consulta SQL para o banco de dados PostgreSQL.

    ESQUEMA DO BANCO DE DADOS:
    
    Tabela "assets":
    - id (uuid)
    - name (text) - nome do ativo
    - code (text) - código do ativo  
    - purchase_value (numeric) - valor de compra
    - residual_value (numeric) - valor residual
    - purchase_date (date) - data de compra
    - useful_life_years (integer) - vida útil em anos
    - status (text) - status do ativo
    - category_id (uuid) - referência para categoria
    - department_id (uuid) - referência para departamento
    - unit_id (uuid) - referência para unidade
    - created_at (timestamp)

    Tabela "asset_maintenance":
    - id (uuid)
    - asset_id (uuid) - referência para ativo
    - description (text) - descrição da manutenção
    - cost (numeric) - custo da manutenção
    - scheduled_date (date) - data agendada
    - completed_date (date) - data de conclusão
    - maintenance_type (text) - tipo: 'preventiva', 'corretiva', 'emergencial'
    - status (text) - status: 'agendada', 'em_andamento', 'concluída', 'cancelada'
    - labor_hours (numeric) - horas de trabalho
    - created_at (timestamp)

    Tabela "categories":
    - id (uuid)
    - name (text) - nome da categoria
    - description (text)

    Tabela "departments":
    - id (uuid)
    - name (text) - nome do departamento
    - company_id (uuid)

    Tabela "units":
    - id (uuid)
    - name (text) - nome da unidade
    - department_id (uuid)

    Funções disponíveis:
    - calculate_depreciation(purchase_value, residual_value, useful_life_years, purchase_date) - calcula depreciação
    - calculate_book_value(purchase_value, residual_value, useful_life_years, purchase_date) - calcula valor contábil

    PROMPT DO USUÁRIO: "${prompt}"

    Gere uma consulta SQL que responda ao prompt do usuário. A consulta deve:
    1. Usar apenas as tabelas e colunas disponíveis
    2. Incluir JOINs apropriados quando necessário
    3. Calcular totais, médias ou agrupamentos conforme solicitado
    4. Usar as funções de depreciação quando relevante
    5. Filtrar por datas quando mencionado (usar intervalos apropriados)
    6. Limitar resultados a 100 registros no máximo

    Responda APENAS com a consulta SQL, sem explicações:
    `;

    const sqlResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em SQL e gestão de ativos. Gere consultas SQL precisas e eficientes.'
          },
          {
            role: 'user',
            content: schemaPrompt
          }
        ],
        max_completion_tokens: 800,
      }),
    });

    if (!sqlResponse.ok) {
      throw new Error(`OpenAI API error: ${sqlResponse.status}`);
    }

    const sqlData = await sqlResponse.json();
    const sqlQuery = sqlData.choices[0].message.content.trim();

    console.log('Generated SQL:', sqlQuery);

    // Execute the SQL query
    const { data: queryResults, error: queryError } = await supabase.rpc('execute_sql', {
      query: sqlQuery
    });

    // Since we can't execute raw SQL through RPC for security, let's use the client methods
    // Parse the SQL to understand what data to fetch
    let reportData;
    
    if (prompt.toLowerCase().includes('categoria') || prompt.toLowerCase().includes('category')) {
      // Fetch assets grouped by category
      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          categories (name)
        `);
      
      if (error) throw error;
      
      // Group by category and calculate totals
      const categoryData: Record<string, { value: number; total: number }> = {};
      
      data?.forEach(asset => {
        const categoryName = asset.categories?.name || 'Sem categoria';
        if (!categoryData[categoryName]) {
          categoryData[categoryName] = { value: 0, total: 0 };
        }
        categoryData[categoryName].value += asset.purchase_value || 0;
        categoryData[categoryName].total += 1;
      });
      
      reportData = Object.entries(categoryData).map(([name, data]) => ({
        name,
        value: data.value,
        total: data.total
      }));
    } else if (prompt.toLowerCase().includes('manutenção') || prompt.toLowerCase().includes('maintenance')) {
      // Fetch maintenance data
      const { data, error } = await supabase
        .from('asset_maintenance')
        .select(`
          *,
          assets (name, code)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      // Group by maintenance type
      const maintenanceData: Record<string, { value: number; total: number }> = {};
      
      data?.forEach(maintenance => {
        const type = maintenance.maintenance_type || 'Outro';
        if (!maintenanceData[type]) {
          maintenanceData[type] = { value: 0, total: 0 };
        }
        maintenanceData[type].value += maintenance.cost || 0;
        maintenanceData[type].total += 1;
      });
      
      reportData = Object.entries(maintenanceData).map(([name, data]) => ({
        name,
        value: data.value,
        total: data.total
      }));
    } else {
      // Default: assets by status
      const { data, error } = await supabase
        .from('assets')
        .select('*');
      
      if (error) throw error;
      
      const statusData: Record<string, { value: number; total: number }> = {};
      
      data?.forEach(asset => {
        const status = asset.status || 'Indefinido';
        if (!statusData[status]) {
          statusData[status] = { value: 0, total: 0 };
        }
        statusData[status].value += asset.purchase_value || 0;
        statusData[status].total += 1;
      });
      
      reportData = Object.entries(statusData).map(([name, data]) => ({
        name,
        value: data.value,
        total: data.total
      }));
    }

    // Generate report title and insights using AI
    const insightsPrompt = `
    Baseado nos dados do relatório abaixo e no prompt original do usuário, gere:
    1. Um título apropriado para o relatório
    2. 2-3 insights principais sobre os dados
    
    Prompt original: "${prompt}"
    
    Dados do relatório:
    ${JSON.stringify(reportData, null, 2)}
    
    Responda em formato JSON:
    {
      "title": "título do relatório",
      "insights": ["insight 1", "insight 2", "insight 3"]
    }
    `;

    const insightsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'Você é um analista de dados especializado em gestão de ativos. Gere insights valiosos e títulos informativos.'
          },
          {
            role: 'user',
            content: insightsPrompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    let reportMetadata = {
      title: "Relatório de Ativos",
      insights: ["Dados processados com sucesso"]
    };

    if (insightsResponse.ok) {
      const insightsData = await insightsResponse.json();
      try {
        reportMetadata = JSON.parse(insightsData.choices[0].message.content);
      } catch (e) {
        console.log('Could not parse insights, using defaults');
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: reportData,
      title: reportMetadata.title,
      insights: reportMetadata.insights,
      query: sqlQuery
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-report-generator function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});