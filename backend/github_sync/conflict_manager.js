/**
 * Manages read-only dry-run database comparisons, changesets,
 * and conflict merges based on stable DSR task identities.
 */

const getTaskIdsList = (task) => {
  if (!task) return [];
  if (Array.isArray(task.taskIds)) return task.taskIds.map(id => String(id).toLowerCase().trim());
  if (task.taskId) return [String(task.taskId).toLowerCase().trim()];
  return [];
};

/**
 * Finds a matching task in the list using sno or taskIds overlap.
 */
export const findMatchingTask = (task, list) => {
  if (!task || !list) return null;
  
  // 1. Try matching by serial number (sno)
  if (task.sno !== undefined && task.sno !== null) {
    const match = list.find(t => t.sno === task.sno);
    if (match) return match;
  }
  
  // 2. Try matching by overlapping task IDs
  const taskIds = getTaskIdsList(task);
  if (taskIds.length > 0) {
    const match = list.find(t => getTaskIdsList(t).some(id => taskIds.includes(id)));
    if (match) return match;
  }
  
  return null;
};

/**
 * Compares two database objects (local vs remote) in a completely read-only dry-run.
 * Returns a diff report listing added, deleted, updated, and conflicting items.
 */
export const compareDatabases = (localDb, remoteDb) => {
  const localTasks = localDb.tasks || [];
  const remoteTasks = remoteDb.tasks || [];
  
  const added = []; // in remote, not in local
  const deleted = []; // in local, not in remote
  const updated = []; // matched, but has property differences
  const conflicts = []; // matched, both sides modified differently

  // 1. Check local tasks vs remote tasks
  localTasks.forEach(lTask => {
    const rTask = findMatchingTask(lTask, remoteTasks);
    if (!rTask) {
      deleted.push({
        sno: lTask.sno,
        function: lTask.function,
        taskIds: lTask.taskIds || [lTask.taskId],
        status: lTask.status
      });
    } else {
      // Diff task properties
      const taskDiffs = getTaskPropertyDiffs(lTask, rTask);
      if (taskDiffs.length > 0) {
        updated.push({
          sno: lTask.sno,
          taskIds: lTask.taskIds || [lTask.taskId],
          function: lTask.function,
          diffs: taskDiffs
        });
      }
    }
  });

  remoteTasks.forEach(rTask => {
    const lTask = findMatchingTask(rTask, localTasks);
    if (!lTask) {
      added.push({
        sno: rTask.sno,
        function: rTask.function,
        taskIds: rTask.taskIds || [rTask.taskId],
        status: rTask.status
      });
    }
  });

  // Check other collections summary
  const collectionsDiff = [];
  const compareCollectionLength = (key) => {
    const lLen = Array.isArray(localDb[key]) ? localDb[key].length : 0;
    const rLen = Array.isArray(remoteDb[key]) ? remoteDb[key].length : 0;
    if (lLen !== rLen) {
      collectionsDiff.push({
        collection: key,
        localCount: lLen,
        remoteCount: rLen
      });
    }
  };

  ['teamMembers', 'holidays', 'layouts', 'customDashboards'].forEach(compareCollectionLength);

  return {
    hasConflicts: updated.some(u => u.diffs.some(d => d.conflict)),
    tasks: { added, deleted, updated },
    collections: collectionsDiff
  };
};

/**
 * Compares scalar and nested properties of two matched tasks.
 */
const getTaskPropertyDiffs = (lTask, rTask) => {
  const diffs = [];
  const fields = [
    'status', 'startDate', 'endDate', 'remarks', 
    'deliveredDate', 'progress', 'include_in_dsr'
  ];

  fields.forEach(field => {
    const lVal = lTask[field];
    const rVal = rTask[field];
    
    // Normalize values
    const lStr = lVal !== undefined && lVal !== null ? String(lVal) : '';
    const rStr = rVal !== undefined && rVal !== null ? String(rVal) : '';

    if (lStr !== rStr) {
      diffs.push({
        field,
        local: lVal,
        remote: rVal,
        conflict: true // Default to conflict if different and no sync history baseline
      });
    }
  });

  // Owners list comparison
  const lOwners = lTask.owners || [];
  const rOwners = rTask.owners || [];

  lOwners.forEach(lOwner => {
    const rOwner = rOwners.find(o => o.id === lOwner.id || o.name === lOwner.name);
    if (!rOwner) {
      diffs.push({
        field: `owner_${lOwner.name || lOwner.id}_assignment`,
        local: 'Assigned',
        remote: 'Not Assigned',
        conflict: true
      });
    } else {
      // Compare owner-level allocations
      ['totalFT', 'completedFT', 'dailyRemarks'].forEach(prop => {
        const lv = lOwner[prop];
        const rv = rOwner[prop];
        if (JSON.stringify(lv) !== JSON.stringify(rv)) {
          diffs.push({
            field: `owner_${lOwner.name}_${prop}`,
            local: lv,
            remote: rv,
            conflict: true
          });
        }
      });
    }
  });

  rOwners.forEach(rOwner => {
    const lOwner = lOwners.find(o => o.id === rOwner.id || o.name === rOwner.name);
    if (!lOwner) {
      diffs.push({
        field: `owner_${rOwner.name || rOwner.id}_assignment`,
        local: 'Not Assigned',
        remote: 'Assigned',
        conflict: true
      });
    }
  });

  return diffs;
};

/**
 * Merges local and remote databases based on user resolutions.
 * resolutions: { [conflict_key]: 'local' | 'remote' }
 * e.g. { "task_1_status": "local", "task_1_owner_Kimaya_totalFT": "remote" }
 */
export const mergeDatabases = (localDb, remoteDb, resolutions = {}) => {
  const mergedDb = JSON.parse(JSON.stringify(localDb)); // clone local
  const remoteTasks = remoteDb.tasks || [];

  // 1. Process tasks merge
  mergedDb.tasks = mergedDb.tasks.map(lTask => {
    const rTask = findMatchingTask(lTask, remoteTasks);
    if (!rTask) {
      // If task was deleted on remote but exists locally, check resolution
      const resKey = `task_${lTask.sno}_existence`;
      if (resolutions[resKey] === 'remote') {
        return null; // delete task
      }
      return lTask;
    }

    // Task matches. Apply field updates.
    const mergedTask = { ...lTask };
    const fields = [
      'status', 'startDate', 'endDate', 'remarks', 
      'deliveredDate', 'progress', 'include_in_dsr'
    ];

    fields.forEach(field => {
      if (lTask[field] !== rTask[field]) {
        const resKey = `task_${lTask.sno}_${field}`;
        const choice = resolutions[resKey] || 'local'; // default local
        mergedTask[field] = choice === 'local' ? lTask[field] : rTask[field];
      }
    });

    // Merge owners
    if (lTask.owners || rTask.owners) {
      const mergedOwners = [];
      const lOwners = lTask.owners || [];
      const rOwners = rTask.owners || [];

      lOwners.forEach(lOwner => {
        const rOwner = rOwners.find(o => o.id === lOwner.id || o.name === lOwner.name);
        if (!rOwner) {
          const resKey = `task_${lTask.sno}_owner_${lOwner.name || lOwner.id}_assignment`;
          const choice = resolutions[resKey] || 'local';
          if (choice === 'local') {
            mergedOwners.push(lOwner);
          }
        } else {
          // Owner exists on both. Compare properties.
          const mergedOwner = { ...lOwner };
          ['totalFT', 'completedFT', 'dailyRemarks'].forEach(prop => {
            if (JSON.stringify(lOwner[prop]) !== JSON.stringify(rOwner[prop])) {
              const resKey = `task_${lTask.sno}_owner_${lOwner.name}_${prop}`;
              const choice = resolutions[resKey] || 'local';
              mergedOwner[prop] = choice === 'local' ? lOwner[prop] : rOwner[prop];
            }
          });
          mergedOwners.push(mergedOwner);
        }
      });

      rOwners.forEach(rOwner => {
        const lOwner = lOwners.find(o => o.id === rOwner.id || o.name === rOwner.name);
        if (!lOwner) {
          const resKey = `task_${lTask.sno}_owner_${rOwner.name || rOwner.id}_assignment`;
          const choice = resolutions[resKey] || 'remote';
          if (choice === 'remote') {
            mergedOwners.push(rOwner);
          }
        }
      });

      mergedTask.owners = mergedOwners;
    }

    return mergedTask;
  }).filter(Boolean);

  // Add tasks that are new on remote
  remoteTasks.forEach(rTask => {
    const lTask = findMatchingTask(rTask, localDb.tasks || []);
    if (!lTask) {
      const resKey = `task_${rTask.sno}_existence`;
      const choice = resolutions[resKey] || 'remote';
      if (choice === 'remote') {
        mergedDb.tasks.push(rTask);
      }
    }
  });

  // Merge other collections (simple resolution per collection)
  ['teamMembers', 'holidays', 'layouts', 'customDashboards'].forEach(col => {
    if (resolutions[col] === 'remote') {
      mergedDb[col] = remoteDb[col] || [];
    }
  });

  return mergedDb;
};
