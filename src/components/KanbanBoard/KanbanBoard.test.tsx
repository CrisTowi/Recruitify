import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KanbanBoard from './KanbanBoard';
import * as helpers from './helpers';
import type { KanbanBoard as KanbanBoardType } from '@/types';

// Mock dnd-kit — pointer/drag APIs are not available in jsdom
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DragOverlay: () => null,
  PointerSensor: class {},
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  useDroppable: vi.fn(() => ({ setNodeRef: vi.fn(), isOver: false })),
  useDraggable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  })),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: vi.fn(() => '') } },
}));

// Mock heavy child modals to isolate KanbanBoard behaviour
vi.mock('@/components/AddCompanyModal/AddCompanyModal', () => ({
  default: ({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) => (
    <div data-testid="add-company-modal">
      <button onClick={onClose}>Close modal</button>
      <button onClick={onCreated}>Created</button>
    </div>
  ),
}));

vi.mock('@/components/CompanyDetailModal/CompanyDetailModal', () => ({
  default: () => <div data-testid="company-detail-modal" />,
}));

vi.mock('@/components/OfferModal/OfferModal', () => ({
  default: () => <div data-testid="offer-modal" />,
}));

vi.mock('./helpers', async (importOriginal) => {
  const original = await importOriginal<typeof import('./helpers')>();
  return { ...original, fetchBoard: vi.fn(), patchStatus: vi.fn() };
});

const emptyBoard: KanbanBoardType = {
  Wishlist: [], Applied: [], Interviewing: [], Offer: [], Rejected: [], Ghosted: [],
};

describe('KanbanBoard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a loading state while the board is being fetched', () => {
    vi.mocked(helpers.fetchBoard).mockReturnValue(new Promise(() => {}));
    render(<KanbanBoard />);
    expect(screen.getByText('Loading…')).toBeTruthy();
  });

  it('renders all six columns after the board loads', async () => {
    vi.mocked(helpers.fetchBoard).mockResolvedValue(emptyBoard);
    render(<KanbanBoard />);
    await waitFor(() => expect(screen.getByText('Wishlist')).toBeTruthy());
    expect(screen.getByText('Applied')).toBeTruthy();
    expect(screen.getByText('Interviewing')).toBeTruthy();
    expect(screen.getByText('Offer')).toBeTruthy();
    expect(screen.getByText('Rejected')).toBeTruthy();
    expect(screen.getByText('Ghosted')).toBeTruthy();
  });

  it('shows an error message when the board fetch fails', async () => {
    vi.mocked(helpers.fetchBoard).mockRejectedValue(new Error('Network error'));
    render(<KanbanBoard />);
    await waitFor(() => expect(screen.getByText(/Failed to load board/)).toBeTruthy());
  });

  it('renders the Add Company button', async () => {
    vi.mocked(helpers.fetchBoard).mockResolvedValue(emptyBoard);
    render(<KanbanBoard />);
    await waitFor(() => expect(screen.getByRole('button', { name: '+ Add Company' })).toBeTruthy());
  });

  it('opens the AddCompanyModal when the Add Company button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(helpers.fetchBoard).mockResolvedValue(emptyBoard);
    render(<KanbanBoard />);
    await waitFor(() => screen.getByRole('button', { name: '+ Add Company' }));
    await user.click(screen.getByRole('button', { name: '+ Add Company' }));
    expect(screen.getByTestId('add-company-modal')).toBeTruthy();
  });

  it('closes the AddCompanyModal when onClose is triggered', async () => {
    const user = userEvent.setup();
    vi.mocked(helpers.fetchBoard).mockResolvedValue(emptyBoard);
    render(<KanbanBoard />);
    await waitFor(() => screen.getByRole('button', { name: '+ Add Company' }));
    await user.click(screen.getByRole('button', { name: '+ Add Company' }));
    await user.click(screen.getByRole('button', { name: 'Close modal' }));
    expect(screen.queryByTestId('add-company-modal')).toBeNull();
  });
});
