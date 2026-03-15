import { useMemo, useState } from 'react';

function normalizeDepartment(value) {
  const normalized = value.trim();
  return normalized || 'UNASSIGNED';
}

export default function TeamRosterPanel({
  employees,
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

  function getDraftDepartment(employee) {
    return drafts[employee.id] ?? employee.department ?? 'UNASSIGNED';
  }

  async function handleSubmit(event, employee) {
    event.preventDefault();

    const nextDepartment = normalizeDepartment(getDraftDepartment(employee));

    if (nextDepartment === (employee.department ?? 'UNASSIGNED')) {
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
      <p className="muted">Managers can update team departments, including their own.</p>

      {editableRows.length === 0 ? <p className="muted">No team members found.</p> : null}

      <div className="roster-list">
        {editableRows.map((employee) => {
          const draftDepartment = getDraftDepartment(employee);
          const nextDepartment = normalizeDepartment(draftDepartment);
          const unchanged = nextDepartment === (employee.department ?? 'UNASSIGNED');
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
                  <input
                    type="text"
                    value={draftDepartment}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDrafts((previous) => ({
                        ...previous,
                        [employee.id]: value
                      }));
                    }}
                    placeholder="UNASSIGNED"
                  />
                </label>

                <button type="submit" disabled={unchanged || isSaving}>
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
