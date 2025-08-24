-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create policy for categories - everyone can read, only admins can modify
CREATE POLICY "Anyone can view categories"
ON public.categories
FOR SELECT
USING (true);

-- Create assets table
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  serial_number TEXT,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  purchase_value DECIMAL(15,2) NOT NULL,
  purchase_date DATE NOT NULL,
  residual_value DECIMAL(15,2) DEFAULT 0,
  useful_life_years INTEGER NOT NULL DEFAULT 5,
  location_type TEXT CHECK (location_type IN ('rfid', 'gps', 'manual')) DEFAULT 'manual',
  current_location TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive', 'disposed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for assets
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Create policies for assets
CREATE POLICY "Authenticated users can view assets"
ON public.assets
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create assets"
ON public.assets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update assets"
ON public.assets
FOR UPDATE
TO authenticated
USING (true);

-- Create documents table for file uploads
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('invoice', 'manual', 'warranty', 'other')),
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create policies for documents
CREATE POLICY "Authenticated users can view documents"
ON public.documents
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can upload documents"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

-- Create function to calculate depreciation
CREATE OR REPLACE FUNCTION calculate_depreciation(
  purchase_value DECIMAL,
  residual_value DECIMAL,
  useful_life_years INTEGER,
  purchase_date DATE
)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
DECLARE
  years_passed DECIMAL;
  annual_depreciation DECIMAL;
  total_depreciation DECIMAL;
BEGIN
  -- Calculate years passed since purchase
  years_passed := EXTRACT(EPOCH FROM (CURRENT_DATE - purchase_date)) / (365.25 * 24 * 3600);
  
  -- Calculate annual depreciation (straight line method)
  annual_depreciation := (purchase_value - residual_value) / useful_life_years;
  
  -- Calculate total depreciation
  total_depreciation := annual_depreciation * LEAST(years_passed, useful_life_years);
  
  RETURN GREATEST(0, total_depreciation);
END;
$$;

-- Create function to calculate current book value
CREATE OR REPLACE FUNCTION calculate_book_value(
  purchase_value DECIMAL,
  residual_value DECIMAL,
  useful_life_years INTEGER,
  purchase_date DATE
)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
DECLARE
  depreciation DECIMAL;
BEGIN
  depreciation := calculate_depreciation(purchase_value, residual_value, useful_life_years, purchase_date);
  RETURN purchase_value - depreciation;
END;
$$;

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO public.categories (name, description) VALUES
('Mobiliário', 'Móveis e equipamentos de escritório'),
('TI', 'Equipamentos de tecnologia da informação'),
('Maquinário', 'Máquinas e equipamentos industriais'),
('Veículos', 'Automóveis e veículos da empresa'),
('Ferramentas', 'Ferramentas e equipamentos de trabalho');