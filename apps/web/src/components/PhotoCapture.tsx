'use client';

import { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { compressImage } from '../lib/imageCompression';

export interface CapturedPhoto {
  id: string;
  blob: Blob;
  mimeType: string;
  tamanhoBytes: number;
  previewUrl: string;
}

interface PhotoCaptureProps {
  label?: string;
  required?: boolean;
  photos: CapturedPhoto[];
  onAddPhoto: (photo: CapturedPhoto) => void;
  onRemovePhoto: (id: string) => void;
  maxPhotos?: number;
}

export function PhotoCapture({
  label = 'Evidência Fotográfica',
  required = false,
  photos,
  onAddPhoto,
  onRemovePhoto,
  maxPhotos = 3,
}: PhotoCaptureProps) {
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setCompressing(true);
    try {
      for (let i = 0; i < files.length; i++) {
        if (photos.length + i >= maxPhotos) break;

        const file = files[i];
        // Compressão automática no cliente (RD04)
        const compressed = await compressImage(file, 1600, 0.8);
        const photoId = crypto.randomUUID();
        const previewUrl = URL.createObjectURL(compressed.blob);

        onAddPhoto({
          id: photoId,
          blob: compressed.blob,
          mimeType: compressed.mimeType,
          tamanhoBytes: compressed.tamanhoBytes,
          previewUrl,
        });
      }
    } finally {
      setCompressing(false);
      // Limpa os inputs para permitir selecionar a mesma foto novamente se necessário
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-medium text-slate-700">
        <span>
          {label} {required && <strong className="text-red-500">* (Obrigatório)</strong>}
        </span>
        <span className="text-slate-400">
          {photos.length}/{maxPhotos} fotos
        </span>
      </div>

      {/* Grid de Previews de Fotos Capturadas */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((foto) => (
          <div
            key={foto.id}
            className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100 group shadow-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto.previewUrl}
              alt="Evidência"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onRemovePhoto(foto.id)}
              className="absolute top-1 right-1 p-1 bg-red-600/80 hover:bg-red-700 text-white rounded-full shadow-md"
              title="Remover foto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] text-white text-center py-0.5">
              {(foto.tamanhoBytes / 1024).toFixed(0)} KB
            </div>
          </div>
        ))}

        {/* Botões de Ação de Captura */}
        {photos.length < maxPhotos && (
          <>
            {/* Input Câmera Nativa */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              id="camera-input"
            />

            {/* Input Galeria / Arquivos */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
              id="gallery-input"
            />

            <div className="flex gap-1.5 aspect-square">
              {/* Botão Câmera */}
              <button
                type="button"
                disabled={compressing}
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center p-2 rounded-lg border-2 border-dashed border-brand-500/30 hover:border-brand-500 bg-brand-50 text-brand-500 text-[11px] font-medium transition-colors"
                title="Tirar foto com a câmera"
              >
                {compressing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-4 h-4 mb-1" />
                    <span>Câmera</span>
                  </>
                )}
              </button>

              {/* Botão Galeria */}
              <button
                type="button"
                disabled={compressing}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center p-2 rounded-lg border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 text-slate-600 text-[11px] font-medium transition-colors"
                title="Escolher imagem da galeria"
              >
                <ImageIcon className="w-4 h-4 mb-1" />
                <span>Galeria</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

