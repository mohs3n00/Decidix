import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { DecidixIcon } from '../components/DecidixIcon';
import { TwoToneHeading } from '../components/TwoToneHeading';
import { PriorityBadge } from '../components/PriorityBadge';
import { MetricCard } from '../components/MetricCard';

describe('Decidix Core Components', () => {
  it('renders DecidixIcon without crashing', () => {
    const { container } = render(<DecidixIcon name="overview" size={24} />);
    const iconSpan = container.querySelector('span[role="img"]');
    expect(iconSpan).toBeInTheDocument();
  });

  it('renders TwoToneHeading with first word and second word styling', () => {
    render(<TwoToneHeading first="Regional" second="Overview" level={1} />);
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
    expect(screen.getByText('+1.2%')).toBeInTheDocument();
  });
});
