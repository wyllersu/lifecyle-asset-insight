-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Add company_id to departments
ALTER TABLE public.departments ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX idx_departments_company_id ON public.departments(company_id);

-- Add company_id to profiles  
ALTER TABLE public.profiles ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX idx_profiles_company_id ON public.profiles(company_id);

-- Create trigger for companies updated_at
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create RLS policies for companies
CREATE POLICY "Users can view their own company" 
ON public.companies 
FOR SELECT 
USING (id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own company" 
ON public.companies 
FOR UPDATE 
USING (id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Update departments RLS policies
DROP POLICY IF EXISTS "Authenticated users can view departments" ON public.departments;
CREATE POLICY "Users can view departments from their company" 
ON public.departments 
FOR SELECT 
USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Create RLS policies for departments management
CREATE POLICY "Users can insert departments in their company" 
ON public.departments 
FOR INSERT 
WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update departments in their company" 
ON public.departments 
FOR UPDATE 
USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete departments in their company" 
ON public.departments 
FOR DELETE 
USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Update units RLS policies to check company through department
DROP POLICY IF EXISTS "Authenticated users can manage units" ON public.units;
DROP POLICY IF EXISTS "Authenticated users can view units" ON public.units;

CREATE POLICY "Users can view units from their company" 
ON public.units 
FOR SELECT 
USING (department_id IN (
  SELECT id FROM public.departments 
  WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
));

CREATE POLICY "Users can insert units in their company" 
ON public.units 
FOR INSERT 
WITH CHECK (department_id IN (
  SELECT id FROM public.departments 
  WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
));

CREATE POLICY "Users can update units in their company" 
ON public.units 
FOR UPDATE 
USING (department_id IN (
  SELECT id FROM public.departments 
  WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
));

CREATE POLICY "Users can delete units in their company" 
ON public.units 
FOR DELETE 
USING (department_id IN (
  SELECT id FROM public.departments 
  WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
));

-- Update profiles RLS policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view profiles from their company" 
ON public.profiles 
FOR SELECT 
USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Update assets RLS policies to check company through department
DROP POLICY IF EXISTS "Authenticated users can view assets" ON public.assets;
CREATE POLICY "Users can view assets from their company" 
ON public.assets 
FOR SELECT 
USING (department_id IN (
  SELECT id FROM public.departments 
  WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
) OR department_id IS NULL);

-- Update other asset policies to respect company boundaries
DROP POLICY IF EXISTS "Authenticated users can update assets" ON public.assets;
CREATE POLICY "Users can update assets from their company" 
ON public.assets 
FOR UPDATE 
USING (department_id IN (
  SELECT id FROM public.departments 
  WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
) OR department_id IS NULL);

-- Insert a default company for existing data
INSERT INTO public.companies (name, description) 
VALUES ('Empresa Principal', 'Empresa padrão para dados existentes')
ON CONFLICT (name) DO NOTHING;

-- Update existing departments to belong to the default company
UPDATE public.departments 
SET company_id = (SELECT id FROM public.companies WHERE name = 'Empresa Principal' LIMIT 1)
WHERE company_id IS NULL;

-- Update existing profiles to belong to the default company  
UPDATE public.profiles 
SET company_id = (SELECT id FROM public.companies WHERE name = 'Empresa Principal' LIMIT 1)
WHERE company_id IS NULL;