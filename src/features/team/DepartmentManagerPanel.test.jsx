// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import DepartmentManagerPanel from './DepartmentManagerPanel';

describe('DepartmentManagerPanel', () => {
  it('adds, renames, and deletes departments', async () => {
    const onAddDepartment = vi.fn().mockResolvedValue(undefined);
    const onRenameDepartment = vi.fn().mockResolvedValue(undefined);
    const onDeleteDepartment = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <DepartmentManagerPanel
        departments={['SALES', 'OPS']}
        employees={[
          { id: 'e1', department: 'SALES' },
          { id: 'e2', department: 'OPS' },
          { id: 'e3', department: null }
        ]}
        onAddDepartment={onAddDepartment}
        onRenameDepartment={onRenameDepartment}
        onDeleteDepartment={onDeleteDepartment}
        isSaving={false}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('SERVICE'), { target: { value: 'service' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => {
      expect(onAddDepartment).toHaveBeenCalledWith('SERVICE');
    });

    const salesCard = screen.getByText('SALES').closest('article');
    const renameInput = within(salesCard).getByRole('textbox');
    fireEvent.change(renameInput, { target: { value: 'support' } });
    fireEvent.click(within(salesCard).getByRole('button', { name: /rename/i }));

    await waitFor(() => {
      expect(onRenameDepartment).toHaveBeenCalledWith('SALES', 'SUPPORT');
    });

    const opsCard = screen.getByText('OPS').closest('article');
    fireEvent.click(within(opsCard).getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(onDeleteDepartment).toHaveBeenCalledWith('OPS');
    });
  });
});
