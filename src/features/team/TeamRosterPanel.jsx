import { useMemo, useState } from 'react';
import { DEFAULT_DEPARTMENT, buildDepartmentList, toStoredDepartment } from '../../utils/department';

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

  const departmentOptions = useMemo(
    () => buildDepartmentList(departments ?? []).filter((department) => department !== DEFAULT_DEPARTMENT),
    [departments]
  );

  function getDraftDepartment(employee) {
    return drafts[employee.id] ?? employee.department ?? departmentOptions[0] ?? '';
  }

  async function handleSubmit(event, employee) {
    event.preventDefault();

    const draftDepartment = getDraftDepartment(employee);

    if (!draftDepartment) {
      return;
    }

    const nextDepartment = toStoredDepartment(draftDepartment);

    if (nextDepartment === toStoredDepartment(employee.department)) {
      return;
    }

    await onUpdateDepartment(employee.id, nextDepartment);

    setDrafts((previous) => ({
      ...previous,
      [employee.id]: nextDepartment
    }));
  }

  return (
    <section className="panel">
      <h3>Team Roster</h3>
      <p className="muted">Managers can update team departments, including their own, using the available department list.</p>

      {editableRows.length === 0 ? <p className="muted">No team members found.</p> : null}

      <div className="roster-list">
        {editableRows.map((employee) => {
          const draftDepartment = getDraftDepartment(employee);
          const nextDepartment = toStoredDepartment(draftDepartment);
          const unchanged = nextDepartment === toStoredDepartment(employee.department);
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
                    {departmentOptions.length === 0 ? (
                      <option value="" disabled>
                        No departments available
                      </option>
                    ) : null}
                    {departmentOptions.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </label>

                <button type="submit" disabled={unchanged || isSaving || !draftDepartment}>
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </form>
            </article>
          );
        })}
      </div>
    </section>
  );
}
