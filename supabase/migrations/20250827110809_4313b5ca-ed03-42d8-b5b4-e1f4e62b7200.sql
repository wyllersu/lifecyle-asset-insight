-- Create maintenance history table
CREATE TABLE public.asset_maintenance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('preventiva', 'corretiva', 'emergencial')),
  description TEXT NOT NULL,
  cost NUMERIC DEFAULT 0,
  performed_by UUID REFERENCES auth.users(id),
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  status TEXT NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada', 'em_andamento', 'concluída', 'cancelada')),
  next_maintenance_date DATE,
  parts_used JSONB DEFAULT '[]'::jsonb,
  labor_hours NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create spare parts table
CREATE TABLE public.spare_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  part_number TEXT UNIQUE NOT NULL,
  description TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  supplier TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create asset parts relationship table
CREATE TABLE public.asset_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES public.spare_parts(id) ON DELETE CASCADE,
  quantity_required INTEGER NOT NULL DEFAULT 1,
  UNIQUE(asset_id, part_id)
);

-- Create maintenance parts usage table
CREATE TABLE public.maintenance_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_id UUID NOT NULL REFERENCES public.asset_maintenance(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES public.spare_parts(id) ON DELETE CASCADE,
  quantity_used INTEGER NOT NULL DEFAULT 1,
  cost_per_unit NUMERIC NOT NULL DEFAULT 0
);

-- Create asset disposal table
CREATE TABLE public.asset_disposal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  disposal_date DATE NOT NULL,
  disposal_method TEXT NOT NULL CHECK (disposal_method IN ('venda', 'descarte', 'doacao', 'reciclagem')),
  sale_value NUMERIC DEFAULT 0,
  buyer_info TEXT,
  disposal_reason TEXT NOT NULL,
  environmental_compliance BOOLEAN DEFAULT false,
  certificate_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  manager_id UUID REFERENCES auth.users(id),
  budget NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create saved reports table
CREATE TABLE public.saved_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  parameters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add department_id to assets table
ALTER TABLE public.assets ADD COLUMN department_id UUID REFERENCES public.departments(id);

-- Enable RLS on all new tables
ALTER TABLE public.asset_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_disposal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for maintenance
CREATE POLICY "Authenticated users can view maintenance records" 
ON public.asset_maintenance FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create maintenance records" 
ON public.asset_maintenance FOR INSERT 
WITH CHECK (auth.uid() = performed_by);

CREATE POLICY "Authenticated users can update maintenance records" 
ON public.asset_maintenance FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Create RLS policies for spare parts
CREATE POLICY "Authenticated users can view spare parts" 
ON public.spare_parts FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage spare parts" 
ON public.spare_parts FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create RLS policies for asset parts
CREATE POLICY "Authenticated users can view asset parts" 
ON public.asset_parts FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create RLS policies for maintenance parts
CREATE POLICY "Authenticated users can view maintenance parts" 
ON public.maintenance_parts FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create RLS policies for disposal
CREATE POLICY "Authenticated users can view disposal records" 
ON public.asset_disposal FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create disposal records" 
ON public.asset_disposal FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create RLS policies for departments
CREATE POLICY "Authenticated users can view departments" 
ON public.departments FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create RLS policies for saved reports
CREATE POLICY "Users can view their own saved reports" 
ON public.saved_reports FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved reports" 
ON public.saved_reports FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved reports" 
ON public.saved_reports FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved reports" 
ON public.saved_reports FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_asset_maintenance_asset_id ON public.asset_maintenance(asset_id);
CREATE INDEX idx_asset_maintenance_scheduled_date ON public.asset_maintenance(scheduled_date);
CREATE INDEX idx_asset_maintenance_status ON public.asset_maintenance(status);
CREATE INDEX idx_spare_parts_part_number ON public.spare_parts(part_number);
CREATE INDEX idx_asset_disposal_asset_id ON public.asset_disposal(asset_id);
CREATE INDEX idx_assets_department_id ON public.assets(department_id);

-- Create trigger for updated_at
CREATE TRIGGER update_asset_maintenance_updated_at
  BEFORE UPDATE ON public.asset_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_spare_parts_updated_at
  BEFORE UPDATE ON public.spare_parts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saved_reports_updated_at
  BEFORE UPDATE ON public.saved_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();