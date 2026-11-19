import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { WorkspaceProvider, useWorkspace } from '../context/WorkspaceContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import { ToastProvider } from '../components/Toast';
import { DatasetManagementScreen } from '../features/datasets/DatasetManagementScreen';

// Helper component to interact with workspace datasets
const DatasetTestHelper = () => {
  const {
    approvedDatasets,
    pendingDatasets,
    rejectedDatasets,
    activeDataset,
    selectActiveDataset,
    uploadDataset,
    approveDataset,
    rejectDataset,
    getWorkspaceKpiData,
  } = useWorkspace();

  const handleCreateMockFile = async (name: string) => {
    const file = new File(
      ['governorate,health,education,economy\nCairo,85,82,78\nAlexandria,80,79,75\n'],
      `${name}.csv`,
      { type: 'text/csv' }
    );
    await uploadDataset(file, name, 'Mock test dataset for research');
  };

  const kpis = getWorkspaceKpiData();

  return (
    <div>
      <div data-testid="active-dataset-name">{activeDataset?.name}</div>
      <div data-testid="active-dataset-score">{kpis.score}</div>
      <div data-testid="approved-count">{approvedDatasets.length}</div>
      <div data-testid="pending-count">{pendingDatasets.length}</div>
      <div data-testid="rejected-count">{rejectedDatasets.length}</div>

      <button onClick={() => handleCreateMockFile('مبادرة الصحة المدرسية')}>
        Upload Regular Dataset
      </button>

      {pendingDatasets[0] && (
        <button onClick={() => approveDataset(pendingDatasets[0].id)}>
          Approve First Pending
        </button>
      )}

      {pendingDatasets[0] && (
        <button onClick={() => rejectDataset(pendingDatasets[0].id, 'غير مطابقة للمعيار')}>
          Reject First Pending
        </button>
      )}

      {approvedDatasets[1] && (
        <button onClick={() => selectActiveDataset(approvedDatasets[1].id)}>
          Select Second Approved
        </button>
      )}
    </div>
  );
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter initialEntries={['/datasets']}>
      <LanguageProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <ToastProvider>
              {ui}
            </ToastProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
};

describe('Unified Platform Dataset Registry & Approval Workflow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with default approved datasets and active CAPMAS baseline', () => {
    renderWithProviders(<DatasetTestHelper />);

    expect(screen.getByTestId('active-dataset-name').textContent).toContain('الأساس الوطني المعتمد');
    expect(screen.getByTestId('active-dataset-score').textContent).toBe('74.2');
    expect(Number(screen.getByTestId('approved-count').textContent)).toBeGreaterThanOrEqual(4);
    expect(screen.getByTestId('pending-count').textContent).toBe('0');
  });

  it('adds uploaded datasets by regular users to pending_review queue', async () => {
    renderWithProviders(<DatasetTestHelper />);

    fireEvent.click(screen.getByText('Upload Regular Dataset'));

    await waitFor(() => {
      expect(screen.getByTestId('pending-count').textContent).toBe('1');
    });
  });

  it('allows approving a pending dataset so it joins the approved list', async () => {
    renderWithProviders(<DatasetTestHelper />);

    // 1. Upload dataset (becomes pending)
    fireEvent.click(screen.getByText('Upload Regular Dataset'));
    await waitFor(() => {
      expect(screen.getByTestId('pending-count').textContent).toBe('1');
    });

    const initialApprovedCount = Number(screen.getByTestId('approved-count').textContent);

    // 2. Approve it
    fireEvent.click(screen.getByText('Approve First Pending'));

    await waitFor(() => {
      expect(screen.getByTestId('pending-count').textContent).toBe('0');
      expect(Number(screen.getByTestId('approved-count').textContent)).toBe(initialApprovedCount + 1);
    });
  });

  it('allows rejecting a pending dataset and recording rejection reason', async () => {
    renderWithProviders(<DatasetTestHelper />);

    // 1. Upload dataset (becomes pending)
    fireEvent.click(screen.getByText('Upload Regular Dataset'));
    await waitFor(() => {
      expect(screen.getByTestId('pending-count').textContent).toBe('1');
    });

    // 2. Reject it
    fireEvent.click(screen.getByText('Reject First Pending'));

    await waitFor(() => {
      expect(screen.getByTestId('pending-count').textContent).toBe('0');
      expect(screen.getByTestId('rejected-count').textContent).toBe('1');
    });
  });

  it('switches the active dataset and updates platform KPI scores', async () => {
    renderWithProviders(<DatasetTestHelper />);

    expect(screen.getByTestId('active-dataset-name').textContent).toContain('الأساس الوطني المعتمد');

    fireEvent.click(screen.getByText('Select Second Approved'));

    await waitFor(() => {
      expect(screen.getByTestId('active-dataset-name').textContent).toContain('حياة كريمة');
      expect(screen.getByTestId('active-dataset-score').textContent).toBe('71.8');
    });
  });

  it('renders DatasetManagementScreen with approved, pending, and rejected tabs', () => {
    renderWithProviders(<DatasetManagementScreen />);

    expect(screen.getByText(/National Dataset Registry|سجل وإدارة مجموعات البيانات الوطنية/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Approved Datasets|المجموعات المعتمدة للتحليل/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Pending Review|قيد مراجعة الإدارة/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Rejected Datasets|المجموعات المرفوضة/i).length).toBeGreaterThanOrEqual(1);
  });
});
