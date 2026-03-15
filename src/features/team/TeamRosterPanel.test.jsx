// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import TeamRosterPanel from './TeamRosterPanel';

describe('TeamRosterPanel', () => {
  it('updates an employee department from available options', async () => {
    const onUpdateDepartment = vi.fn().mockResolvedValue(undefined);

    render(
      <TeamRosterPanel
        employees={[
          { id: 'm1', name: 'Manager One', email: 'm1@example.com', role: 'manager', department: 'OPS' },
          { id: 'e1', name: 'Employee One', email: 'e1@example.com', role: 'employee', department: 'SALES' },
          { id: 'm2', name: 'Manager Two', email: 'm2@example.com', role: 'manager', department: 'OPS' }
        ]}
        departments={['SALES', 'OPS', 'SERVICE']}
        onUpdateDepartment={onUpdateDepartment}
        updatingEmployeeId=""
        managerEmployeeId="m1"
      />
    );

    expect(screen.getByText('Manager One')).toBeInTheDocument();
    expect(screen.getByText('Employee One')).toBeInTheDocument();
    expect(screen.queryByText('Manager Two')).not.toBeInTheDocument();

    const employeeCard = screen.getByText('Employee One').closest('article');
    const select = within(employeeCard).getByRole('combobox');
    const saveButton = within(employeeCard).getByRole('button', { name: /save/i });

    fireEvent.change(select, { target: { value: 'SERVICE' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onUpdateDepartment).toHaveBeenCalledWith('e1', 'SERVICE');
    });
  });
});
