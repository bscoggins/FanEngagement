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
 *
 * @example
 * ```tsx
 * <ResponsiveImage
 *   src="/images/hero-fallback.jpg"
 *   alt="Fans celebrating in the stadium"
 *   sizes="(min-width: 1024px) 800px, 100vw"
 *   sources={[
 *     {
 *       srcSet: "/images/hero-large.webp 2x, /images/hero.webp 1x",
 *       type: "image/webp",
 *       media: "(min-width: 1024px)",
 *       sizes: "(min-width: 1024px) 800px, 100vw",
 *     },
 *     {
 *       srcSet: "/images/hero-large.jpg 2x, /images/hero.jpg 1x",
 *       type: "image/jpeg",
 *       media: "(min-width: 1024px)",
 *       sizes: "(min-width: 1024px) 800px, 100vw",
 *     },
 *   ]}
 * />
 * ```
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
      {computedSources.map((source) => {
        const { key, ...sourceProps } = source;
        return (
          <source
            key={key ?? sourceProps.srcSet ?? `${sourceProps.type ?? 'source'}-${sourceProps.media ?? 'all'}`}
            {...sourceProps}
          />
        );
      })}
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
