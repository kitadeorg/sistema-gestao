// Logo NETSUL CONDO em base64 (gerado a partir de public/logo.svg)
// Gera duas versões: colorida (capa) e branca (cabeçalho das páginas internas)

async function svgParaBase64(svgUrl: string, width: number, height: number, filtro?: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(''); return; }

      // Aplicar filtro CSS se pedido (ex: branco)
      if (filtro) {
        ctx.filter = filtro;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => resolve('');
    img.src = svgUrl;
  });
}

/** Logo colorido — para a capa */
export async function getLogoBase64(): Promise<string> {
  return svgParaBase64('/logo.svg', 640, 153);
}

/** Logo todo branco — para o cabeçalho das páginas internas (fundo laranja) */
export async function getLogoBrancoBase64(): Promise<string> {
  // brightness(0) torna tudo preto, invert(1) inverte para branco
  return svgParaBase64('/logo.svg', 640, 153, 'brightness(0) invert(1)');
}
