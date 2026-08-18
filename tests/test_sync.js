import assert from 'assert';
import { compareDatabases, mergeDatabases, findMatchingTask } from '../backend/github_sync/conflict_manager.js';
import * as syncManager from '../backend/github_sync/sync_manager.js';

console.log('--- RUNNING GITHUB SYNC FEATURE UNIT TESTS ---');

// Test 1: Task Identity Matching (Primary Key = SNo, Fallback = taskIds overlap)
const localTask = { sno: 1, taskIds: ["SPA_00122"] };
const remoteTask = { sno: 1, taskIds: ["SPA_00122"] };
assert.ok(findMatchingTask(localTask, [remoteTask]), 'Should match tasks by SNo');

const localTaskNoSno = { taskIds: ["SPA_00122", "SPA_00123"] };
const remoteTaskNoSno = { taskIds: ["SPA_00123"] };
assert.ok(findMatchingTask(localTaskNoSno, [remoteTaskNoSno]), 'Should match tasks by overlapping taskIds');

// Test 2: Local-only vs GitHub-only modifications comparison
const localDb = { tasks: [{ sno: 1, status: "In Progress", taskIds: ["SPA_00122"] }] };
const remoteDb = { tasks: [{ sno: 1, status: "Delivered", taskIds: ["SPA_00122"] }] };
const diff = compareDatabases(localDb, remoteDb);
assert.ok(diff.hasConflicts, 'Should flag conflict if local differs from remote');
assert.equal(diff.tasks.updated.length, 1, 'Should find 1 modified task');

// Test 3: Conflict Field-level resolutions and merging
const resolutions = {
  "task_1_status": "remote"
};
const merged = mergeDatabases(localDb, remoteDb, resolutions);
assert.equal(merged.tasks[0].status, "Delivered", "Merged task should take remote value based on resolution choice");

// Test 4: Dynamic Hash calculation ignores whitespace/formatting
const hash1 = syncManager.getDatabaseHash('{\n  "tasks": []\n}');
const hash2 = syncManager.getDatabaseHash('{"tasks":[]}');
assert.equal(hash1, hash2, 'Hash calculation must be canonical and ignore structural whitespace');

// Test 5: Mask Token security check
const masked = syncManager.maskToken('ghp_mySuperSecretToken123456');
assert.ok(masked.startsWith('••••••••'), 'Token must be masked at start');
assert.ok(masked.endsWith('3456'), 'Token must show only last 4 characters');

console.log('✓ All GitHub Sync unit tests passed successfully!');
