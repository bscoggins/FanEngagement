import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponsiveImage } from './ResponsiveImage';

describe('ResponsiveImage', () => {
  it('renders picture with img and default descriptor', () => {
    render(<ResponsiveImage src="https://cdn.example.com/logo.png" alt="Logo" />);

    const img = screen.getByAltText('Logo');
    const picture = img.parentElement;
    expect(picture?.tagName.toLowerCase()).toBe('picture');
    expect(img.getAttribute('src')).toBe('https://cdn.example.com/logo.png');
    expect(img.getAttribute('srcset')).toBe('https://cdn.example.com/logo.png 1x');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
  });

  it('respects provided srcSet and sizes', () => {
    render(
      <ResponsiveImage
        src="https://cdn.example.com/logo.png"
        srcSet="logo-1x.png 1x, logo-2x.png 2x"
        sizes="(max-width: 600px) 100vw, 300px"
        alt="Logo"
        loading="eager"
      />,
    );

    const img = screen.getByAltText('Logo');
    expect(img.getAttribute('srcset')).toBe('logo-1x.png 1x, logo-2x.png 2x');
    expect(img.getAttribute('sizes')).toBe('(max-width: 600px) 100vw, 300px');
    expect(img.getAttribute('loading')).toBe('eager');
  });

  it('renders provided sources without leaking key prop', () => {
    render(
      <ResponsiveImage
        src="https://cdn.example.com/logo.png"
        alt="Logo"
        sources={[
          {
            key: 'webp',
            srcSet: 'logo.webp 1x, logo@2x.webp 2x',
            type: 'image/webp',
            media: '(min-width: 800px)',
            sizes: '50vw',
          },
        ]}
      />,
    );

    const sources = document.querySelectorAll('source');
    expect(sources).toHaveLength(1);
    const source = sources[0];
    expect(source.getAttribute('srcset')).toBe('logo.webp 1x, logo@2x.webp 2x');
    expect(source.getAttribute('type')).toBe('image/webp');
    expect(source.getAttribute('media')).toBe('(min-width: 800px)');
    expect(source.getAttribute('sizes')).toBe('50vw');
    expect(source.hasAttribute('key')).toBe(false);
  });
});
