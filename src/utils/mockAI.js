import { differenceInDays, parseISO } from 'date-fns';

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'phi3';

/**
 * Helper to call the local Ollama instance.
 * Returns the generated text if successful, or null if it fails (CORS / Offline).
 */
const callOllama = async (prompt) => {
  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt: prompt,
        stream: false
      })
    });
    
    if (!response.ok) throw new Error(`Ollama Error: ${response.status}`);
    
    const data = await response.json();
    return data.response.trim();
  } catch (err) {
    console.warn("⚠️ Ollama unavailable (CORS or Offline). Falling back to Simulated AI.");
    return null;
  }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * FEATURE 1: Comment Improver (✨)
 */
export const improveComment = async (text) => {
  if (!text || text.trim() === '') {
    return text;
  }

  // Attempt real AI
  const prompt = `You are an AI proofreader like Grammarly. Your only job is to fix spelling and grammar mistakes in the provided text. Do NOT rewrite the sentence structure, change the tone, or alter the meaning. Keep the original words as much as possible, just correct the errors. Do NOT include any conversational text like "Here is the corrected text". Just output the exact fixed text.\n\nText to fix: "${text}"`;
  const aiResponse = await callOllama(prompt);
  if (aiResponse) return aiResponse.replace(/^"|"$/g, ''); // Remove wrapping quotes if any

  // ----------- FALLBACK MOCK LOGIC -----------
  await delay(800 + Math.random() * 400);

  const typos = {
    'teh': 'the', 'dont': "don't", 'cant': "can't", 'im': "I'm", 'ive': "I've",
    'wating': 'waiting', 'blokced': 'blocked', 'funtionality': 'functionality',
    'speling': 'spelling', 'gramarly': 'Grammarly', 'i': 'I', 'god': 'good',
    'thier': 'their', 'recieve': 'receive', 'acheive': 'achieve', 
    'tomorow': 'tomorrow', 'definitly': 'definitely', 'seperate': 'separate',
    'occured': 'occurred', 'bussiness': 'business'
  };

  let newText = text.replace(/working god/gi, 'working well');
  const words = newText.split(/(\b)/); 
  newText = words.map(w => {
    const lower = w.toLowerCase();
    if (typos[lower]) {
      if (w[0] === w[0].toUpperCase()) return typos[lower].charAt(0).toUpperCase() + typos[lower].slice(1);
      return typos[lower];
    }
    return w;
  }).join('');

  newText = newText.replace(/\b i \b/g, ' I ').replace(/^i \b/g, 'I ');
  newText = newText.replace(/(^\s*|[.!?]\s+)([a-z])/g, (m, p, l) => p + l.toUpperCase());

  const trimmed = newText.trim();
  if (trimmed.length > 0 && !/[.!?]$/.test(trimmed)) newText = trimmed + '.';

  return newText;
};


/**
 * FEATURE 2: Risk Detector
 */
export const analyzeRisks = async (tasks) => {
  const report = [];

  // Pre-calculate risk metrics so we know which ones to send to LLM
  const riskyTasksData = [];

  tasks.forEach(t => {
    if (t.status === 'Delivered' || t.status === 'Archive' || t.status === 'Initial') return;

    let totalFT = 0, completedFT = 0;
    if (t.owners) {
      t.owners.forEach(o => {
        totalFT += Number(o.totalFT || 0);
        completedFT += Number(o.completedFT || 0);
      });
    }

    const progressPct = totalFT > 0 ? (completedFT / totalFT) * 100 : 0;
    let daysLeft = 999;
    try { if (t.endDate) daysLeft = differenceInDays(parseISO(t.endDate), new Date()); } catch(e) {}

    if (t.status === 'Blocked') {
      riskyTasksData.push({ t, riskLevel: '🔴 Critical', daysLeft, progressPct });
    } else if (daysLeft < 3 && progressPct < 70) {
      riskyTasksData.push({ t, riskLevel: '🟠 High', daysLeft, progressPct });
    } else if (progressPct === 0 && daysLeft < 7 && t.status !== 'Yet To Start') {
      riskyTasksData.push({ t, riskLevel: '🟡 Medium', daysLeft, progressPct });
    }
  });

  // Call Ollama for each risky task explanation
  await Promise.all(riskyTasksData.map(async (data) => {
    const { t, riskLevel, daysLeft, progressPct } = data;
    
    const prompt = `You are a strict project risk analyst. A software task named "${t.function}" is currently ${Math.round(progressPct)}% complete with ${daysLeft} days remaining before the deadline. Its status is "${t.status}". Write exactly one concise sentence (maximum 20 words) explaining why this is a risk and what the manager should do. Keep it highly professional. Do not output anything else.`;
    
    let aiAnalysis = await callOllama(prompt);
    
    if (!aiAnalysis) {
      // Fallback
      if (riskLevel === '🔴 Critical') aiAnalysis = `Task explicitly marked Blocked. With ${daysLeft} days left and ${Math.round(progressPct)}% done, immediate unblocking intervention is required.`;
      else if (riskLevel === '🟠 High') aiAnalysis = `Velocity mismatch: Deadline in ${daysLeft} days but only ${Math.round(progressPct)}% complete. High probability of delay without resource injection.`;
      else aiAnalysis = `Stagnation detected: 0% progress logged despite nearing deadline in ${daysLeft} days. Check in with owners immediately.`;
    }

    report.push({ ...t, riskLevel, aiAnalysis });
  }));

  if (report.length === 0) await delay(800); // UI feel

  return report.sort((a,b) => {
     if (a.riskLevel === '🔴 Critical') return -1;
     if (b.riskLevel === '🔴 Critical') return 1;
     return 0;
  });
};


/**
 * FEATURE 3: Workload Analyzer
 */
export const analyzeWorkload = async (teamMembers, activeTasks) => {
  const workloads = {};
  teamMembers.forEach(m => workloads[m.name] = 0);
  const taskToOwnerMap = [];

  activeTasks.forEach(t => {
    if (t.owners) {
      t.owners.forEach(o => {
         const remainingFT = Math.max(0, Number(o.totalFT || 0) - Number(o.completedFT || 0));
         if (workloads[o.name] !== undefined) {
            workloads[o.name] += remainingFT;
            if (remainingFT > 0) taskToOwnerMap.push({ taskSno: t.sno, owner: o.name, burden: remainingFT });
         } else {
            workloads[o.name] = remainingFT;
            taskToOwnerMap.push({ taskSno: t.sno, owner: o.name, burden: remainingFT });
         }
      });
    }
  });

  const entries = Object.entries(workloads).map(([name, pendingFT]) => ({ name, pendingFT })).sort((a,b) => b.pendingFT - a.pendingFT);

  if (entries.length === 0) {
    return { status: 'idle', message: 'No active team members or tasks found to analyze.' };
  }

  const highest = entries[0];
  const lowest = entries[entries.length - 1];
  
  // Prompt Ollama for the overarching message
  const prompt = `You are an AI Resource Manager. The team's active workload (measured in Full-Time days) is as follows: ${entries.map(e => e.name + ': ' + e.pendingFT + ' FTs').join(', ')}. The highest loaded is ${highest.name}. The lowest loaded is ${lowest.name}. Provide a 2-sentence actionable recommendation on how to rebalance the team's workload. Be direct and managerial. Do not use conversational filler.`;
  
  let suggestion = await callOllama(prompt);

  if (!suggestion) {
     // Fallback
     await delay(800);
     if (highest.pendingFT === 0) {
        return { status: 'optimal', message: '✅ Team workload perfectly balanced. 0 pending FTs.', distribution: entries };
     }
     if (highest.pendingFT <= 20) {
        return { status: 'balanced', message: `✅ Workload sustainable. ${highest.name} has the most load (${highest.pendingFT} FTs) but remains within safety thresholds.`, distribution: entries };
     }
     const overloadedMap = taskToOwnerMap.filter(x => x.owner === highest.name).sort((a,b) => b.burden - a.burden);
     const candidateTask = overloadedMap.length > 0 ? overloadedMap[0] : null;
     suggestion = `⚠️ ${highest.name} is overloaded with ${highest.pendingFT} pending FTs. `;
     if (lowest.pendingFT < 10 && candidateTask && lowest.name !== highest.name) {
       suggestion += `Suggest moving Task ${candidateTask.taskSno} (${candidateTask.burden} FT) to ${lowest.name} (${lowest.pendingFT} FT total).`;
     } else {
       suggestion += `Distribute their tasks to free team members.`;
     }
  }

  return {
    status: highest.pendingFT > 20 ? 'overloaded' : 'balanced',
    message: suggestion,
    distribution: entries
  };
};
