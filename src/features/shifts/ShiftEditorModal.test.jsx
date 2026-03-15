// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import ShiftEditorModal from './ShiftEditorModal';

describe('ShiftEditorModal', () => {
  const employees = [
    { id: 'e1', name: 'Alex', department: 'OPS' },
    { id: 'e2', name: 'Sam', department: null }
  ];

  it('returns null when no shift is selected', () => {
    const { container } = render(
      <ShiftEditorModal shift={null} employees={employees} onSave={() => {}} onDelete={() => {}} onClose={() => {}} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('saves edited shifts and supports delete/close interactions', () => {
    const onSave = vi.fn();
    const onDelete = vi.fn();
    const onClose = vi.fn();

    render(
      <ShiftEditorModal
        shift={{
          id: 's1',
          employeeId: 'e1',
          day: 1,
          startTime: '09:00',
          endTime: '17:00',
          isNew: false
        }}
        employees={employees}
        onSave={onSave}
        onDelete={onDelete}
        onClose={onClose}
      />
    );

    fireEvent.change(screen.getByLabelText('Day'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /save shift/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 's1',
        day: 2,
        employeeId: 'e1'
      })
    );

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith('s1');

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalled();
  });
});
