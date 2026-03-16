import CsvImportForm from '../schedule/CsvImportForm';
import TeamRosterPanel from '../team/TeamRosterPanel';
import DepartmentManagerPanel from '../team/DepartmentManagerPanel';
import SwapRequestsPanel from '../swaps/SwapRequestsPanel';
import PanelSection from '../../components/ui/PanelSection';

export default function ManagerPage({
  importSection,
  requestsSection,
  departmentsSection,
  rosterSection
}) {
  return (
    <section className="manager-page">
      <PanelSection
        as="header"
        className="panel manager-page-header"
        title="Manager Page"
        titleAs="h2"
        description="Manage team members, process requests, and import weekly schedules."
      />

      <div className="manager-page-grid manager-page-grid-top">
        <CsvImportForm
          weekStart={importSection.weekStart}
          employees={importSection.employees}
          onImport={importSection.onImport}
        />

        <SwapRequestsPanel
          title="Schedule Requests"
          role="manager"
          currentEmployeeId={requestsSection.currentEmployeeId}
          swapRequests={requestsSection.swapRequests}
          shifts={requestsSection.shifts}
          employees={requestsSection.employees}
          onDecision={requestsSection.onDecision}
        />
      </div>

      <div className="manager-page-team-row">
        <DepartmentManagerPanel
          departments={departmentsSection.departments}
          employees={departmentsSection.employees}
          onAddDepartment={departmentsSection.onAddDepartment}
          onRenameDepartment={departmentsSection.onRenameDepartment}
          onDeleteDepartment={departmentsSection.onDeleteDepartment}
          isSaving={departmentsSection.isSaving}
        />

        <TeamRosterPanel
          employees={rosterSection.employees}
          departments={rosterSection.departments}
          onUpdateDepartment={rosterSection.onUpdateDepartment}
          updatingEmployeeId={rosterSection.updatingEmployeeId}
          managerEmployeeId={rosterSection.managerEmployeeId}
        />
      </div>
    </section>
  );
}
