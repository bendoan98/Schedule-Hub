import { useMemo, useState } from 'react';
import {
  buildDepartmentList,
  normalizeDepartmentName
} from '../../utils/department';
import PanelSection from '../../components/ui/PanelSection';

export default function DepartmentManagerPanel({
  departments,
  employees,
  onAddDepartment,
  onRenameDepartment,
  onDeleteDepartment,
  isSaving
}) {
  const [newDepartment, setNewDepartment] = useState('');
  const [renameDrafts, setRenameDrafts] = useState({});

  const managedDepartments = useMemo(() => buildDepartmentList(departments), [departments]);

  const memberCountByDepartment = useMemo(() => {
    const counts = new Map();

    employees.forEach((employee) => {
      const key = normalizeDepartmentName(employee.department);
      if (!key) {
        return;
      }
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return counts;
  }, [employees]);

  async function handleAddDepartment(event) {
    event.preventDefault();

    const normalized = normalizeDepartmentName(newDepartment);

    if (!normalized || managedDepartments.includes(normalized)) {
      return;
    }

    await onAddDepartment(normalized);
    setNewDepartment('');
  }

  async function handleRenameDepartment(event, currentDepartment) {
    event.preventDefault();

    const draftValue = renameDrafts[currentDepartment] ?? currentDepartment;
    const normalized = normalizeDepartmentName(draftValue);

    if (!normalized || normalized === currentDepartment || managedDepartments.includes(normalized)) {
      return;
    }

    await onRenameDepartment(currentDepartment, normalized);

    setRenameDrafts((previous) => {
      const next = { ...previous };
      delete next[currentDepartment];
      return next;
    });
  }

  async function handleDeleteDepartment(department) {
    const shouldDelete = window.confirm(
      `Delete ${department}? Team members in this department will have no department.`
    );

    if (!shouldDelete) {
      return;
    }

    await onDeleteDepartment(department);
  }

  return (
    <PanelSection
      className="panel department-panel"
      title="Department Manager"
      description="Add, rename, or delete departments for your team."
      descriptionClassName="muted"
    >

      <form className="department-add-form" onSubmit={handleAddDepartment}>
        <label>
          New Department
          <input
            type="text"
            value={newDepartment}
            onChange={(event) => setNewDepartment(event.target.value)}
            placeholder="SERVICE"
            disabled={isSaving}
          />
        </label>
        <button type="submit" disabled={isSaving || !normalizeDepartmentName(newDepartment)}>
          Add
        </button>
      </form>

      <div className="department-list">
        {managedDepartments.length === 0 ? <p className="muted">No departments yet.</p> : null}
        {managedDepartments.map((department) => {
          const draftValue = renameDrafts[department] ?? department;
          const normalizedDraft = normalizeDepartmentName(draftValue);
          const hasMembers = memberCountByDepartment.get(department) ?? 0;
          const canRename =
            Boolean(normalizedDraft) &&
            normalizedDraft !== department &&
            !managedDepartments.includes(normalizedDraft);

          return (
            <article key={department} className="department-item">
              <div className="department-item-header">
                <strong>{department}</strong>
                <small>{hasMembers} member{hasMembers === 1 ? '' : 's'}</small>
              </div>

              <form
                className="department-rename-form"
                onSubmit={(event) => handleRenameDepartment(event, department)}
              >
                <label>
                  Rename To
                  <input
                    type="text"
                    value={draftValue}
                    onChange={(event) => {
                      const value = event.target.value;
                      setRenameDrafts((previous) => ({
                        ...previous,
                        [department]: value
                      }));
                    }}
                    disabled={isSaving}
                  />
                </label>
                <button type="submit" disabled={isSaving || !canRename}>
                  Rename
                </button>
                <button type="button" className="danger" disabled={isSaving} onClick={() => handleDeleteDepartment(department)}>
                  Delete
                </button>
              </form>
            </article>
          );
        })}
      </div>
    </PanelSection>
  );
}
