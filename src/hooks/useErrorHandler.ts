import { useToast } from './use-toast';
import { useCallback } from 'react';

export const useErrorHandler = () => {
  const { toast } = useToast();

  const handleError = useCallback((error: any, defaultMessage = 'Ocorreu um erro inesperado') => {
    console.error('Error caught by handler:', error);
    
    const message = error?.message || defaultMessage;
    
    toast({
      title: "Erro",
      description: message,
      variant: "destructive",
    });
  }, [toast]);

  const handleSuccess = useCallback((message: string) => {
    toast({
      title: "Sucesso",
      description: message,
    });
  }, [toast]);

  return { handleError, handleSuccess };
};