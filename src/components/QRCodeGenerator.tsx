import React from 'react';
import QRCode from 'react-qr-code';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Download } from 'lucide-react';

interface QRCodeGeneratorProps {
  assetCode: string;
  assetName: string;
  size?: number;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ 
  assetCode, 
  assetName, 
  size = 200 
}) => {
  const qrValue = `ASSET:${assetCode}`;

  const downloadQRCode = () => {
    const svg = document.getElementById(`qr-${assetCode}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = size;
    canvas.height = size;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0);
        
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `qr-code-${assetCode}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <Card className="w-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <QrCode className="h-4 w-4" />
          QR Code - {assetName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center p-4 bg-white rounded-lg">
          <QRCode
            id={`qr-${assetCode}`}
            value={qrValue}
            size={size}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox={`0 0 ${size} ${size}`}
          />
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Código: {assetCode}</p>
          <Button size="sm" variant="outline" onClick={downloadQRCode}>
            <Download className="h-4 w-4 mr-2" />
            Baixar QR Code
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QRCodeGenerator;