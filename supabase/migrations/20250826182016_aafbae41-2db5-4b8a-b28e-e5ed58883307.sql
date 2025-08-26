-- Create asset_documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('asset_documents', 'asset_documents', true, 52428800, ARRAY['image/*', 'application/pdf']);

-- Create storage policies for asset_documents bucket
CREATE POLICY "Authenticated users can upload asset documents"
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'asset_documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view asset documents"
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'asset_documents');

CREATE POLICY "Authenticated users can update their own asset documents"
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'asset_documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete their own asset documents"
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'asset_documents' AND auth.uid() IS NOT NULL);

-- Create asset_audit_log table
CREATE TABLE public.asset_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on asset_audit_log
ALTER TABLE public.asset_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies for asset_audit_log
CREATE POLICY "Authenticated users can view audit logs"
ON public.asset_audit_log 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create audit logs"
ON public.asset_audit_log 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add rfid_id column to assets table
ALTER TABLE public.assets ADD COLUMN rfid_id TEXT;

-- Create index for better performance
CREATE INDEX idx_asset_audit_log_asset_id ON public.asset_audit_log(asset_id);
CREATE INDEX idx_asset_audit_log_created_at ON public.asset_audit_log(created_at DESC);