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
    const oneX = new URL(url);
    const twoX = new URL(url);
    oneX.searchParams.set('dpr', '1');
    twoX.searchParams.set('dpr', '2');
    return `${oneX.toString()} 1x, ${twoX.toString()} 2x`;
  } catch {
    return `${src} 1x`;
  }
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
  const resolvedSrcSet = srcSet ?? buildDensitySrcSet(src);
  const computedSources = sources ?? [];

  return (
    <picture>
      {computedSources.map((source, index) => (
        <source key={`${source.type ?? 'source'}-${index}`} {...source} />
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
