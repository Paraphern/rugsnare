package main

// R37 port: --prune / -prune drops dead souls (pinned entries whose file
// no longer exists) instead of letting them ghost as REMOVED on every diff.
// Mirrors the JS tests in product/test/skills-pin.test.js.

import (
	"os"
	"path/filepath"
	"testing"
)

func pinFixtureProject(t *testing.T) (string, string) {
	t.Helper()
	cwd := t.TempDir()
	home := t.TempDir()
	write(t, filepath.Join(cwd, "skills", "helper", "SKILL.md"), benignSkill)
	return cwd, home
}

func TestPinAllSkillsDeadSoulsReportedWithoutPrune(t *testing.T) {
	cwd, home := pinFixtureProject(t)
	pins := SkillPinMap{}
	if stats := PinAllSkills(pins, cwd, home, false); stats.Pinned != 1 {
		t.Fatalf("initial pin: %+v", stats)
	}

	// the skill file disappears (deleted skill, removed plugin)
	if err := os.Remove(filepath.Join(cwd, "skills", "helper", "SKILL.md")); err != nil {
		t.Fatal(err)
	}

	stats := PinAllSkills(pins, cwd, home, false)
	if stats.Pruned != 0 {
		t.Errorf("without prune nothing is dropped, got Pruned=%d", stats.Pruned)
	}
	if len(stats.DeadSouls) != 1 {
		t.Fatalf("dead souls = %v, want the deleted skill", stats.DeadSouls)
	}
	if len(pins) != 1 {
		t.Errorf("entry kept for union semantics (ghosts as REMOVED on diff), store has %d", len(pins))
	}
}

func TestPinAllSkillsPruneDropsDeadSouls(t *testing.T) {
	cwd, home := pinFixtureProject(t)
	pins := SkillPinMap{}
	PinAllSkills(pins, cwd, home, false)

	if err := os.Remove(filepath.Join(cwd, "skills", "helper", "SKILL.md")); err != nil {
		t.Fatal(err)
	}

	stats := PinAllSkills(pins, cwd, home, true)
	if stats.Pruned != 1 || len(stats.DeadSouls) != 1 {
		t.Fatalf("prune stats: %+v", stats)
	}
	if len(pins) != 0 {
		t.Errorf("dead soul still in store after prune: %v", pins)
	}
}

func TestPinAllSkillsNoDeadSoulsNoNoise(t *testing.T) {
	cwd, home := pinFixtureProject(t)
	pins := SkillPinMap{}
	stats := PinAllSkills(pins, cwd, home, true)
	if len(stats.DeadSouls) != 0 || stats.Pruned != 0 {
		t.Fatalf("healthy store must not report dead souls: %+v", stats)
	}
	if stats.Pinned != 1 {
		t.Fatalf("pinned = %d", stats.Pinned)
	}
}
