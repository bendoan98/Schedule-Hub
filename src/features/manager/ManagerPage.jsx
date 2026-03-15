import CsvImportForm from '../schedule/CsvImportForm';
import TeamRosterPanel from '../team/TeamRosterPanel';
import SwapRequestsPanel from '../swaps/SwapRequestsPanel';

export default function ManagerPage({
  weekStart,
  employees,
  onImport,
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

      <div className="manager-page-grid">
        <CsvImportForm weekStart={weekStart} employees={employees} onImport={onImport} />

        <TeamRosterPanel
          employees={employees}
          onUpdateDepartment={onUpdateDepartment}
          updatingEmployeeId={updatingEmployeeId}
          managerEmployeeId={currentEmployeeId}
        />

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
    </section>
  );
}
