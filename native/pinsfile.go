// Pins store: reads and writes .rugsnare/pins.json while preserving every
// top-level subtree this binary does not own (notably `servers`, written by
// the npm CLI). Only the `skills` subtree is touched.

package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// SkillPinMap is the `skills` subtree: key -> pin.
type SkillPinMap map[string]SkillPin

// pinsDoc is the whole pins.json as raw subtrees.
type pinsDoc map[string]json.RawMessage

// rugsnareDir mirrors pins.js: .rugsnare under cwd.
func rugsnareDir(cwd string) string { return filepath.Join(cwd, ".rugsnare") }

func pinsPath(cwd string) string { return filepath.Join(rugsnareDir(cwd), "pins.json") }

// LoadSkillPins reads the skills subtree; empty map when absent.
// A malformed skills subtree is an error (the store is user-visible state;
// silently wiping it on a parse hiccup would be worse than failing loud).
func LoadSkillPins(cwd string) (SkillPinMap, error) {
	data, err := os.ReadFile(pinsPath(cwd))
	if err != nil {
		return SkillPinMap{}, nil // no store yet - fine
	}
	var doc pinsDoc
	if err := json.Unmarshal(data, &doc); err != nil {
		return nil, fmt.Errorf("pins.json: %w", err)
	}
	raw, ok := doc["skills"]
	if !ok || len(raw) == 0 {
		return SkillPinMap{}, nil
	}
	var skills SkillPinMap
	if err := json.Unmarshal(raw, &skills); err != nil {
		return nil, fmt.Errorf("pins.json skills subtree: %w", err)
	}
	return skills, nil
}

// HasSkillPins reports whether a skills baseline exists (driftable state).
func HasSkillPins(cwd string) bool {
	pins, err := LoadSkillPins(cwd)
	return err == nil && len(pins) > 0
}

// SaveSkillPins writes the skills subtree back into pins.json, leaving
// every other top-level key byte-identical (raw passthrough). When the
// file does not exist yet, a fresh {version, servers, skills} document is
// created with the same base shape the npm CLI starts from.
func SaveSkillPins(cwd string, skills SkillPinMap) error {
	path := pinsPath(cwd)
	doc := pinsDoc{}

	if data, err := os.ReadFile(path); err == nil {
		if err := json.Unmarshal(data, &doc); err != nil {
			return fmt.Errorf("refusing to rewrite unparsable pins.json: %w", err)
		}
	}
	if _, ok := doc["version"]; !ok {
		doc["version"] = json.RawMessage("1")
	}
	if _, ok := doc["servers"]; !ok {
		doc["servers"] = json.RawMessage("{}")
	}

	raw, err := json.Marshal(skills)
	if err != nil {
		return err
	}
	doc["skills"] = json.RawMessage(raw)

	out, err := marshalIndent(doc)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(rugsnareDir(cwd), 0o755); err != nil {
		return err
	}
	// write-then-rename: a crash mid-write never corrupts the baseline
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, append(out, '\n'), 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

// marshalIndent produces 2-space indented JSON like JSON.stringify(x, null, 2).
func marshalIndent(v any) ([]byte, error) {
	var buf []byte
	enc := json.NewEncoder(newWriterBuf(&buf))
	enc.SetIndent("", "  ")
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return nil, err
	}
	// Encoder.Encode appends \n; strip it, SaveSkillPins adds its own
	return buf[:len(buf)-1], nil
}

type writerBuf struct{ b *[]byte }

func newWriterBuf(b *[]byte) *writerBuf { return &writerBuf{b} }

func (w *writerBuf) Write(p []byte) (int, error) {
	*w.b = append(*w.b, p...)
	return len(p), nil
}
