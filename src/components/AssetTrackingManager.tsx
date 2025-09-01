import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, QrCode } from 'lucide-react';
import GoogleAssetMap from './GoogleAssetMap';
import QRCodeScanner from './QRCodeScanner';
import AssetScanPopup from './AssetScanPopup';

const AssetTrackingManager = () => {
  const [activeSubTab, setActiveSubTab] = useState('map');
  const [scannedAssetCode, setScannedAssetCode] = useState<string | null>(null);

  const handleScan = (result: string) => {
    console.log('QR Code escaneado:', result);
  };

  const handleAssetFound = (assetCode: string) => {
    setScannedAssetCode(assetCode);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-foreground">Rastreamento de Ativos</h2>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="map" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Mapa de Ativos
          </TabsTrigger>
          <TabsTrigger value="scanner" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Scanner QR Code
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="space-y-6">
          <GoogleAssetMap />
        </TabsContent>

        <TabsContent value="scanner" className="space-y-6">
          <div className="flex justify-center">
            <QRCodeScanner 
              onScan={handleScan}
              onAssetFound={handleAssetFound}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Asset Scan Popup */}
      {scannedAssetCode && (
        <AssetScanPopup 
          assetCode={scannedAssetCode}
          onClose={() => setScannedAssetCode(null)}
        />
      )}
    </div>
  );
};

export default AssetTrackingManager;