import { useState } from 'react';
import { insertCsvShifts, insertNotifications, removeShift, upsertShift } from '../lib/supabaseData';
import { newId } from '../utils/id';
import { addLocalNotification } from './scheduleActionHelpers';

export default function useShiftActions({ env, context, setters, loadSupabaseData }) {
  const { isSupabaseMode, session, supabase } = env;
  const { team, employees, weekStart, currentEmployeeId } = context;
  const { setEmployees, setShifts, setNotifications, setAppMessage } = setters;

  const [editingShift, setEditingShift] = useState(null);

  async function handleCsvImport(result, importWeekStart = weekStart) {
    if (!isSupabaseMode || !session || !supabase) {
      setEmployees((previous) => [...previous, ...result.importedEmployees]);
      setShifts((previous) => [...previous, ...result.importedShifts]);
      addLocalNotification(
        setNotifications,
        'Schedule Imported',
        `Added ${result.importedShifts.length} shifts from CSV.`
      );
      return `Imported ${result.rowCount} rows and ${result.importedShifts.length} shifts.`;
    }

    try {
      const knownEmployeeIds = new Set(employees.map((employee) => employee.id));
      const validShifts = result.importedShifts.filter((shift) => knownEmployeeIds.has(shift.employeeId));
      const skippedShiftCount = result.importedShifts.length - validShifts.length;

      if (validShifts.length === 0) {
        return 'No shifts imported. CSV employee_name values must match employees in your team.';
      }

      const insertedCount = await insertCsvShifts(supabase, validShifts, importWeekStart);

      if (team?.id) {
        const employeeNotifications = employees
          .filter((employee) => employee.role === 'employee' && employee.id !== currentEmployeeId)
          .map((employee) => ({
            teamId: team.id,
            targetEmployeeId: employee.id,
            title: 'New Schedule Available',
            body: `A new schedule was published for the week of ${importWeekStart}.`
          }));

        await insertNotifications(supabase, employeeNotifications);
      }

      await loadSupabaseData();

      const summary =
        skippedShiftCount > 0
          ? `Imported ${insertedCount} shifts. Skipped ${skippedShiftCount} shifts for unknown employees.`
          : `Imported ${insertedCount} shifts.`;

      setAppMessage(summary);
      return summary;
    } catch (error) {
      setAppMessage(error.message);
      return `Import failed: ${error.message}`;
    }
  }

  function handleAddShift(employeeId, day) {
    setEditingShift({
      id: newId(),
      employeeId,
      day,
      startTime: '09:00',
      endTime: '17:00',
      weekStart,
      isNew: true
    });
  }

  function openEditShift(shift) {
    setEditingShift({ ...shift, isNew: false });
  }

  async function handleSaveShift(updatedShift) {
    if (isSupabaseMode && session && supabase) {
      try {
        await upsertShift(supabase, { ...updatedShift, weekStart }, weekStart);
        setEditingShift(null);
        await loadSupabaseData();
        setAppMessage('Shift saved.');
      } catch (error) {
        setAppMessage(error.message);
      }

      return;
    }

    const shiftToSave = {
      id: updatedShift.id,
      employeeId: updatedShift.employeeId,
      day: Number(updatedShift.day),
      startTime: updatedShift.startTime,
      endTime: updatedShift.endTime,
      weekStart
    };

    setShifts((previous) => {
      const exists = previous.some((shift) => shift.id === shiftToSave.id);

      if (exists) {
        return previous.map((shift) => (shift.id === shiftToSave.id ? shiftToSave : shift));
      }

      return [...previous, shiftToSave];
    });

    setEditingShift(null);
    addLocalNotification(setNotifications, 'Shift Saved', 'A shift was added or updated.');
  }

  async function handleDeleteShift(shiftId) {
    if (isSupabaseMode && session && supabase) {
      try {
        await removeShift(supabase, shiftId);
        setEditingShift(null);
        await loadSupabaseData();
        setAppMessage('Shift deleted.');
      } catch (error) {
        setAppMessage(error.message);
      }

      return;
    }

    setShifts((previous) => previous.filter((shift) => shift.id !== shiftId));
    setEditingShift(null);
    addLocalNotification(setNotifications, 'Shift Deleted', 'A shift was removed from the schedule.');
  }

  return {
    editingShift,
    handleCsvImport,
    handleAddShift,
    openEditShift,
    handleSaveShift,
    handleDeleteShift,
    closeEditShift: () => setEditingShift(null)
  };
}
