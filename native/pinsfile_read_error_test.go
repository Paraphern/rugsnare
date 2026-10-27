package main

import (
	"bytes"
	"errors"
	"io/fs"
	"os"
	"testing"
)

func unreadablePinStore(t *testing.T) (string, string, []byte) {
	t.Helper()
	cwd := t.TempDir()
	path := pinsPath(cwd)
	original := []byte(`{"version":1,"servers":{"keep":{"hash":"original"}},"skills":{}}`)
	write(t, path, string(original))
	if err := os.Chmod(path, 0); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chmod(path, 0o600) })
	if _, err := os.ReadFile(path); !errors.Is(err, fs.ErrPermission) {
		t.Skipf("fixture cannot induce a permission error: %v", err)
	}
	return cwd, path, original
}

func TestLoadSkillPinsReadFailure(t *testing.T) {
	cwd, _, _ := unreadablePinStore(t)
	if _, err := LoadSkillPins(cwd); !errors.Is(err, fs.ErrPermission) {
		t.Fatalf("LoadSkillPins error = %v, want permission error", err)
	}
}

func TestSaveSkillPinsReadFailurePreservesStore(t *testing.T) {
	cwd, path, original := unreadablePinStore(t)
	if err := SaveSkillPins(cwd, SkillPinMap{}); !errors.Is(err, fs.ErrPermission) {
		t.Errorf("SaveSkillPins error = %v, want permission error", err)
	}
	if err := os.Chmod(path, 0o600); err != nil {
		t.Fatal(err)
	}
	after, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(after, original) {
		t.Error("read failure replaced the existing pin document")
	}
}

func TestPinStoreDirectoryReadFailure(t *testing.T) {
	cwd := t.TempDir()
	path := pinsPath(cwd)
	if err := os.MkdirAll(path, 0o755); err != nil {
		t.Fatal(err)
	}
	if _, err := LoadSkillPins(cwd); err == nil {
		t.Error("LoadSkillPins accepted a directory as an absent store")
	}
	if err := SaveSkillPins(cwd, SkillPinMap{}); err == nil {
		t.Error("SaveSkillPins accepted a directory as an absent store")
	}
	if _, err := os.Stat(path + ".tmp"); !errors.Is(err, fs.ErrNotExist) {
		t.Errorf("read failure wrote a temporary document: %v", err)
	}
	if info, err := os.Stat(path); err != nil || !info.IsDir() {
		t.Fatalf("original directory changed: %v", err)
	}
}

func TestMissingPinStoreCanBeCreated(t *testing.T) {
	cwd := t.TempDir()
	if pins, err := LoadSkillPins(cwd); err != nil || len(pins) != 0 {
		t.Fatalf("missing store: pins=%v error=%v", pins, err)
	}
	want := SkillPinMap{"test": {}}
	if err := SaveSkillPins(cwd, want); err != nil {
		t.Fatal(err)
	}
	if pins, err := LoadSkillPins(cwd); err != nil || len(pins) != 1 {
		t.Fatalf("created store: pins=%v error=%v", pins, err)
	}
}
