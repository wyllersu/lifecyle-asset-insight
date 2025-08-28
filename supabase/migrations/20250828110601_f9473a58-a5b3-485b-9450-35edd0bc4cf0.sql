-- Fix security issue: Set search_path for all functions to prevent malicious code injection

-- Fix function calculate_depreciation
CREATE OR REPLACE FUNCTION public.calculate_depreciation(purchase_value numeric, residual_value numeric, useful_life_years integer, purchase_date date)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

-- Fix function calculate_book_value
CREATE OR REPLACE FUNCTION public.calculate_book_value(purchase_value numeric, residual_value numeric, useful_life_years integer, purchase_date date)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  depreciation DECIMAL;
BEGIN
  depreciation := calculate_depreciation(purchase_value, residual_value, useful_life_years, purchase_date);
  RETURN purchase_value - depreciation;
END;
$function$;

-- Fix function update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;