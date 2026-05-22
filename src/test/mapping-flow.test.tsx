import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import Dashboard from '../components/Dashboard';

vi.mocked(invoke);

const mockProfile = {
  id: 'profile-1',
  name: 'Test Profile',
  description: 'A test profile',
  mappings: {},
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const mockProfileWithMapping = {
  ...mockProfile,
  mappings: {
    '0:60': {
      id: 'profile-1_0:60',
      name: 'Test Mapping',
      midi_channel: 0,
      midi_note_or_cc: 60,
      action: { TypeText: { text: 'Hello' } },
    },
  },
};

describe('Full Mapping Flow', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it('renders dashboard and loads profiles on mount', async () => {
    vi.mocked(invoke).mockImplementation(async (cmd: string) => {
      switch (cmd) {
        case 'initialize_midi': return [];
        case 'get_profiles': return [mockProfile];
        case 'get_active_profile': return mockProfile;
        default: return null;
      }
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('initialize_midi');
      expect(invoke).toHaveBeenCalledWith('get_profiles');
      expect(invoke).toHaveBeenCalledWith('get_active_profile');
    });
  });

  it('shows profile name after loading', async () => {
    vi.mocked(invoke).mockImplementation(async (cmd: string) => {
      switch (cmd) {
        case 'initialize_midi': return [];
        case 'get_profiles': return [mockProfile];
        case 'get_active_profile': return mockProfile;
        default: return null;
      }
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getAllByText('Test Profile').length).toBeGreaterThan(0);
    });
  });

  it('shows "Add Mapping" slots when profile has no mappings', async () => {
    vi.mocked(invoke).mockImplementation(async (cmd: string) => {
      switch (cmd) {
        case 'initialize_midi': return [];
        case 'get_profiles': return [mockProfile];
        case 'get_active_profile': return mockProfile;
        default: return null;
      }
    });

    render(<Dashboard />);

    await waitFor(() => {
      const addButtons = screen.getAllByText('Add Mapping');
      expect(addButtons.length).toBeGreaterThan(0);
    });
  });

  it('opens MIDI value selector when clicking Add Mapping', async () => {
    vi.mocked(invoke).mockImplementation(async (cmd: string) => {
      switch (cmd) {
        case 'initialize_midi': return [];
        case 'get_profiles': return [mockProfile];
        case 'get_active_profile': return mockProfile;
        default: return null;
      }
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getAllByText('Add Mapping').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText('Add Mapping')[0]);

    await waitFor(() => {
      expect(screen.getByText('Assign MIDI Source')).toBeInTheDocument();
    });
  });

  it('opens action editor after selecting MIDI values', async () => {
    vi.mocked(invoke).mockImplementation(async (cmd: string) => {
      switch (cmd) {
        case 'initialize_midi': return [];
        case 'get_profiles': return [mockProfile];
        case 'get_active_profile': return mockProfile;
        default: return null;
      }
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getAllByText('Add Mapping').length).toBeGreaterThan(0);
    });

    // Open MIDI selector
    fireEvent.click(screen.getAllByText('Add Mapping')[0]);

    await waitFor(() => {
      expect(screen.getByText('Assign MIDI Source')).toBeInTheDocument();
    });

    // Click Assign
    fireEvent.click(screen.getByText('Assign'));

    await waitFor(() => {
      expect(screen.getByText('SIGNAL ENGINE // MAPPING_v2.0')).toBeInTheDocument();
    });
  });

  it('shows existing mapping in the grid', async () => {
    vi.mocked(invoke).mockImplementation(async (cmd: string) => {
      switch (cmd) {
        case 'initialize_midi': return [];
        case 'get_profiles': return [mockProfileWithMapping];
        case 'get_active_profile': return mockProfileWithMapping;
        default: return null;
      }
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Test Mapping')).toBeInTheDocument();
      expect(screen.getByText('"Hello"')).toBeInTheDocument();
    });
  });

  it('opens delete confirmation when clicking delete on a mapping', async () => {
    vi.mocked(invoke).mockImplementation(async (cmd: string) => {
      switch (cmd) {
        case 'initialize_midi': return [];
        case 'get_profiles': return [mockProfileWithMapping];
        case 'get_active_profile': return mockProfileWithMapping;
        default: return null;
      }
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Test Mapping')).toBeInTheDocument();
    });

    // Click the delete button (trash icon)
    const deleteBtn = screen.getByTitle('Delete');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText('Delete Mapping')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
    });
  });

  it('calls delete API and refreshes when confirming delete', async () => {
    let deleteCount = 0;
    vi.mocked(invoke).mockImplementation(async (cmd: string, _args?: unknown) => {
      switch (cmd) {
        case 'initialize_midi': return [];
        case 'get_profiles': return [mockProfileWithMapping];
        case 'get_active_profile':
          return deleteCount > 0 ? mockProfile : mockProfileWithMapping;
        case 'delete_mapping':
          deleteCount++;
          return undefined;
        default: return null;
      }
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Test Mapping')).toBeInTheDocument();
    });

    // Open delete modal
    fireEvent.click(screen.getByTitle('Delete'));

    await waitFor(() => {
      expect(screen.getByText('Delete Mapping')).toBeInTheDocument();
    });

    // Confirm delete
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('delete_mapping', { mappingId: 'profile-1_0:60' });
      expect(deleteCount).toBe(1);
    });
  });

  it('enables MIDI when toggle clicked and devices found', async () => {
    let initCount = 0;
    vi.mocked(invoke).mockImplementation(async (cmd: string) => {
      switch (cmd) {
        case 'initialize_midi':
          initCount++;
          return initCount > 1 ? ['Device 1'] : [];
        case 'get_profiles': return [mockProfile];
        case 'get_active_profile': return mockProfile;
        default: return null;
      }
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTitle('Enable MIDI')).toBeInTheDocument();
    });

    // Click toggle to enable
    fireEvent.click(screen.getByTitle('Enable MIDI'));

    await waitFor(() => {
      expect(screen.getByTitle('Disable MIDI')).toBeInTheDocument();
    });
  });
});
