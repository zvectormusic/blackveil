#!/bin/bash
# Renders a dry-vs-wet demo of each factory preset through the running HISE instance (REST API on
# :1900), into Binaries/Demos/ (not in git): "Blackveil <BPM> - <Category> - <Name>.wav", 2 bars of
# the preset's dry kick (the rumble muted), then 4 bars wet and a last kick that rings out (to where
# its tail stays under -60 dBFS, at most 6 s), 24-bit 44.1 kHz. SAMPLE / MIDI, the factory kick
# Kick 01 G, KEY OFF (a preset never changes them).
#
#   bash tools/render_demos.sh                      every preset in UserPresets/
#   bash tools/render_demos.sh "Rumble/Deep Tunnel"  only these
#
# Run from projects/Blackveil, the project loaded, nothing unsaved (the end reloads the project from
# XmlPresetBackups/Blackveil.xml, which also removes the MIDI player added here); Live closed (HISE
# records nothing while Live holds the audio device). About 30 s a preset.
#
# How the timing is exact (2026-10-31; first attempts were off): HISE's test sequencer fires MIDI on
# a timer, so a note lands at the start of the next audio block (several ms of jitter). The kicks
# come from a MIDI player module instead (DemoPlayer, added for the run, never saved) playing a
# generated MIDI file, synced to HISE's internal clock; starting the clock also starts the engine's
# grid, so the GRID duck lines up with the kicks as in a DAW (with the transport stopped the grid
# free-runs at an arbitrary phase: GRID presets ducked mid-beat). The synced player starts LAG_MS
# after the clock (measured, constant: about an audio block), so the file puts each kick that much
# before its beat; the script checks the result in the engine's snapshot before rendering and stops
# if the kick isn't on the grid line (then measure the new lag: it prints it). Dry and wet are two
# takes (a mute switched mid-take lands on HISE's timer too), joined on bar 3 by demo_join.ps1,
# which also prints each kick's distance from the grid (0 / 4 samples: HISE's 8-sample event raster).

BPM=140
TPQ=9600                 # MIDI ticks a beat (fine enough for the lag: 0.045 ms a tick at 140)
LAG_MS=9.28              # the synced player's start after the clock (measured at 140 BPM, 2026-10-31)
cd "$(dirname "$0")/.." || exit 1
OUT="Binaries/Demos"
mkdir -p "$OUT"
OUT_ABS="$(cd "$OUT" && pwd -W)"

api() { curl -s -X POST "localhost:1900/api/$1" -H "Content-Type: application/json" -d "$2"; }
repl() { api repl "{\"moduleId\":\"Interface\",\"expression\":\"$1\"}"; }
replv() { repl "$1" | grep -oE '"value": [^,}]*' | sed 's/"value": //'; }
setv() { api set_component_value "{\"moduleId\":\"Interface\",\"id\":\"$1\",\"value\":$2}" | grep -q '"success": true' || echo "FAILED $1=$2"; }

curl -s localhost:1900/api/status | grep -q '"name": "Blackveil"' || { echo "HISE isn't running with Blackveil loaded"; exit 1; }
[ "$(replv "Content.getComponent('lblKickFile').getValue()")" = '""' ] || echo "note: a user kick is loaded; the demos use it"

# --- the MIDI file: a beat of lead-in, 17 kicks (note 36) a beat apart, each LAG_MS early ---
vlq() {   # a number as a MIDI variable-length quantity, printf escapes
	local v=$1 s; s=$(printf '\\x%02x' $((v & 127))); v=$((v >> 7))
	while [ $v -gt 0 ]; do s="$(printf '\\x%02x' $(((v & 127) | 128)))$s"; v=$((v >> 7)); done
	printf '%s' "$s"
}
LAG_T=$(awk "BEGIN{printf \"%d\", $LAG_MS * $BPM * $TPQ / 60000 + 0.5}")
NOTE_T=$((TPQ / 4))
MID="$OUT/_kicks.mid"; TRK="$OUT/_trk.bin"; : > "$TRK"
for i in $(seq 0 16); do
	if [ $i -eq 0 ]; then printf "$(vlq $((TPQ - LAG_T)))" >> "$TRK"; else printf "$(vlq $((TPQ - NOTE_T)))" >> "$TRK"; fi
	printf "\x90\x24\x7f$(vlq $NOTE_T)\x80\x24\x00" >> "$TRK"
done
printf '\x00\xff\x2f\x00' >> "$TRK"
L=$(stat -c %s "$TRK")
{ printf "MThd\x00\x00\x00\x06\x00\x00\x00\x01\\x$(printf %02x $((TPQ >> 8)))\\x$(printf %02x $((TPQ & 255)))MTrk"
  printf "\\x$(printf %02x $((L >> 24 & 255)))\\x$(printf %02x $((L >> 16 & 255)))\\x$(printf %02x $((L >> 8 & 255)))\\x$(printf %02x $((L & 255)))"
  cat "$TRK"; } > "$MID"
rm -f "$TRK"
MID_ABS="$OUT_ABS/_kicks.mid"

# --- the setup (all undone by the reload at the end) ---
restore() {
	repl "transport.stopInternalClock(0)" > /dev/null
	repl "Engine.setHostBpm(-1)" > /dev/null
	api project/load '{"file":"XmlPresetBackups/Blackveil.xml"}' | grep -q '"success": true' || echo "FAILED to reload the project: reload it before saving"
	rm -f "$MID" "$OUT/_dry.wav" "$OUT/_wet.wav"
}
trap restore EXIT
repl "Engine.setHostBpm($BPM)" > /dev/null
setv cmbSrcMode 2       # SAMPLE
setv cmbSrcTrig 1       # MIDI
setv knbKickIndex 0     # Kick 01 G
setv cmbKey 1           # OFF
api builder/apply '{"operations":[{"op":"add","type":"MidiPlayer","parent":"Blackveil","chain":0,"name":"DemoPlayer"}]}' | grep -q '"success": true' || { echo "FAILED to add the MIDI player"; exit 1; }
[ "$(replv "Synth.getMidiPlayer('DemoPlayer').setFile('$MID_ABS', true, true)")" = "true" ] || { echo "FAILED to load $MID_ABS"; exit 1; }
api testing/sequence '{"blocking":true,"messages":[{"type":"set_attribute","processorId":"DemoPlayer","parameterId":"LoopEnabled","value":0,"timestamp":0}]}' > /dev/null
repl "transport.setEnableGrid(true, 11)" > /dev/null          # (the player syncs only to an enabled grid)
repl "transport.setSyncMode(transport.InternalOnly)" > /dev/null
repl "Synth.getMidiPlayer('DemoPlayer').setSyncToMasterClock(true)" > /dev/null

# --- the check: in the engine's snapshot (one beat from a grid line), where the kick starts ---
check() {
	repl "transport.startInternalClock(0)" > /dev/null; sleep 2.5
	local lo=0 hi; hi=$(replv "2 * SNAP_BINS" | awk '{printf "%d", $1}')
	local bins=$((hi / 2)) pre; pre=$(replv "bvSnap[0].getMagnitude($((hi - 6)), 6)")
	while [ $((hi - lo)) -gt 1 ]; do
		local mid=$(((lo + hi) / 2)) m; m=$(replv "bvSnap[0].getMagnitude(0, $mid)")
		if awk "BEGIN{exit !($m > 0.02)}"; then hi=$mid; else lo=$mid; fi
	done
	repl "transport.stopInternalClock(0)" > /dev/null; sleep 1
	local ms; ms=$(awk "BEGIN{printf \"%.2f\", $((hi / 2)) / $bins * 60000 / $BPM}")
	echo "grid check: the kick starts $ms ms after the grid line (level before it: $pre)"
	awk "BEGIN{exit !($((hi / 2)) <= 2 && $pre < 0.01)}" || { echo "not on the grid: set LAG_MS to $LAG_MS + $ms (or less if it starts before the line) and run again"; exit 1; }
}
repl "Engine.loadUserPreset(FileSystem.getFolder(FileSystem.UserPresets).getChildFile('Init/Init.preset'))" > /dev/null
sleep 1
check

# --- one preset: the dry take, the wet take, joined ---
BEAT_MS=$(awk "BEGIN{print 60000 / $BPM}")
DRY_MS=$(awk "BEGIN{printf \"%d\", 9 * $BEAT_MS + 250}")       # the lead-in + 8 kicks
WET_MS=$(awk "BEGIN{printf \"%d\", 17 * $BEAT_MS + 6500}")      # the lead-in + 16 kicks + the last one's tail
take() {
	api testing/sequence "{\"recordOutput\":\"$1\",\"messages\":[{\"type\":\"repl\",\"id\":\"go\",\"expression\":\"transport.startInternalClock(0)\",\"timestamp\":0},{\"type\":\"repl\",\"id\":\"end\",\"expression\":\"transport.stopInternalClock(0)\",\"timestamp\":$2}]}" > /dev/null
}
render() {
	local p="$1" out="$OUT_ABS/Blackveil $BPM - ${1%%/*} - ${1#*/}.wav"
	repl "Engine.loadUserPreset(FileSystem.getFolder(FileSystem.UserPresets).getChildFile('$p.preset'))" > /dev/null
	sleep 1
	setv btnRumbleMute 1
	sleep 3            # the previous preset's tails die out
	take "$OUT_ABS/_dry.wav" "$DRY_MS"
	setv btnRumbleMute 0
	sleep 5            # the rumble built during the dry take dies out
	take "$OUT_ABS/_wet.wav" "$WET_MS"
	echo "$p: $(powershell -File tools/demo_join.ps1 -Dry "$OUT_ABS/_dry.wav" -Wet "$OUT_ABS/_wet.wav" -Out "$out" -Bpm $BPM 2>&1 | tail -1)"
}

if [ $# -gt 0 ]; then
	for p in "$@"; do render "$p"; done
else
	for f in UserPresets/*/*.preset; do p="${f#UserPresets/}"; render "${p%.preset}"; done
fi
