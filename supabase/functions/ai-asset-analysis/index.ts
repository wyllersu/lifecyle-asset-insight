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
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { assetName, description } = await req.json();

    if (!assetName) {
      throw new Error('Asset name is required');
    }

    console.log('Analyzing asset:', { assetName, description });

    // Create a detailed prompt for asset analysis
    const analysisPrompt = `
    Analise o seguinte ativo e forneça sugestões baseadas em práticas industriais brasileiras:
    
    Nome do Ativo: ${assetName}
    ${description ? `Descrição: ${description}` : ''}
    
    Com base no nome e descrição do ativo, forneça as seguintes informações:
    
    1. CATEGORIA: Sugira uma categoria apropriada (ex: Tecnologia, Mobiliário, Veículos, Equipamentos, Maquinário, etc.)
    
    2. VIDA ÚTIL: Sugira a vida útil em anos baseada nas taxas de depreciação brasileiras e práticas do setor
    
    3. VALOR RESIDUAL: Sugira uma porcentagem do valor de compra que o ativo manterá ao final da vida útil (0-30%)
    
    4. TIPO DE MANUTENÇÃO: Sugira o tipo de manutenção mais apropriado (preventiva, corretiva, ou preditiva)
    
    5. INTERVALO DE MANUTENÇÃO: Sugira intervalos de manutenção em meses
    
    Responda APENAS em formato JSON válido:
    {
      "categoria": "string",
      "vidaUtil": number,
      "valorResidualPercentual": number,
      "tipoManutencao": "preventiva" | "corretiva" | "preditiva",
      "intervaloManutencaoMeses": number,
      "justificativa": "string explicando brevemente as escolhas"
    }
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'Você é um especialista em gestão de ativos e depreciação no Brasil. Forneça análises precisas baseadas nas normas contábeis brasileiras e práticas industriais.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI Response:', aiResponse);

    // Parse the JSON response
    let analysisResult;
    try {
      analysisResult = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw response:', aiResponse);
      
      // Fallback analysis
      analysisResult = {
        categoria: "Geral",
        vidaUtil: 5,
        valorResidualPercentual: 10,
        tipoManutencao: "preventiva",
        intervaloManutencaoMeses: 6,
        justificativa: "Análise padrão aplicada devido a erro no processamento da resposta da IA"
      };
    }

    return new Response(JSON.stringify({
      success: true,
      analysis: analysisResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-asset-analysis function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});