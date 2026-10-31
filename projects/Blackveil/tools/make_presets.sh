#!/bin/bash
# Builds Blackveil's factory presets through the running HISE instance (REST API on :1900).
# Run from projects/Blackveil with the project loaded. Each preset starts from presetInit()
# (every sound control at its default, the default chain order, duck curve TIGHT 1/4; the setup
# SOURCE / KEY / kick stays), applies its overrides and is saved with Engine.saveUserPreset() into
# UserPresets/<Category>/<Name>.preset. The plugin ships them (embedded at export).
#
# Values are in the controls' own units; combos are 1-based:
#   cmbFltType 1 LP 12, 2 LP 24, 3 BP 12, 4 BP 24, 5 HP 12, 6 HP 24
#   cmbDstMode 1 TAPE, 2 TUBE, 3 FOLD, 4 CLIP
#   cmbDlyTime 1 1/32, 2 1/16T, 3 1/16, 4 1/16D, 5 1/8T, 6 1/8, 7 1/8D, 8 1/4T, 9 1/4, 10 1/4D, 11 1/2
#   cmbRvbType 1 PLATE, 2 HALL, 3 SPRING, 4 SHIMMER, 5 DARK
#   cmbGrnMode 1 CLOUD, 2 DETUNE, 3 OCT UP, 4 OCT DOWN, 5 REVERSE
#   power: btnFx0On FILTER, btnFx1On DIST, btnFx2On DELAY, btnFx3On REVERB, btnEqOn EQ,
#          btnGrnOn GRAIN (off by default)
#   order A B C D E: the chain left to right, 0 FILTER, 1 DIST, 2 DELAY, 3 REVERB, 4 EQ; GRAIN
#          (5) goes last (a five-slot order puts it there)
#   curve NAME LEN: a duck curve preset (TIGHT PUMP SMOOTH LONG GATE SNAP SWELL DOUBLE), LENGTH (ignored since 2026-10-30: always 1/4)
#                   index into DUCK_LENGTHS (2 = 1/8, 3 = 1/4, 4 = 1/2)

repl() { curl -s -X POST localhost:1900/api/repl -H "Content-Type: application/json" \
	-d "{\"moduleId\":\"Interface\",\"expression\":\"$1\"}" | grep -q '"success": true' || echo "FAILED $1"; }
setv() { curl -s -X POST localhost:1900/api/set_component_value -H "Content-Type: application/json" \
	-d "{\"moduleId\":\"Interface\",\"id\":\"$1\",\"value\":$2}" | grep -q '"success": true' || echo "FAILED $1=$2"; }

# preset "Category/Name" [id value | order a b c d e | curve NAME LEN] ...
preset() {
	local name="$1"; shift
	mkdir -p "UserPresets/$(dirname "$name")"   # (saveUserPreset writes nothing into a missing folder)
	repl "presetInit()"
	setv cmbFltType 2
	while [ $# -gt 0 ]; do
		case "$1" in
			order) setv knbChainOrder $(( $2 + 8 * $3 + 64 * $4 + 512 * $5 + 4096 * $6 )); shift 6 ;;
			curve) repl "presetCurve(\\\"$2\\\", $3)"; shift 3 ;;
			*) setv "$1" "$2"; shift 2 ;;
		esac
	done
	sleep 0.5
	repl "Engine.saveUserPreset(FileSystem.getFolder(FileSystem.UserPresets).getChildFile(\\\"$name.preset\\\"))" \
		&& echo "saved $name"
}

preset "Init/Init"

# classic: the kick into a big reverb, distorted, low-passed, ducked
preset "Rumble/Classic Rumble" order 3 1 0 4 2 btnFx2On 0 \
	cmbRvbType 2 knbRvbSize 75 knbRvbDamp 60 knbRvbWidth 30 knbRvbMix 100 \
	cmbDstMode 1 knbDstDrive 45 knbDstTone 3000 knbDstMix 100 \
	knbFltCutoff 250 knbFltReso 15 knbFltEnv 20 knbFltEnvDec 150 \
	knbEqFreq 120 knbEqGain 4 knbEqSubCut 35 knbDuckDepth 90 curve TIGHT 3
preset "Rumble/Deep Tunnel" order 3 1 0 4 2 btnFx2On 0 \
	cmbRvbType 5 knbRvbSize 90 knbRvbDamp 75 knbRvbWidth 20 \
	cmbDstMode 2 knbDstDrive 30 \
	knbFltCutoff 160 knbFltReso 10 knbFltEnv 0 \
	knbEqFreq 80 knbEqGain 5 knbDuckDepth 95 curve PUMP 3
preset "Rumble/Tight Sub" order 0 3 1 4 2 btnFx2On 0 \
	cmbRvbType 1 knbRvbSize 45 knbRvbDamp 50 \
	cmbDstMode 1 knbDstDrive 25 \
	knbFltCutoff 140 knbFltReso 25 knbFltEnv 30 knbFltEnvDec 100 \
	knbEqFreq 60 knbEqGain 6 knbEqSubCut 30 knbDuckDepth 100 curve GATE 3
preset "Rumble/Low Pressure" order 3 1 0 4 2 btnFx2On 0 \
	cmbRvbType 2 knbRvbSize 80 knbRvbDamp 65 \
	cmbDstMode 2 knbDstDrive 50 \
	cmbFltType 1 knbFltCutoff 300 knbFltEnv 0 \
	knbDuckSplit 150 knbDuckDepth 100 curve TIGHT 3

# hypnotic: synced echoes into the room
preset "Hypnotic/Sixteenth Echo" order 0 2 3 1 4 btnFx1On 0 \
	cmbDlyTime 3 knbDlyFeedback 55 knbDlyLowCut 40 knbDlyHighCut 2000 knbDlyMix 50 btnDlyPing 1 \
	knbFltCutoff 300 knbFltReso 30 knbFltEnv 40 knbFltEnvDec 200 \
	cmbRvbType 2 knbRvbSize 60 knbRvbDamp 60 knbRvbMix 80 \
	knbEqGain 3 knbDuckDepth 85 curve SMOOTH 3
preset "Hypnotic/Dotted Roll" order 0 2 3 4 1 btnFx1On 0 \
	cmbDlyTime 7 knbDlyFeedback 45 knbDlyHighCut 1500 knbDlyMix 45 \
	cmbRvbType 1 knbRvbSize 55 knbRvbMix 90 \
	cmbFltType 3 knbFltCutoff 200 knbFltReso 40 knbFltEnv 50 knbFltEnvDec 250 \
	knbDuckDepth 90 curve PUMP 3
preset "Hypnotic/Triplet Haze" order 0 2 3 4 1 btnFx1On 0 \
	cmbDlyTime 5 knbDlyFeedback 60 knbDlyHighCut 1200 knbDlyMix 50 btnDlyPing 1 \
	cmbRvbType 4 knbRvbSize 70 knbRvbDamp 70 knbRvbMix 60 \
	knbFltCutoff 400 knbFltReso 20 \
	knbEqFreq 100 knbEqGain 3 knbDuckDepth 80 curve SMOOTH 3

# industrial: heavy distortion, after or before the reverb
preset "Industrial/Grinder" order 3 1 0 4 2 btnFx2On 0 \
	cmbDstMode 3 knbDstDrive 65 knbDstTone 3000 knbDstMix 80 \
	cmbRvbType 3 knbRvbSize 60 knbRvbDamp 40 \
	cmbFltType 4 knbFltCutoff 350 knbFltReso 45 knbFltEnv 40 knbFltEnvDec 120 \
	knbEqFreq 150 knbEqGain 5 knbDuckDepth 100 curve SNAP 3
preset "Industrial/Clipped Wall" order 3 1 0 4 2 btnFx2On 0 \
	cmbDstMode 4 knbDstDrive 70 knbDstTone 2500 \
	cmbRvbType 5 knbRvbSize 85 \
	knbFltCutoff 500 knbFltReso 10 \
	knbDuckDepth 90 curve LONG 3 knbLimDrive 3
preset "Industrial/Tube Hammer" order 1 3 0 4 2 btnFx2On 0 \
	cmbDstMode 2 knbDstDrive 60 knbDstTone 4000 \
	cmbRvbType 1 knbRvbSize 50 knbRvbDamp 70 \
	knbFltCutoff 350 knbFltEnv 50 knbFltEnvDec 80 \
	knbDuckDepth 100 curve TIGHT 3

# dub: dark echoes and springs
preset "Dub/Dub Chamber" order 0 2 3 4 1 btnFx1On 0 \
	cmbDlyTime 7 knbDlyFeedback 65 knbDlyLowCut 80 knbDlyHighCut 1200 knbDlyMix 55 btnDlyPing 1 \
	cmbRvbType 3 knbRvbSize 65 knbRvbDamp 60 knbRvbMix 85 \
	cmbFltType 1 knbFltCutoff 400 knbFltReso 20 \
	knbDuckDepth 80 curve SMOOTH 3
preset "Dub/Spring Thump" order 3 0 4 1 2 btnFx2On 0 \
	cmbRvbType 3 knbRvbSize 50 knbRvbDamp 45 knbRvbWidth 50 \
	knbFltCutoff 220 knbFltReso 35 knbFltEnv 60 knbFltEnvDec 180 \
	cmbDstMode 1 knbDstDrive 30 knbDstMix 60 \
	knbDuckDepth 85 curve DOUBLE 3

# grain (2026-10-30): GRAIN last in the chain, after the room
preset "Hypnotic/Grain Haze" order 0 3 1 4 2 btnFx1On 0 btnFx2On 0 \
	cmbRvbType 2 knbRvbSize 70 knbRvbDamp 65 \
	knbFltCutoff 300 knbFltReso 20 knbFltEnv 30 \
	btnGrnOn 1 cmbGrnMode 2 knbGrnSize 120 knbGrnDensity 30 knbGrnSpray 400 knbGrnMix 45 \
	knbDuckDepth 85 curve SMOOTH 3
preset "Industrial/Grain Shred" order 3 1 0 4 2 btnFx2On 0 \
	cmbDstMode 3 knbDstDrive 55 knbDstTone 3500 \
	cmbRvbType 5 knbRvbSize 75 \
	knbFltCutoff 450 knbFltReso 15 \
	btnGrnOn 1 cmbGrnMode 5 knbGrnSize 40 knbGrnDensity 60 knbGrnSpray 150 knbGrnMix 60 \
	knbDuckDepth 100 curve SNAP 3
preset "Dub/Octave Ghost" order 0 2 3 4 1 btnFx1On 0 \
	cmbDlyTime 7 knbDlyFeedback 55 knbDlyHighCut 1400 knbDlyMix 45 \
	cmbRvbType 3 knbRvbSize 60 knbRvbMix 80 \
	cmbFltType 1 knbFltCutoff 380 \
	btnGrnOn 1 cmbGrnMode 4 knbGrnSize 200 knbGrnDensity 12 knbGrnSpray 600 knbGrnMix 40 \
	knbDuckDepth 80 curve SMOOTH 3

# leave the project at its defaults so the saved XML starts clean
repl "presetInit()"
setv cmbFltType 2
