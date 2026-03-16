import { useState } from 'react';
import {
  createDepartment,
  deleteDepartment,
  ensureDepartment,
  insertNotifications,
  renameDepartment,
  replaceDepartmentForTeam,
  updateEmployeeDepartment
} from '../lib/supabaseData';
import {
  buildDepartmentList,
  normalizeDepartmentName
} from '../utils/department';
import { addLocalNotification } from './scheduleActionHelpers';

export default function useDepartmentActions({ env, context, setters, loadSupabaseData }) {
  const { isSupabaseMode, session, supabase } = env;
  const { team, employees, departments, currentEmployeeId } = context;
  const { setEmployees, setTeamDepartments, setNotifications, setAppMessage } = setters;

  const [updatingDepartmentEmployeeId, setUpdatingDepartmentEmployeeId] = useState('');
  const [departmentActionLoading, setDepartmentActionLoading] = useState(false);

  async function handleUpdateEmployeeDepartment(employeeId, departmentValue) {
    const nextDepartment = normalizeDepartmentName(departmentValue) || null;
    setUpdatingDepartmentEmployeeId(employeeId);

    if (isSupabaseMode && session && supabase) {
      try {
        const previousEmployee = employees.find((employee) => employee.id === employeeId);
        await updateEmployeeDepartment(supabase, {
          employeeId,
          teamId: team?.id ?? null,
          department: nextDepartment
        });

        if (team?.id && nextDepartment && !departments.includes(nextDepartment)) {
          await ensureDepartment(supabase, team.id, nextDepartment);
        }

        if (team?.id) {
          const departmentNotifications =
            employeeId === currentEmployeeId
              ? []
              : [
                  {
                    teamId: team.id,
                    targetEmployeeId: employeeId,
                    title: 'Department Updated',
                    body: `Your department changed from ${
                      previousEmployee?.department ?? 'no department'
                    } to ${nextDepartment ?? 'no department'}.`
                  }
                ];

          await insertNotifications(supabase, departmentNotifications);
        }

        await loadSupabaseData();
        setAppMessage('Department updated.');
      } catch (error) {
        setAppMessage(error.message);
      } finally {
        setUpdatingDepartmentEmployeeId('');
      }

      return;
    }

    setEmployees((previous) =>
      previous.map((employee) => {
        if (employee.id !== employeeId) {
          return employee;
        }

        return {
          ...employee,
          department: nextDepartment
        };
      })
    );

    if (nextDepartment) {
      setTeamDepartments((previous) => buildDepartmentList([...(previous ?? []), nextDepartment]));
    }

    setUpdatingDepartmentEmployeeId('');
    addLocalNotification(setNotifications, 'Department Updated', 'Employee department was updated.');
  }

  async function handleAddDepartment(departmentName) {
    const normalizedDepartment = normalizeDepartmentName(departmentName);

    if (!normalizedDepartment || departments.includes(normalizedDepartment)) {
      return;
    }

    const nextDepartments = buildDepartmentList([...departments, normalizedDepartment]);
    setDepartmentActionLoading(true);

    if (isSupabaseMode && session && supabase) {
      try {
        if (!team?.id) {
          throw new Error('Join or create a team before managing departments.');
        }

        await createDepartment(supabase, team.id, normalizedDepartment);
        await loadSupabaseData();
        setAppMessage(`Department ${normalizedDepartment} added.`);
      } catch (error) {
        setAppMessage(error.message);
      } finally {
        setDepartmentActionLoading(false);
      }

      return;
    }

    setTeamDepartments(nextDepartments);
    setDepartmentActionLoading(false);
    addLocalNotification(
      setNotifications,
      'Department Added',
      `${normalizedDepartment} was added to the team list.`
    );
  }

  async function handleRenameDepartment(currentDepartment, nextDepartmentName) {
    const sourceDepartment = normalizeDepartmentName(currentDepartment);
    const targetDepartment = normalizeDepartmentName(nextDepartmentName);

    if (
      !sourceDepartment ||
      !targetDepartment ||
      sourceDepartment === targetDepartment ||
      departments.includes(targetDepartment)
    ) {
      return;
    }

    const nextDepartments = buildDepartmentList(
      departments.map((departmentName) => {
        if (departmentName === sourceDepartment) {
          return targetDepartment;
        }

        return departmentName;
      })
    );

    setDepartmentActionLoading(true);

    if (isSupabaseMode && session && supabase) {
      try {
        if (!team?.id) {
          throw new Error('Join or create a team before managing departments.');
        }

        const affectedEmployeeIds = employees
          .filter(
            (employee) =>
              normalizeDepartmentName(employee.department) === sourceDepartment &&
              employee.id !== currentEmployeeId
          )
          .map((employee) => employee.id);

        await replaceDepartmentForTeam(supabase, {
          teamId: team.id,
          fromDepartment: sourceDepartment,
          toDepartment: targetDepartment
        });
        await renameDepartment(supabase, {
          teamId: team.id,
          fromName: sourceDepartment,
          toName: targetDepartment
        });
        await insertNotifications(
          supabase,
          affectedEmployeeIds.map((employeeId) => ({
            teamId: team.id,
            targetEmployeeId: employeeId,
            title: 'Department Updated',
            body: `Your department changed from ${sourceDepartment} to ${targetDepartment}.`
          }))
        );
        await loadSupabaseData();
        setAppMessage(`Department ${sourceDepartment} renamed to ${targetDepartment}.`);
      } catch (error) {
        setAppMessage(error.message);
      } finally {
        setDepartmentActionLoading(false);
      }

      return;
    }

    setEmployees((previous) =>
      previous.map((employee) => {
        if (normalizeDepartmentName(employee.department) !== sourceDepartment) {
          return employee;
        }

        return {
          ...employee,
          department: targetDepartment
        };
      })
    );

    setTeamDepartments(nextDepartments);
    setDepartmentActionLoading(false);
    addLocalNotification(
      setNotifications,
      'Department Renamed',
      `${sourceDepartment} is now ${targetDepartment}.`
    );
  }

  async function handleDeleteDepartment(departmentName) {
    const sourceDepartment = normalizeDepartmentName(departmentName);

    if (!sourceDepartment) {
      return;
    }

    const nextDepartments = buildDepartmentList(
      departments.filter((departmentValue) => departmentValue !== sourceDepartment)
    );

    setDepartmentActionLoading(true);

    if (isSupabaseMode && session && supabase) {
      try {
        if (!team?.id) {
          throw new Error('Join or create a team before managing departments.');
        }

        const affectedEmployeeIds = employees
          .filter(
            (employee) =>
              normalizeDepartmentName(employee.department) === sourceDepartment &&
              employee.id !== currentEmployeeId
          )
          .map((employee) => employee.id);

        await replaceDepartmentForTeam(supabase, {
          teamId: team.id,
          fromDepartment: sourceDepartment,
          toDepartment: null
        });
        await deleteDepartment(supabase, {
          teamId: team.id,
          name: sourceDepartment
        });
        await insertNotifications(
          supabase,
          affectedEmployeeIds.map((employeeId) => ({
            teamId: team.id,
            targetEmployeeId: employeeId,
            title: 'Department Updated',
            body: `Your department ${sourceDepartment} was removed.`
          }))
        );
        await loadSupabaseData();
        setAppMessage(`Department ${sourceDepartment} deleted.`);
      } catch (error) {
        setAppMessage(error.message);
      } finally {
        setDepartmentActionLoading(false);
      }

      return;
    }

    setEmployees((previous) =>
      previous.map((employee) => {
        if (normalizeDepartmentName(employee.department) !== sourceDepartment) {
          return employee;
        }

        return {
          ...employee,
          department: null
        };
      })
    );

    setTeamDepartments(nextDepartments);
    setDepartmentActionLoading(false);
    addLocalNotification(
      setNotifications,
      'Department Deleted',
      `${sourceDepartment} moved to no department.`
    );
  }

  return {
    updatingDepartmentEmployeeId,
    departmentActionLoading,
    handleUpdateEmployeeDepartment,
    handleAddDepartment,
    handleRenameDepartment,
    handleDeleteDepartment
  };
}
