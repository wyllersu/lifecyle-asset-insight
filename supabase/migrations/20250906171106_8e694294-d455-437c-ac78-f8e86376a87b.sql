-- Fix company isolation issues in RLS policies

-- Update assets policies to properly isolate by company
DROP POLICY IF EXISTS "Users can view assets from their company" ON public.assets;
DROP POLICY IF EXISTS "Users can update assets from their company" ON public.assets;

CREATE POLICY "Users can view assets from their company" 
ON public.assets 
FOR SELECT 
USING (
  department_id IN (
    SELECT d.id 
    FROM departments d 
    JOIN profiles p ON p.company_id = d.company_id 
    WHERE p.user_id = auth.uid()
  ) 
  OR department_id IS NULL
);

CREATE POLICY "Users can update assets from their company" 
ON public.assets 
FOR UPDATE 
USING (
  department_id IN (
    SELECT d.id 
    FROM departments d 
    JOIN profiles p ON p.company_id = d.company_id 
    WHERE p.user_id = auth.uid()
  ) 
  OR department_id IS NULL
);

-- Fix documents policies to isolate by company
DROP POLICY IF EXISTS "Authenticated users can view documents" ON public.documents;

CREATE POLICY "Users can view documents from their company assets" 
ON public.documents 
FOR SELECT 
USING (
  asset_id IN (
    SELECT a.id 
    FROM assets a 
    JOIN departments d ON a.department_id = d.id 
    JOIN profiles p ON p.company_id = d.company_id 
    WHERE p.user_id = auth.uid()
  ) 
  OR asset_id IS NULL
);

-- Fix profiles policies to remove duplicate
DROP POLICY IF EXISTS "Users can view profiles from their company" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles for asset management" ON public.profiles;

CREATE POLICY "Users can view profiles from their company" 
ON public.profiles 
FOR SELECT 
USING (
  company_id = (
    SELECT company_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  ) 
  OR auth.uid() = user_id
);