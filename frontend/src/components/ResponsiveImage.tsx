import React from 'react';

type PictureSource = {
  srcSet: string;
  type?: string;
  media?: string;
  sizes?: string;
  key?: string;
};

export interface ResponsiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  sources?: PictureSource[];
  defaultDescriptor?: string;
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
  defaultDescriptor = '1x',
  ...rest
}) => {
  const resolvedSrcSet = srcSet ?? `${src} ${defaultDescriptor}`;
  const computedSources = sources ?? [];

  return (
    <picture>
      {computedSources.map((source, index) => (
        <source
          key={source.key ?? source.srcSet ?? `${source.type ?? 'source'}-${source.media ?? 'all'}`}
          {...source}
        />
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
