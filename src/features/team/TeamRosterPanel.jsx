import { useMemo, useState } from 'react';
import { buildDepartmentList, normalizeDepartmentName } from '../../utils/department';
import PanelSection from '../../components/ui/PanelSection';

export default function TeamRosterPanel({
  employees,
  departments,
  onUpdateDepartment,
  updatingEmployeeId,
  managerEmployeeId
}) {
  const [drafts, setDrafts] = useState({});

  const editableRows = useMemo(() => {
    return employees.filter(
      (employee) => employee.role === 'employee' || employee.id === managerEmployeeId
    );
  }, [employees, managerEmployeeId]);

  const departmentOptions = useMemo(() => buildDepartmentList(departments ?? []), [departments]);

  function getDraftDepartment(employee) {
    return drafts[employee.id] ?? employee.department ?? '';
  }

  async function handleSubmit(event, employee) {
    event.preventDefault();

    const draftDepartment = getDraftDepartment(employee);
    const nextDepartment = normalizeDepartmentName(draftDepartment) || null;
    const currentDepartment = normalizeDepartmentName(employee.department) || null;

    if (nextDepartment === currentDepartment) {
      return;
    }

    await onUpdateDepartment(employee.id, nextDepartment);

    setDrafts((previous) => ({
      ...previous,
      [employee.id]: nextDepartment ?? ''
    }));
  }

  return (
    <PanelSection
      className="panel"
      title="Team Roster"
      description="Managers can update team departments, including their own, using the available department list."
      descriptionClassName="muted"
    >

      {editableRows.length === 0 ? <p className="muted">No team members found.</p> : null}

      <div className="roster-list">
        {editableRows.map((employee) => {
          const draftDepartment = getDraftDepartment(employee);
          const nextDepartment = normalizeDepartmentName(draftDepartment) || null;
          const currentDepartment = normalizeDepartmentName(employee.department) || null;
          const unchanged = nextDepartment === currentDepartment;
          const isSaving = updatingEmployeeId === employee.id;

          return (
            <article key={employee.id} className="roster-item">
              <div className="roster-header">
                <strong>{employee.name}</strong>
                <small>{employee.email}</small>
              </div>

              <form className="roster-form" onSubmit={(event) => handleSubmit(event, employee)}>
                <label>
                  Department
                  <select
                    value={draftDepartment}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDrafts((previous) => ({
                        ...previous,
                        [employee.id]: value
                      }));
                    }}
                  >
                    <option value="">No department</option>
                    {departmentOptions.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </label>

                <button type="submit" disabled={unchanged || isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </form>
            </article>
          );
        })}
      </div>
    </PanelSection>
  );
}
