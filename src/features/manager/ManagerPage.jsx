import CsvImportForm from '../schedule/CsvImportForm';
import TeamRosterPanel from '../team/TeamRosterPanel';
import DepartmentManagerPanel from '../team/DepartmentManagerPanel';
import SwapRequestsPanel from '../swaps/SwapRequestsPanel';

export default function ManagerPage({
  weekStart,
  departments,
  employees,
  onImport,
  onAddDepartment,
  onRenameDepartment,
  onDeleteDepartment,
  departmentActionLoading,
  onUpdateDepartment,
  updatingEmployeeId,
  currentEmployeeId,
  swapRequests,
  shifts,
  onDecision
}) {
  return (
    <section className="manager-page">
      <header className="panel manager-page-header">
        <h2>Manager Page</h2>
        <p>Manage team members, process requests, and import weekly schedules.</p>
      </header>

      <div className="manager-page-grid manager-page-grid-top">
        <CsvImportForm weekStart={weekStart} employees={employees} onImport={onImport} />

        <SwapRequestsPanel
          title="Schedule Requests"
          role="manager"
          currentEmployeeId={currentEmployeeId}
          swapRequests={swapRequests}
          shifts={shifts}
          employees={employees}
          onDecision={onDecision}
        />
      </div>

      <div className="manager-page-team-row">
        <DepartmentManagerPanel
          departments={departments}
          employees={employees}
          onAddDepartment={onAddDepartment}
          onRenameDepartment={onRenameDepartment}
          onDeleteDepartment={onDeleteDepartment}
          isSaving={departmentActionLoading}
        />

        <TeamRosterPanel
          employees={employees}
          departments={departments}
          onUpdateDepartment={onUpdateDepartment}
          updatingEmployeeId={updatingEmployeeId}
          managerEmployeeId={currentEmployeeId}
        />
      </div>
    </section>
  );
}
