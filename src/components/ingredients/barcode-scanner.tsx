"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"
import { nanoid } from "nanoid"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void
  onScanError?: (error: unknown) => void
  onClose: () => void
}

export function BarcodeScanner({ onScanSuccess, onScanError, onClose }: BarcodeScannerProps) {
  const [scannerId] = useState(`scanner-${nanoid()}`)
  const [permissionError, setPermissionError] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  
  useEffect(() => {
    // Initialize the scanner
    const html5QrCode = new Html5Qrcode(scannerId)
    scannerRef.current = html5QrCode

    const config = { 
      fps: 10, 
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      formatsToSupport: [ 
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE 
      ]
    }

    html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        // Stop scanning after success to prevent multiple triggers
        if (scannerRef.current?.isScanning) {
           scannerRef.current.stop().then(() => {
             scannerRef.current?.clear()
             onScanSuccess(decodedText)
           }).catch(err => console.error("Failed to stop scanner", err))
        }
      },
      (errorMessage) => {
        if (onScanError) onScanError(errorMessage)
      }
    ).catch((err) => {
      console.error("Error starting scanner", err)
      setPermissionError(true)
    })

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().then(() => {
            scannerRef.current?.clear()
        }).catch(err => {
            // Ignore stop errors on unmount
            console.log("Scanner stop error", err)
        })
      } else {
          scannerRef.current?.clear()
      }
    }
  }, [scannerId, onScanSuccess, onScanError])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative w-full max-w-md bg-background rounded-lg overflow-hidden p-4 mx-4">
        <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 z-10 text-white bg-black/20 hover:bg-black/40"
            onClick={onClose}
        >
            <X className="h-6 w-6" />
        </Button>
        
        <div className="text-center mb-4">
            <h3 className="font-semibold text-lg">Scan Barcode</h3>
            <p className="text-sm text-muted-foreground">Point your camera at a product barcode</p>
        </div>

        {permissionError ? (
            <div className="text-center py-8 text-destructive">
                <p>Camera permission denied or camera not available.</p>
                <Button variant="outline" className="mt-4" onClick={onClose}>Close</Button>
            </div>
        ) : (
            <div id={scannerId} className="w-full overflow-hidden rounded-md bg-black" />
        )}
      </div>
    </div>
  )
}
