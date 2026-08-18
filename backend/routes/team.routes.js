import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { getEntireDatabase, updateEntireDatabase } from '../services/db.service.js';

const router = Router();
const VARIANTS = ['vsm_pt', 'vsm_pc', 'bsi_pt', 'bsi_pc', 'bsi_auto'];

// Fetch all members from all variant databases to support cross-variant imports/transfers
router.get('/all-members', async (req, res) => {
  try {
    const allMembers = [];
    const seenNames = new Set();

    for (const variant of VARIANTS) {
      const filename = `database_${variant}.json`;
      const dbPath = path.resolve(filename);
      try {
        const raw = await fs.readFile(dbPath, 'utf8');
        const db = JSON.parse(raw);
        if (db.teamMembers) {
          db.teamMembers.forEach(member => {
            if (!seenNames.has(member.name.trim().toLowerCase())) {
              seenNames.add(member.name.trim().toLowerCase());
              allMembers.push({
                sno: member.sno,
                name: member.name,
                location: member.location,
                perimeter: member.perimeter,
                status: member.status || 'Active',
                sourceVariant: variant
              });
            }
          });
        }
      } catch (e) {
        // file doesn't exist or is invalid, skip
      }
    }
    
    res.json({ success: true, members: allMembers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Transfer / copy team member across databases
router.post('/transfer', async (req, res) => {
  try {
    const { sourceVariant, targetVariant, memberName, action } = req.body;
    
    if (!sourceVariant || !targetVariant || !memberName) {
      return res.status(400).json({ success: false, error: 'Missing source, target, or member name' });
    }

    if (sourceVariant === targetVariant) {
      return res.status(400).json({ success: false, error: 'Source and target variants must be different' });
    }

    const sourceDb = await getEntireDatabase(sourceVariant);
    const targetDb = await getEntireDatabase(targetVariant);

    const sourceMemberIndex = (sourceDb.teamMembers || []).findIndex(
      m => m.name.trim().toLowerCase() === memberName.trim().toLowerCase()
    );
    
    if (sourceMemberIndex === -1) {
      return res.status(404).json({ success: false, error: 'Member not found in source variant' });
    }

    const sourceMember = sourceDb.teamMembers[sourceMemberIndex];
    const targetPrefix = targetVariant.toUpperCase().split('_')[0]; // VSM or BSI

    // 1. Copy/Add Member Profile to Target
    if (!targetDb.teamMembers) targetDb.teamMembers = [];
    
    let targetMember = targetDb.teamMembers.find(
      m => m.name.trim().toLowerCase() === sourceMember.name.trim().toLowerCase()
    );
    
    if (!targetMember) {
      const nextSno = targetDb.teamMembers.length > 0 
        ? Math.max(...targetDb.teamMembers.map(m => m.sno)) + 1 
        : 1;
      
      targetMember = {
        ...sourceMember,
        sno: nextSno,
        perimeter: targetPrefix,
        status: 'Active'
      };
      targetDb.teamMembers.push(targetMember);
    } else {
      targetMember.status = 'Active';
      targetMember.perimeter = targetPrefix;
    }

    // 2. Copy WFO/WFH Modes (teamModes)
    if (sourceDb.teamModes) {
      if (!targetDb.teamModes) targetDb.teamModes = [];
      const memberModes = sourceDb.teamModes.filter(m => m.name === sourceMember.name);
      
      memberModes.forEach(mode => {
        // Avoid duplicate modes on the same date
        const dup = targetDb.teamModes.some(m => m.name === sourceMember.name && m.date === mode.date);
        if (!dup) {
          targetDb.teamModes.push({ ...mode });
        }
      });
    }

    // 3. Copy Leave Data (leaveData)
    if (sourceDb.leaveData) {
      if (!targetDb.leaveData) targetDb.leaveData = [];
      const memberLeaves = sourceDb.leaveData.filter(l => l.name === sourceMember.name);
      
      memberLeaves.forEach(leave => {
        const dup = targetDb.leaveData.some(l => l.name === sourceMember.name && l.date === leave.date);
        if (!dup) {
          targetDb.leaveData.push({ ...leave });
        }
      });
    }

    // Save target database
    await updateEntireDatabase(targetDb, targetVariant);

    // 4. Source Database Update (Soft retirement for 'move' action)
    if (action === 'move') {
      sourceDb.teamMembers[sourceMemberIndex] = {
        ...sourceMember,
        status: 'Inactive'
      };
      await updateEntireDatabase(sourceDb, sourceVariant);
    }

    res.json({ success: true, message: `Successfully transferred ${sourceMember.name} from ${sourceVariant} to ${targetVariant}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
