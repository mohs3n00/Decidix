import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { DecidixIcon } from '../components/DecidixIcon';
import { TwoToneHeading } from '../components/TwoToneHeading';
import { PriorityBadge } from '../components/PriorityBadge';
import { MetricCard } from '../components/MetricCard';
import { HeroCard } from '../components/HeroCard';
import { ScoreRing } from '../components/ScoreRing';
import { DecidixChip } from '../components/DecidixChip';
import { DecidixButton } from '../components/DecidixButton';
import { StatWell } from '../components/StatWell';

describe('Decidix Core Components', () => {
  it('renders DecidixIcon without crashing', () => {
    const { container } = render(<DecidixIcon name="overview" size={24} />);
    const iconSpan = container.querySelector('span[role="img"]');
    expect(iconSpan).toBeInTheDocument();
  });

  it('renders TwoToneHeading with first word and second word styling', () => {
    render(<TwoToneHeading eyebrow="REGIONAL METRICS" first="Regional" second="Overview" level={1} />);
    expect(screen.getByText('REGIONAL METRICS')).toBeInTheDocument();
    expect(screen.getByText('Regional')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });

  it('renders PriorityBadge with correct priority class label', () => {
    render(<PriorityBadge priority="critical" />);
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('renders MetricCard with label and value', () => {
    render(
      <MetricCard
        metric={{
          key: 'literacy_rate',
          label: 'Literacy Rate',
          value: 94.5,
          unit: 'percent',
          change: 1.2,
          higher_is_better: true,
        }}
      />
    );
    expect(screen.getByText('Literacy Rate')).toBeInTheDocument();
    expect(screen.getByText('94.5%')).toBeInTheDocument();
    expect(screen.getByText('1.2%')).toBeInTheDocument();
  });

  it('renders HeroCard with cyan glow and content', () => {
    const { container } = render(
      <HeroCard className="p-6">
        <div>Hero Content</div>
      </HeroCard>
    );
    expect(screen.getByText('Hero Content')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('decidix-hero-card');
  });

  it('renders ScoreRing with correct score', () => {
    render(<ScoreRing score={82} />);
    expect(screen.getByText('82')).toBeInTheDocument();
  });

  it('renders DecidixChip selected and unselected states', () => {
    const { rerender } = render(<DecidixChip label="5 Years" selected={false} />);
    expect(screen.getByText('5 Years')).toBeInTheDocument();

    rerender(<DecidixChip label="5 Years" selected={true} />);
    expect(screen.getByText('5 Years')).toBeInTheDocument();
  });

  it('renders DecidixButton with variants', () => {
    render(<DecidixButton variant="primary">Submit</DecidixButton>);
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('renders StatWell tile', () => {
    render(<StatWell label="Active Projects" value="42" subtext="+3 this quarter" />);
    expect(screen.getByText('Active Projects')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('+3 this quarter')).toBeInTheDocument();
  });
});
