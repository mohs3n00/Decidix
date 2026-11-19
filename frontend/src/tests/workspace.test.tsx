import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { WorkspaceProvider, useWorkspace } from '../context/WorkspaceContext';
import { AuthProvider } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import { ToastProvider } from '../components/Toast';
import { TeamManagementScreen } from '../features/team/TeamManagementScreen';

const TestComponent = () => {
  const {
    currentWorkspaceType,
    currentWorkspaceName,
    teams,
    createTeam,
    addTeamMember,
    switchWorkspace,
  } = useWorkspace();

  return (
    <div>
      <div data-testid="ws-type">{currentWorkspaceType}</div>
      <div data-testid="ws-name">{currentWorkspaceName.en}</div>
      <button onClick={() => switchWorkspace('national')}>Switch National</button>
      <button onClick={() => switchWorkspace('personal')}>Switch Personal</button>
      <button onClick={() => createTeam('Ministry of Planning', 'National Planning Team')}>
        Create Test Team
      </button>
      {teams[0] && (
        <button onClick={() => addTeamMember(teams[0].id, 'usr_colleague_99')}>
          Add Test Member
        </button>
      )}
      <div data-testid="team-count">{teams.length}</div>
      {teams[0] && <div data-testid="member-count">{teams[0].members.length}</div>}
    </div>
  );
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter initialEntries={['/team']}>
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

describe('Workspace & Team Architecture Feature', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with default workspace and toggles between national and personal', () => {
    renderWithProviders(<TestComponent />);
    expect(screen.getByTestId('ws-type')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Switch National'));
    expect(screen.getByTestId('ws-type').textContent).toBe('national');

    fireEvent.click(screen.getByText('Switch Personal'));
    expect(screen.getByTestId('ws-type').textContent).toBe('personal');
  });

  it('renders TeamManagementScreen with User ID card and team creation action', () => {
    renderWithProviders(<TeamManagementScreen />);
    expect(screen.getByText(/Your Personal User ID/i)).toBeInTheDocument();
    expect(screen.getByText(/Create New Team/i)).toBeInTheDocument();
    expect(screen.getByText(/My Personal Workspace/i)).toBeInTheDocument();
  });

  it('creates team and adds team member using unique User ID', async () => {
    renderWithProviders(<TestComponent />);

    fireEvent.click(screen.getByText('Create Test Team'));
    expect(screen.getByTestId('team-count').textContent).toBe('1');

    await waitFor(() => {
      expect(screen.getByText('Add Test Member')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Test Member'));
    expect(screen.getByTestId('member-count').textContent).toBe('2');
  });
});
