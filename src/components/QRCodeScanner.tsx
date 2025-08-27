import React, { useRef, useEffect, useState } from 'react';
import QrScanner from 'qr-scanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, CameraOff, Scan } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QRCodeScannerProps {
  onScan: (result: string) => void;
  onAssetFound?: (assetCode: string) => void;
  className?: string;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ 
  onScan, 
  onAssetFound, 
  className 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [lastScan, setLastScan] = useState<string>('');

  useEffect(() => {
    checkCameraAvailability();
    return () => {
      stopScanning();
    };
  }, []);

  const checkCameraAvailability = async () => {
    try {
      const hasCamera = await QrScanner.hasCamera();
      setHasCamera(hasCamera);
    } catch (error) {
      console.error('Erro ao verificar câmera:', error);
      setHasCamera(false);
    }
  };

  const startScanning = async () => {
    if (!videoRef.current || !hasCamera) return;

    try {
      scannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          const code = result.data;
          setLastScan(code);
          onScan(code);

          // Check if it's an asset QR code
          if (code.startsWith('ASSET:')) {
            const assetCode = code.replace('ASSET:', '');
            onAssetFound?.(assetCode);
          }
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment', // Use back camera if available
        }
      );

      await scannerRef.current.start();
      setIsScanning(true);
    } catch (error) {
      console.error('Erro ao iniciar scanner:', error);
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const toggleScanning = () => {
    if (isScanning) {
      stopScanning();
    } else {
      startScanning();
    }
  };

  if (!hasCamera) {
    return (
      <Card className={cn("w-full max-w-md", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CameraOff className="h-5 w-5" />
            Scanner QR Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CameraOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Câmera não disponível ou não permitida
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="h-5 w-5" />
          Scanner QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full h-64 bg-black rounded-lg object-cover"
            playsInline
            muted
          />
          {!isScanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
              <Camera className="h-12 w-12 text-white" />
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <Button onClick={toggleScanning} variant={isScanning ? "destructive" : "default"}>
            {isScanning ? (
              <>
                <CameraOff className="h-4 w-4 mr-2" />
                Parar Scanner
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Iniciar Scanner
              </>
            )}
          </Button>
        </div>

        {lastScan && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Último scan:</p>
            <Badge variant="outline" className="break-all">
              {lastScan}
            </Badge>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center">
          Posicione o QR code dentro da área da câmera para fazer a leitura
        </div>
      </CardContent>
    </Card>
  );
};

export default QRCodeScanner;