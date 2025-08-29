-- Create units table
CREATE TABLE public.units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on units
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- Create policies for units
CREATE POLICY "Authenticated users can view units"
ON public.units
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage units"
ON public.units
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Add unit_id column to profiles table
ALTER TABLE public.profiles ADD COLUMN unit_id UUID REFERENCES public.units(id);

-- Add department_id column to profiles table
ALTER TABLE public.profiles ADD COLUMN department_id UUID REFERENCES public.departments(id);

-- Update RLS on profiles to allow users to update their unit
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Add unit_id column to assets table
ALTER TABLE public.assets ADD COLUMN unit_id UUID REFERENCES public.units(id);

-- Update RLS on assets to allow updates by users in the same department/unit
DROP POLICY IF EXISTS "Authenticated users can update assets" ON public.assets;
CREATE POLICY "Authenticated users can update assets"
ON public.assets
FOR UPDATE
USING (
  auth.uid() = created_by OR
  auth.uid() = assigned_to OR
  (SELECT department_id FROM public.profiles WHERE user_id = auth.uid()) = department_id OR
  (SELECT unit_id FROM public.profiles WHERE user_id = auth.uid()) = unit_id OR
  auth.uid() IS NOT NULL
);

-- Update policies for categories to allow management
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Authenticated users can view categories"
ON public.categories
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage categories"
ON public.categories
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX idx_profiles_unit_id ON public.profiles(unit_id);
CREATE INDEX idx_profiles_department_id ON public.profiles(department_id);
CREATE INDEX idx_assets_unit_id ON public.assets(unit_id);
CREATE INDEX idx_units_department_id ON public.units(department_id);

-- Create trigger for updating timestamps on units
CREATE TRIGGER update_units_updated_at
BEFORE UPDATE ON public.units
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();