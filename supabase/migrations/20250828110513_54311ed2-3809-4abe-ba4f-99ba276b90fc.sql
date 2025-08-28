-- Add assigned_to column to assets table
ALTER TABLE public.assets ADD COLUMN assigned_to UUID REFERENCES public.profiles(user_id);

-- Update RLS policy to allow assigned users to update assets
DROP POLICY IF EXISTS "Authenticated users can update assets" ON public.assets;

CREATE POLICY "Authenticated users can update assets" 
ON public.assets 
FOR UPDATE 
USING (auth.uid() = created_by OR auth.uid() = assigned_to OR auth.uid() IS NOT NULL);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_assets_assigned_to ON public.assets(assigned_to);