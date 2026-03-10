import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StageAddForm from './StageAddForm';
import type { InterviewStage } from '@/types';

const mockStage: InterviewStage = {
  id: 'stage-1',
  company_id: 'company-1',
  stage_name: 'Technical Screen',
  is_completed: false,
  scheduled_date: null,
  order_index: 0,
  notes: null,
};

describe('StageAddForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the stage name input and Add button', () => {
    render(<StageAddForm companyId="company-1" onCreated={vi.fn()} />);
    expect(screen.getByPlaceholderText(/Stage name/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add' })).toBeTruthy();
  });

  it('disables the Add button when the name input is empty', () => {
    render(<StageAddForm companyId="company-1" onCreated={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });

  it('enables the Add button once a name is typed', async () => {
    const user = userEvent.setup();
    render(<StageAddForm companyId="company-1" onCreated={vi.fn()} />);
    await user.type(screen.getByPlaceholderText(/Stage name/i), 'Technical Screen');
    expect(screen.getByRole('button', { name: 'Add' })).not.toBeDisabled();
  });

  it('does not submit when the name is only whitespace', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    global.fetch = vi.fn();
    render(<StageAddForm companyId="company-1" onCreated={onCreated} />);
    await user.type(screen.getByPlaceholderText(/Stage name/i), '   ');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(fetch).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('calls the API and invokes onCreated on success', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockStage),
    } as unknown as Response);

    render(<StageAddForm companyId="company-1" onCreated={onCreated} />);
    await user.type(screen.getByPlaceholderText(/Stage name/i), 'Technical Screen');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(mockStage));
    expect(fetch).toHaveBeenCalledWith(
      '/api/companies/company-1/roadmap',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('resets the input fields after a successful submission', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockStage),
    } as unknown as Response);

    render(<StageAddForm companyId="company-1" onCreated={vi.fn()} />);
    const input = screen.getByPlaceholderText(/Stage name/i);
    await user.type(input, 'Technical Screen');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect((input as HTMLInputElement).value).toBe(''));
  });
});
