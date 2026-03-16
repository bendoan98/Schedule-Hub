import { useState } from 'react';
import CsvImportForm from '../schedule/CsvImportForm';
import TeamRosterPanel from '../team/TeamRosterPanel';
import DepartmentManagerPanel from '../team/DepartmentManagerPanel';
import SwapRequestsPanel from '../swaps/SwapRequestsPanel';
import PanelSection from '../../components/ui/PanelSection';

const MANAGER_TABS = [
  {
    id: 'requests',
    label: 'Schedule Requests',
    description: 'Approve or deny pending requests.'
  },
  {
    id: 'import',
    label: 'CSV Import',
    description: 'Upload weekly schedules from CSV.'
  },
  {
    id: 'departments',
    label: 'Department Manager',
    description: 'Create, rename, or delete departments.'
  },
  {
    id: 'roster',
    label: 'Team Roster',
    description: 'Assign each member to a department.'
  }
];

export default function ManagerPage({
  importSection,
  requestsSection,
  departmentsSection,
  rosterSection
}) {
  const [activeTab, setActiveTab] = useState('requests');

  function renderActivePanel() {
    switch (activeTab) {
      case 'import':
        return (
          <CsvImportForm
            weekStart={importSection.weekStart}
            employees={importSection.employees}
            onImport={importSection.onImport}
          />
        );
      case 'departments':
        return (
          <DepartmentManagerPanel
            departments={departmentsSection.departments}
            employees={departmentsSection.employees}
            onAddDepartment={departmentsSection.onAddDepartment}
            onRenameDepartment={departmentsSection.onRenameDepartment}
            onDeleteDepartment={departmentsSection.onDeleteDepartment}
            isSaving={departmentsSection.isSaving}
          />
        );
      case 'roster':
        return (
          <TeamRosterPanel
            employees={rosterSection.employees}
            departments={rosterSection.departments}
            onUpdateDepartment={rosterSection.onUpdateDepartment}
            updatingEmployeeId={rosterSection.updatingEmployeeId}
            managerEmployeeId={rosterSection.managerEmployeeId}
          />
        );
      case 'requests':
      default:
        return (
          <SwapRequestsPanel
            title="Schedule Requests"
            role="manager"
            currentEmployeeId={requestsSection.currentEmployeeId}
            swapRequests={requestsSection.swapRequests}
            shifts={requestsSection.shifts}
            employees={requestsSection.employees}
            onDecision={requestsSection.onDecision}
          />
        );
    }
  }

  return (
    <section className="manager-page">
      <PanelSection
        as="header"
        className="panel manager-page-header"
        title="Manager Page"
        titleAs="h2"
        description="Manage team members, process requests, and import weekly schedules."
      />

      <div className="manager-page-tab-layout">
        <nav className="manager-page-tab-nav" role="tablist" aria-label="Manager panels" aria-orientation="vertical">
          {MANAGER_TABS.map((tab) => {
            const isActive = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                id={`manager-tab-${tab.id}`}
                type="button"
                className={`manager-page-tab-button ${isActive ? 'active' : ''}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`manager-panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
              >
                <strong>{tab.label}</strong>
                <small>{tab.description}</small>
              </button>
            );
          })}
        </nav>

        <div
          id={`manager-panel-${activeTab}`}
          className="manager-page-tab-content"
          role="tabpanel"
          aria-labelledby={`manager-tab-${activeTab}`}
        >
          {renderActivePanel()}
        </div>
      </div>
    </section>
  );
}
