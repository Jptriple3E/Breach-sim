const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getMissionSummaries, getMission } = require('../db/missions');

const router = express.Router();

// List all missions with the current user's progress merged in
router.get('/', requireAuth, async (req, res) => {
  try {
    const summaries = getMissionSummaries();
    const progressRows = await db.getAllProgress(req.user.id);

    const progressByMission = Object.fromEntries(
      progressRows.map((p) => [p.mission_id, p])
    );

    const merged = summaries.map((m) => ({
      ...m,
      stepIndex: progressByMission[m.id]?.step_index || 0,
      completed: !!progressByMission[m.id]?.completed,
    }));

    res.json({ missions: merged });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get full briefing + current step for one mission
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const mission = getMission(req.params.id);
    if (!mission) return res.status(404).json({ error: 'Mission not found' });

    const progress = await db.getProgress(req.user.id, mission.id);

    res.json({
      id: mission.id,
      title: mission.title,
      difficulty: mission.difficulty,
      points: mission.points,
      briefing: mission.briefing,
      totalSteps: mission.steps.length,
      stepIndex: progress?.step_index || 0,
      completed: !!progress?.completed,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit a simulated terminal command for a mission
router.post('/:id/command', requireAuth, async (req, res) => {
  try {
    const mission = getMission(req.params.id);
    if (!mission) return res.status(404).json({ error: 'Mission not found' });

    const { command } = req.body;
    if (typeof command !== 'string' || !command.trim()) {
      return res.status(400).json({ error: 'Command is required' });
    }

    let progress = await db.getProgress(req.user.id, mission.id);
    if (!progress) {
      progress = await db.ensureProgress(req.user.id, mission.id);
    }

    if (progress.completed) {
      return res.json({
        output: 'Mission already complete. Try another mission.',
        stepIndex: progress.step_index,
        completed: true,
      });
    }

    const currentStep = mission.steps[progress.step_index];
    const trimmed = command.trim();

    if (currentStep.match.test(trimmed)) {
      const newStepIndex = progress.step_index + 1;
      const justCompleted = !!currentStep.completesMission;

      await db.advanceProgress(req.user.id, mission.id, newStepIndex, justCompleted);

      let score;
      if (justCompleted) {
        score = await db.addToScore(req.user.id, mission.points);
      } else {
        const user = await db.getUserById(req.user.id);
        score = user.score;
      }

      return res.json({
        output: currentStep.output,
        stepIndex: newStepIndex,
        completed: justCompleted,
        score,
      });
    }

    return res.json({
      output: `Command not recognized or not valid at this stage: '${trimmed}'\nType 'hint' if you're stuck.`,
      stepIndex: progress.step_index,
      completed: false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
