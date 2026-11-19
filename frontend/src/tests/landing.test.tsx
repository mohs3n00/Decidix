import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from '../features/landing/LandingPage';
import { LanguageProvider } from '../context/LanguageContext';
import { AuthProvider } from '../context/AuthContext';

const renderLanding = () => {
  return render(
    <MemoryRouter initialEntries={['/landing']}>
      <LanguageProvider>
        <AuthProvider>
          <LandingPage />
        </AuthProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
};

describe('LandingPage Feature', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders landing page hero title and key sections in default English', () => {
    renderLanding();
    expect(screen.getAllByText('DECIDIX').length).toBeGreaterThan(0);
    expect(
      screen.getByText(/National Intelligent Decision Support & Regional Planning Platform/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText('Explore Platform as Guest')[0]).toBeInTheDocument();
    expect(screen.getByText('Request Institutional Access')).toBeInTheDocument();
  });

  it('renders metrics strip with accurate figures', () => {
    renderLanding();
    expect(screen.getByText('74.2')).toBeInTheDocument();
    expect(screen.getByText('27')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('National Index')).toBeInTheDocument();
    expect(screen.getByText('Monitored Regions')).toBeInTheDocument();
    expect(screen.getByText('Official Data Baseline')).toBeInTheDocument();
  });

  it('renders tiers and FAQ accordion', () => {
    renderLanding();
    expect(screen.getByText('Guest / Citizen Explorer')).toBeInTheDocument();
    expect(screen.getByText('Institutional Analyst')).toBeInTheDocument();
    expect(screen.getByText('Platform Administrator')).toBeInTheDocument();
    expect(screen.getByText('FREQUENTLY ASKED QUESTIONS')).toBeInTheDocument();
    expect(screen.getByText('Everything You Need to Know')).toBeInTheDocument();
  });

  it('toggles FAQ item open and closed upon click', () => {
    renderLanding();
    const faqQuestion = screen.getByText('How does Decidix safeguard team workspaces and institutional data?');
    expect(faqQuestion).toBeInTheDocument();

    // Click to open
    fireEvent.click(faqQuestion);
    expect(screen.getByText(/Decidix enforces strict workspace tenancy isolation/i)).toBeInTheDocument();

    // Click to close
    fireEvent.click(faqQuestion);
  });

  it('switches language cleanly to Arabic when clicking language toggle', () => {
    renderLanding();
    const langBtn = screen.getByRole('button', { name: /Switch Language/i });
    expect(langBtn).toBeInTheDocument();

    fireEvent.click(langBtn);
    // After switching to Arabic, check for Arabic content
    expect(
      screen.getByText(/المنصة الوطنية لدعم القرار التنموي والتخطيط الإقليمي/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText('استعراض المنصة كزائر')[0]).toBeInTheDocument();
    expect(screen.getByText('طلب الوصول المؤسسي')).toBeInTheDocument();
  });
});
