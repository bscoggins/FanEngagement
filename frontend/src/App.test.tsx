import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /FanEngagement/i, level: 1 })).toBeInTheDocument();
  });

  it('displays the welcome message on the home page', () => {
    render(<App />);
    expect(screen.getByText(/Welcome to FanEngagement/i)).toBeInTheDocument();
  });

  it('shows login link when not authenticated', () => {
    render(<App />);
    const loginLinks = screen.getAllByText(/Login/i);
    expect(loginLinks.length).toBeGreaterThan(0);
  });
});
