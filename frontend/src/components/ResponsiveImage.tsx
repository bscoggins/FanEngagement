import React from 'react';

type PictureSource = {
  srcSet: string;
  type?: string;
  media?: string;
  sizes?: string;
};

const buildDensitySrcSet = (src: string) => {
  try {
    const url = new URL(src);
    const oneX = new URL(url.toString());
    const twoX = new URL(url.toString());
    oneX.searchParams.set('dpr', '1');
    twoX.searchParams.set('dpr', '2');
    return `${oneX.toString()} 1x, ${twoX.toString()} 2x`;
  } catch {
    return `${src} 1x`;
  }
};

const inferImageType = (src: string): PictureSource['type'] => {
  const normalized = src.split('?')[0].toLowerCase();
  if (normalized.endsWith('.webp')) return 'image/webp';
  if (normalized.endsWith('.avif')) return 'image/avif';
  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) return 'image/jpeg';
  if (normalized.endsWith('.svg')) return 'image/svg+xml';
  return undefined;
};

export interface ResponsiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  sources?: PictureSource[];
}

/**
 * Lightweight responsive image wrapper that adds srcset/sizes support,
 * optional modern format sources, and lazy loading defaults.
 */
export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  loading = 'lazy',
  decoding = 'async',
  sizes,
  sources,
  srcSet,
  ...rest
}) => {
  const inferredType = inferImageType(src);
  const resolvedSrcSet = srcSet ?? buildDensitySrcSet(src);

  const buildSources = () => {
    if (sources) return sources;
    if (inferredType && (inferredType === 'image/webp' || inferredType === 'image/avif')) {
      return [{ srcSet: resolvedSrcSet, type: inferredType }];
    }
    return [];
  };

  const computedSources = buildSources();

  return (
    <picture>
      {computedSources.map((source, index) => (
        <source key={index} {...source} />
      ))}
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding={decoding}
        sizes={sizes}
        srcSet={resolvedSrcSet}
        {...rest}
      />
    </picture>
  );
};
