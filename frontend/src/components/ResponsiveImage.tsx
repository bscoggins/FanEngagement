import React from 'react';

type PictureSource = {
  srcSet: string;
  type?: string;
  media?: string;
  sizes?: string;
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
  const resolvedSrcSet = srcSet ?? `${src} 1x`;
  const computedSources = sources ?? [];

  return (
    <picture>
      {computedSources.map((source, index) => (
        <source key={`source-${index}`} {...source} />
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
