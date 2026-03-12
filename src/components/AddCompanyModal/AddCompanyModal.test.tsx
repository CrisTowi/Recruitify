import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders as render } from '@/test/renderWithProviders';
import userEvent from '@testing-library/user-event';
import AddCompanyModal from './AddCompanyModal';

describe('AddCompanyModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the modal title', () => {
    render(<AddCompanyModal onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Add Company' })).toBeTruthy();
  });

  it('renders all form fields', () => {
    render(<AddCompanyModal onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.getByLabelText(/Company name/i)).toBeTruthy();
    expect(screen.getByLabelText(/Logo URL/i)).toBeTruthy();
    expect(screen.getByLabelText(/Status/i)).toBeTruthy();
  });

  it('shows a validation error when submitting with an empty name', async () => {
    const user = userEvent.setup();
    render(<AddCompanyModal onClose={vi.fn()} onCreated={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Add Company' }));
    expect(screen.getByText('Company name is required.')).toBeTruthy();
  });

  it('calls onClose when the Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AddCompanyModal onClose={onClose} onCreated={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when the Escape key is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AddCompanyModal onClose={onClose} onCreated={vi.fn()} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when clicking the backdrop', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<AddCompanyModal onClose={onClose} onCreated={vi.fn()} />);
    const backdrop = container.firstChild as HTMLElement;
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onCreated after a successful submission', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);

    render(<AddCompanyModal onClose={vi.fn()} onCreated={onCreated} />);
    await user.type(screen.getByLabelText(/Company name/i), 'Stripe');
    await user.click(screen.getByRole('button', { name: 'Add Company' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
  });

  it('sends the correct payload to the API', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);

    render(<AddCompanyModal onClose={vi.fn()} onCreated={vi.fn()} />);
    await user.type(screen.getByLabelText(/Company name/i), 'Stripe');
    await user.click(screen.getByRole('button', { name: 'Add Company' }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      '/api/companies',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Stripe', logo_url: null, status: 'Wishlist' }),
      }),
    ));
  });

  it('shows an error message when the API call fails', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Internal server error' }),
    } as unknown as Response);

    render(<AddCompanyModal onClose={vi.fn()} onCreated={vi.fn()} />);
    await user.type(screen.getByLabelText(/Company name/i), 'Stripe');
    await user.click(screen.getByRole('button', { name: 'Add Company' }));

    await waitFor(() => expect(screen.getAllByText('Internal server error').length).toBeGreaterThan(0));
  });

  it('shows the status select with Wishlist as the default', () => {
    render(<AddCompanyModal onClose={vi.fn()} onCreated={vi.fn()} />);
    const select = screen.getByLabelText(/Status/i) as HTMLSelectElement;
    expect(select.value).toBe('Wishlist');
  });
});
