import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const footerSections: FooterSection[] = [
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '#' },
      { label: 'Help Center', href: '#' },
      { label: 'Blog', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Cookie Policy', href: '#' },
    ],
  },
];

const socialLinks: FooterLink[] = [
  { label: 'Twitter', href: '#', external: true },
  { label: 'LinkedIn', href: '#', external: true },
  { label: 'GitHub', href: '#', external: true },
];

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-container">
        {/* Brand section */}
        <div className="footer-brand">
          <div className="footer-logo">
            {/* Placeholder for future logo image */}
            <div className="footer-logo-placeholder" aria-hidden="true">
              <span className="footer-logo-icon">⚡</span>
            </div>
            <span className="footer-logo-text">FanEngagement</span>
          </div>
          <p className="footer-tagline">
            Empowering fan communities with transparent governance.
          </p>
          
          {/* Social links */}
          <div className="footer-social">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="footer-social-link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Follow us on ${link.label}`}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Link sections */}
        <div className="footer-sections">
          {footerSections.map((section) => (
            <div key={section.title} className="footer-section">
              <h3 className="footer-section-title">{section.title}</h3>
              <ul className="footer-section-links">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        className="footer-link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.label}
                      </a>
                    ) : link.href.startsWith('#') ? (
                      <a href={link.href} className="footer-link">
                        {link.label}
                      </a>
                    ) : (
                      <Link to={link.href} className="footer-link">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footer-bottom">
        <div className="footer-bottom-container">
          <p className="footer-copyright">
            © {currentYear} FanEngagement. All rights reserved.
          </p>
          <p className="footer-built-with">
            Built with transparency in mind.
          </p>
        </div>
      </div>
    </footer>
  );
};
