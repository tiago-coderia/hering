/**
 * Compressão de fotos no cliente antes do armazenamento no IndexedDB (RD04).
 * Reduz a resolução máxima para 1600px e comprime com qualidade JPEG 0.8.
 */
export async function compressImage(
  file: File | Blob,
  maxDimension = 1600,
  quality = 0.8
): Promise<{ blob: Blob; mimeType: string; tamanhoBytes: number }> {
  return new Promise((resolve) => {
    // Se não estiver em ambiente de navegador com suporte a Canvas/Image, retorna original
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve({
        blob: file,
        mimeType: file.type || 'image/jpeg',
        tamanhoBytes: file.size,
      });
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;

      // Redimensionamento proporcional
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback gracioso
        resolve({
          blob: file,
          mimeType: file.type || 'image/jpeg',
          tamanhoBytes: file.size,
        });
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (compressedBlob) => {
          if (compressedBlob) {
            resolve({
              blob: compressedBlob,
              mimeType: 'image/jpeg',
              tamanhoBytes: compressedBlob.size,
            });
          } else {
            resolve({
              blob: file,
              mimeType: file.type || 'image/jpeg',
              tamanhoBytes: file.size,
            });
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Em caso de falha na leitura da imagem, retorna o arquivo original sem quebrar o fluxo
      resolve({
        blob: file,
        mimeType: file.type || 'image/jpeg',
        tamanhoBytes: file.size,
      });
    };

    img.src = objectUrl;
  });
}

