'use client';

import React from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { useGetProductQrCode } from '@/queries/products/get-product-qr-code';
import { useGetProductBarcode } from '@/queries/products/get-product-barcode';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Download, Printer } from 'lucide-react';
import { toast } from '../../ui/use-toast';
import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer';

interface ProductCodesProps {
  productId: string;
  productNumber: string;
  productName: string;
}

export default function ProductCodes({ productId, productNumber, productName }: ProductCodesProps) {
  const { data: qrCodeData, isLoading: qrLoading, error: qrError } = useGetProductQrCode(productId);
  const { data: barcodeData, isLoading: barcodeLoading, error: barcodeError } = useGetProductBarcode(productId);

  // PDF Styles
  const styles = StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      padding: 30,
    },
    header: {
      fontSize: 24,
      textAlign: 'center',
      marginBottom: 30,
      fontWeight: 'bold',
    },
    codesContainer: {
      flexDirection: 'column',
      alignItems: 'center',
      marginTop: 20,
    },
    codeSection: {
      alignItems: 'center',
      marginBottom: 30,
    },
    codeTitle: {
      fontSize: 18,
      marginBottom: 15,
      fontWeight: 'bold',
    },
    codeImage: {
      width: 200,
      height: 200,
      marginBottom: 15,
    },
    barcodeImage: {
      width: 300,
      height: 100,
      marginBottom: 15,
    },
    productInfo: {
      marginTop: 15,
      textAlign: 'center',
    },
    productText: {
      fontSize: 12,
      marginBottom: 5,
    },
    label: {
      fontWeight: 'bold',
    },
  });

  const handleDownloadQR = async () => {
    try {
      // Convert QR code SVG to image
      const qrSvg = document.getElementById('qr-code-canvas') as unknown as SVGElement;
      if (!qrSvg) {
        throw new Error('QR code SVG not found');
      }

      // Create a canvas to convert SVG to image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      canvas.width = 200;
      canvas.height = 200;

      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(qrSvg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      // Create image from SVG
      const img = new window.Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        const qrImageData = canvas.toDataURL('image/png');
        URL.revokeObjectURL(url);
        
        // Create PDF with the image
        createQRPDF(qrImageData);
      };
      img.src = url;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download QR code PDF",
        variant: "destructive",
      });
    }
  };

    const createQRPDF = async (qrImageData: string) => {
    try {
      // Create PDF Document for QR Code
      const QRCodePDF = () => (
        <Document>
          <Page size="A4" style={styles.page}>
            <Text style={styles.header}>QR Code</Text>
            <View style={styles.codesContainer}>
              <View style={styles.codeSection}>
                <Text style={styles.codeTitle}>Product QR Code</Text>
                <Image src={qrImageData} style={styles.codeImage} />
                <View style={styles.productInfo}>
                  <Text style={styles.productText}>
                    <Text style={styles.label}>Product:</Text> {productName}
                  </Text>
                  <Text style={styles.productText}>
                    <Text style={styles.label}>SKU:</Text> {productNumber}
                  </Text>
                  <Text style={styles.productText}>
                    <Text style={styles.label}>Generated:</Text> {new Date().toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
          </Page>
        </Document>
      );

      const blob = await pdf(<QRCodePDF />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-code-${productNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "QR code PDF downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download QR code PDF",
        variant: "destructive",
      });
    }
  };

  const handleDownloadBarcode = async () => {
    try {
      // Convert barcode SVG to image (similar to QR code approach)
      const barcodeSvg = document.getElementById('barcode-canvas') as unknown as SVGElement;
      if (!barcodeSvg) {
        throw new Error('Barcode SVG not found');
      }

      // Create a canvas to convert SVG to image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      canvas.width = 300;
      canvas.height = 100;

      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(barcodeSvg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      // Create image from SVG
      const img = new window.Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        const barcodeImageData = canvas.toDataURL('image/png');
        URL.revokeObjectURL(url);
        
        // Create PDF with the image
        createBarcodePDF(barcodeImageData);
      };
      img.src = url;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download barcode PDF",
        variant: "destructive",
      });
    }
  };

    const createBarcodePDF = async (barcodeImageData: string) => {
    try {
      // Create PDF Document for Barcode
      const BarcodePDF = () => (
        <Document>
          <Page size="A4" style={styles.page}>
            <Text style={styles.header}>Barcode</Text>
            <View style={styles.codesContainer}>
              <View style={styles.codeSection}>
                <Text style={styles.codeTitle}>Product Barcode</Text>
                <Image src={barcodeImageData} style={styles.barcodeImage} />
                <View style={styles.productInfo}>
                  <Text style={styles.productText}>
                    <Text style={styles.label}>Product:</Text> {productName}
                  </Text>
                  <Text style={styles.productText}>
                    <Text style={styles.label}>SKU:</Text> {productNumber}
                  </Text>
                  <Text style={styles.productText}>
                    <Text style={styles.label}>Generated:</Text> {new Date().toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
          </Page>
        </Document>
      );

      const blob = await pdf(<BarcodePDF />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `barcode-${productNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Barcode PDF downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download barcode PDF",
        variant: "destructive",
      });
    }
  };

  const handlePrintCodes = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const qrCanvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
      const barcodeCanvas = document.getElementById('barcode-canvas') as HTMLCanvasElement;
      
      if (qrCanvas && barcodeCanvas) {
        const qrImage = qrCanvas.toDataURL();
        const barcodeImage = barcodeCanvas.toDataURL();
        
        printWindow.document.write(`
          <html>
            <head>
              <title>Product Codes - ${productName}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .codes-container { display: flex; gap: 40px; justify-content: center; }
                .code-section { text-align: center; }
                .code-section h3 { margin-bottom: 10px; }
                .code-section img { border: 1px solid #ccc; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>
              <h1 style="text-align: center; margin-bottom: 30px;">Product Codes</h1>
              <div class="codes-container">
                <div class="code-section">
                  <h3>QR Code</h3>
                  <img src="${qrImage}" alt="QR Code" />
                  <p><strong>Product:</strong> ${productName}</p>
                  <p><strong>SKU:</strong> ${productNumber}</p>
                </div>
                <div class="code-section">
                  <h3>Barcode</h3>
                  <img src="${barcodeImage}" alt="Barcode" />
                  <p><strong>Product:</strong> ${productName}</p>
                  <p><strong>SKU:</strong> ${productNumber}</p>
                </div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  if (qrLoading || barcodeLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">Loading codes...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (qrError || barcodeError) {
    return (
      <Card>
        <CardHeader className='border-b p-4'>
          <CardTitle className="text-xl">Product Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">
            Error loading product codes. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className='border-b p-4 mb-4'>
        <CardTitle className="flex items-center justify-between text-lg">
          Product Codes
          {/* <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintCodes}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div> */}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* QR Code Section */}
          <div className="flex flex-col items-center space-y-4">
            <h3 className="text-lg font-semibold">QR Code</h3>
                         <div className="bg-white p-4 rounded-lg border">
               <QRCodeSVG
                 id="qr-code-canvas"
                 value={JSON.stringify(qrCodeData)}
                 size={200}
                 level="M"
                 includeMargin={true}
               />
             </div>
                         <Button
               variant="outline"
               size="sm"
               onClick={handleDownloadQR}
               className="flex items-center gap-2"
             >
               <Download className="h-4 w-4" />
               Download QR Code PDF
             </Button>
            <div className="text-sm text-gray-600 text-center">
              <p><strong>Product:</strong> {productName}</p>
              <p><strong>SKU:</strong> {productNumber}</p>
            </div>
          </div>

          {/* Barcode Section */}
          <div className="flex flex-col items-center space-y-4 border-l">
            <h3 className="text-lg font-semibold">Barcode</h3>
            <div className="bg-white p-4 rounded-lg border">
              <Barcode
                id="barcode-canvas"
                value={productNumber}
                width={2}
                height={100}
                fontSize={14}
                margin={10}
                displayValue={true}
              />
            </div>
                         <Button
               variant="outline"
               size="sm"
               onClick={handleDownloadBarcode}
               className="flex items-center gap-2"
             >
               <Download className="h-4 w-4" />
               Download Barcode PDF
             </Button>
            <div className="text-sm text-gray-600 text-center">
              <p><strong>Product:</strong> {productName}</p>
              <p><strong>SKU:</strong> {productNumber}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 