// Blackveil - interface: every section and control of SPEC.md in one view, left to right like
// the signal: SOURCE -> FX CHAIN -> DUCK / OUTPUT, under a large visualizer; the engine is
// bv_engine.h (BvEngine). Host (plugin) parameters: HOST_PARAMS at the end (append-only).
// Removing a component from this script does NOT delete it from HISE's stored UI data:
// remove it with /api/ui/apply too (see the root CLAUDE.md).

Content.makeFrontInterface(1200, 926);

// The window's size is the user's: the header's SIZE button (pnlUiSize) steps through UI_SIZES
// (S / M / L);
// HISE keeps the zoom in its settings (per user, not in presets). The layout keeps its
// 1200 x 926 coordinates.
const var UI_SIZES = [0.8, 1.0, 1.25];
const var UI_SIZE_NAMES = ["S", "M", "L"];

// Theme.js is the shared ShadowDSP look (copied; it moves to shared/ later). It reads some state
// (macros, modulation rings, sequencer) Blackveil doesn't have, so empty stand-ins.
var knobMod = {};
const var MOD_ALIAS = {};
var macroLearn = -1;
const var MACRO_TARGETS = [];
var macroDepth = {};
var seqPlayingStep = -1;
var seqLength = 16;

// controls whose module / mode is switched off: id -> true; Theme.js draws them darker (they
// stay editable). Set by uiDimUpdate.
const var uiDim = {};

// KEY (cmbKey, the header): the root note, 0 C .. 11 B, -1 OFF. The SAMPLE kick is tuned to it,
// EQ FREQ snaps to its root and fifth (Theme.js formats that knob with it: keySnapHz).
var keyRoot = -1;
// FILTER TYPE is COMB (2026-10-31): its CUTOFF snaps to KEY's root (Theme.js combSnapHz)
var fltComb = false;

include("Theme.js");

// ---------------------------------------------------------------------------
// Layout grid

const var W = 1200;
const var H = 926;
const var Y_HEADER = 110;
const var VIZ_Y = 122;               // visualizer
const var VIZ_H = 220;
const var ROW_Y = 358;               // group titles under it (SOURCE, FX CHAIN, MASTER)
const var Y_BOTTOM = 866;

// The modules are "nodes" in one row, left to right like the signal: SOURCE (two knob columns),
// then eight one-column nodes: slots 0..3 the FX chain (reorderable), 4 EQ, 5 DUCK, 6 OUTPUT,
// 7 LIMITER. Each node: a title bar (icon, name, power button if it can be off), a small display
// of its settings, a selector row and its knobs.
const var NODE_Y = 388;
const var NODE_H = 472;
const var NODE_W = 108;
const var NODE_GAP = 10;
const var NODE_CHAIN = 0;            // paintNode's kinds: a reorderable FX node, a fixed one (SOURCE, OUTPUT, LIMITER)
const var NODE_FIXED = 1;
const var NODE_RECESS = 0x50000000;  // the fixed nodes' fill, their title band, frame
const var NODE_BAND = 0x12FFFFFF;
const var NODE_FRAME = 0x10FFFFFF;
// a fixed node's title band (rounded on top only: two overlapping fills doubled the alpha)
const var nodeBandPath = Content.createPath();
inline function fillNodeBand(g, x, y, w)
{
	nodeBandPath.clear();
	nodeBandPath.addRoundedRectangleCustomisable([x, y, w, 28], [4, 4], [true, true, false, false]);
	g.setColour(NODE_BAND);
	g.fillPath(nodeBandPath, [x, y, w, 28]);
}
const var SRC_X = 28;
const var SRC_W = 200;
const var DISP_X = 8;                // inside a node: the display, the selector row, the knobs
const var DISP_Y = 34;
const var DISP_W = NODE_W - 16;
const var DISP_H = 50;
const var SEL_Y = 92;
const var NODE_KNOB_Y = 122;
const var NODE_KNOB_H = 84;          // the small ("mini") knob
const var NODE_KNOB_PITCH = 86;
const var KNOB_W = 72;               // knob cells
const var KNOB_H = 92;               // SOURCE's (compact) knobs
const var KNOB_PITCH = 102;
const var SIZE_W = 70;                // the header's SIZE button, flush right (24 px margin)
const var SIZE_X = W - 24 - SIZE_W;
const var KEY_W = 56;
const var KEY_X = SIZE_X - 16 - KEY_W; // the header's KEY combo (its label left of it), left of SIZE

inline function nodeX(slot) { return SRC_X + SRC_W + NODE_GAP + slot * (NODE_W + NODE_GAP); }

// ---------------------------------------------------------------------------
// Helpers

inline function place(c, x, y, w, h)
{
	c.set("x", x);
	c.set("y", y);
	if (w > 0) c.set("width", w);
	if (h > 0) c.set("height", h);
}

// a compact knob: title on top, readout below (Theme.js's rotary look); kind = Theme formatter
inline function addKnob(name, title, x, y, min, max, def, mode, middle, kind)
{
	local k = Content.addKnob(name, x, y);
	k.set("text", title);
	k.set("width", KNOB_W);
	k.set("height", KNOB_H);
	// mode first: setting it resets the range to the mode's defaults
	k.set("mode", mode);
	k.set("min", min);
	k.set("max", max);
	k.set("defaultValue", def);
	k.set("middlePosition", middle != -1 ? middle : (min + max) / 2);
	k.set("isPluginParameter", false);
	k.set("saveInPreset", true);
	k.set("dragDirection", "Vertical");
	k.setValue(def);
	k.setLocalLookAndFeel(laf);
	KNOB_INFO[name] = [title, "", "", "", kind];
	return k;
}

// a two-position switch: text "OFF|ON" draws both positions (Theme.js drawToggleButton)
inline function addSwitch(name, text, x, y, w, h, def)
{
	local b = Content.addButton(name, x, y);
	b.set("text", text);
	b.set("width", w);
	b.set("height", h);
	b.set("saveInPreset", true);
	b.set("isPluginParameter", false);
	b.set("defaultValue", def);
	b.setValue(def);
	b.setLocalLookAndFeel(laf);
	return b;
}

inline function addCombo(name, items, x, y, w)
{
	local c = Content.addComboBox(name, x, y);
	c.set("items", items.join("\n"));
	c.set("width", w);
	c.set("height", 24);
	c.set("saveInPreset", true);
	c.set("isPluginParameter", false);
	c.setValue(1);
	c.setLocalLookAndFeel(laf);
	return c;
}

// a switch with more positions, as a panel (after the look's addSegSwitch); getIndex / onPick
// are inline functions
inline function addSegSwitch(name, x, y, w, h, segs, getIndex, onPick)
{
	local p = Content.addPanel(name, x, y);
	p.set("width", w);
	p.set("height", h);
	p.set("saveInPreset", false);
	p.set("allowCallbacks", "Clicks & Hover");
	p.data.segs = segs;
	p.data.get = getIndex;
	p.data.pick = onPick;
	p.data.hover = false;

	p.setPaintRoutine(function(g)
	{
		var sa = [0.5, 0.5, this.getWidth() - 1, this.getHeight() - 1];
		var sn = this.data.segs.length;
		var sw = sa[2] / sn;
		var si = this.data.get();
		var sd = uiDim[this.getId()] == true ? 0.4 : 1.0;   // switched off: darker
		g.setColour(dimColour(0xFF16171A, sd));
		g.fillRoundedRectangle(sa, 3.0);
		g.setColour(dimColour(0xFF2E3035, sd));
		g.fillRoundedRectangle([sa[0] + si * sw + 2, sa[1] + 2, sw - 4, sa[3] - 4], 2.0);
		g.setColour(dimColour(this.data.hover ? 0xFF6A6D74 : Theme.LINE, sd));
		g.drawRoundedRectangle(sa, 3.0, 1.0);
		g.setFontWithSpacing(Theme.FONT_BOLD, 11.5, 0.06);
		for (sj = 0; sj < sn; sj++)
		{
			g.setColour(dimColour(sj == si ? 0xFFF4F4F6 : Theme.TEXT_DIM, sd));
			g.drawAlignedText(this.data.segs[sj], [sa[0] + sj * sw, sa[1], sw, sa[3]], "centred");
		}
	});

	p.setMouseCallback(function(event)
	{
		if (event.hover != this.data.hover)
		{
			this.data.hover = event.hover;
			this.repaint();
		}
		if (event.clicked)
		{
			var sn = this.data.segs.length;
			this.data.pick(Math.range(Math.floor(event.x / (this.getWidth() / sn)), 0, sn - 1));
			this.repaint();
		}
	});
	return p;
}

// ---------------------------------------------------------------------------
// State (the switches drawn as panels keep theirs in the hidden components below)

var srcMode = 0;                     // 0 EXT, 1 SAMPLE
var trigMode = 0;                    // 0 MIDI, 1 GRID
var trigDiv = 0;                     // index in DIVISIONS
var duckTrig = 0;                    // 0 KICK, 1 GRID
var duckTarget = 0;                  // 0 RUMBLE, 1 ALL (the whole output)
var duckDiv = 0;
var vizWindow = 0;                   // 0 1 BEAT (the only one since 2026-10-30, user), 1 1 BAR, 2 2 BARS
var kickIndex = 0;
const var DIVISIONS = ["1/4", "1/8", "1/2", "1 BAR"];
const var VIZ_BEATS = [1, 4, 8];
// the duck curve (seconds after a trigger): fall, depth 0..1, hold, release, shape -1..1, and
// offset: the whole curve shifted against the trigger (-50..+50 ms; negative = before the kick,
// which needs lookahead latency in KICK mode)
const var curve = {"depth": 0.85, "offset": 0.0};   // DEPTH (the knob), OFFSET (seconds)
var BEAT_SEC = 0.5;                  // one beat at the host's tempo (seconds; bvPoll follows it)

// The switches drawn as panels (EXT | SAMPLE, MIDI | GRID, the division pills, KICK | GRID,
// RUMBLE | ALL), the kick and the FX order keep their state in hidden components (2026-10-29: as
// script variables, sessions and presets lost them). The combos are host parameters (a DAW shows
// their item names); a click on a panel sets its combo, the combo's callback applies it (also
// when the host or a preset sets it). Ids and items are append-only.
inline function addState(name, items, def)
{
	local c = addCombo(name, items, 0, 0, 10);
	c.set("visible", false);
	c.set("defaultValue", def + 1);
	c.setValue(def + 1);
	return c;
}
const var cmbSrcMode = addState("cmbSrcMode", ["EXT", "SAMPLE"], srcMode);
const var cmbSrcTrig = addState("cmbSrcTrig", ["MIDI", "GRID"], trigMode);
const var cmbSrcDiv = addState("cmbSrcDiv", DIVISIONS, trigDiv);
const var cmbDuckTrig = addState("cmbDuckTrig", ["KICK", "GRID"], duckTrig);
const var cmbDuckDiv = addState("cmbDuckDiv", DIVISIONS, duckDiv);
const var cmbDuckTarget = addState("cmbDuckTarget", ["RUMBLE", "ALL"], duckTarget);
// the kick (an index into KICKS, saved, not a host parameter: the kick set grows) and the FX
// order (engineSendOrder's value: slot k's node in bits 2k..2k+1)
inline function addHiddenValue(name, max, def)
{
	local k = addKnob(name, "", 0, 0, 0, max, def, "Linear", -1, "int");
	k.set("stepSize", 1);
	k.set("visible", false);
	return k;
}
const var knbKickIndex = addHiddenValue("knbKickIndex", 255, 0);
// the user kick's file (USER KICKS, 2026-10-31): its full path, "" = a factory kick
const var lblKickFile = Content.addLabel("lblKickFile", 0, 0);
lblKickFile.set("visible", false);
lblKickFile.set("saveInPreset", true);
lblKickFile.set("editable", false);
lblKickFile.set("text", "");
const var knbFxOrder = addHiddenValue("knbFxOrder", 255, 0 + 4 * 1 + 16 * 2 + 64 * 3);
// the whole chain with EQ (2026-10-29: EQ joined the reorderable chain) and GRAIN (2026-10-30):
// slot k's module in bits 3k..3k+2 (0 FILTER, 1 DIST, 2 DELAY, 3 REVERB, 4 EQ, 5 GRAIN); a value
// from before GRAIN (five slots) puts it last. knbFxOrder keeps the four others' order.
const var knbChainOrder = addHiddenValue("knbChainOrder", 262143, 0 + 8 * 1 + 64 * 2 + 512 * 3 + 4096 * 4 + 32768 * 5);

// ---------------------------------------------------------------------------
// The engine (DspNetworks/ThirdParty/bv_engine.h, module BvEngine). Wired so far: SOURCE (EXT
// and SAMPLE), FILTER, DIST, DELAY, REVERB, EQ, DUCK, OUTPUT, LIMITER and the visualizer's snapshot. Its parameters, by index:
const var BV_SOURCE = 0;
const var BV_DRIVE = 1;
const var BV_LEVEL = 2;
const var BV_WINDOW = 3;
const var BV_TRIGGER = 4;
const var BV_DIVISION = 5;
const var BV_TUNE = 6;
const var BV_DECAY = 7;
const var BV_PITCH = 8;
const var BV_PITCH_DECAY = 9;
const var BV_HIT = 10;
const var BV_HIT_OFFSET = 11;
const var BV_HIT_VELOCITY = 12;
const var BV_FILTER_ON = 13;
const var BV_FILTER_TYPE = 14;
const var BV_CUTOFF = 15;
const var BV_RESONANCE = 16;
const var BV_FILTER_ENV = 17;
const var BV_FILTER_ENV_DECAY = 18;
const var BV_ORDER = 19;
const var BV_DRY_ON = 20;
const var BV_DRY_LEVEL = 21;
const var BV_PHASE = 22;
const var BV_POLARITY = 23;
const var BV_WIDTH = 24;
const var BV_VOLUME = 25;
const var BV_DUCK_TRIGGER = 26;
const var BV_DUCK_DIVISION = 27;
const var BV_DUCK_DEPTH = 28;
const var BV_DUCK_MIX = 29;
const var BV_DUCK_FALL = 30;
const var BV_DUCK_HOLD = 31;
const var BV_DUCK_RELEASE = 32;
const var BV_DUCK_SHAPE = 33;
const var BV_DUCK_OFFSET = 34;
const var BV_REVERB_ON = 35;
const var BV_REVERB_TYPE = 36;
const var BV_REVERB_SIZE = 37;
const var BV_REVERB_DAMP = 38;
const var BV_REVERB_WIDTH = 39;
const var BV_REVERB_MIX = 40;
const var BV_CLONE_ON = 42;          // (41: BV_DUCK_LENGTH, with the duck curve below; 42..46 unused since DELAY)
const var BV_CLONE_BAR2 = 43;
const var BV_CLONE_BAR3 = 44;
const var BV_CLONE_BAR4 = 45;
const var BV_CLONE_DECAY = 46;
const var BV_DIST_ON = 47;
const var BV_DIST_MODE = 48;
const var BV_DIST_DRIVE = 49;
const var BV_DIST_TONE = 50;
const var BV_DIST_MIX = 51;
const var BV_EQ_ON = 52;
const var BV_EQ_FREQ = 53;
const var BV_EQ_GAIN = 54;
const var BV_EQ_WIDTH = 55;
const var BV_EQ_SUB_CUT = 56;
const var BV_LIM_ON = 57;
const var BV_LIM_DRIVE = 58;
const var BV_LIM_CEILING = 59;
const var BV_LIM_RELEASE = 60;
const var BV_DUCK_TARGET = 61;
const var BV_WET_LEVEL = 62;
const var BV_DELAY_ON = 63;
const var BV_DELAY_TIME = 64;
const var BV_DELAY_FEEDBACK = 65;
const var BV_DELAY_LOW_CUT = 66;
const var BV_DELAY_HIGH_CUT = 67;
const var BV_DELAY_MIX = 68;
const var BV_DELAY_PING_PONG = 69;
const var BV_DUCK_SPLIT = 70;
const var BV_GATE_LENGTH = 71;
const var BV_CHAIN_ORDER = 72;
const var BV_DIST_CRUSH = 73;
const var BV_NOISE_LEVEL = 74;
const var BV_NOISE_COLOR = 75;
// GRAIN (2026-10-30)
const var BV_GRAIN_ON = 76;
const var BV_GRAIN_MODE = 77;
const var BV_GRAIN_SIZE = 78;
const var BV_GRAIN_DENSITY = 79;
const var BV_GRAIN_SPRAY = 80;
const var BV_GRAIN_MIX = 81;
const var BV_EQ_TYPE = 82;           // 0 BELL, 1 LOW SHELF, 2 HIGH SHELF (2026-10-30)
const var BV_DELAY_SWING = 86;       // -1/3..1/3 of TIME (knbDlySwing / 100; 2026-10-30)
const var BV_BASS_MONO = 87;         // Hz, 20..500, 20 = OFF (knbOutMono; 2026-10-31)
const var BvEngine = Synth.getEffect("BvEngine");
// HISE's master clock follows the host: it resyncs the engine's grid when the host's position
// jumps (Inactive, the default, never does: until 2026-10-31 the GRID kick and duck lagged the
// host after a preset load, during which HISE suspends the audio, until the transport restarted)
const var transport = Engine.createTransportHandler();
transport.setSyncMode(transport.ExternalOnly);

// the node controls wired to the engine: id -> [parameter, scale] (scale "combo": item 1.. -> 0..)
const var ENGINE_CTL = {"btnFx0On": [BV_FILTER_ON, 1.0], "cmbFltType": [BV_FILTER_TYPE, "combo"],
                        "knbFltCutoff": [BV_CUTOFF, 1.0], "knbFltReso": [BV_RESONANCE, 0.01],
                        "knbFltEnv": [BV_FILTER_ENV, 0.01], "knbFltEnvDec": [BV_FILTER_ENV_DECAY, 1.0],
                        "btnDryOn": [BV_DRY_ON, 1.0], "knbDryLevel": [BV_DRY_LEVEL, 1.0],
                        "sldKick": [BV_DRY_LEVEL, 1.0], "sldRumble": [BV_WET_LEVEL, 1.0],
                        "knbOutPhase": [BV_PHASE, 1.0], "btnOutPol": [BV_POLARITY, 1.0],
                        "knbOutWidth": [BV_WIDTH, 1.0], "knbOutVolume": [BV_VOLUME, 1.0], "knbOutMono": [BV_BASS_MONO, 1.0],
                        "knbDuckDepth": [BV_DUCK_DEPTH, 0.01], "knbDuckSplit": [BV_DUCK_SPLIT, 1.0],
                        "btnFx3On": [BV_REVERB_ON, 1.0], "cmbRvbType": [BV_REVERB_TYPE, "combo"],
                        "knbRvbSize": [BV_REVERB_SIZE, 0.01], "knbRvbDamp": [BV_REVERB_DAMP, 0.01],
                        "knbRvbWidth": [BV_REVERB_WIDTH, 0.01], "knbRvbMix": [BV_REVERB_MIX, 0.01],
                        "btnFx2On": [BV_DELAY_ON, 1.0], "knbDlyFeedback": [BV_DELAY_FEEDBACK, 0.01],
                        "knbDlyLowCut": [BV_DELAY_LOW_CUT, 1.0], "knbDlyHighCut": [BV_DELAY_HIGH_CUT, 1.0],
                        "knbDlyMix": [BV_DELAY_MIX, 0.01], "btnDlyPing": [BV_DELAY_PING_PONG, 1.0],
                        "knbDlySwing": [BV_DELAY_SWING, 0.01],
                        "btnFx1On": [BV_DIST_ON, 1.0], "cmbDstMode": [BV_DIST_MODE, "combo"],
                        "knbDstDrive": [BV_DIST_DRIVE, 0.01], "knbDstTone": [BV_DIST_TONE, 1.0],
                        "knbDstMix": [BV_DIST_MIX, 0.01],
                        "btnEqOn": [BV_EQ_ON, 1.0], "knbEqFreq": [BV_EQ_FREQ, 1.0],
                        "knbEqGain": [BV_EQ_GAIN, 1.0], "knbEqWidth": [BV_EQ_WIDTH, 1.0],
                        "knbEqSubCut": [BV_EQ_SUB_CUT, 1.0], "cmbEqType": [BV_EQ_TYPE, "combo"],
                        "btnLimOn": [BV_LIM_ON, 1.0], "knbLimDrive": [BV_LIM_DRIVE, 1.0],
                        "knbLimCeiling": [BV_LIM_CEILING, 1.0], "knbLimRelease": [BV_LIM_RELEASE, 1.0],
                        "sldSend": [BV_GATE_LENGTH, 1.0],
                        "btnGrnOn": [BV_GRAIN_ON, 1.0], "cmbGrnMode": [BV_GRAIN_MODE, "combo"],
                        "knbGrnSize": [BV_GRAIN_SIZE, 1.0], "knbGrnDensity": [BV_GRAIN_DENSITY, 1.0],
                        "knbGrnSpray": [BV_GRAIN_SPRAY, 1.0], "knbGrnMix": [BV_GRAIN_MIX, 0.01]};

// ---------------------------------------------------------------------------
// The duck curve (edited in the visualizer's CURVE view): breakpoints [x, y, bend] over LENGTH,
// x 0..1 (the first at 0, the last at 1), y 1 = no duck .. 0 = full DEPTH, bend -1..1 = the
// segment that ends at the point (0 straight; > 0 slow start, < 0 fast start). The script
// sends the points to the engine through its slider pack ([0] = the count, then x, y, bend per
// point; the engine computes the curve the same way, duckShape) and keeps them, with LENGTH and
// OFFSET, in pnlDuckCurve's value (saved with presets and sessions).
const var BV_DUCK_LENGTH = 41;
const var DUCK_LENGTHS = ["1/32", "1/16", "1/8", "1/4", "1/2", "1 BAR"];
const var DUCK_LENGTH_BEATS = [0.125, 0.25, 0.5, 1.0, 2.0, 4.0];
// (CHOP: a 16th-note gate, four dips a beat; SHUFFLE: a full duck, then a shallower one on the
// swung 8th, 2/3 of the beat; 2026-10-31, user)
const var DUCK_PRESETS = {"TIGHT": [[0, 1, 0], [0.008, 0, 0], [0.068, 0, 0], [0.43, 1, 0.4], [1, 1, 0]],
                          "PUMP": [[0, 1, 0], [0.03, 0, 0], [0.92, 1, 0.7], [1, 1, 0]],
                          "SMOOTH": [[0, 1, 0], [0.12, 0.05, -0.5], [0.8, 1, -0.3], [1, 1, 0]],
                          "LONG": [[0, 1, 0], [0.02, 0, 0], [0.3, 0, 0], [1, 1, 0.3]],
                          "GATE": [[0, 1, 0], [0.01, 0, 0], [0.6, 0, 0], [0.62, 1, 0], [1, 1, 0]],
                          "SNAP": [[0, 1, 0], [0.005, 0, 0], [0.25, 1, -0.6], [1, 1, 0]],
                          "SWELL": [[0, 1, 0], [0.01, 0, 0], [1, 1, 0.8]],
                          "DOUBLE": [[0, 1, 0], [0.01, 0, 0], [0.2, 0.7, -0.3], [0.5, 0.7, 0], [0.52, 0.2, 0],
                                     [0.9, 1, 0.3], [1, 1, 0]],
                          "CHOP": [[0, 1, 0], [0.01, 0, 0], [0.2, 1, -0.5], [0.25, 1, 0], [0.26, 0, 0], [0.45, 1, -0.5],
                                   [0.5, 1, 0], [0.51, 0, 0], [0.7, 1, -0.5], [0.75, 1, 0], [0.76, 0, 0], [0.95, 1, -0.5],
                                   [1, 1, 0]],
                          "SHUFFLE": [[0, 1, 0], [0.01, 0, 0], [0.4, 1, -0.5], [0.66, 1, 0], [0.68, 0.45, 0],
                                      [0.95, 1, -0.4], [1, 1, 0]]};
const var DUCK_PRESET_NAMES = ["TIGHT", "PUMP", "SMOOTH", "LONG", "GATE", "SNAP", "SWELL", "DOUBLE", "CHOP", "SHUFFLE"];
var duckPts = [];
// LENGTH is always 1/4 since 2026-10-30 (user: "we only need 1/4"): a stored or random length is
// ignored; DUCK_LENGTHS and the stored "length" stay (presets and sessions hold one)
const var DUCK_LEN_FIXED = 3;
var duckLenIdx = DUCK_LEN_FIXED;
const var duckTable = Synth.getSliderPackProcessor("BvEngine").getSliderPack(0);
// room for the count and 16 points (the engine's MaxDuckPoints, CE_MAX_POINTS): the pack has 16
// sliders by default, i.e. 5 points; the engine ignored the rest (until 2026-10-30: a curve of 7
// points never dropped after its 5th)
duckTable.setNumSliders(1 + 3 * 16);
const var duckTableData = [];

inline function duckLoadPreset(name)
{
	duckPts = [];
	for (p in DUCK_PRESETS[name])
		duckPts.push([p[0], p[1], p[2]]);
}
duckLoadPreset("TIGHT");

// the shape (1 = no duck .. 0 = full depth) at u = 0..1 of LENGTH
inline function duckShapeAt(u)
{
	local n = duckPts.length;
	if (u <= 0)
		return duckPts[0][1];
	if (u >= 1)
		return duckPts[n - 1][1];
	for (dsi = 1; dsi < n; dsi++)   // (a loop variable of its own: callers loop too)
	{
		if (u <= duckPts[dsi][0])
		{
			local x0 = duckPts[dsi - 1][0];
			local t = duckPts[dsi][0] > x0 ? (u - x0) / (duckPts[dsi][0] - x0) : 1.0;
			local y0 = duckPts[dsi - 1][1];
			return y0 + (duckPts[dsi][1] - y0) * Math.pow(t, Math.pow(2.0, duckPts[dsi][2] * 2.5));
		}
	}
	return duckPts[n - 1][1];
}

inline function duckLenSec() { return DUCK_LENGTH_BEATS[duckLenIdx] * BEAT_SEC; }

// sends the points, LENGTH and OFFSET to the engine
inline function duckSend()
{
	duckTableData.clear();
	duckTableData.push(duckPts.length);
	for (p in duckPts)
	{
		duckTableData.push(p[0]);
		duckTableData.push(p[1]);
		duckTableData.push(p[2]);
	}
	duckTable.setAllValues(duckTableData);
	BvEngine.setAttribute(BV_DUCK_LENGTH, DUCK_LENGTH_BEATS[duckLenIdx]);
	BvEngine.setAttribute(BV_DUCK_OFFSET, curve.offset * 1000);
}

// the curve's state for presets / sessions (a hidden panel's value); a stored one replaces it
const var pnlDuckCurve = Content.addPanel("pnlDuckCurve", 0, 0);
pnlDuckCurve.set("width", 1);
pnlDuckCurve.set("height", 1);
pnlDuckCurve.set("visible", false);
pnlDuckCurve.set("saveInPreset", true);
pnlDuckCurve.set("allowCallbacks", "No Callbacks");
inline function duckStore() { pnlDuckCurve.setValue({"points": duckPts, "length": duckLenIdx, "offset": curve.offset}); }
inline function duckRestore(v)
{
	if (isDefined(v) && typeof(v) == "object" && isDefined(v.points) && v.points.length >= 2)
	{
		duckPts = [];
		for (p in v.points)
			duckPts.push([p[0], p[1], p[2]]);
		duckLenIdx = DUCK_LEN_FIXED;
		curve.offset = Math.range(v.offset, -0.05, 0.05);
	}
}

inline function engineSend(id, value)
{
	local ec = ENGINE_CTL[id];
	local ev = id == "knbEqFreq" ? keySnapHz(value) : value;   // KEY: the key's root or fifth
	if (id == "knbFltCutoff")
		ev = combSnapHz(value);                                 // COMB with a KEY: its root
	if (isDefined(ec))
		BvEngine.setAttribute(ec[0], ec[1] == "combo" ? ev - 1 : ev * ec[1]);
}

// SAMPLE's kicks: every audio file in the project's AudioFiles folder (embedded in the plugin),
// played from the engine's audio file slot. KICKS[i] = [reference, display name, its note (0 C ..
// 11 B, -1 unknown)]: the file name's last part, if it's a note name ("..._G.wav", "..._F#.wav").
const var DIVISION_BEATS = [1.0, 0.5, 2.0, 4.0];   // DIVISIONS: 1/4, 1/8, 1/2, 1 BAR
const var kickSlot = Synth.getAudioSampleProcessor("BvEngine");
const var KICKS = [];
const var NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
inline function noteIndex(s)
{
	local i = NOTE_NAMES.indexOf(s.toUpperCase());
	if (i == -1 && s.length == 2 && s.charAt(1) == "b")   // a flat: Db = C#
	{
		i = NOTE_NAMES.indexOf(s.charAt(0).toUpperCase());
		if (i != -1)
			i = (i + 11) % 12;
	}
	return i;
}
// a kick's note from its name's last word ("Kick 01 G", "kick-F#", "..._G"), -1 if it's no note
inline function kickNoteOf(name)
{
	local parts = name.replace(" ", "_").replace("-", "_").split("_");
	return noteIndex(parts[parts.length - 1]);
}
for (ref in Engine.loadAudioFilesIntoPool())
{
	// "{PROJECT_FOLDER}Kick_01_G.wav" -> "Kick 01 G", G
	var kn = ref.replace("{PROJECT_FOLDER}", "");
	kn = kn.substring(0, kn.lastIndexOf("."));
	KICKS.push([ref, kn.replace("_", " "), kickNoteOf(kn)]);
}

// USER KICKS (2026-10-31): an audio file dropped on the kick box (or picked from its right-click
// menu) plays from where it is, and ‹ › then step through the audio files of its folder.
// lblKickFile (hidden, saved in sessions and presets) holds its full path, "" = the factory kicks
// (knbKickIndex keeps the factory one meanwhile). Its file missing (another computer, moved): the
// factory kick plays and the box says MISSING.
const var USER_KICK_WILDCARD = "*.wav;*.aif;*.aiff;*.flac";
var userKick = "";                   // the user kick's full path, "" = a factory kick
var userKickOk = false;              // ... and its file exists
var userKickName = "";               // its file name without the extension
var userKickNote = -1;               // its note (kickNoteOf), -1 unknown
var userKickDir = "";                // its folder's name
var userKickPos = 0;                 // its index in userKicks
const var userKicks = [];            // its folder's audio files (full paths, sorted)
inline function userKickScan()
{
	userKicks.clear();
	userKickOk = false;
	if (userKick == "")
		return;
	local f = FileSystem.fromAbsolutePath(userKick);
	userKickOk = isDefined(f) && f.isFile();
	if (!userKickOk)
		return;
	userKickName = f.toString(1);
	userKickNote = kickNoteOf(userKickName);
	userKickDir = f.getParentDirectory().toString(3);
	for (uf in FileSystem.findFiles(f.getParentDirectory(), USER_KICK_WILDCARD, false))
		userKicks.push(uf.toString(0));
	userKicks.sortNatural();
	// its place: by file name (the path's spelling can differ: slashes, case)
	userKickPos = 0;
	for (ui = 0; ui < userKicks.length; ui++)
		if (FileSystem.fromAbsolutePath(userKicks[ui]).toString(3).toLowerCase() == f.toString(3).toLowerCase())
			userKickPos = ui;
}
// the kick that plays: its name and note
inline function kickName()
{
	if (userKickOk)
		return userKickName;
	return KICKS.length > 0 ? KICKS[kickIndex][1] : "NO KICKS";
}
inline function kickNote()
{
	if (userKickOk)
		return userKickNote;
	return KICKS.length > 0 ? KICKS[kickIndex][2] : -1;
}
var bvHits = 0;                      // MIDI: each note bumps the engine's Hit counter

// the loaded kick's waveform for SOURCE's preview (pnlSrcKick): the peak of each of
// KICK_WAVE_BINS slices of its first KICK_WAVE_SEC (left channel; one time scale for every
// kick, so their lengths compare and the strip's right end stays free for the label),
// scaled to the loudest = 1
const var KICK_WAVE_BINS = 90;
const var KICK_WAVE_SEC = 1.0;
const var kickWave = [];
inline function kickWaveUpdate()
{
	kickWave.clear();
	local af = kickSlot.getAudioFile(0);
	local ch = af.getContent();
	if (ch.length == 0)
		return;
	local n = ch[0].length;
	local per = Math.max(1, Math.floor((af.getSampleRate() > 0 ? af.getSampleRate() : 44100) * KICK_WAVE_SEC / KICK_WAVE_BINS));
	local top = 0.0;
	for (kwb = 0; kwb < KICK_WAVE_BINS; kwb++)
	{
		kickWave.push(kwb * per < n ? ch[0].getMagnitude(kwb * per, Math.min(per, n - kwb * per)) : 0.0);
		top = Math.max(top, kickWave[kwb]);
	}
	if (top > 0)
		for (kwb = 0; kwb < KICK_WAVE_BINS; kwb++)
			kickWave[kwb] = kickWave[kwb] / top;
}

inline function loadKick()
{
	if (userKickOk)
		kickSlot.setFile(userKick);
	else if (KICKS.length > 0)
		kickSlot.setFile(KICKS[kickIndex][0]);
	kickWaveUpdate();
}

// KEY: semitones that bring the kick's note to the key (-5..+6), 0 when KEY is OFF or the
// kick's note is unknown; SOURCE TUNE adds to it
inline function kickKeyOffset()
{
	local kn = kickNote();
	if (keyRoot < 0 || kn < 0)
		return 0;
	local d = (keyRoot - kn + 12) % 12;
	return d > 6 ? d - 12 : d;
}

// the snapshot: 2 channels (source, output) x SNAP_SIZE; per channel bin b's min / max at
// [2b], [2b + 1], then [SNAP_SIZE - 2] = a counter (+1 per snapshot), [SNAP_SIZE - 1] = its window
// in beats. The engine writes one per window, aligned to the host's bars, and none for a silent
// window: the last one stays.
const var SNAP_SIZE = 4096;
const var SNAP_REFS = 32;            // per channel: the window's duck triggers, after the bins
const var SNAP_BINS = SNAP_SIZE / 2 - 1 - SNAP_REFS / 2;
const var bvRing = Synth.getDisplayBufferSource("BvEngine").getDisplayBuffer(0);
bvRing.setRingBufferProperties({"BufferLength": SNAP_SIZE, "NumChannels": 2});
const var bvSnap = [Buffer.create(SNAP_SIZE), Buffer.create(SNAP_SIZE)];
var bvCounter = -1;
var bvHave = false;                  // a snapshot of the current window is in bvSnap
var bvDuckRefs = [];                 // its duck triggers (seconds into the window)

// true when a new snapshot (of the window shown) or a new tempo needs a rebuild
inline function bvPoll()
{
	local changed = false;
	local bpm = Engine.getHostBpm();
	if (bpm > 0 && Math.abs(60.0 / bpm - BEAT_SEC) > 0.0001)
	{
		BEAT_SEC = 60.0 / bpm;
		changed = true;
	}
	bvRing.copyReadBuffer(bvSnap);
	local c = bvSnap[0][SNAP_SIZE - 2];
	if (c != bvCounter && bvSnap[0][SNAP_SIZE - 1] == VIZ_BEATS[vizWindow])
	{
		bvCounter = c;
		bvHave = c > 0;
		changed = true;
		// the duck triggers: fractions of the window (-1000 = an empty slot)
		bvDuckRefs = [];
		local winSec = BEAT_SEC * VIZ_BEATS[vizWindow];
		for (ch = 0; ch < 2; ch++)
			for (k = 0; k < SNAP_REFS; k++)
				if (bvSnap[ch][2 * SNAP_BINS + k] > -100)
					bvDuckRefs.push(bvSnap[ch][2 * SNAP_BINS + k] * winSec);
	}
	return changed;
}

// ---------------------------------------------------------------------------
// Background: texture, header, section titles, the arrows of the signal flow

const var pnlBg = Content.addPanel("pnlBg", 0, 0);
pnlBg.set("width", W);
pnlBg.set("height", H);
pnlBg.set("saveInPreset", false);
pnlBg.set("allowCallbacks", "No Callbacks");
pnlBg.loadImage("{PROJECT_FOLDER}bg_texture.png", "bg");
pnlBg.loadImage("{PROJECT_FOLDER}blackveil_logo.png", "productLogo");

// the signal flow on the group titles' lines (2026-10-30, was a "›" between every two nodes;
// user: arrows on the lines instead): a line from x0 to x1 ending in an arrowhead at x1
inline function drawFlowLine(g, x0, x1, y)
{
	g.setColour(Theme.LINE);
	g.drawLine(x0, x1, y, y, 1.0);
	g.setColour(Theme.TEXT_FAINT);
	g.drawLine(x1 - 5, x1, y - 4, y, 1.2);
	g.drawLine(x1 - 5, x1, y + 4, y, 1.2);
}

pnlBg.setPaintRoutine(function(g)
{
	g.drawImage("bg", [0, 0, W, H], 0, 0);

	// header: product name on its black strip (the preset box is pnlPreset)
	g.setColour(0xFF000000);
	g.fillRect([0, 0, W, Y_HEADER]);
	// the product logo (2026-10-30, the user's; white on transparent, its alpha made from the
	// source's brightness so it sits on any background; 640 x 164, drawn at half size and less)
	g.drawImage("productLogo", [24, Y_HEADER / 2 - 32, 250, 64], 0, 0);
	g.setColour(Theme.LINE);
	g.drawLine(0, W, Y_HEADER + 0.5, Y_HEADER + 0.5, 1.0);

	// group titles over the node row (INPUT over SOURCE since 2026-10-30); the INPUT and FX CHAIN
	// lines end in an arrowhead at the next group (the signal goes left to right)
	// FX CHAIN: the six reorderable nodes (EQ, GRAIN among them); MASTER: OUTPUT, LIMITER
	local ly = ROW_Y + 9.5;
	g.setColour(Theme.TEXT);
	g.setFontWithSpacing(Theme.FONT_BOLD, 15.0, 0.18);   // (Theme.drawSectionTitle's look, its line drawn here)
	g.drawAlignedText("INPUT", [SRC_X, ROW_Y, 200, 18], "left");
	g.drawAlignedText("FX CHAIN", [nodeX(0), ROW_Y, 200, 18], "left");
	drawFlowLine(g, SRC_X + g.getStringWidth("INPUT") + 16, nodeX(0) - 8, ly);
	local fxl = nodeX(0) + g.getStringWidth("FX CHAIN") + 16;
	g.setFont(Theme.FONT, 11.5);
	local hw = g.getStringWidth("drag a node to reorder");
	local hx = nodeX(6) - 30 - hw;     // the hint sits in a gap of the line
	g.setColour(Theme.TEXT_FAINT);
	g.drawAlignedText("drag a node to reorder", [hx, ROW_Y + 1, hw + 2, 16], "left");
	g.setColour(Theme.LINE);
	g.drawLine(fxl, hx - 8, ly, ly, 1.0);
	drawFlowLine(g, hx + hw + 8, nodeX(6) - 8, ly);
	Theme.drawSectionTitle(g, "MASTER", nodeX(6), ROW_Y, nodeX(7) + NODE_W);

	// the FX chain's slots: raised (a drop shadow under each; paintNode draws the cards)
	for (k = 0; k < 6; k++)
		g.drawDropShadow([nodeX(k), NODE_Y + 4, NODE_W, NODE_H - 4], 0xC0000000, 14);

	// bottom bar
	g.setColour(Theme.LINE);
	g.drawLine(0, W, Y_BOTTOM + 0.5, Y_BOTTOM + 0.5, 1.0);

	// KEY's label, left of its combo (cmbKey)
	g.setFontWithSpacing(Theme.FONT_BOLD, 11.5, 0.12);
	g.setColour(Theme.TEXT_FAINT);
	g.drawAlignedText("KEY", [KEY_X - 40, Y_HEADER / 2 - 13, 34, 26], "right");
});

// SIZE: a click steps the window's zoom through UI_SIZES, S -> M -> L -> S (from the current one)
// the index of the zoom in UI_SIZES (the nearest one, for a zoom saved by an older version)
inline function uiSizeIndex()
{
	local z = Settings.getZoomLevel();
	local best = 0;
	for (i = 1; i < UI_SIZES.length; i++)
		if (Math.abs(UI_SIZES[i] - z) < Math.abs(UI_SIZES[best] - z))
			best = i;
	return best;
}
const var pnlUiSize = Content.addPanel("pnlUiSize", SIZE_X, Y_HEADER / 2 - 13);
pnlUiSize.set("width", SIZE_W);
pnlUiSize.set("tooltip", "SIZE: the window size, S 80 % / M 100 % / L 125 % (click for the next)");
pnlUiSize.set("height", 26);
pnlUiSize.set("saveInPreset", false);
pnlUiSize.set("allowCallbacks", "Clicks & Hover");
pnlUiSize.setPaintRoutine(function(g)
{
	var hov = this.data.hover == true;
	g.setColour(hov ? 0xFF1E2024 : 0xFF16171A);
	g.fillRoundedRectangle([0, 0, this.getWidth(), this.getHeight()], 3.0);
	g.setColour(Theme.LINE);
	g.drawRoundedRectangle([0.5, 0.5, this.getWidth() - 1, this.getHeight() - 1], 3.0, 1.0);
	g.setFontWithSpacing(Theme.FONT_BOLD, 11.5, 0.12);
	g.setColour(Theme.TEXT_FAINT);
	g.drawAlignedText("SIZE", [10, 0, 40, this.getHeight()], "left");
	g.setColour(hov ? Theme.TEXT : Theme.TEXT_DIM);
	g.drawAlignedText(UI_SIZE_NAMES[uiSizeIndex()], [0, 0, this.getWidth() - 12, this.getHeight()], "right");
});
pnlUiSize.setMouseCallback(function(event)
{
	if (event.clicked)
	{
		Settings.setZoomLevel(UI_SIZES[(uiSizeIndex() + 1) % UI_SIZES.length]);
		this.repaint();
	}
	if (event.hover != this.data.hover)
	{
		this.data.hover = event.hover;
		this.repaint();
	}
});

// KEY: OFF or the root note (keyRoot); its callback (onKey) is set at the end
const var cmbKey = addCombo("cmbKey", ["OFF", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"], KEY_X, Y_HEADER / 2 - 13, KEY_W);
cmbKey.set("height", 26);
cmbKey.set("defaultValue", 1);
cmbKey.set("tooltip", "KEY: the SAMPLE kick is tuned to it (its note from the file name), EQ FREQ snaps to its root and fifth, a COMB filter to its root");

// ---------------------------------------------------------------------------
// VISUALIZER and the duck curve's editor in one view (merged 2026-10-29, user): the engine's last
// snapshot, the input (kick, grey) and the output (what DUCK acts on, white), with the duck curve
// over it, on one timeline. The zoom: CURVE (one cycle of the curve, from the first trigger, over
// the width) or the snapshot's window (1 beat / 1 bar / 2 bars). The curve's cycle from the
// window's first trigger is the editable one (its handles); the others repeat it.

const var pnlViz = Content.addPanel("pnlViz", 24, VIZ_Y);
pnlViz.set("width", W - 48);
pnlViz.set("height", VIZ_H);
pnlViz.set("saveInPreset", false);
pnlViz.set("allowCallbacks", "Clicks, Hover & Dragging");

const var VIZ_LABEL_W = 16;          // left margin
const var VIZ_X0 = VIZ_LABEL_W;
const var VIZ_COL_W = 176;           // on the right: DUCK's controls (2026-10-30, from its node)
const var VIZ_X1 = W - 48 - 12 - VIZ_COL_W;
// one lane (top, height): the input (grey, behind), the output (white, in front) and the duck
// curve over each other; the curve's range: no duck at CE_Y0 .. full DEPTH at CE_Y1 (the
// waveforms are centred on it)
const var LANE = [34, VIZ_H - 34 - 12];
const var CE_Y0 = LANE[0] + 10;
const var CE_Y1 = LANE[0] + LANE[1] - 22;
var vizCurveZoom = false;            // the zoom: true = CURVE, false = the window (vizWindow)
const var vizView = [0.0, 1.0];      // the timeline shown: start (seconds, window time), span
const var vizIn = [[], []];          // per pixel: min, max
const var vizOut = [[], []];
var vizWavePaths = [undefined, undefined];   // input / output waveform, built by vizBuild
var vizDrag = -1;                    // handle being dragged
var vizDragStart = [];

// the duck curve's gain (0..1) s seconds after a trigger
inline function duckGain(s)
{
	if (s < 0) return 1.0;
	return 1.0 - curve.depth * (1.0 - Math.range(duckShapeAt(s / duckLenSec()), 0.0, 1.0));
}

// the offset the engine uses: in KICK mode the curve can't start before the kick (that would
// need lookahead latency), so a negative one counts as 0
inline function duckOffset() { return duckTrig == 0 ? Math.max(0.0, curve.offset) : curve.offset; }

// The curve in the visualizer starts at the triggers of the engine's last snapshot (bvDuckRefs,
// seconds into the window: kicks or grid points) plus the offset; the window loops, so the
// triggers are also placed one window earlier (the pre-roll) and later. Before the first snapshot: one
// trigger per beat (KICK) or per division (GRID). duckStarts is sorted.
var duckStarts = [];
inline function duckBuildStarts()
{
	local winSec = BEAT_SEC * VIZ_BEATS[vizWindow];
	local off = duckOffset();
	local refs = bvDuckRefs;
	if (!bvHave)
	{
		refs = [];
		local period = BEAT_SEC * (duckTrig == 1 ? DIVISION_BEATS[duckDiv] : 1.0);
		for (rt = 0.0; rt < winSec - 0.0001; rt += period)
			refs.push(rt);
	}
	duckStarts.clear();
	for (rt in refs)
		duckStarts.push(rt - winSec + off);
	for (rt in refs)
		duckStarts.push(rt + off);
	for (rt in refs)
		duckStarts.push(rt + winSec + off);   // (a CURVE zoom can reach past the window)
	duckStarts.sort();
}


// Every zoom's timeline is anchored on the editable cycle's start (OFFSET moves the trigger line
// and the waveforms, the curve stays, like a drag of that line). A window: VIZ_PRE + the largest
// OFFSET before the cycle (the trigger line stays visible at any OFFSET), a span that covers the
// window and the whole cycle at any OFFSET. CURVE: one cycle with a margin that keeps the trigger
// line visible at the largest OFFSET (+50 ms).
const var VIZ_PRE = 0.06;
inline function vizSecPerPx() { return vizView[1] / (VIZ_X1 - VIZ_X0); }
inline function vizSecToX(s) { return VIZ_X0 + (s - vizView[0]) / vizSecPerPx(); }
inline function vizXToSec(x) { return vizView[0] + (x - VIZ_X0) * vizSecPerPx(); }

// the trigger the editable cycle starts from (seconds into the window): the snapshot's first one
inline function vizEditRef()
{
	if (!bvHave || bvDuckRefs.length == 0)
		return 0.0;
	local ref = 1.0e9;
	for (rt in bvDuckRefs)
		ref = Math.min(ref, rt);
	return ref;
}
// the editable cycle's start (seconds into the window): its trigger + OFFSET
inline function vizEditStart() { return vizEditRef() + duckOffset(); }

// true when the timeline changed (then the waveforms need a rebuild)
inline function vizUpdateView()
{
	local len = duckLenSec();
	local pre = VIZ_PRE + 0.05;
	local s = vizEditStart() - pre;
	local span = Math.max(BEAT_SEC * VIZ_BEATS[vizWindow] + pre + 0.05, pre + 1.02 * len);
	if (vizCurveZoom)
	{
		local margin = 0.055 + 0.04 * len;
		s = vizEditStart() - margin;
		span = margin + 1.04 * len;
	}
	local changed = Math.abs(s - vizView[0]) > 0.00001 || Math.abs(span - vizView[1]) > 0.00001;
	vizView[0] = s;
	vizView[1] = span;
	return changed;
}

// rebuilds the waveforms from the engine's last snapshot on the timeline: per pixel, the min / max
// of the bins it covers (the window loops: times before or after it wrap into it)
inline function vizBuild()
{
	duckBuildStarts();
	vizUpdateView();
	for (lane in [vizIn[0], vizIn[1], vizOut[0], vizOut[1]])
		lane.clear();
	if (!bvHave)
	{
		vizWavePaths = [undefined, undefined];
		return;
	}
	local n = VIZ_X1 - VIZ_X0;
	local secPerPx = vizSecPerPx();
	local winSec = BEAT_SEC * VIZ_BEATS[vizWindow];
	local binsPerSec = SNAP_BINS / winSec;
	for (px = 0; px < n; px++)
	{
		local t = vizView[0] + px * secPerPx;
		t -= Math.floor(t / winSec) * winSec;
		local b0 = Math.range(Math.floor(t * binsPerSec), 0, SNAP_BINS - 1);
		local b1 = Math.range(Math.floor((t + secPerPx) * binsPerSec), b0 + 1, SNAP_BINS);
		local iMin = 1.0;
		local iMax = -1.0;
		local oMin = 1.0;
		local oMax = -1.0;
		for (b = b0; b < b1; b++)
		{
			iMin = Math.min(iMin, bvSnap[0][2 * b]);
			iMax = Math.max(iMax, bvSnap[0][2 * b + 1]);
			oMin = Math.min(oMin, bvSnap[1][2 * b]);
			oMax = Math.max(oMax, bvSnap[1][2 * b + 1]);
		}
		vizIn[0].push(iMin);
		vizIn[1].push(iMax);
		vizOut[0].push(oMin);
		vizOut[1].push(oMax);
	}

	// the two waveforms as one path each (a 1 px stroke per pixel column), built once here so
	// a repaint (a curve drag) only draws two paths instead of ~2,200 rectangles
	local lc = (CE_Y0 + CE_Y1) / 2;
	local la = (CE_Y1 - CE_Y0) / 2;
	for (wv = 0; wv < 2; wv++)
	{
		local data = wv == 0 ? vizIn : vizOut;
		local wp = Content.createPath();
		wp.startNewSubPath(0, 0);                // anchors: the panel's size (drawPath fits bounds)
		wp.startNewSubPath(W - 48, VIZ_H);
		for (px = 0; px < n; px++)
		{
			local hi = Math.range(data[1][px], -1.0, 1.0);
			local lo = Math.range(data[0][px], -1.0, 1.0);
			local top = lc - hi * la;
			wp.startNewSubPath(VIZ_X0 + px + 0.5, top);
			wp.lineTo(VIZ_X0 + px + 0.5, top + Math.max(1, (hi - lo) * la));
		}
		vizWavePaths[wv] = wp;
	}
}

// The timer polls the engine for a new snapshot (or tempo) and rebuilds then, except during a
// curve drag (rebuilt on release). vizRequestBuild: a rebuild once controls pause for 120 ms.
var vizBuildDue = 0.0;               // Engine.getUptime() when the rebuild is due, 0 = none
inline function vizRequestBuild() { vizBuildDue = Engine.getUptime() + 0.12; }
const var vizBuildTimer = Engine.createTimerObject();
vizBuildTimer.setTimerCallback(function()
{
	var due = bvPoll();
	if (vizBuildDue > 0 && Engine.getUptime() >= vizBuildDue)
	{
		vizBuildDue = 0.0;
		due = true;
	}
	if (due && vizDrag < 0)
	{
		vizBuild();
		pnlViz.repaint();
	}
});
vizBuildTimer.startTimer(50);

// ---------------------------------------------------------------------------
// The duck curve's editor, in the visualizer: the editable cycle (LENGTH, from the window's first
// trigger + OFFSET), top = no duck, bottom = full DEPTH; the triggers (KICK / BEAT) are vertical
// lines. Drag a point (the first and last only move up / down), double-click to add or remove
// one, drag a segment's diamond up / down to bend it, drag the trigger line for OFFSET (the
// curve stays, the line and the waveforms move); points snap
// to the cycle's grid lines when near them (SHIFT: no snap). Header: the curve presets, one button
// each (in the LENGTH pills' place since 2026-10-30; the one matching the curve is lit).
const var CE_PRE_X = VIZ_X0 + 52;    // preset buttons: x, pitch (y 8..28)
const var CE_PRE_PITCH = 66;
inline function cePresetRect(k) { return [CE_PRE_X + k * CE_PRE_PITCH, 8, CE_PRE_PITCH - 4, 20]; }
// the preset the curve is (unedited), or -1
inline function duckPresetMatch()
{
	for (dpk = 0; dpk < DUCK_PRESET_NAMES.length; dpk++)
	{
		local pp = DUCK_PRESETS[DUCK_PRESET_NAMES[dpk]];
		local same = pp.length == duckPts.length;
		for (dpj = 0; same && dpj < pp.length; dpj++)
			same = Math.abs(pp[dpj][0] - duckPts[dpj][0]) < 0.0001 && Math.abs(pp[dpj][1] - duckPts[dpj][1]) < 0.0001 &&
			       Math.abs(pp[dpj][2] - duckPts[dpj][2]) < 0.0001;
		if (same)
			return dpk;
	}
	return -1;
}
const var CE_MAX_POINTS = 16;
var ceDrag = [-1, -1];               // [what (0 point, 1 bend, 2 offset), index]
var ceDragStart = [];
var ceHover = -1;

// the editable cycle: u (0..1) <-> x
inline function ceX(u) { return vizSecToX(vizEditStart() + u * duckLenSec()); }
inline function ceSpanPx() { return duckLenSec() / vizSecPerPx(); }
inline function ceU(x) { return (x - ceX(0)) / ceSpanPx(); }
inline function ceY(y) { return CE_Y1 - y * (CE_Y1 - CE_Y0); }
inline function ceVisible(x) { return x >= VIZ_X0 - 6 && x <= VIZ_X1 + 6; }
// the editable cycle's trigger line, and the OFFSET handle (see above)
inline function ceTrigX() { return Math.range(vizSecToX(vizEditRef()), VIZ_X0 + 2, VIZ_X1); }
inline function ceOffX() { return ceTrigX(); }
inline function ceInRect(r, x, y) { return x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3]; }

// the grid: 16 columns, 4 rows; a dragged value within 4 px of a line snaps to it
inline function ceSnapU(u)
{
	local g = Math.round(u * 16) / 16;
	return Math.abs(ceX(g) - ceX(u)) < 4 ? g : u;
}
inline function ceSnapY(y)
{
	local g = Math.round(y * 4) / 4;
	return Math.abs(ceY(g) - ceY(y)) < 4 ? g : y;
}

// a segment's bend diamond: halfway along it (segment i ends at point i)
inline function ceBendPos(i)
{
	local u = (duckPts[i - 1][0] + duckPts[i][0]) / 2;
	return [ceX(u), ceY(duckShapeAt(u))];
}

// what's under the mouse: [0 point / 1 bend / 2 trigger line, index], or [-1, -1]
inline function ceHit(x, y)
{
	local best = 11.0;
	local hit = [-1, -1];
	for (k = 0; k < duckPts.length; k++)
	{
		local d = Math.sqrt(Math.pow(x - ceX(duckPts[k][0]), 2) + Math.pow(y - ceY(duckPts[k][1]), 2));
		if (d < best && ceVisible(ceX(duckPts[k][0])))
		{
			best = d;
			hit = [0, k];
		}
	}
	if (hit[0] >= 0)
		return hit;
	for (k = 1; k < duckPts.length; k++)
	{
		if (ceX(duckPts[k][0]) - ceX(duckPts[k - 1][0]) < 18)
			continue;
		local bp = ceBendPos(k);
		if (Math.abs(x - bp[0]) < 9 && Math.abs(y - bp[1]) < 9 && ceVisible(bp[0]))
			return [1, k];
	}
	if (Math.abs(x - ceOffX()) < 6 && y >= CE_Y0 - 6 && y <= CE_Y1)
		return [2, 0];
	return hit;
}

// the curve changed: the engine, the displays; stored when the drag ends
inline function ceChanged()
{
	duckSend();
	if (vizUpdateView())
		vizBuild();                      // the timeline moved (CURVE: LENGTH, OFFSET)
	else
		duckBuildStarts();
	pnlViz.repaint();
	Content.getComponent("pnlDisp4").repaint();   // (nodeDisplays is declared further down)
	Content.getComponent("pnlDuckInfo").repaint();
}

inline function ceMs(s) { return Engine.doubleToString(s * 1000, s < 0.1 ? 1 : 0) + " ms"; }

inline function cePaint(g, w, h)
{
	// header: the curve presets, then the legend (right-aligned)
	g.setFontWithSpacing(Theme.FONT_BOLD, 11.5, 0.12);
	g.setColour(Theme.TEXT_FAINT);
	g.drawAlignedText("CURVE", [VIZ_X0, 8, 50, 20], "left");
	// the right column's title (DUCK's controls, DUCK_COL_X)
	Theme.drawSectionTitle(g, "DUCK", VIZ_X1 + 12, 9, W - 48 - 12 - 22);   // like FX CHAIN / MASTER; its lock (pnlLock6) at the end
	g.setFontWithSpacing(Theme.FONT_BOLD, 11.5, 0.12);
	g.setColour(Theme.TEXT_FAINT);
	local cpm = duckPresetMatch();
	for (k = 0; k < DUCK_PRESET_NAMES.length; k++)
	{
		local r = cePresetRect(k);
		g.setColour(k == cpm ? 0xFF2A2C31 : 0xFF141518);
		g.fillRoundedRectangle(r, 3.0);
		g.setColour(k == cpm ? 0x60FFFFFF : 0x30FFFFFF);
		g.drawRoundedRectangle(r, 3.0, 1.0);
		g.setColour(k == cpm ? Theme.TEXT : Theme.TEXT_DIM);
		g.drawAlignedText(DUCK_PRESET_NAMES[k], r, "centred");
	}

	// the legend: in the hint line, left (the row's right end is BOUNCE's)
	local lgx = VIZ_X0;
	local lgy = h - 18;
	g.setColour(0xA0A8ABB2);
	g.fillRect([lgx, lgy + 5, 10, 10]);
	g.setColour(Theme.TEXT_DIM);
	g.drawAlignedText("INPUT", [lgx + 16, lgy, 60, 20], "left");
	g.setColour(0xE0F4F4F6);
	g.fillRect([lgx + 76, lgy + 5, 10, 10]);
	g.setColour(Theme.TEXT_DIM);
	g.drawAlignedText("OUTPUT", [lgx + 92, lgy, 70, 20], "left");
	g.setColour(0xFFF4F4F6);
	g.drawLine(lgx + 164, lgx + 182, lgy + 10.5, lgy + 10.5, 1.8);
	g.setColour(Theme.TEXT_DIM);
	g.drawAlignedText("DUCK CURVE", [lgx + 188, lgy, 90, 20], "left");

	// beat lines (bar lines brighter) and the beat numbers (bar.beat of the window)
	local nb = VIZ_BEATS[vizWindow];
	local secPerPx = vizSecPerPx();
	g.setFont(Theme.FONT, 11.0);
	for (b = Math.ceil(vizView[0] / BEAT_SEC); b * BEAT_SEC <= vizView[0] + vizView[1]; b++)
	{
		local bx = vizSecToX(b * BEAT_SEC);
		local bw = b - Math.floor(b / nb) * nb;
		g.setColour(bw % 4 == 0 ? 0x30FFFFFF : 0x14FFFFFF);
		g.drawLine(bx, bx, LANE[0] - 6, CE_Y1 + 4, 1.0);
		if (bx < VIZ_X1 - 30)
		{
			g.setColour(Theme.TEXT_FAINT);
			g.drawAlignedText(Engine.doubleToString(Math.floor(bw / 4) + 1, 0) + "." + Engine.doubleToString(bw % 4 + 1, 0), [bx + 4, CE_Y1 + 4, 40, 14], "left");
		}
	}

	// rows at 0 / 25 / 50 / 75 / 100 % of DEPTH; the editable cycle's 16 columns
	for (k = 0; k <= 4; k++)
	{
		local gy = ceY(k / 4);
		g.setColour(k == 0 || k == 4 ? 0x26FFFFFF : 0x0FFFFFFF);
		g.drawLine(VIZ_X0, VIZ_X1, gy, gy, 1.0);
	}
	for (k = 0; k <= 16; k++)
	{
		local gx = ceX(k / 16);
		if (gx >= VIZ_X0 && gx <= VIZ_X1)
		{
			g.setColour(k % 4 == 0 ? 0x1AFFFFFF : 0x0AFFFFFF);
			g.drawLine(gx, gx, CE_Y0, CE_Y1, 1.0);
		}
	}

	// the waveforms (pre-built paths, see vizBuild): the input grey and behind, the output white
	if (isDefined(vizWavePaths[1]))
	{
		g.setColour(0x80A8ABB2);
		g.drawPath(vizWavePaths[0], [0, 0, w, h], 1.0);
		g.setColour(0xB0F4F4F6);
		g.drawPath(vizWavePaths[1], [0, 0, w, h], 1.0);
	}
	else
	{
		g.setColour(Theme.TEXT_FAINT);
		g.setFontWithSpacing(Theme.FONT_BOLD, 11.5, 0.12);
		g.drawAlignedText("NO SIGNAL YET  ·  THE FIRST SNAPSHOT SHOWS AFTER ONE FULL WINDOW OF AUDIO", [VIZ_X0, (CE_Y0 + CE_Y1) / 2 - 24, VIZ_X1 - VIZ_X0, 16], "centred");
	}

	// the 0 % / -DEPTH labels, over the waveforms
	g.setFont(Theme.FONT, 11.0);
	g.setColour(Theme.TEXT_FAINT);
	g.drawAlignedText("0 %", [VIZ_X0 + 4, ceY(1) + 2, 50, 14], "left");
	g.drawAlignedText("-" + Math.round(curve.depth * 100) + " %", [VIZ_X0 + 4, ceY(0) - 16, 50, 14], "left");

	// the triggers: every one on the timeline faint, the editable cycle's brighter and labelled
	for (st in duckStarts)
	{
		local sx = vizSecToX(st - duckOffset());
		if (sx >= VIZ_X0 && sx <= VIZ_X1)
		{
			g.setColour(0x40F4F4F6);
			g.drawLine(sx, sx, CE_Y0 - 6, CE_Y1 + 2, 1.0);
		}
	}
	local tx = ceTrigX();
	local offOn = ceDrag[0] == 2 || ceHover == 100;
	g.setColour(offOn ? 0xFFF4F4F6 : 0x90F4F4F6);
	g.drawLine(tx, tx, CE_Y0 - 6, CE_Y1 + 2, 1.5);
	g.setFontWithSpacing(Theme.FONT_BOLD, 10.5, 0.1);
	g.drawAlignedText(duckTrig == 0 ? "KICK" : "BEAT", [tx - 20, CE_Y0 - 22, 40, 14], "centred");

	// the curve: every cycle on the timeline (read only), with a dark halo so it reads over the
	// waveforms; after a cycle's end its last value holds until the next trigger
	local len = duckLenSec();
	local ap = Content.createPath();
	ap.startNewSubPath(0, 0);
	ap.startNewSubPath(w, h);
	local si = -1;                       // the last start at or before t
	for (px = 0; px <= VIZ_X1 - VIZ_X0; px += 2)
	{
		local t = vizView[0] + px * secPerPx;
		while (si + 1 < duckStarts.length && duckStarts[si + 1] <= t)
			si++;
		local ay = ceY(si < 0 ? 1.0 : Math.range(duckShapeAt((t - duckStarts[si]) / len), 0.0, 1.0));
		if (px == 0) ap.startNewSubPath(VIZ_X0, ay); else ap.lineTo(VIZ_X0 + px, ay);
	}
	g.setColour(0xC0000000);
	g.drawPath(ap, [0, 0, w, h], 4.5);
	g.setColour(0x90F4F4F6);
	g.drawPath(ap, [0, 0, w, h], 1.4);

	// the editable cycle, filled under (the ducked part above it)
	local ex0 = Math.max(ceX(0), VIZ_X0);
	local ex1 = Math.min(ceX(1), VIZ_X1);
	if (ex1 > ex0)
	{
		local cp = Content.createPath();
		local fp = Content.createPath();
		cp.startNewSubPath(0, 0);
		cp.startNewSubPath(w, h);
		fp.startNewSubPath(0, 0);
		fp.startNewSubPath(w, h);
		fp.startNewSubPath(ex0, CE_Y0);
		for (x = ex0; x <= ex1; x++)
		{
			local cy = ceY(Math.range(duckShapeAt(ceU(x)), 0.0, 1.0));
			if (x == ex0) cp.startNewSubPath(x, cy); else cp.lineTo(x, cy);
			fp.lineTo(x, cy);
		}
		fp.lineTo(ex1, CE_Y0);
		fp.closeSubPath();
		g.setColour(0x18FFFFFF);
		g.fillPath(fp, [0, 0, w, h]);
		g.setColour(0xC0000000);
		g.drawPath(cp, [0, 0, w, h], 5.0);
		g.setColour(0xFFF4F4F6);
		g.drawPath(cp, [0, 0, w, h], 2.0);
	}

	// bend diamonds, then the points (the hovered / dragged one larger)
	for (k = 1; k < duckPts.length; k++)
	{
		if (ceX(duckPts[k][0]) - ceX(duckPts[k - 1][0]) < 18)
			continue;
		local bp = ceBendPos(k);
		if (!ceVisible(bp[0]))
			continue;
		local on = (ceDrag[0] == 1 && ceDrag[1] == k) || ceHover == 200 + k;
		local dp = Content.createPath();
		dp.startNewSubPath(bp[0], bp[1] - 5);
		dp.lineTo(bp[0] + 5, bp[1]);
		dp.lineTo(bp[0], bp[1] + 5);
		dp.lineTo(bp[0] - 5, bp[1]);
		dp.closeSubPath();
		g.setColour(on ? 0xFFF4F4F6 : 0xFF8A8D94);
		g.fillPath(dp, [bp[0] - 5, bp[1] - 5, 10, 10]);
	}
	for (k = 0; k < duckPts.length; k++)
	{
		local px = ceX(duckPts[k][0]);
		if (!ceVisible(px))
			continue;
		local on = (ceDrag[0] == 0 && ceDrag[1] == k) || ceHover == k;
		local r = on ? 7.0 : 5.5;
		local py = ceY(duckPts[k][1]);
		g.setColour(0xE0000000);
		g.fillEllipse([px - r - 1.5, py - r - 1.5, 2 * r + 3, 2 * r + 3]);
		g.setColour(0xFFF4F4F6);
		g.fillEllipse([px - r, py - r, 2 * r, 2 * r]);
	}

	// the value being dragged, else the help line
	if (ceDrag[0] >= 0)
	{
		local txt = "";
		local ax = ceOffX();
		local ay = CE_Y0;
		if (ceDrag[0] == 0)
		{
			local p = duckPts[ceDrag[1]];
			txt = ceMs(p[0] * duckLenSec()) + "  ·  DUCK " + Math.round((1.0 - p[1]) * curve.depth * 100) + " %";
			ax = ceX(p[0]);
			ay = ceY(p[1]);
		}
		if (ceDrag[0] == 1)
		{
			local bp = ceBendPos(ceDrag[1]);
			txt = "BEND " + Math.round(duckPts[ceDrag[1]][2] * 100);
			ax = bp[0];
			ay = bp[1];
		}
		if (ceDrag[0] == 2)
			txt = "OFFSET " + (duckOffset() > 0.0005 ? "+" : "") + Math.round(duckOffset() * 1000) + " ms" + (duckTrig == 0 && curve.offset < -0.0005 ? " (KICK: not before)" : "");
		local bx = Math.range(ax + 12, VIZ_X0, VIZ_X1 - 190);
		local by = Math.max(ay - 26, 2);
		g.setColour(0xFF1A1B1F);
		g.fillRoundedRectangle([bx, by, 190, 20], 3.0);
		g.setColour(0xFFF4F4F6);
		g.setFont(Theme.FONT_BOLD, 11.5);
		g.drawAlignedText(txt, [bx + 6, by, 180, 20], "left");
	}
	else
	{
		g.setColour(Theme.TEXT_FAINT);
		g.setFont(Theme.FONT, 14.5);
		g.drawAlignedText("drag points  ·  double-click: add / remove  ·  drag a diamond: bend  ·  drag the " + (duckTrig == 0 ? "KICK" : "BEAT") + " line: offset  ·  SHIFT: no snap", [VIZ_X0, h - 19, VIZ_X1 - VIZ_X0, 18], "right");
	}
}

inline function ceMouse(event)
{
	if (event.doubleClick)
	{
		local hit = ceHit(event.x, event.y);
		if (hit[0] == 0)
		{
			// remove (not the first or last point)
			if (hit[1] > 0 && hit[1] < duckPts.length - 1)
				duckPts.removeElement(hit[1]);
		}
		else if (event.x > Math.max(ceX(0), VIZ_X0) && event.x < Math.min(ceX(1), VIZ_X1) && event.y > CE_Y0 - 4 && event.y < CE_Y1 + 4 && duckPts.length < CE_MAX_POINTS)
		{
			local u = ceU(event.x);
			local y = Math.range((CE_Y1 - event.y) / (CE_Y1 - CE_Y0), 0.0, 1.0);
			for (k = 1; k < duckPts.length; k++)
			{
				if (u < duckPts[k][0])
				{
					duckPts.insert(k, [u, y, 0.0]);
					break;
				}
			}
		}
		ceDrag = [-1, -1];
		ceChanged();
		duckStore();
		return;
	}
	if (event.clicked)
	{
		// the curve presets (LENGTH and OFFSET stay)
		for (k = 0; k < DUCK_PRESET_NAMES.length; k++)
		{
			if (ceInRect(cePresetRect(k), event.x, event.y))
			{
				duckLoadPreset(DUCK_PRESET_NAMES[k]);
				ceChanged();
				duckStore();
				return;
			}
		}
		ceDrag = ceHit(event.x, event.y);
		if (ceDrag[0] == 0 || ceDrag[0] == 1)
			ceDragStart = [duckPts[ceDrag[1]][0], duckPts[ceDrag[1]][1], duckPts[ceDrag[1]][2]];
		if (ceDrag[0] == 2)
			ceDragStart = [curve.offset];
		vizDrag = ceDrag[0];
		pnlViz.repaint();
		return;
	}
	if (event.drag && ceDrag[0] >= 0)
	{
		local du = event.dragX / ceSpanPx();
		local dy = -event.dragY / (CE_Y1 - CE_Y0);
		local i = ceDrag[1];
		if (ceDrag[0] == 0)
		{
			local n = duckPts.length;
			local y = Math.range(ceDragStart[1] + dy, 0.0, 1.0);
			duckPts[i][1] = event.shiftDown ? y : ceSnapY(y);
			// the first and last stay at 0 / 1; the others between their neighbours
			if (i > 0 && i < n - 1)
			{
				local u = Math.range(ceDragStart[0] + du, duckPts[i - 1][0] + 0.001, duckPts[i + 1][0] - 0.001);
				duckPts[i][0] = event.shiftDown ? u : Math.range(ceSnapU(u), duckPts[i - 1][0] + 0.001, duckPts[i + 1][0] - 0.001);
			}
		}
		if (ceDrag[0] == 1)
		{
			// up = the curve higher: a rising segment rises sooner, a falling one later
			local rising = duckPts[i][1] > duckPts[i - 1][1];
			duckPts[i][2] = Math.range(ceDragStart[2] + (rising ? -dy : dy) * 2.0, -1.0, 1.0);
		}
		if (ceDrag[0] == 2)
		{
			// the trigger line moves right = the curve starts earlier against it
			local ds = event.dragX * vizSecPerPx();
			local off = Math.range(ceDragStart[0] - ds, -0.05, 0.05);
			curve.offset = event.shiftDown ? off : Math.round(off * 1000) / 1000;
		}
		ceChanged();
		return;
	}
	if (event.mouseUp && ceDrag[0] >= 0)
	{
		ceDrag = [-1, -1];
		vizDrag = -1;
		duckStore();
		pnlViz.repaint();
		return;
	}
	if (event.hover)
	{
		local hit = ceHit(event.x, event.y);
		local hv = hit[0] == 0 ? hit[1] : (hit[0] == 1 ? 200 + hit[1] : (hit[0] == 2 ? 100 : -1));
		if (hv != ceHover)
		{
			ceHover = hv;
			pnlViz.repaint();
		}
	}
}

pnlViz.setPaintRoutine(function(g)
{
	var w = this.getWidth();
	var h = this.getHeight();
	g.setColour(0xFF08090B);
	g.fillRoundedRectangle([0, 0, w, h], 4.0);
	cePaint(g, w, h);
});

pnlViz.setMouseCallback(function(event)
{
	ceMouse(event);
});

// the zoom: CURVE | 1 BEAT | 1 BAR | 2 BARS (the window: the engine's snapshot length). Since
// 2026-10-30 always 1 BEAT (user: no other resolution needed): the switch stays, hidden
inline function vizWindowIndex() { return vizCurveZoom ? 0 : vizWindow + 1; }
inline function onVizWindow(i)
{
	vizCurveZoom = i == 0;
	if (i > 0 && i - 1 != vizWindow)
	{
		vizWindow = i - 1;
		BvEngine.setAttribute(BV_WINDOW, VIZ_BEATS[vizWindow]);
		bvHave = false;                  // until the engine's first snapshot of this window
	}
	vizBuild();
	pnlViz.repaint();
}
const var pnlVizWindow = addSegSwitch("pnlVizWindow", W - 24 - 12 - 300, VIZ_Y + 6, 300, 22, ["CURVE", "1 BEAT", "1 BAR", "2 BARS"], vizWindowIndex, onVizWindow);
pnlVizWindow.set("visible", false);
// the WAVE | CURVE switch, until the two views were merged: kept (component ids are append-only),
// hidden
inline function vizNoIndex() { return 0; }
inline function vizNoPick(i) { }
const var pnlVizMode = addSegSwitch("pnlVizMode", 0, 0, 10, 10, ["", ""], vizNoIndex, vizNoPick);
pnlVizMode.set("visible", false);

// KICK / RUMBLE: two horizontal faders in the footer, right, the output's two levels (dB, -60 =
// silent). KICK is the dry kick's level, the same as OUTPUT's DRY knob (each follows the other);
// RUMBLE is the rumble's (WetLevel). A fader: the name, the track, the value; a mute button left
// of it (KICK's is DRY's power button inverted, RUMBLE's keeps the fader's level).
const var FDR_W = 226;
const var FDR_H = 30;
const var FDR_MUTE = 30;             // the mute button's width + gap, left of each fader
const var FDR_X = W - 24 - 2 * (FDR_MUTE + FDR_W) - 24 + FDR_MUTE;
const var FDR_Y = Y_BOTTOM + (H - Y_BOTTOM - FDR_H) / 2;
const var fdrLaf = Content.createLocalLookAndFeel();
fdrLaf.registerFunction("drawLinearSlider", function(g, obj)
{
	var fa = obj.area;
	var fw = fa[2];
	var fh = fa[3];
	var fd = uiDim[obj.id] == true ? 0.4 : 1.0;
	var fnorm = Content.getComponent(obj.id).getValueNormalized();
	var ft0 = obj.id == "sldSend" ? 84 : 64;   // the track: left, right (SEND GATE: a longer name)
	var ft1 = fw - 64;
	var fx = ft0 + fnorm * (ft1 - ft0);
	var fcy = fh / 2;

	g.setFontWithSpacing(Theme.FONT_BOLD, 11.0, 0.08);
	g.setColour(dimColour(Theme.TEXT_DIM, fd));
	g.drawAlignedText(obj.text, [0, 0, ft0 - 8, fh], "left");

	// the track, its fill left of the thumb, the thumb
	g.setColour(dimColour(0xFF3A3D43, fd));
	g.fillRoundedRectangle([ft0, fcy - 1.5, ft1 - ft0, 3], 1.5);
	g.setColour(dimColour(0xFFD8D8DC, fd));
	g.fillRoundedRectangle([ft0, fcy - 1.5, fx - ft0, 3], 1.5);
	g.setColour(dimColour(obj.hover || obj.clicked ? 0xFFFFFFFF : 0xFFF4F4F6, fd));
	g.fillRoundedRectangle([fx - 5, fcy - 10, 10, 20], 2.5);
	g.setColour(0xFF08090B);
	g.drawLine(fx, fx, fcy - 6, fcy + 6, 1.0);

	g.setFont(Theme.FONT_BOLD, 11.0);
	g.setColour(dimColour(Theme.TEXT, fd));
	var ftxt = obj.value <= -59.9 ? "OFF" : (obj.value > 0.05 ? "+" : "") + Engine.doubleToString(obj.value, 1) + " dB";
	if (obj.id == "sldSend")
		ftxt = obj.value >= 995 ? "FULL" : Math.round(obj.value) + " ms";
	g.drawAlignedText(ftxt, [ft1 + 8, 0, fw - ft1 - 8, fh], "right");
});
// a mute button: a speaker, black on white when on (value 0), dim and crossed out like a disabled button when muted
fdrLaf.registerFunction("drawToggleButton", function(g, obj)
{
	var ma = [0.5, 0.5, obj.area[2] - 1, obj.area[3] - 1];
	var mon = obj.value > 0.5;
	g.setColour(mon ? 0xFF16171A : (obj.over ? 0xFFFFFFFF : 0xFFE8E8EA));
	g.fillRoundedRectangle(ma, 3.0);
	if (mon)
	{
		g.setColour(obj.over ? 0xFF4A4D54 : Theme.LINE);
		g.drawRoundedRectangle(ma, 3.0, 1.0);
	}
	var spx = obj.area[2] / 2 - (mon ? 7 : 3.25);     // the icon's left edge (6.5 px, 14 with the cross)
	var spy = obj.area[3] / 2;
	var spk = Content.createPath();
	spk.startNewSubPath(spx, spy - 2.5);
	spk.lineTo(spx + 3, spy - 2.5);
	spk.lineTo(spx + 6.5, spy - 6);
	spk.lineTo(spx + 6.5, spy + 6);
	spk.lineTo(spx + 3, spy + 2.5);
	spk.lineTo(spx, spy + 2.5);
	spk.closeSubPath();
	g.setColour(mon ? (obj.over ? 0xFF5A5D64 : 0xFF3A3C42) : 0xFF08090B);
	g.fillPath(spk, [spx, spy - 6, 6.5, 12]);
	if (mon)
	{
		var spw = Content.createPath();
		spw.startNewSubPath(0, 0);
		spw.startNewSubPath(obj.area[2], obj.area[3]);
		spw.startNewSubPath(spx + 9, spy - 2.5);
		spw.lineTo(spx + 14, spy + 2.5);
		spw.startNewSubPath(spx + 14, spy - 2.5);
		spw.lineTo(spx + 9, spy + 2.5);
		g.drawPath(spw, [0, 0, obj.area[2], obj.area[3]], 1.3);
	}
});

inline function addFader(name, title, x)
{
	local s = Content.addKnob(name, x, FDR_Y);
	s.set("text", title);
	s.set("width", FDR_W);
	s.set("height", FDR_H);
	s.set("style", "Horizontal");
	s.set("mode", "Decibel");
	s.set("min", -60);
	s.set("max", 6);
	s.set("defaultValue", 0);
	s.set("middlePosition", -12);
	s.set("stepSize", 0.1);
	s.set("isPluginParameter", false);
	s.set("saveInPreset", true);
	s.setValue(0);
	s.setLocalLookAndFeel(fdrLaf);
	return s;
}
const var sldKick = addFader("sldKick", "KICK", FDR_X);
const var sldRumble = addFader("sldRumble", "RUMBLE", FDR_X + FDR_MUTE + FDR_W + 24);

inline function addMute(name, faderX)
{
	local b = Content.addButton(name, faderX - FDR_MUTE, FDR_Y + 4);
	b.set("text", "");
	b.set("tooltip", "On / mute");
	b.set("width", FDR_MUTE - 8);
	b.set("height", FDR_H - 8);
	b.set("isPluginParameter", false);
	b.set("defaultValue", 0);
	b.setLocalLookAndFeel(fdrLaf);
	return b;
}
const var btnKickMute = addMute("btnKickMute", FDR_X);
btnKickMute.set("saveInPreset", false);    // (DRY's power button holds it)
const var btnRumbleMute = addMute("btnRumbleMute", FDR_X + FDR_MUTE + FDR_W + 24);
btnRumbleMute.set("saveInPreset", true);

// the rumble's level the engine gets: the fader's, or silent when muted
inline function rumbleSend()
{
	BvEngine.setAttribute(BV_WET_LEVEL, btnRumbleMute.getValue() > 0.5 ? -60.0 : sldRumble.getValue());
	uiDim["sldRumble"] = btnRumbleMute.getValue() > 0.5;
	sldRumble.sendRepaintMessage();
}

inline function onMute(component, value)
{
	if (component == btnKickMute)
	{
		// KICK's mute is DRY off (declared further down)
		Content.getComponent("btnDryOn").setValue(1 - value);
		Content.getComponent("btnDryOn").changed();
	}
	else
		rumbleSend();
	vizRequestBuild();
}
btnKickMute.setControlCallback(onMute);
btnRumbleMute.setControlCallback(onMute);

inline function onFader(component, value)
{
	if (component == sldRumble)
		rumbleSend();
	else
		engineSend(component.getId(), value);
	if (component == sldKick)
	{
		Content.getComponent("knbDryLevel").setValue(value);   // (declared further down)
		Content.getComponent("knbDryLevel").sendRepaintMessage();
	}
	vizRequestBuild();                   // the output waveform follows the levels
}
sldKick.setControlCallback(onFader);
sldRumble.setControlCallback(onFader);

// SEND GATE (footer, left; 2026-10-29): only each kick's first LENGTH ms feed the FX chain (full
// for 60 %, then a fade), so the kick's tail stays out of the rumble; the dry kick isn't touched.
// 10 ms .. 1 s; at the top FULL (no gate).
const var sldSend = addFader("sldSend", "SEND GATE", 24);
sldSend.set("width", FDR_W + 20);
sldSend.set("mode", "Time");
sldSend.set("suffix", " ms");             // (addFader made it a dB fader: the host shows the suffix)
sldSend.set("min", 10);
sldSend.set("max", 1000);
sldSend.set("defaultValue", 1000);
sldSend.set("middlePosition", 150);
sldSend.set("stepSize", 1);
sldSend.set("tooltip", "SEND GATE: how much of each kick feeds the FX chain (FULL: all of it)");
sldSend.setValue(1000);
sldSend.setControlCallback(onFader);

// ---------------------------------------------------------------------------
// NODES: SOURCE, then eight one-column nodes (see the layout grid). A node is a panel (plate,
// title bar with an icon, the name, a power button if it can be off) plus its controls, kept in
// nodeControls[n] with their offsets so they move with the node (the FX chain reorders).

// node 4 was DUCK until 2026-10-30 (its controls moved to the visualizer); now GRAIN
const var NODE_NAMES = ["FILTER", "DIST", "DELAY", "REVERB", "GRAIN", "OUTPUT", "EQ", "LIMITER"];
const var NODE_ICONS = ["filter", "dist", "delay", "reverb", "grain", "output", "eq", "limiter"];
// FX chain: fxOrder[slot] = node 0..3, 6 (EQ, in the chain since 2026-10-29, user) or 4 (GRAIN,
// 2026-10-30)
const var fxOrder = [0, 1, 2, 3, 6, 4];
inline function isChainNode(n) { return n != 5 && n != 7; }
// a chain node's module in the engine (ChainOrder): 0..3 as the node, EQ 4, GRAIN 5
inline function nodeModule(n) { return n == 6 ? 4 : (n == 4 ? 5 : n); }
const var nodePanels = [];
const var nodeControls = [[], [], [], [], [], [], [], []];   // [component, dx, dy]
const var nodePower = [];                    // power button per node (undefined: always on)
const var nodeDisplays = [];
const var ctlNode = {};                      // control id -> its node (to repaint the display)

// the nodes after the chain keep their indexes (5 OUTPUT, 7 LIMITER; 4 GRAIN and 6 EQ are in the
// chain) and sit OUTPUT, LIMITER: the limiter catches the kick added back in OUTPUT
const var MASTER_SLOT = [-1, 6, -1, 7];
inline function nodeSlot(n) { return isChainNode(n) ? fxOrder.indexOf(n) : MASTER_SLOT[n - 4]; }

// the engine's FX chain order (ChainOrder): slot k's module (0 FILTER .. 3 REVERB, 4 EQ = node 6,
// 5 GRAIN = node 4) in bits 3k..3k+2. Saved in knbChainOrder; knbFxOrder keeps the four others'
// order (2 bits each, as before EQ joined), so a session from before puts EQ last, where it was.
inline function engineSendOrder()
{
	local cv = 0;
	local ov = 0;
	local j = 0;
	for (k = 0; k < 6; k++)
	{
		cv += nodeModule(fxOrder[k]) * Math.pow(8, k);
		if (fxOrder[k] < 4)
		{
			ov += fxOrder[k] * Math.pow(4, j);
			j++;
		}
	}
	BvEngine.setAttribute(BV_CHAIN_ORDER, cv);
	knbChainOrder.setValue(cv);          // (saved: presets and sessions keep the order)
	knbFxOrder.setValue(ov);
}

inline function nodeLayout()
{
	for (n = 0; n < 8; n++)
	{
		local nx = nodeX(nodeSlot(n));
		nodePanels[n].set("x", nx);
		nodePanels[n].repaint();
		for (nc in nodeControls[n])
			nc[0].set("x", nx + nc[1]);
	}
	engineSendOrder();
}

inline function nodeAdd(n, c, dx, dy)
{
	nodeControls[n].push([c, dx, dy]);
	c.set("y", NODE_Y + dy);
	ctlNode[c.getId()] = n;
	return c;
}

// a node's knobs: one centred column from NODE_KNOB_Y (small knobs)
inline function nodeKnob(n, k, i)
{
	k.set("height", NODE_KNOB_H);
	nodeAdd(n, k, (NODE_W - KNOB_W) / 2, NODE_KNOB_Y + i * NODE_KNOB_PITCH);
}

// a small round power button (Theme.js draws the text "POWER" as a power glyph)
inline function addPower(name, def)
{
	local b = addSwitch(name, "POWER", 0, 0, 18, 18, def);
	return b;
}

// The icons, after the reference sheet (white line drawings): drawn in a s x s box at x, y.
inline function drawNodeIcon(g, kind, x, y, s, colour)
{
	local p = Content.createPath();
	p.startNewSubPath(x, y);            // anchors: drawPath fits the path's bounds to the area
	p.startNewSubPath(x + s, y + s);
	if (kind == "filter")
	{
		// axes, a flat pass band, a resonant peak, the roll-off
		p.startNewSubPath(x + 1, y);
		p.lineTo(x + 1, y + s - 1);
		p.lineTo(x + s, y + s - 1);
		p.startNewSubPath(x + 1, y + s * 0.45);
		p.quadraticTo(x + s * 0.45, y + s * 0.45, x + s * 0.6, y + s * 0.15);
		p.quadraticTo(x + s * 0.7, y + s * 0.1, x + s * 0.92, y + s - 1);
	}
	if (kind == "dist")
	{
		// a sine turning jagged
		p.startNewSubPath(x, y + s * 0.5);
		for (ii = 1; ii <= 8; ii++)
			p.lineTo(x + ii * s * 0.06, y + s * 0.5 - Math.sin(ii / 8.0 * Math.PI * 2.0) * s * 0.4);
		local jag = [0.1, 0.9, 0.2, 0.75, 0.05, 0.95, 0.4, 0.7, 0.3];
		for (ii = 0; ii < jag.length; ii++)
			p.lineTo(x + s * (0.5 + ii * 0.06), y + s * jag[ii]);
	}
	if (kind == "reverb")
	{
		// arcs, then scattered dots
		for (ii = 0; ii < 4; ii++)
		{
			local rr = s * (0.2 + ii * 0.14);
			p.startNewSubPath(x + rr * 0.5, y + s / 2 - rr);
			p.quadraticTo(x + rr * 1.5, y + s / 2, x + rr * 0.5, y + s / 2 + rr);
		}
	}
	if (kind == "grain")
	{
		// grains: Hann bumps of different sizes on a line
		p.startNewSubPath(x, y + s * 0.85);
		p.lineTo(x + s, y + s * 0.85);
		for (gi = 0; gi < 3; gi++)
		{
			local gx = x + s * [0.05, 0.38, 0.66][gi];
			local gw = s * [0.3, 0.26, 0.34][gi];
			local gh = s * [0.55, 0.8, 0.4][gi];
			p.startNewSubPath(gx, y + s * 0.85);
			p.quadraticTo(gx + gw * 0.5, y + s * 0.85 - 2 * gh, gx + gw, y + s * 0.85);
		}
	}
	if (kind == "duck")
	{
		// level high, a dip at the kick, the recovery
		p.startNewSubPath(x, y + s * 0.2);
		p.lineTo(x + s * 0.25, y + s * 0.2);
		p.lineTo(x + s * 0.3, y + s * 0.85);
		p.quadraticTo(x + s * 0.55, y + s * 0.85, x + s * 0.75, y + s * 0.2);
		p.lineTo(x + s, y + s * 0.2);
	}
	if (kind == "output")
	{
		// a speaker
		p.startNewSubPath(x + s * 0.05, y + s * 0.35);
		p.lineTo(x + s * 0.25, y + s * 0.35);
		p.lineTo(x + s * 0.5, y + s * 0.1);
		p.lineTo(x + s * 0.5, y + s * 0.9);
		p.lineTo(x + s * 0.25, y + s * 0.65);
		p.lineTo(x + s * 0.05, y + s * 0.65);
		p.closeSubPath();
		p.startNewSubPath(x + s * 0.68, y + s * 0.3);
		p.quadraticTo(x + s * 0.8, y + s * 0.5, x + s * 0.68, y + s * 0.7);
		p.startNewSubPath(x + s * 0.82, y + s * 0.15);
		p.quadraticTo(x + s * 1.0, y + s * 0.5, x + s * 0.82, y + s * 0.85);
	}
	if (kind == "eq")
	{
		// a bell on the baseline
		p.startNewSubPath(x, y + s * 0.8);
		p.lineTo(x + s * 0.2, y + s * 0.8);
		p.quadraticTo(x + s * 0.35, y + s * 0.8, x + s * 0.42, y + s * 0.15);
		p.quadraticTo(x + s * 0.5, y + s * 0.05, x + s * 0.58, y + s * 0.15);
		p.quadraticTo(x + s * 0.65, y + s * 0.8, x + s * 0.8, y + s * 0.8);
		p.lineTo(x + s, y + s * 0.8);
	}
	if (kind == "limiter")
	{
		// a wave flattened under a ceiling line
		p.startNewSubPath(x, y + s * 0.15);
		p.lineTo(x + s, y + s * 0.15);
		p.startNewSubPath(x, y + s * 0.7);
		p.quadraticTo(x + s * 0.12, y + s * 0.28, x + s * 0.25, y + s * 0.28);
		p.lineTo(x + s * 0.45, y + s * 0.28);
		p.quadraticTo(x + s * 0.55, y + s * 0.95, x + s * 0.7, y + s * 0.28);
		p.lineTo(x + s * 0.85, y + s * 0.28);
		p.quadraticTo(x + s * 0.95, y + s * 0.5, x + s, y + s * 0.7);
	}
	g.setColour(colour);
	g.drawPath(p, [x, y, s, s], 1.4);

	// the filled parts: sample bars, delay taps, reverb dots
	if (kind == "source")
	{
		local bars = [0.15, 0.35, 0.6, 0.3, 0.9, 0.5, 1.0, 0.45, 0.8, 0.3, 0.55, 0.2];
		for (ii = 0; ii < bars.length; ii++)
			g.fillRect([x + ii * s / bars.length, y + s / 2 - bars[ii] * s / 2, 1.2, bars[ii] * s]);
	}
	if (kind == "delay")
	{
		// a hit and its repeats, each lower
		local taps = [1.0, 0.68, 0.46, 0.3];
		for (ii = 0; ii < taps.length; ii++)
			g.fillRect([x + ii * s * 0.3, y + s - taps[ii] * s, 1.8, taps[ii] * s]);
	}
	if (kind == "reverb")
	{
		local dots = [[0.75, 0.2], [0.85, 0.45], [0.8, 0.75], [0.95, 0.3], [0.92, 0.62], [0.72, 0.5], [0.97, 0.85], [0.88, 0.1]];
		for (dd in dots)
			g.fillRect([x + dd[0] * s, y + dd[1] * s, 1.3, 1.3]);
	}
}

// a node's plate and title bar (paint routine of every node panel and of SOURCE's). Since
// 2026-10-30 (user: the fixed modules should look different from the reorderable ones) kind
// NODE_CHAIN is a raised card (lighter, brighter border, a drop shadow drawn by pnlBg, a grip
// left of the icon, the title bar lit on hover); NODE_FIXED (SOURCE, OUTPUT,
// LIMITER) is recessed, with a solid
// title band and a dimmer title.
inline function paintNode(g, w, h, title, icon, off, drag, kind, hover)
{
	local d = off ? 0.4 : 1.0;
	local tx = 29;
	if (kind == NODE_CHAIN)
	{
		g.setColour(drag ? 0x1CFFFFFF : (off ? 0x10000000 : 0x10FFFFFF));
		g.fillRoundedRectangle([0, 0, w, h], 4.0);
		if (hover || drag)
		{
			g.setColour(0x0CFFFFFF);
			g.fillRoundedRectangle([1, 1, w - 2, 27], 3.0);
		}
		g.setColour(drag ? 0x70FFFFFF : dimColour(0x30FFFFFF, d));
		g.drawRoundedRectangle([0.5, 0.5, w - 1, h - 1], 4.0, 1.0);
		g.setColour(dimColour(0x1CFFFFFF, d));
		g.drawLine(1, w - 1, 28.5, 28.5, 1.0);
		// the grip: 2 x 3 dots
		g.setColour(hover || drag ? 0xC0F4F4F6 : dimColour(0x60F4F4F6, d));
		for (gi = 0; gi < 6; gi++)
			g.fillEllipse([5 + (gi % 2) * 3.5, 9 + Math.floor(gi / 2) * 4, 2, 2]);
		drawNodeIcon(g, icon, 14, 7, 15, dimColour(0xFFF4F4F6, d));
		tx = 34;
	}
	else
	{
		g.setColour(NODE_RECESS);
		g.fillRoundedRectangle([0, 0, w, h], 4.0);
		fillNodeBand(g, 0, 0, w);
		g.setColour(NODE_FRAME);
		g.drawRoundedRectangle([0.5, 0.5, w - 1, h - 1], 4.0, 1.0);
		drawNodeIcon(g, icon, 8, 7, 15, dimColour(0xFFB8BAC0, d));
	}
	g.setColour(dimColour(kind == NODE_CHAIN ? Theme.TEXT : 0xFFA8ABB2, d));
	g.setFontWithSpacing(Theme.FONT_BOLD, 12.0, 0.04);
	g.drawAlignedText(title, [tx, 0, w - tx - 23, 28], "left");
}

for (n = 0; n < 8; n++)
{
	var np = Content.addPanel("pnlNode" + n, 0, NODE_Y);
	np.set("width", NODE_W);
	np.set("height", NODE_H);
	np.set("saveInPreset", false);
	np.set("allowCallbacks", isChainNode(n) ? "Clicks, Hover & Dragging" : "No Callbacks");
	if (isChainNode(n))
		np.setMouseCursor("DraggingHandCursor", Colours.white, [0, 0]);
	np.data.node = n;
	np.data.drag = false;
	np.data.off = false;
	np.data.hover = false;
	np.setPaintRoutine(function(g)
	{
		paintNode(g, this.getWidth(), this.getHeight(), NODE_NAMES[this.data.node], NODE_ICONS[this.data.node], this.data.off, this.data.drag,
		          isChainNode(this.data.node) ? NODE_CHAIN : NODE_FIXED, this.data.hover);
	});
	// FX nodes: drag a node (anywhere outside its controls) across another node's slot to move it there
	np.setMouseCallback(function(event)
	{
		if (isDefined(event.hover) && event.hover != this.data.hover)
		{
			this.data.hover = event.hover;
			this.repaint();
		}
		if (event.clicked)
		{
			this.data.drag = true;
			this.repaint();
		}
		else if (event.drag && this.data.drag)
		{
			var ax = this.get("x") + event.x;
			var target = Math.range(Math.floor((ax - nodeX(0) + NODE_GAP / 2) / (NODE_W + NODE_GAP)), 0, 5);
			var from = fxOrder.indexOf(this.data.node);
			if (target != from)
			{
				fxOrder.removeElement(from);
				fxOrder.insert(target, this.data.node);
				nodeLayout();
			}
		}
		if (event.mouseUp && this.data.drag)
		{
			this.data.drag = false;
			nodeLayout();
		}
	});
	nodePanels.push(np);
}

// the power buttons (FX nodes keep their ids from iteration 1)
for (n = 0; n < 8; n++)
	nodePower.push(undefined);
for (n = 0; n < 4; n++)
	nodePower[n] = nodeAdd(n, addPower("btnFx" + n + "On", 1), NODE_W - 24, 5);
nodePower[6] = nodeAdd(6, addPower("btnEqOn", 1), NODE_W - 24, 5);
nodePower[4] = nodeAdd(4, addPower("btnGrnOn", 0), NODE_W - 24, 5);   // GRAIN: off by default
nodePower[7] = nodeAdd(7, addPower("btnLimOn", 1), NODE_W - 24, 5);

inline function nodeOff(n) { return isDefined(nodePower[n]) && nodePower[n].getValue() < 0.5; }

// ---------------------------------------------------------------------------
// The small displays: each node's settings as a picture (paintDisplay, by node).

// the engine's FilterType 0..9: Vital's analog model (12 / 24 dB x low / band / high pass), then
// its LADDER, DIODE and DIRTY low passes and its COMB (a feedback comb at CUTOFF)
const var FILTER_TYPES = ["LP 12 dB", "LP 24 dB", "BP 12 dB", "BP 24 dB", "HP 12 dB", "HP 24 dB",
                           "LADDER", "DIODE", "DIRTY", "COMB"];   // (2026-10-31; append-only)
const var DIST_MODES = ["TAPE", "TUBE", "FOLD", "CLIP"];
const var RVB_TYPES = ["PLATE", "HALL", "SPRING", "SHIMMER", "DARK"];   // append-only (engine ReverbType)
const var RVB_TIME = [1.0, 1.7, 0.7, 2.6, 1.4];   // tail length multiplier per engine

inline function kv(id) { return Content.getComponent(id).getValue(); }

// a log frequency axis 20 Hz..20 kHz over the display's width
inline function dispFreq(px, w) { return 20.0 * Math.pow(1000.0, px / w); }

// the filter's magnitude (dB) at f: a rough picture per family (LP / HP / BP, 12 or 24 dB)
inline function filterDb(f, fc, q, name)
{
	local slope = (name.indexOf("12") != -1 || name.indexOf("SEM") != -1 || name.indexOf("MS-20") != -1 || name.indexOf("DIGITAL") != -1) ? 2 : 4;
	local r = f / fc;
	local mag = 1.0;
	if (name.indexOf("BP") != -1)
		mag = 1.0 / Math.sqrt(1.0 + q * q * Math.pow(r - 1.0 / r, 2));
	else
	{
		if (name.indexOf("HP") != -1)
			r = 1.0 / r;
		mag = 1.0 / Math.sqrt(1.0 + Math.pow(r, 2 * slope));
		mag *= 1.0 + (q - 0.7) * 0.6 * Math.exp(-Math.pow(Math.log(r) / Math.log(2.0), 2) * 6.0);
	}
	return 8.685889638 * Math.log(Math.max(mag, 0.00001));
}

inline function paintDisplay(g, n, w, h, d)
{
	local fg = dimColour(0xFFF4F4F6, d);
	local faint = dimColour(0x60F4F4F6, d);
	local p = Content.createPath();
	p.startNewSubPath(0, 0);
	p.startNewSubPath(w, h);

	if (n == 0)
	{
		// FILTER: the response at the cutoff, and (faint) where the envelope sweeps it
		local fname = FILTER_TYPES[Math.range(kv("cmbFltType") - 1, 0, FILTER_TYPES.length - 1)];
		local fq = 0.7 + kv("knbFltReso") / 100.0 * 7.0;
		if (fname == "COMB")
		{
			// COMB: a spike on each harmonic of its pitch (KEY: the snapped one), as tall as RESO
			// feeds back, lower as the loop's low pass (42 st above) darkens them; until they're
			// closer than 3 px. Faint: where the envelope starts them.
			local cres = kv("knbFltReso") / 100.0;
			for (sweep = 1; sweep >= 0; sweep--)
			{
				local cfc = Math.range(combSnapHz(kv("knbFltCutoff")) * (sweep == 1 ? Math.pow(2.0, 7.0 * kv("knbFltEnv") / 100.0) : 1.0), 20, 20000);
				g.setColour(sweep == 1 ? faint : fg);
				for (ck = 1; ck <= 64; ck++)
				{
					local cx = w * Math.log(cfc * ck / 20.0) / Math.log(1000.0);
					if (cx > w || (ck > 1 && w * Math.log(ck / (ck - 1)) / Math.log(1000.0) < 3.0))
						break;
					local ch = (h - 14) * (0.3 + 0.7 * cres) / Math.sqrt(1.0 + Math.pow(ck / 11.2, 2));
					g.drawLine(cx, cx, h - 5, h - 5 - ch, sweep == 1 ? 1.0 : 1.6);
				}
			}
			g.setColour(faint);
			g.drawLine(0, w, h - 5, h - 5, 1.0);
			return;
		}
		for (sweep = 1; sweep >= 0; sweep--)
		{
			local fc = Math.range(combSnapHz(kv("knbFltCutoff")) * (sweep == 1 ? Math.pow(2.0, 7.0 * kv("knbFltEnv") / 100.0) : 1.0), 20, 20000);
			local fp = Content.createPath();
			fp.startNewSubPath(0, 0);
			fp.startNewSubPath(w, h);
			for (px = 0; px <= w; px += 2)
			{
				local fy = Math.range(6 - filterDb(dispFreq(px, w), fc, fq, fname) * (h - 8) / 42.0, 1, h - 1);
				if (px == 0) fp.startNewSubPath(px, fy); else fp.lineTo(px, fy);
			}
			g.setColour(sweep == 1 ? faint : fg);
			g.drawPath(fp, [0, 0, w, h], sweep == 1 ? 1.0 : 1.6);
		}
		return;
	}
	if (n == 1)
	{
		// DIST: the transfer curve (input left..right, output bottom..top), mixed with the dry line
		local dm = Math.range(kv("cmbDstMode") - 1, 0, 3);
		local dr = 1.0 + kv("knbDstDrive") / 100.0 * 9.0;
		local mixv = kv("knbDstMix") / 100.0;
		// CRUSH: the curve in steps (the held samples across, the bits up)
		local crv = kv("knbDstCrush") / 100.0;
		local cxs = 2.0 / Math.max(4, Math.round(200 * Math.exp(-3.912 * crv)));
		local cys = Math.pow(2.0, -(11.0 - 10.0 * crv));   // (the engine's 12 .. 2 bits)
		g.setColour(faint);
		g.drawLine(0, w, h - 2, 2, 0.8);
		for (px = 0; px <= w; px += 2)
		{
			local xi = px / w * 2.0 - 1.0;
			if (crv > 0.001) xi = Math.floor(xi / cxs) * cxs;
			local yo = 0.0;
			if (dm == 0) yo = Math.tanh(dr * xi) / Math.tanh(dr);
			if (dm == 1) yo = xi >= 0 ? Math.tanh(dr * xi) / Math.tanh(dr) : Math.tanh(dr * 0.6 * xi) / Math.tanh(dr * 0.6) * 0.8;
			if (dm == 2) yo = Math.sin(xi * dr * Math.PI / 2.0);
			if (dm == 3) yo = Math.range(xi * dr, -1.0, 1.0);
			if (crv > 0.001) yo = Math.round(yo / cys) * cys;
			yo = mixv * yo + (1.0 - mixv) * xi;
			local dy = h / 2 - yo * (h / 2 - 3);
			if (px == 0) p.startNewSubPath(px, dy); else p.lineTo(px, dy);
		}
		g.setColour(fg);
		g.drawPath(p, [0, 0, w, h], 1.6);
		return;
	}
	if (n == 2)
	{
		// DELAY: the input (outlined, at 1 - MIX) and its repeats at TIME, each FEEDBACK lower
		// (the first at MIX), over 1, 2 or 4 beats (faint beat lines); PING-PONG: the repeats
		// alternate up (left) and down (right) from the centre
		local dbeats = DLY_BEATS[Math.range(kv("cmbDlyTime") - 1, 0, DLY_BEATS.length - 1)];
		local dspan = dbeats <= 0.25 ? 1 : (dbeats <= 0.5 ? 2 : 4);
		local dfb = kv("knbDlyFeedback") / 100.0;
		local dmix = kv("knbDlyMix") / 100.0;
		local dpp = kv("btnDlyPing") > 0.5;
		// SWING: the off-beat repeats (the 1st, 3rd...) moved by a fraction of TIME, -1/3..+1/3;
		// the bars sit under its slider (knbDlySwing, the top DLY_SW_H px)
		local dsw = kv("knbDlySwing") / 100.0;
		local dtop = DLY_SW_H;
		local dmid = dtop + (h - dtop) / 2;
		g.setColour(dimColour(0x20F4F4F6, d));
		for (bi = 1; bi < dspan; bi++)
			g.drawLine(bi * w / dspan, bi * w / dspan, dtop, h, 1.0);
		if (dpp)
		{
			g.setColour(faint);
			g.drawLine(0, w, dmid, dmid, 0.8);
		}
		local dlv = dmix;
		for (ti = 0; ti * dbeats < dspan && (ti == 0 || dlv > 0.01); ti++)
		{
			local tx = 1 + (ti + (ti % 2 == 1 ? dsw : 0.0)) * dbeats / dspan * (w - 3);
			local tl = ti == 0 ? 1.0 - dmix : dlv;
			local th = (dpp ? (h - dtop) / 2 - 2 : h - dtop - 3) * tl;
			local ty = dpp ? (ti == 0 ? dmid - th : (ti % 2 == 1 ? dmid - th : dmid)) : h - 1 - th;
			if (dpp && ti == 0)
				th = 2 * th;
			g.setColour(ti == 0 ? faint : fg);
			if (ti == 0)
				g.drawRect([tx - 1, ty, 3, Math.max(th, 1)], 1.0);
			else
				g.fillRect([tx - 1, ty, 2.5, Math.max(th, 1)]);
			if (ti > 0)
				dlv *= dfb;
		}
		return;
	}
	if (n == 3)
	{
		// REVERB: the tail's envelope (length = SIZE x the engine), its high end fading faster
		// with DAMP (brighter inner shape), height = MIX, spread = WIDTH
		local rt = (0.3 + kv("knbRvbSize") / 100.0 * 2.7) * RVB_TIME[Math.range(kv("cmbRvbType") - 1, 0, RVB_TIME.length - 1)];
		local hd = 1.0 - kv("knbRvbDamp") / 100.0 * 0.8;
		local mixr = kv("knbRvbMix") / 100.0;
		local spread = 0.5 + kv("knbRvbWidth") / 200.0;
		for (layer = 0; layer < 2; layer++)
		{
			local rp = Content.createPath();
			rp.startNewSubPath(0, 0);
			rp.startNewSubPath(w, h);
			local tau = layer == 0 ? rt : rt * hd * 0.5;
			rp.startNewSubPath(0, h / 2);
			for (px = 0; px <= w; px += 2)
				rp.lineTo(px, h / 2 - mixr * spread * (h / 2 - 2) * Math.exp(-px / w * 4.0 / tau));
			for (px = w; px >= 0; px -= 2)
				rp.lineTo(px, h / 2 + mixr * spread * (h / 2 - 2) * Math.exp(-px / w * 4.0 / tau));
			rp.closeSubPath();
			g.setColour(layer == 0 ? faint : dimColour(0xB0F4F4F6, d));
			g.fillPath(rp, [0, 0, w, h]);
		}
		return;
	}
	if (n == 4)
	{
		// GRAIN: one second of grains (a fixed scatter, so it doesn't flicker): DENSITY of them,
		// each a Hann bump SIZE wide; SPRAY scatters them in height, MODE moves them (OCT UP /
		// DOWN: up / down, DETUNE: a little, REVERSE: the bumps lean back), MIX = their height
		local gsz = kv("knbGrnSize") / 1000.0;
		local gnum = Math.min(60, Math.round(kv("knbGrnDensity")));
		local gsp = kv("knbGrnSpray") / 1000.0;
		local gmode = Math.range(kv("cmbGrnMode") - 1, 0, 4);
		local gmix = 0.25 + 0.75 * kv("knbGrnMix") / 100.0;
		local gshift = [0.0, 0.0, -0.22, 0.22, 0.0][gmode];
		g.setColour(faint);
		g.drawLine(0, w, h / 2, h / 2, 0.8);
		for (gi = 0; gi < gnum; gi++)
		{
			local r1 = Math.abs(Math.sin(gi * 12.9898) * 43758.5453);
			r1 = r1 - Math.floor(r1);          // (HISEScript % is an integer modulo)
			local r2 = Math.abs(Math.sin(gi * 78.233) * 12543.123);
			r2 = r2 - Math.floor(r2);
			local gx = (gi + r1 - 0.5) / gnum * w;
			local gw = Math.max(2, gsz * w);
			local gh = (h * 0.3) * gmix * (0.35 + 0.65 * r2);
			local gyc = h / 2 + gh / 2 + (gshift + (r2 - 0.5) * (0.1 + 0.8 * gsp) + (gmode == 1 ? (r1 - 0.5) * 0.1 : 0.0)) * (h - 10);
			local gp = Content.createPath();
			gp.startNewSubPath(0, 0);
			gp.startNewSubPath(w, h);
			gp.startNewSubPath(gx - gw / 2, gyc);
			gp.quadraticTo(gx - (gmode == 4 ? gw * 0.25 : 0.0), gyc - 2 * gh, gx + gw / 2, gyc);   // (REVERSE: leaning back)
			g.setColour(fg);
			g.drawPath(gp, [0, 0, w, h], 1.1);
		}
		return;
	}
	if (n == 5)
	{
		// OUTPUT: the stereo image (a vertical line = mono, wider = WIDTH), POL marked
		local wd = kv("knbOutWidth") / 200.0;
		g.setColour(faint);
		g.drawLine(w / 2, w / 2, 3, h - 3, 0.8);
		g.setColour(fg);
		g.drawEllipse([w / 2 - wd * (w / 2 - 4) - 0.5, 4, Math.max(1, wd * (w - 8)), h - 8], 1.6);
		if (kv("btnOutPol") > 0.5)
		{
			g.setFont(Theme.FONT_BOLD, 11.5);
			g.drawAlignedText("POL -", [w - 34, 2, 32, 12], "right");
		}
		return;
	}
	if (n == 6)
	{
		// EQ: TYPE (BELL, LOW SHELF, HIGH SHELF; FREQ, GAIN, WIDTH) and the SUB CUT high-pass under
		// it. The engine's analog prototypes (processEq): H(s) = (b2 s² + b1 s + b0) / (a2 s² + a1 s + a0)
		local ef = keySnapHz(kv("knbEqFreq"));   // (KEY: the snapped one)
		local eg = kv("knbEqGain");
		local ek = Math.max(0.1, kv("knbEqWidth"));   // the engine's k
		local esub = kv("knbEqSubCut");
		local et = Math.range(kv("cmbEqType") - 1, 0, 2);
		local eG = Math.pow(10.0, eg / 20.0);
		local eA = Math.sqrt(eG);
		local eq = ek * Math.sqrt(eA);
		local ec = [[1.0, ek * eG, 1.0, 1.0, ek, 1.0],
		            [eA, eA * eq, eA * eA, eA, eq, 1.0],
		            [eA * eA, eA * eq, eA, 1.0, eq, eA]][et];
		g.setColour(faint);
		g.drawLine(0, w, h * 0.6, h * 0.6, 0.8);
		for (px = 0; px <= w; px += 2)
		{
			local f = dispFreq(px, w);
			local ww = f / ef;
			local nr = ec[2] - ec[0] * ww * ww;
			local dr = ec[5] - ec[3] * ww * ww;
			local db = 4.342944819 * Math.log((nr * nr + Math.pow(ec[1] * ww, 2)) / (dr * dr + Math.pow(ec[4] * ww, 2)));
			db += 8.685889638 * Math.log(1.0 / Math.sqrt(1.0 + Math.pow(esub / f, 4)));
			local ey = Math.range(h * 0.6 - db * (h * 0.6 - 3) / 15.0, 1, h - 1);
			if (px == 0) p.startNewSubPath(px, ey); else p.lineTo(px, ey);
		}
		g.setColour(fg);
		g.drawPath(p, [0, 0, w, h], 1.6);
		return;
	}
	if (n == 7)
	{
		// LIMITER: input level (with DRIVE) against output level, flat at the CEILING
		local drv = kv("knbLimDrive");
		local ceil = kv("knbLimCeiling");
		g.setColour(faint);
		g.drawLine(0, w, h - 2, 2, 0.8);
		for (px = 0; px <= w; px += 2)
		{
			local inDb = -36.0 + px / w * 42.0 + drv;
			local outDb = Math.min(inDb, ceil);
			local ly = Math.range(2 + (6.0 - outDb) / 42.0 * (h - 4), 1, h - 1);
			if (px == 0) p.startNewSubPath(px, ly); else p.lineTo(px, ly);
		}
		g.setColour(fg);
		g.drawPath(p, [0, 0, w, h], 1.6);
		return;
	}
}

for (n = 0; n < 8; n++)
{
	var dp = Content.addPanel("pnlDisp" + n, 0, 0);
	dp.set("width", DISP_W);
	dp.set("height", DISP_H);
	dp.set("saveInPreset", false);
	dp.set("allowCallbacks", "No Callbacks");
	dp.data.node = n;
	dp.setPaintRoutine(function(g)
	{
		var dd = nodeOff(this.data.node) ? 0.4 : 1.0;
		g.setColour(0xFF08090B);
		g.fillRoundedRectangle([0, 0, this.getWidth(), this.getHeight()], 3.0);
		paintDisplay(g, this.data.node, this.getWidth(), this.getHeight(), dd);
	});
	nodeDisplays.push(nodeAdd(n, dp, DISP_X, DISP_Y));

}

// ---------------------------------------------------------------------------
// SOURCE (two knob columns): EXT | SAMPLE, the kick (SAMPLE), its trigger (MIDI | GRID +
// division), then TUNE, DECAY, PITCH (env amount), P.DECAY, DRIVE, LEVEL

const var pnlSrcNode = Content.addPanel("pnlSrcNode", SRC_X, NODE_Y);
pnlSrcNode.set("width", SRC_W);
pnlSrcNode.set("height", NODE_H);
pnlSrcNode.set("saveInPreset", false);
pnlSrcNode.set("allowCallbacks", "No Callbacks");
pnlSrcNode.setPaintRoutine(function(g)
{
	paintNode(g, this.getWidth(), this.getHeight(), "SOURCE", "source", false, false, NODE_FIXED, false);
});

inline function srcModeIndex() { return srcMode; }
inline function onSrcMode(i)
{
	srcMode = i;
	cmbSrcMode.setValue(i + 1);
	BvEngine.setAttribute(BV_SOURCE, i);
	pnlSrcKick.repaint();
	pnlSrcDiv.repaint();
	uiDimUpdate();
}
const var pnlSrcMode = addSegSwitch("pnlSrcMode", SRC_X + 14, NODE_Y + 34, SRC_W - 28, 26, ["EXT", "SAMPLE"], srcModeIndex, onSrcMode);

// the kick: its name, ‹ › step through the kick set (KICKS) or, with a user kick, through its
// folder's audio files; under it its waveform (kickWave) with its number and note; dimmed in
// EXT. Drop an audio file on it to load it (USER KICKS); right-click: load a file, or back to the
// factory kicks.
const var SRC_WAVE_Y = 34;           // the waveform strip, under the name box
const var SRC_WAVE_H = 28;
const var pnlSrcKick = Content.addPanel("pnlSrcKick", SRC_X + 14, NODE_Y + 66);
pnlSrcKick.set("width", SRC_W - 28);
pnlSrcKick.set("height", SRC_WAVE_Y + SRC_WAVE_H);
pnlSrcKick.set("saveInPreset", false);
pnlSrcKick.set("allowCallbacks", "Clicks Only");
pnlSrcKick.set("popupMenuItems", "Load a kick file...\nFactory kicks");
pnlSrcKick.set("popupOnRightClick", true);
pnlSrcKick.set("tooltip", "Drop an audio file here to use it as the kick; the arrows then browse its folder. Right-click: load a file, or back to the factory kicks");
pnlSrcKick.data.dropHover = false;
// a name shortened to n characters
inline function kickShort(s, n)
{
	return s.length > n ? s.substring(0, n - 1) + "…" : s;
}
pnlSrcKick.setPaintRoutine(function(g)
{
	var on = srcMode == 1;
	var kbw = this.getWidth();
	g.setColour(0xFF16171A);
	g.fillRoundedRectangle([0.5, 0.5, kbw - 1, 30], 3.0);
	g.setColour(Theme.LINE);
	g.drawRoundedRectangle([0.5, 0.5, kbw - 1, 30], 3.0, 1.0);
	g.setColour(on ? Theme.TEXT_DIM : 0xFF3A3C42);
	g.setFont(Theme.FONT, 16.0);
	g.drawAlignedText("‹", [4, 0, 20, 30], "centred");
	g.drawAlignedText("›", [kbw - 24, 0, 20, 30], "centred");
	g.setColour(on ? Theme.TEXT : 0xFF3A3C42);
	// the name: 14 px, smaller (down to 11) or shortened if it doesn't fit between the arrows
	// (Graphics.drawFittedText isn't registered for scripts in this HISE)
	var kname = kickName();
	var kfs = 14.0;
	g.setFont(Theme.FONT_BOLD, kfs);
	while (g.getStringWidth(kname) > kbw - 52 && kfs > 11.0)
	{
		kfs -= 1.0;
		g.setFont(Theme.FONT_BOLD, kfs);
	}
	for (kcut = kname.length - 1; g.getStringWidth(kname) > kbw - 52 && kcut > 3; kcut--)
		kname = kickShort(kickName(), kcut);
	g.drawAlignedText(kname, [24, 0, kbw - 48, 30], "centred");
	// the waveform strip: a mirrored peak bar per bin
	g.setColour(0xFF08090B);
	g.fillRoundedRectangle([0, SRC_WAVE_Y, kbw, SRC_WAVE_H], 3.0);
	g.setFontWithSpacing(Theme.FONT, 11.5, 0.12);
	if (this.data.dropHover)
	{
		g.setColour(Theme.TEXT);
		g.drawRoundedRectangle([0.5, 0.5, kbw - 1, this.getHeight() - 1], 3.0, 1.5);
		g.drawAlignedText("DROP TO LOAD THIS KICK", [0, SRC_WAVE_Y, kbw, SRC_WAVE_H], "centred");
		return;
	}
	if (!on)
	{
		g.setColour(0xFF3A3C42);
		g.drawAlignedText("EXTERNAL INPUT", [0, SRC_WAVE_Y, kbw, SRC_WAVE_H], "centred");
		return;
	}
	var kwx0 = 4;
	var kwbw = (kbw - 2 * kwx0) / KICK_WAVE_BINS;
	var kwcy = SRC_WAVE_Y + SRC_WAVE_H / 2;
	var kwamp = SRC_WAVE_H / 2 - 3;
	g.setColour(0xFF8C8F96);
	for (kwi = 0; kwi < kickWave.length; kwi++)
	{
		var kwh = Math.max(0.5, kickWave[kwi] * kwamp);
		g.fillRect([kwx0 + kwi * kwbw, kwcy - kwh, Math.max(1.0, kwbw - 0.6), 2 * kwh]);
	}
	// its number and note (with a KEY, the note it plays at: "G › F"), right, over the tail; a user
	// kick: its folder first. A missing user kick: MISSING and its name (the factory kick plays)
	var ksub = "";
	if (userKick != "" && !userKickOk)
	{
		g.setColour(0xFFE0605A);
		g.drawAlignedText("MISSING  ·  " + kickShort(userKick.substring(userKick.lastIndexOf("\\") + 1, userKick.length), 18), [0, SRC_WAVE_Y, kbw - 8, SRC_WAVE_H], "right");
		return;
	}
	if (userKickOk)
		ksub = kickShort(userKickDir, 14) + "  ·  " + (userKickPos + 1) + " / " + userKicks.length;
	else
		ksub = (kickIndex + 1) + " / " + KICKS.length;
	var kno = kickNote();
	if (kno >= 0)
		ksub += "  ·  " + NOTE_NAMES[kno] + (keyRoot >= 0 && keyRoot != kno ? " › " + NOTE_NAMES[keyRoot] : "");
	g.setColour(Theme.TEXT);
	g.drawAlignedText(ksub, [0, SRC_WAVE_Y, kbw - 8, SRC_WAVE_H], "right");
});
// a user kick (its full path; "" = back to the factory kicks): lblKickFile holds it, its callback
// (onKickFile) loads it. A file switches SOURCE to SAMPLE.
inline function userKickLoad(path)
{
	lblKickFile.setValue(path);
	lblKickFile.changed();
	if (path != "" && srcMode != 1)
	{
		cmbSrcMode.setValue(2);
		cmbSrcMode.changed();
	}
}
pnlSrcKick.setMouseCallback(function(event)
{
	// the right-click menu: 1 load a file, 2 the factory kicks
	if (isDefined(event.result) && event.result > 0)
	{
		if (event.result == 1)
			FileSystem.browse(userKickOk ? FileSystem.fromAbsolutePath(userKick).getParentDirectory() : FileSystem.Documents,
			                  false, USER_KICK_WILDCARD, function(f) { userKickLoad(f.toString(0)); });
		if (event.result == 2 && userKick != "")
			userKickLoad("");
		return;
	}
	if (event.clicked && !event.rightClick && srcMode == 1 && event.y < 30)
	{
		var step = event.x < this.getWidth() / 2 ? -1 : 1;
		if (userKickOk && userKicks.length > 0)
			userKickLoad(userKicks[(userKickPos + step + userKicks.length) % userKicks.length]);
		else if (KICKS.length > 0)
		{
			// a missing user kick is let go; the hidden knob holds the factory one, its callback
			// (onKickIndex) loads it
			if (userKick != "")
				userKickLoad("");
			knbKickIndex.setValue((kickIndex + step + KICKS.length) % KICKS.length);
			knbKickIndex.changed();
		}
	}
});
pnlSrcKick.setFileDropCallback("Drop & Hover", USER_KICK_WILDCARD, function(f)
{
	this.data.dropHover = f.hover && !f.drop;
	if (f.drop && isDefined(f.fileName))
		userKickLoad(typeof f.fileName == "string" ? f.fileName : f.fileName[0]);
	this.repaint();
});

inline function trigModeIndex() { return srcMode == 0 ? 1 : trigMode; }   // EXT: always the grid
inline function onTrigMode(i)
{
	trigMode = i;
	cmbSrcTrig.setValue(i + 1);
	BvEngine.setAttribute(BV_TRIGGER, i);
	pnlSrcDiv.repaint();
}
const var pnlSrcTrig = addSegSwitch("pnlSrcTrig", SRC_X + 14, NODE_Y + 136, 100, 24, ["MIDI", "GRID"], trigModeIndex, onTrigMode);

// a division pill: click cycles 1/4 > 1/8 > 1/2 > 1 BAR; dimmed unless its mode is GRID
inline function addDivPill(name, x, y, w, getOn, getIdx, onNext)
{
	local p = Content.addPanel(name, x, y);
	p.set("width", w);
	p.set("height", 24);
	p.set("saveInPreset", false);
	p.set("allowCallbacks", "Clicks Only");
	p.data.on = getOn;
	p.data.idx = getIdx;
	p.data.next = onNext;
	p.setPaintRoutine(function(g)
	{
		var on = this.data.on();
		var pw = this.getWidth();
		g.setColour(0xFF16171A);
		g.fillRoundedRectangle([0.5, 0.5, pw - 1, 23], 3.0);
		g.setColour(Theme.LINE);
		g.drawRoundedRectangle([0.5, 0.5, pw - 1, 23], 3.0, 1.0);
		g.setColour(on ? 0xFFF4F4F6 : 0xFF3A3C42);
		g.setFontWithSpacing(Theme.FONT_BOLD, 11.5, 0.06);
		g.drawAlignedText(DIVISIONS[this.data.idx()], [0, 0, pw, 24], "centred");
	});
	p.setMouseCallback(function(event)
	{
		if (event.clicked && this.data.on())
		{
			this.data.next();
			this.repaint();
		}
	});
	return p;
}
// EXT always takes its kicks from the grid (the KICK duck, FILTER's envelope)
inline function srcDivOn() { return srcMode == 0 || trigMode == 1; }
inline function srcDivIdx() { return trigDiv; }
inline function srcDivNext()
{
	trigDiv = (trigDiv + 1) % DIVISIONS.length;
	cmbSrcDiv.setValue(trigDiv + 1);
	BvEngine.setAttribute(BV_DIVISION, DIVISION_BEATS[trigDiv]);
}
const var pnlSrcDiv = addDivPill("pnlSrcDiv", SRC_X + SRC_W - 14 - 64, NODE_Y + 136, 64, srcDivOn, srcDivIdx, srcDivNext);

const var srcKnobs = [addKnob("knbSrcTune", "TUNE", 0, 0, -24, 24, 0, "Linear", -1, "stInt"),
                      addKnob("knbSrcDecay", "DECAY", 0, 0, 20, 2000, 2000, "Time", 300, "time"),
                      addKnob("knbSrcPitch", "PITCH", 0, 0, 0, 48, 0, "Linear", -1, "stInt"),
                      addKnob("knbSrcPitchDec", "P.DECAY", 0, 0, 1, 1000, 60, "Time", 100, "time"),
                      addKnob("knbSrcDrive", "DRIVE", 0, 0, 0, 100, 20, "Linear", -1, "percent"),
                      addKnob("knbSrcLevel", "LEVEL", 0, 0, -24, 12, 0, "Decibel", -6, "decibel")];
for (c in [srcKnobs[0], srcKnobs[2]])
	c.set("stepSize", 1);
for (i = 0; i < srcKnobs.length; i++)
	place(srcKnobs[i], SRC_X + 14 + (i % 2) * 100 + (86 - KNOB_W) / 2, NODE_Y + 170 + Math.floor(i / 2) * KNOB_PITCH, 0, 0);

// the engine: TUNE (st), DECAY (ms), PITCH (st), P.DECAY (ms), DRIVE (0..100 % -> 0..1), LEVEL (dB)
const var SRC_PARAMS = [BV_TUNE, BV_DECAY, BV_PITCH, BV_PITCH_DECAY, BV_DRIVE, BV_LEVEL];
// TUNE adds KEY's offset (the kick's note to the key)
inline function srcSend(i, value) { BvEngine.setAttribute(SRC_PARAMS[i], i == 4 ? value / 100.0 : (i == 0 ? value + kickKeyOffset() : value)); }
inline function onSrcKnob(component, value) { srcSend(srcKnobs.indexOf(component), value); }
for (k in srcKnobs)
	k.setControlCallback(onSrcKnob);

// ---------------------------------------------------------------------------
// The nodes' controls

// FILTER: type, CUTOFF, RESO, ENV (amount), ENV DEC (each hit's cutoff envelope)
nodeAdd(0, addCombo("cmbFltType", FILTER_TYPES, 0, 0, DISP_W), DISP_X, SEL_Y);
nodeKnob(0, addKnob("knbFltCutoff", "CUTOFF", 0, 0, 20, 20000, 400, "Frequency", 1000, "combfreq"), 0);
nodeKnob(0, addKnob("knbFltReso", "RESO", 0, 0, 0, 100, 30, "Linear", -1, "percent"), 1);
nodeKnob(0, addKnob("knbFltEnv", "ENV", 0, 0, -100, 100, 40, "Linear", -1, "signedPercent"), 2);
nodeKnob(0, addKnob("knbFltEnvDec", "ENV DEC", 0, 0, 1, 2000, 150, "Time", 300, "time"), 3);

// COMB (TYPE 10): with a KEY its CUTOFF snaps to the key's root (engineSend, the readout, the
// display); re-sent when TYPE or KEY changes
inline function fltCombUpdate()
{
	fltComb = Content.getComponent("cmbFltType").getValue() == FILTER_TYPES.indexOf("COMB") + 1;
	engineSend("knbFltCutoff", Content.getComponent("knbFltCutoff").getValue());
	Content.getComponent("knbFltCutoff").sendRepaintMessage();
	nodeDisplays[0].repaint();
}

// DIST: mode, DRIVE, TONE, MIX
nodeAdd(1, addCombo("cmbDstMode", DIST_MODES, 0, 0, DISP_W), DISP_X, SEL_Y);
nodeKnob(1, addKnob("knbDstDrive", "DRIVE", 0, 0, 0, 100, 40, "Linear", -1, "percent"), 0);
nodeKnob(1, addKnob("knbDstTone", "TONE", 0, 0, 200, 20000, 4000, "Frequency", 2000, "freq"), 1);
nodeKnob(1, addKnob("knbDstMix", "MIX", 0, 0, 0, 100, 100, "Linear", -1, "percent"), 2);

// DELAY (CLONE's slot since 2026-10-29, user: "replace clone with a delay unit"): TIME (synced:
// DLY_TIMES, beats in DLY_BEATS; append-only, the combo's index is saved), MONO / PING-PONG (the
// arrows button next to it), FEEDBACK, LOW CUT and HIGH CUT (in the feedback loop: each repeat
// thinner and darker), MIX. CLONE's knobs stay, hidden (component ids are append-only).
const var DLY_TIMES = ["1/32", "1/16T", "1/16", "1/16D", "1/8T", "1/8", "1/8D", "1/4T", "1/4", "1/4D", "1/2"];
const var DLY_BEATS = [0.125, 1.0 / 6.0, 0.25, 0.375, 1.0 / 3.0, 0.5, 0.75, 2.0 / 3.0, 1.0, 1.5, 2.0];
for (cid in ["knbClnBar2", "knbClnBar3", "knbClnBar4", "knbClnDecay"])
{
	var ck = addKnob(cid, "", 0, 0, 0, 100, 0, "Linear", -1, "percent");
	ck.set("visible", false);
	ck.set("saveInPreset", false);
}
const var cmbDlyTime = nodeAdd(2, addCombo("cmbDlyTime", DLY_TIMES, 0, 0, DISP_W - 30), DISP_X, SEL_Y);
cmbDlyTime.set("defaultValue", 3);
cmbDlyTime.setValue(3);                  // 1/16
const var dlyLaf = Content.createLocalLookAndFeel();
dlyLaf.registerFunction("drawToggleButton", function(g, obj)
{
	// PING-PONG: two opposed arrows, lit when on
	var pa = [0.5, 0.5, obj.area[2] - 1, obj.area[3] - 1];
	var pd = uiDim[obj.id] == true ? 0.4 : 1.0;
	var pon = obj.value > 0.5;
	g.setColour(dimColour(pon ? 0xFF2E3035 : 0xFF16171A, pd));
	g.fillRoundedRectangle(pa, 3.0);
	g.setColour(dimColour(obj.over ? 0xFF6A6D74 : Theme.LINE, pd));
	g.drawRoundedRectangle(pa, 3.0, 1.0);
	var pcx = obj.area[2] / 2;
	var pcy = obj.area[3] / 2;
	var pp = Content.createPath();
	pp.startNewSubPath(0, 0);
	pp.startNewSubPath(obj.area[2], obj.area[3]);
	pp.startNewSubPath(pcx - 7, pcy - 3);
	pp.lineTo(pcx + 7, pcy - 3);
	pp.lineTo(pcx + 4, pcy - 6);
	pp.startNewSubPath(pcx + 7, pcy + 3);
	pp.lineTo(pcx - 7, pcy + 3);
	pp.lineTo(pcx - 4, pcy + 6);
	g.setColour(dimColour(pon ? 0xFFF4F4F6 : Theme.TEXT_DIM, pd));
	g.drawPath(pp, [0, 0, obj.area[2], obj.area[3]], 1.4);
});
const var btnDlyPing = nodeAdd(2, addSwitch("btnDlyPing", "PING", 0, 0, 26, 24, 0), DISP_X + DISP_W - 26, SEL_Y);
btnDlyPing.setLocalLookAndFeel(dlyLaf);
btnDlyPing.set("tooltip", "PING-PONG: the repeats alternate left and right (their lows stay mono)");
// SWING (2026-10-30, user: "a slider above the bars, middle is no swing, left ... backwards,
// right forward"; no label, no value shown, not randomized): the off-beat repeats (the 1st,
// 3rd...) early or late by up to a third of TIME (+33 % = a triplet shuffle; engine 86
// DelaySwing, value / 100); a thin bipolar slider along the top of the display
const var DLY_SW_H = 14;
const var swLaf = Content.createLocalLookAndFeel();
swLaf.registerFunction("drawLinearSlider", function(g, obj)
{
	var sa = obj.area;
	var sd = uiDim[obj.id] == true ? 0.4 : 1.0;
	var scy = sa[3] / 2;
	var st0 = 3;                         // the track (the thumb's half width in from each end)
	var st1 = sa[2] - 3;
	var sc = (st0 + st1) / 2;
	var sx = st0 + Content.getComponent(obj.id).getValueNormalized() * (st1 - st0);
	g.setColour(dimColour(0xFF3A3D43, sd));
	g.fillRect([st0, scy - 0.5, st1 - st0, 1]);
	g.fillRect([sc - 0.5, scy - 3, 1, 6]);           // the centre: straight
	g.setColour(dimColour(0xFFD8D8DC, sd));
	g.fillRect([Math.min(sc, sx), scy - 1, Math.abs(sx - sc), 2]);
	g.setColour(dimColour(obj.hover || obj.clicked ? 0xFFFFFFFF : 0xFFF4F4F6, sd));
	g.fillRoundedRectangle([sx - 2.5, scy - 4.5, 5, 9], 1.5);
});
const var knbDlySwing = addKnob("knbDlySwing", "SWING", 0, 0, -33, 33, 0, "Linear", 0, "percent");
knbDlySwing.set("style", "Horizontal");
knbDlySwing.set("width", DISP_W - 6);
knbDlySwing.set("height", DLY_SW_H);
knbDlySwing.set("dragDirection", "Horizontal");
knbDlySwing.set("stepSize", 1);
knbDlySwing.set("tooltip", "SWING: the off-beat repeats early (left) or late (right); centre = straight, +33 % = triplet shuffle");
knbDlySwing.setLocalLookAndFeel(swLaf);
nodeAdd(2, knbDlySwing, DISP_X + 3, DISP_Y + 1);
nodeKnob(2, addKnob("knbDlyFeedback", "FEEDBACK", 0, 0, 0, 95, 45, "Linear", -1, "percent"), 0);
nodeKnob(2, addKnob("knbDlyLowCut", "LOW CUT", 0, 0, 20, 1000, 40, "Frequency", 100, "freq"), 1);
nodeKnob(2, addKnob("knbDlyHighCut", "HIGH CUT", 0, 0, 200, 20000, 2500, "Frequency", 2000, "freq"), 2);
nodeKnob(2, addKnob("knbDlyMix", "MIX", 0, 0, 0, 100, 50, "Linear", -1, "percent"), 3);
inline function dlyTimeSend() { BvEngine.setAttribute(BV_DELAY_TIME, DLY_BEATS[Math.range(cmbDlyTime.getValue() - 1, 0, DLY_BEATS.length - 1)]); }

// REVERB: engine (DuskVerb's presets), SIZE, DAMP, WIDTH, MIX
nodeAdd(3, addCombo("cmbRvbType", RVB_TYPES, 0, 0, DISP_W), DISP_X, SEL_Y);
nodeKnob(3, addKnob("knbRvbSize", "SIZE", 0, 0, 0, 100, 70, "Linear", -1, "percent"), 0);
nodeKnob(3, addKnob("knbRvbDamp", "DAMP", 0, 0, 0, 100, 60, "Linear", -1, "percent"), 1);
nodeKnob(3, addKnob("knbRvbWidth", "WIDTH", 0, 0, 0, 100, 40, "Linear", -1, "percent"), 2);
nodeKnob(3, addKnob("knbRvbMix", "MIX", 0, 0, 0, 100, 100, "Linear", -1, "percent"), 3);

// GRAIN (2026-10-30; node 4, DUCK's until its controls moved up): MODE, SIZE, DENSITY, SPRAY, MIX
const var GRAIN_MODES = ["CLOUD", "DETUNE", "OCT UP", "OCT DOWN", "REVERSE"];   // append-only (engine GrainMode)
nodeAdd(4, addCombo("cmbGrnMode", GRAIN_MODES, 0, 0, DISP_W), DISP_X, SEL_Y);
nodeKnob(4, addKnob("knbGrnSize", "SIZE", 0, 0, 10, 500, 80, "Time", 80, "time"), 0);
nodeKnob(4, addKnob("knbGrnDensity", "DENSITY", 0, 0, 2, 100, 25, "Linear", 20, "rate"), 1);
nodeKnob(4, addKnob("knbGrnSpray", "SPRAY", 0, 0, 0, 1000, 200, "Time", 200, "time"), 2);
nodeKnob(4, addKnob("knbGrnMix", "MIX", 0, 0, 0, 100, 50, "Linear", -1, "percent"), 3);

// DUCK: trigger KICK | GRID, its division (GRID), DEPTH (the curve's), MIX (ducked vs
// unducked), TARGET RUMBLE | ALL (what it ducks: the rumble, or the whole output with the dry
// kick: with GRID, a volume shaper on any track). Since 2026-10-30 (user: make room for a new
// module) in the visualizer's right column (the curve presets are buttons in the visualizer's
// header again since 2026-10-30; cmbDuckPreset is hidden); node 4's slot is empty (paintNode: a dashed placeholder), its display and the curve
// values (pnlDuckInfo, LENGTH / POINTS / OFFSET: the visualizer shows them) are hidden.
const var DUCK_COL_X = 24 + VIZ_X1 + 12;
const var DUCK_COL_W = W - 24 - 12 - DUCK_COL_X;
const var DUCK_ROW_Y = VIZ_Y + 36;   // under the title DUCK (cePaint): KICK | GRID + division; then RUMBLE | ALL, the two knobs

// the curve and the offset in the visualizer and the node changed (trigger, division, offset)
inline function duckRedraw()
{
	duckBuildStarts();
	pnlViz.repaint();
	if (isDefined(nodeDisplays[4]))
		nodeDisplays[4].repaint();
	Content.getComponent("pnlDuckInfo").repaint();
}
inline function duckTrigIndex() { return duckTrig; }
inline function onDuckTrig(i)
{
	duckTrig = i;
	cmbDuckTrig.setValue(i + 1);
	BvEngine.setAttribute(BV_DUCK_TRIGGER, i);
	pnlDuckDiv.repaint();
	duckRedraw();
}
addSegSwitch("pnlDuckTrig", DUCK_COL_X, DUCK_ROW_Y, DUCK_COL_W - 66, 24, ["KICK", "GRID"], duckTrigIndex, onDuckTrig);
inline function duckDivOn() { return duckTrig == 1; }
inline function duckDivIdx() { return duckDiv; }
inline function duckDivNext()
{
	duckDiv = (duckDiv + 1) % DIVISIONS.length;
	cmbDuckDiv.setValue(duckDiv + 1);
	BvEngine.setAttribute(BV_DUCK_DIVISION, DIVISION_BEATS[duckDiv]);
	duckRedraw();
}
const var pnlDuckDiv = addDivPill("pnlDuckDiv", DUCK_COL_X + DUCK_COL_W - 60, DUCK_ROW_Y, 60, duckDivOn, duckDivIdx, duckDivNext);
const var knbDuckDepth = addKnob("knbDuckDepth", "DEPTH", 0, 0, 0, 100, 85, "Linear", -1, "percent");
// LOW END (2026-10-29, in MIX's place, user: "replace duck mix with ducking the low end"): DUCK
// acts under this frequency, the highs pass; at the top, FULL: the whole band. MIX stays, hidden
// (component ids are append-only); the engine's DuckMix is held at 1.
const var knbDuckMix = addKnob("knbDuckMix", "MIX", 0, 0, 0, 100, 100, "Linear", -1, "percent");
knbDuckMix.set("visible", false);
knbDuckMix.set("saveInPreset", false);
const var knbDuckSplit = addKnob("knbDuckSplit", "LOW END", 0, 0, 40, 2000, 2000, "Frequency", 250, "splitfreq");
place(knbDuckDepth, DUCK_COL_X + (DUCK_COL_W / 2 - KNOB_W) / 2, DUCK_ROW_Y + 70, 0, 0);
place(knbDuckSplit, DUCK_COL_X + DUCK_COL_W / 2 + (DUCK_COL_W / 2 - KNOB_W) / 2, DUCK_ROW_Y + 70, 0, 0);

// the curve's values, read only (edited by the handles), one per line
const var pnlDuckInfo = Content.addPanel("pnlDuckInfo", 0, 0);
pnlDuckInfo.set("width", DISP_W);
pnlDuckInfo.set("height", 76);
pnlDuckInfo.set("saveInPreset", false);
pnlDuckInfo.set("allowCallbacks", "No Callbacks");
pnlDuckInfo.setPaintRoutine(function(g)
{
	var rows = [["LENGTH", DUCK_LENGTHS[duckLenIdx]], ["", ceMs(duckLenSec())], ["POINTS", "" + duckPts.length],
	            ["OFFSET", (duckOffset() > 0.0005 ? "+" : "") + Math.round(duckOffset() * 1000) + " ms"]];
	g.setFontWithSpacing(Theme.FONT_BOLD, 11.5, 0.06);
	for (k = 0; k < rows.length; k++)
	{
		g.setColour(Theme.TEXT_FAINT);
		g.drawAlignedText(rows[k][0], [0, k * 19, this.getWidth(), 18], "left");
		g.setColour(Theme.TEXT);
		g.drawAlignedText(rows[k][1], [0, k * 19, this.getWidth(), 18], "right");
	}
	nodeDisplays[4].repaint();
});
pnlDuckInfo.set("visible", false);
inline function duckTargetIndex() { return duckTarget; }
inline function onDuckTarget(i)
{
	duckTarget = i;
	cmbDuckTarget.setValue(i + 1);
	BvEngine.setAttribute(BV_DUCK_TARGET, i);
	if (isDefined(nodeDisplays[4]))
		nodeDisplays[4].repaint();
}
addSegSwitch("pnlDuckTarget", DUCK_COL_X, DUCK_ROW_Y + 34, DUCK_COL_W, 22, ["RUMBLE", "ALL"], duckTargetIndex, onDuckTarget);

// the curve presets (DUCK_PRESETS): a pick loads one (LENGTH and OFFSET stay); the menu then
// shows its title again (the curve is edited afterwards: no item stays selected)
const var cmbDuckPreset = addCombo("cmbDuckPreset", DUCK_PRESET_NAMES, DUCK_COL_X, VIZ_Y + 6, DUCK_COL_W);
cmbDuckPreset.set("height", 22);
cmbDuckPreset.set("saveInPreset", false);
cmbDuckPreset.set("text", "CURVE PRESETS");
cmbDuckPreset.setValue(0);
cmbDuckPreset.set("visible", false);   // the header's buttons since 2026-10-30 (ids are append-only)
inline function onDuckPreset(component, value)
{
	if (value >= 1)
	{
		duckLoadPreset(DUCK_PRESET_NAMES[value - 1]);
		ceChanged();
		duckStore();
		component.setValue(0);
	}
}
cmbDuckPreset.setControlCallback(onDuckPreset);

// OUTPUT: POL + | -, PHASE, WIDTH, VOLUME, BASS MONO (2026-10-31, user: "add a bass mono knob to the
// output module": under it the output, rumble and dry kick, is mono; 20 = OFF). PHASE (0..360°,
// a rotation of the rumble's low end) and POL line the rumble up with the kick where they overlap, so their sub adds instead of
// cancelling. DRY (its level and power button) moved to the footer's KICK fader and mute: the two
// components stay, hidden (component ids are append-only; they hold older sessions' values), and
// follow the footer.
const var btnOutPol = nodeAdd(5, addSwitch("btnOutPol", "POL +|POL -", 0, 0, DISP_W, 24, 0), DISP_X, SEL_Y);
const var knbDryLevel = addKnob("knbDryLevel", "DRY", 0, 0, -60, 6, 0, "Decibel", -12, "decibel");
const var knbOutPhase = addKnob("knbOutPhase", "PHASE", 0, 0, 0, 360, 0, "Linear", -1, "degrees");
const var knbOutWidth = addKnob("knbOutWidth", "WIDTH", 0, 0, 0, 200, 100, "Linear", -1, "percent");
const var knbOutVolume = addKnob("knbOutVolume", "VOLUME", 0, 0, -60, 6, 0, "Decibel", -12, "decibel");
const var knbOutMono = addKnob("knbOutMono", "BASS MONO", 0, 0, 20, 500, 20, "Frequency", 120, "monofreq");
nodeKnob(5, knbOutPhase, 0);
nodeKnob(5, knbOutWidth, 1);
nodeKnob(5, knbOutVolume, 2);
nodeKnob(5, knbOutMono, 3);
const var btnDryOn = addPower("btnDryOn", 1);
knbDryLevel.set("visible", false);
btnDryOn.set("visible", false);

// EQ (bass emphasis, not the subs): TYPE (since 2026-10-30, user: "add other eq types, eg
// shelf": BELL, LOW SHELF, HIGH SHELF; a shelf's WIDTH is its slope) at FREQ (60..400 Hz) with
// GAIN and WIDTH, and SUB CUT, a high-pass under it so the boost doesn't pile up sub energy
const var EQ_TYPES = ["BELL", "LOW SHELF", "HIGH SHELF"];
const var cmbEqType = nodeAdd(6, addCombo("cmbEqType", EQ_TYPES, 0, 0, DISP_W), DISP_X, SEL_Y);
cmbEqType.set("defaultValue", 1);
nodeKnob(6, addKnob("knbEqFreq", "FREQ", 0, 0, 60, 400, 140, "Frequency", 150, "keyfreq"), 0);
nodeKnob(6, addKnob("knbEqGain", "GAIN", 0, 0, 0, 12, 4, "Decibel", 6, "decibel"), 1);
nodeKnob(6, addKnob("knbEqWidth", "WIDTH", 0, 0, 0.3, 3.0, 1.0, "Linear", 1.0, "int"), 2);
nodeKnob(6, addKnob("knbEqSubCut", "SUB CUT", 0, 0, 20, 80, 35, "Frequency", 40, "freq"), 3);
KNOB_INFO["knbEqWidth"][4] = "";

// LIMITER (the last stage): DRIVE into it, CEILING, RELEASE
nodeKnob(7, addKnob("knbLimDrive", "DRIVE", 0, 0, 0, 12, 0, "Decibel", 4, "decibel"), 0);
nodeKnob(7, addKnob("knbLimCeiling", "CEILING", 0, 0, -12, 0, -0.3, "Decibel", -4, "decibel"), 1);
nodeKnob(7, addKnob("knbLimRelease", "RELEASE", 0, 0, 1, 500, 60, "Time", 80, "time"), 2);

nodeLayout();

// ---------------------------------------------------------------------------
// Control changes: the node's display follows; the duck / output ones also move the visualizer

inline function onNodeCtl(component, value)
{
	local id = component.getId();
	engineSend(id, value);
	if (id == "cmbDlyTime")
		dlyTimeSend();                   // (the combo's index -> beats)
	if (id == "cmbFltType")
		fltCombUpdate();
	if (id == "knbDuckDepth")
		curve.depth = value / 100.0;
	if (id == "knbDuckDepth" || id == "knbDuckSplit" || id == "knbOutPhase" || id == "btnOutPol")
	{
		vizRequestBuild();   // the waveforms once the knob pauses; the curve right away
		pnlViz.repaint();
		pnlDuckInfo.repaint();
	}
	local n = ctlNode[id];
	if (isDefined(n))
		nodeDisplays[n].repaint();
}

for (n = 0; n < 8; n++)
{
	for (nc in nodeControls[n])
	{
		var ct = nc[0].get("type");
		if ((ct == "ScriptSlider" || ct == "ScriptComboBox" || ct == "ScriptButton") && nc[0] != nodePower[n] && nc[0] != btnDryOn)
			nc[0].setControlCallback(onNodeCtl);
	}
}
// DUCK's knobs sit in the visualizer, in no node since 2026-10-30: the loop above misses them
// (DEPTH and LOW END never reached the engine)
knbDuckDepth.setControlCallback(onNodeCtl);
knbDuckSplit.setControlCallback(onNodeCtl);

// ---------------------------------------------------------------------------
// Switched-off controls look disabled (darker, still editable): the sample-only controls in
// EXT, an OFF node's controls (and the node and its display), the DRY knob when DRY is
// off.

const var SRC_SAMPLE_ONLY = ["pnlSrcTrig", "knbSrcTune", "knbSrcDecay", "knbSrcPitch", "knbSrcPitchDec"];

// a panel's paint routine only runs on repaint(); other components redraw on sendRepaintMessage
inline function uiRedraw(c)
{
	if (c.get("type") == "ScriptPanel")
		c.repaint();
	else
		c.sendRepaintMessage();
}

inline function uiDimUpdate()
{
	for (id in SRC_SAMPLE_ONLY)
	{
		uiDim[id] = srcMode == 0;
		uiRedraw(Content.getComponent(id));
	}
	for (n = 0; n < 8; n++)
	{
		local off = nodeOff(n);
		nodePanels[n].data.off = off;
		nodePanels[n].repaint();
		for (nc in nodeControls[n])
		{
			if (nc[0] != nodePower[n])
			{
				uiDim[nc[0].getId()] = off;
				uiRedraw(nc[0]);
			}
		}
	}
	uiDim["knbDryLevel"] = btnDryOn.getValue() < 0.5;
	knbDryLevel.sendRepaintMessage();
	uiDim["sldKick"] = uiDim["knbDryLevel"];
	sldKick.sendRepaintMessage();
	btnKickMute.setValue(btnDryOn.getValue() < 0.5 ? 1 : 0);
	btnKickMute.sendRepaintMessage();
}

inline function onDimSwitch(component, value)
{
	engineSend(component.getId(), value);
	uiDimUpdate();
}
for (n = 0; n < 8; n++)
	if (isDefined(nodePower[n]))
		nodePower[n].setControlCallback(onDimSwitch);
btnDryOn.setControlCallback(onDimSwitch);
uiDimUpdate();

vizBuild();

// the engine starts from the controls' current values
BvEngine.setAttribute(BV_SOURCE, srcMode);
for (i = 0; i < srcKnobs.length; i++)
	srcSend(i, srcKnobs[i].getValue());
BvEngine.setAttribute(BV_TRIGGER, trigMode);
BvEngine.setAttribute(BV_DIVISION, DIVISION_BEATS[trigDiv]);
loadKick();
BvEngine.setAttribute(BV_WINDOW, VIZ_BEATS[vizWindow]);
for (id in ENGINE_CTL)
	engineSend(id, Content.getComponent(id).getValue());
sldKick.setValue(knbDryLevel.getValue());   // (the hidden DRY knob: sessions from before the fader)
engineSend("knbDryLevel", knbDryLevel.getValue());
rumbleSend();                        // (the loop above sent the fader's level, unmuted)
dlyTimeSend();
BvEngine.setAttribute(BV_DUCK_MIX, 1.0);   // (MIX is gone: LOW END took its place)
engineSendOrder();
curve.depth = knbDuckDepth.getValue() / 100.0;
duckRestore(pnlDuckCurve.getValue());   // the stored curve (a preset / session), else TIGHT
duckSend();
// a preset or session loads its curve
inline function onDuckCurveLoad(component, value)
{
	duckRestore(value);
	duckSend();
	duckRedraw();
}
pnlDuckCurve.setControlCallback(onDuckCurveLoad);
BvEngine.setAttribute(BV_DUCK_TRIGGER, duckTrig);
BvEngine.setAttribute(BV_DUCK_TARGET, duckTarget);
BvEngine.setAttribute(BV_DUCK_DIVISION, DIVISION_BEATS[duckDiv]);

// ---------------------------------------------------------------------------
// The hidden state components (see addState): a session, a preset or the host sets one, its
// callback applies it like a click on its switch

inline function stateIndex(value, n) { return Math.range(Math.round(value) - 1, 0, n - 1); }
inline function onStateCombo(component, value)
{
	if (component == cmbSrcMode)
	{
		onSrcMode(stateIndex(value, 2));
		pnlSrcMode.repaint();
		pnlSrcTrig.repaint();
	}
	if (component == cmbSrcTrig)
	{
		onTrigMode(stateIndex(value, 2));
		pnlSrcTrig.repaint();
	}
	if (component == cmbSrcDiv)
	{
		trigDiv = stateIndex(value, DIVISIONS.length);
		BvEngine.setAttribute(BV_DIVISION, DIVISION_BEATS[trigDiv]);
		pnlSrcDiv.repaint();
	}
	if (component == cmbDuckTrig)
	{
		onDuckTrig(stateIndex(value, 2));
		Content.getComponent("pnlDuckTrig").repaint();
	}
	if (component == cmbDuckDiv)
	{
		duckDiv = stateIndex(value, DIVISIONS.length);
		BvEngine.setAttribute(BV_DUCK_DIVISION, DIVISION_BEATS[duckDiv]);
		pnlDuckDiv.repaint();
		duckRedraw();
	}
	if (component == cmbDuckTarget)
	{
		onDuckTarget(stateIndex(value, 2));
		Content.getComponent("pnlDuckTarget").repaint();
		vizRequestBuild();
	}
}
for (c in [cmbSrcMode, cmbSrcTrig, cmbSrcDiv, cmbDuckTrig, cmbDuckDiv, cmbDuckTarget])
	c.setControlCallback(onStateCombo);

// the kick: TUNE is re-sent (KEY: the new kick's note)
inline function onKickIndex(component, value)
{
	kickIndex = KICKS.length > 0 ? Math.range(Math.round(value), 0, KICKS.length - 1) : 0;
	// a user kick plays meanwhile: the factory one waits
	if (!userKickOk)
	{
		loadKick();
		srcSend(0, srcKnobs[0].getValue());
	}
	pnlSrcKick.repaint();
}
knbKickIndex.setControlCallback(onKickIndex);

// the user kick (USER KICKS): its file and folder, then the kick that plays (the factory one if
// there's none or it's missing); TUNE is re-sent (KEY: its note)
inline function onKickFile(component, value)
{
	userKick = isDefined(value) ? "" + value : "";
	userKickScan();
	loadKick();
	srcSend(0, srcKnobs[0].getValue());
	pnlSrcKick.repaint();
}
lblKickFile.setControlCallback(onKickFile);

// The FX order (engineSendOrder's values); anything that isn't a permutation is ignored.
// knbFxOrder (the four nodes without EQ; sessions from before EQ joined have only this one) puts
// them in its order around EQ's slot; when it matches the chain already, nothing changes, so the
// order in which a session restores the two doesn't matter.
inline function onFxOrder(component, value)
{
	local ov = Math.round(value);
	local fo = [];
	for (k = 0; k < 4; k++)
	{
		local m = Math.floor(ov / Math.pow(4, k)) % 4;
		if (fo.indexOf(m) == -1)
			fo.push(m);
	}
	if (fo.length == 4)
	{
		local j = 0;
		local changed = false;
		for (k = 0; k < 6; k++)
		{
			if (fxOrder[k] < 4)
			{
				changed = changed || fxOrder[k] != fo[j];
				fxOrder[k] = fo[j];
				j++;
			}
		}
		if (changed)
			nodeLayout();
	}
}
knbFxOrder.setControlCallback(onFxOrder);

// knbChainOrder: the whole chain (module 4 = EQ, node 6; 5 = GRAIN, node 4); a value from before
// GRAIN (five slots: none above bit 15) puts it last (the engine's decodeChainOrder does the same)
inline function chainDecode(cv, n)
{
	local co = [];
	for (k = 0; k < n; k++)
	{
		local m = Math.floor(cv / Math.pow(8, k)) % 8;
		local cn = m == 4 ? 6 : (m == 5 ? 4 : m);
		if (m < n && co.indexOf(cn) == -1)
			co.push(cn);
	}
	return co.length == n && Math.floor(cv / Math.pow(8, n)) == 0 ? co : [];
}
inline function onChainOrder(component, value)
{
	local cv = Math.round(value);
	local co = chainDecode(cv, 6);
	if (co.length == 0)
	{
		co = chainDecode(cv, 5);
		if (co.length == 5)
			co.push(4);
	}
	if (co.length == 6)
	{
		for (k = 0; k < 6; k++)
			fxOrder[k] = co[k];
		nodeLayout();
	}
}

knbChainOrder.setControlCallback(onChainOrder);

// KEY: the kick's TUNE and EQ FREQ follow it
inline function onKey(component, value)
{
	keyRoot = Math.round(value) - 2;     // item 1 OFF -> -1, 2 C -> 0 .. 13 B -> 11
	srcSend(0, srcKnobs[0].getValue());
	engineSend("knbEqFreq", Content.getComponent("knbEqFreq").getValue());
	Content.getComponent("knbEqFreq").sendRepaintMessage();
	fltCombUpdate();
	nodeDisplays[6].repaint();
	pnlSrcKick.repaint();
}
cmbKey.setControlCallback(onKey);

// ---------------------------------------------------------------------------
// Host (plugin) parameters (2026-10-29). The DAW lists them in the components' order (the
// script's, after the components are recreated: see the root CLAUDE.md on stacking); names,
// ranges and items are append-only (see CLAUDE.md). Not host parameters: the duck curve
// (pnlDuckCurve), the FX order, the kick (the set grows), the visualizer's zoom.
const var HOST_PARAMS = [["cmbSrcMode", "Source"], ["cmbSrcTrig", "Kick Trigger"], ["cmbSrcDiv", "Kick Division"],
                         ["cmbDuckTrig", "Duck Trigger"], ["cmbDuckDiv", "Duck Division"], ["cmbDuckTarget", "Duck Target"],
                         ["cmbKey", "Key"],
                         ["sldKick", "Kick Level"], ["sldRumble", "Rumble Level"], ["btnRumbleMute", "Rumble Mute"],
                         ["sldSend", "Send Gate"],
                         ["knbSrcTune", "Tune"], ["knbSrcDecay", "Decay"], ["knbSrcPitch", "Pitch"],
                         ["knbSrcPitchDec", "Pitch Decay"], ["knbSrcDrive", "Drive"], ["knbSrcLevel", "Level"],
                         ["btnFx0On", "Filter On"], ["cmbFltType", "Filter Type"], ["knbFltCutoff", "Filter Cutoff"],
                         ["knbFltReso", "Filter Resonance"], ["knbFltEnv", "Filter Env"], ["knbFltEnvDec", "Filter Env Decay"],
                         ["btnFx1On", "Dist On"], ["cmbDstMode", "Dist Mode"], ["knbDstDrive", "Dist Drive"],
                         ["knbDstTone", "Dist Tone"], ["knbDstMix", "Dist Mix"],
                         ["btnFx2On", "Delay On"], ["cmbDlyTime", "Delay Time"], ["btnDlyPing", "Delay Ping-Pong"],
                         ["knbDlyFeedback", "Delay Feedback"], ["knbDlyLowCut", "Delay Low Cut"],
                         ["knbDlyHighCut", "Delay High Cut"], ["knbDlyMix", "Delay Mix"], ["knbDlySwing", "Delay Swing"],
                         ["btnFx3On", "Reverb On"], ["cmbRvbType", "Reverb Type"], ["knbRvbSize", "Reverb Size"],
                         ["knbRvbDamp", "Reverb Damp"], ["knbRvbWidth", "Reverb Width"], ["knbRvbMix", "Reverb Mix"],
                         ["knbDuckDepth", "Duck Depth"], ["knbDuckSplit", "Duck Low End"],
                         ["btnOutPol", "Polarity"], ["knbOutPhase", "Phase"], ["knbOutWidth", "Width"],
                         ["knbOutVolume", "Volume"], ["btnDryOn", "Kick On"],
                         ["btnEqOn", "EQ On"], ["cmbEqType", "EQ Type"], ["knbEqFreq", "EQ Freq"], ["knbEqGain", "EQ Gain"],
                         ["knbEqWidth", "EQ Width"], ["knbEqSubCut", "EQ Sub Cut"],
                         ["btnLimOn", "Limiter On"], ["knbLimDrive", "Limiter Drive"],
                         ["knbLimCeiling", "Limiter Ceiling"], ["knbLimRelease", "Limiter Release"],
                         ["btnGrnOn", "Grain On"], ["cmbGrnMode", "Grain Mode"], ["knbGrnSize", "Grain Size"],
                         ["knbGrnDensity", "Grain Density"], ["knbGrnSpray", "Grain Spray"], ["knbGrnMix", "Grain Mix"],
                         ["knbOutMono", "Bass Mono"]];
for (hp in HOST_PARAMS)
{
	var hc = Content.getComponent(hp[0]);
	hc.set("isPluginParameter", true);
	hc.set("pluginParameterName", hp[1]);
}

// ---------------------------------------------------------------------------
// RANDOM (2026-10-29): the dice in the header. Click = a new sound, shift-click = MUTATE (each
// knob of the list moves up to +-7 % of its travel from where it is; LOW END stays at FULL). The arrow left of it
// undoes the last rolls (up to 8). It changes the sound, not the setup: the FX chain (each
// module's knobs, type and power, and the order), EQ, DUCK's curve, LENGTH, DEPTH and LOW END.
// Never SOURCE, KEY, SEND GATE, DUCK's trigger / TARGET, the levels, OUTPUT or the LIMITER.
// RAND_KNOBS: musical ranges (drawn along each knob's own scaling, so frequencies spread
// evenly); RAND_COMBOS: the items allowed (1-based); RAND_POWER: how often a module is on.
const var RAND_KNOBS = {"knbFltCutoff": [60, 2000], "knbFltReso": [0, 60], "knbFltEnv": [-40, 80],
                        "knbFltEnvDec": [30, 600],
                        "knbDstDrive": [10, 70], "knbDstTone": [800, 8000], "knbDstMix": [40, 100],
                        "knbDlyFeedback": [20, 70], "knbDlyLowCut": [20, 200], "knbDlyHighCut": [800, 6000],
                        "knbDlyMix": [20, 80],
                        "knbRvbSize": [40, 90], "knbRvbDamp": [20, 80], "knbRvbWidth": [0, 80], "knbRvbMix": [40, 100],
                        "knbEqFreq": [60, 200], "knbEqGain": [0, 8], "knbEqWidth": [0.5, 2.0], "knbEqSubCut": [20, 50],
                        "knbDuckDepth": [50, 100], "knbDuckSplit": [80, 600],
                        "knbGrnSize": [30, 250], "knbGrnDensity": [8, 60], "knbGrnSpray": [20, 600], "knbGrnMix": [20, 70]};
const var RAND_COMBOS = {"cmbFltType": [1, 2, 2, 3, 4, 5, 7, 7, 8, 8, 9, 10], "cmbDstMode": [1, 2, 3, 4],
                         "cmbDlyTime": [3, 6, 7, 9],      // 1/16, 1/8, 1/8D, 1/4
                         "cmbRvbType": [1, 2, 3, 4, 5], "cmbGrnMode": [1, 1, 2, 2, 3, 4, 5],
                         "cmbEqType": [1, 1, 2, 3]};
const var RAND_POWER = {"btnFx0On": 0.8, "btnFx1On": 0.6, "btnFx2On": 0.5, "btnFx3On": 0.8, "btnEqOn": 0.7,
                        "btnDlyPing": 0.5, "btnGrnOn": 0.35};
const var RAND_SPLIT_FULL = 0.5;          // LOW END: how often FULL (the whole band)
const var RAND_LENGTHS = [3];             // DUCK LENGTH: 1/4 only since 2026-10-30 (DUCK_LEN_FIXED)
const var RAND_MUTATE = 0.07;        // of a knob's travel (0.15 took CUTOFF 400 -> 86 Hz: too far)
// RECIPES (2026-10-31, user: "more sensible randomizer, make sure rumble outputs sound"): a new
// sound first picks one (by weight, among those the locks allow): the modules it turns on,
// FILTER's types, order rules ([a, b] = a before b, ChainOrder codes) and narrower knob ranges.
// Each has a tail (REVERB, or DELAY with feedback): without one the rumble was the filtered kick
// itself, and DUCK pulled it down under the kick. The other modules are rolled as before.
const var RAND_LP_TYPES = [1, 2, 2, 7, 7, 8, 9];     // LP 12, LP 24, LADDER, DIODE, DIRTY
const var RAND_RECIPES = [
	{"name": "CLASSIC", "weight": 3, "on": [3, 0], "types": RAND_LP_TYPES, "after": [[3, 0]],
	 "knobs": {"knbRvbMix": [60, 100], "knbRvbSize": [50, 90]}},
	{"name": "DRIVEN", "weight": 2, "on": [3, 1, 0], "types": RAND_LP_TYPES, "after": [[3, 0], [1, 0]],
	 "knobs": {"knbRvbMix": [60, 100], "knbDstDrive": [30, 70]}},
	{"name": "ECHO", "weight": 1, "on": [2, 0], "types": [1, 2, 3, 4, 7, 8, 10], "after": [[2, 0]],
	 "knobs": {"knbDlyFeedback": [45, 75], "knbDlyMix": [50, 90]}},
	{"name": "HAZE", "weight": 1, "on": [3, 5], "after": [[3, 5]],
	 "knobs": {"knbRvbMix": [60, 100], "knbGrnDensity": [15, 60], "knbGrnMix": [30, 70]}},
	{"name": "TONAL", "weight": 1, "on": [3, 0], "types": [3, 4, 10], "after": [[3, 0]],
	 "knobs": {"knbRvbMix": [60, 100], "knbFltReso": [30, 70]}}];
const var RAND_NO_RECIPE = {"name": "", "weight": 0, "on": [], "after": [], "knobs": {}};
// CUTOFF by FILTER TYPE (item 1..10): the low passes keep the kick's body, BP sits on it, HP only
// cleans the sub (an HP or BP at 1..2 kHz left almost nothing of a kick); COMB snaps to KEY anyway
const var RAND_FLT_CUTOFF = [[100, 1500], [100, 1500], [60, 250], [60, 250], [20, 60], [20, 60],
                             [100, 1500], [100, 1500], [100, 1500], [40, 200]];
const var RAND_FLT_FLOOR = 50;            // Hz: a negative ENV takes CUTOFF no lower (but HP)
const var RAND_DUCK_HARD = ["LONG", "GATE", "CHOP"];   // curves that hold the rumble down for most of the beat (CHOP: four times)
const var RAND_DUCK_HARD_MAX = 85;        // their DEPTH at most
const var RAND_POWER_IDS = ["btnFx0On", "btnFx1On", "btnFx2On", "btnFx3On", "btnEqOn", "btnGrnOn"];
var randLastRecipe = "";                  // (for tests: the last roll's recipe)
const var RAND_UNDO_MAX = 8;
const var randUndo = [];                  // snapshots, the last roll's at the end

// a knob's value <-> its position 0..1 (JUCE's skew from middlePosition, as the knob's travel)
inline function randSkew(c)
{
	local lo = c.get("min");
	local hi = c.get("max");
	return Math.log(0.5) / Math.log(Math.range((c.get("middlePosition") - lo) / (hi - lo), 0.001, 0.999));
}
inline function randToNorm(c, v)
{
	local lo = c.get("min");
	local hi = c.get("max");
	return Math.pow(Math.range((v - lo) / (hi - lo), 0.0, 1.0), randSkew(c));
}
inline function randFromNorm(c, n)
{
	local lo = c.get("min");
	local hi = c.get("max");
	local v = lo + (hi - lo) * Math.pow(Math.range(n, 0.0, 1.0), 1.0 / randSkew(c));
	local step = c.get("stepSize");
	if (step > 0)
		v = Math.round(v / step) * step;
	return Math.range(v, lo, hi);
}

// sets a control as a click would: the value, then its callback (the engine, the displays)
inline function randSet(id, v)
{
	local c = Content.getComponent(id);
	c.setValue(v);
	c.changed();
}

inline function randSnapshot()
{
	local s = {"values": {}, "curve": pnlDuckCurve.getValue(), "order": knbChainOrder.getValue()};
	for (rid in RAND_KNOBS)
		s.values[rid] = Content.getComponent(rid).getValue();
	for (rid in RAND_COMBOS)
		s.values[rid] = Content.getComponent(rid).getValue();
	for (rid in RAND_POWER)
		s.values[rid] = Content.getComponent(rid).getValue();
	randUndo.push(s);
	if (randUndo.length > RAND_UNDO_MAX)
		randUndo.removeElement(0);
}

// LOCKS (2026-10-30, user: "add lock to modules (everything that's randomizable). locked modules
// are no longer randomized"): one per module RANDOM touches, by ChainOrder code (0 FILTER, 1 DIST,
// 2 DELAY, 3 REVERB, 4 EQ, 5 GRAIN) plus 6 DUCK (DEPTH, LOW END, the curve). A locked module keeps
// its controls and its slot in the chain (the others are shuffled into the remaining slots).
// Drawn in the node's bottom right corner (user) and at the end of DUCK's title line. Not saved
// (like RANDOM's undo): pnlLock0..6.
const var LOCK_NODE = [0, 1, 2, 3, 6, 4];    // ChainOrder code -> node index (NODE_NAMES)
const var randLocked = [false, false, false, false, false, false, false];
const var lockPanels = [];

// the module (ChainOrder code, 6 DUCK) a RANDOM control belongs to
inline function randModuleOf(id)
{
	local tags = [["Flt", "btnFx0On"], ["Dst", "btnFx1On"], ["Dly", "btnFx2On"], ["Rvb", "btnFx3On"], ["Eq", "btnEqOn"],
	              ["Grn", "btnGrnOn"], ["Duck", "Duck"]];
	for (rm = 0; rm < tags.length; rm++)
	{
		if (id.indexOf(tags[rm][0]) != -1 || id == tags[rm][1])
			return rm;
	}
	return -1;
}
inline function randFree(id) { return randModuleOf(id) == -1 || !randLocked[randModuleOf(id)]; }

for (lk = 0; lk < 7; lk++)
{
	var lp = Content.addPanel("pnlLock" + lk, 0, 0);
	lp.set("width", 14);
	lp.set("height", 16);
	lp.set("saveInPreset", false);
	lp.set("allowCallbacks", "Clicks & Hover");
	lp.set("tooltip", "LOCK: RANDOM leaves this module alone");
	lp.setMouseCursor("PointingHandCursor", Colours.white, [0, 0]);
	lp.data.mod = lk;
	lp.data.hover = false;
	lp.setPaintRoutine(function(g)
	{
		var lkOn = randLocked[this.data.mod];
		g.setColour(lkOn ? Theme.TEXT : (this.data.hover ? Theme.TEXT_DIM : 0x60F4F4F6));
		// the body, then the shackle (open: lifted, its right leg free)
		g.fillRoundedRectangle([2, 7, 10, 8], 1.5);
		var lkPath = Content.createPath();
		lkPath.startNewSubPath(0, 0);
		lkPath.startNewSubPath(14, 16);
		lkPath.startNewSubPath(4, 7);
		lkPath.lineTo(4, lkOn ? 4.5 : 3);
		lkPath.quadraticTo(4, lkOn ? 1.5 : 0, 7, lkOn ? 1.5 : 0);
		lkPath.quadraticTo(10, lkOn ? 1.5 : 0, 10, lkOn ? 4.5 : 3);
		if (lkOn)
			lkPath.lineTo(10, 7);
		g.drawPath(lkPath, [0, 0, 14, 16], 1.4);
	});
	lp.setMouseCallback(function(event)
	{
		if (event.hover != this.data.hover)
		{
			this.data.hover = event.hover;
			this.repaint();
		}
		if (event.clicked)
		{
			randLocked[this.data.mod] = !randLocked[this.data.mod];
			this.repaint();
		}
	});
	lockPanels.push(lp);
	if (lk < 6)
		nodeAdd(LOCK_NODE[lk], lp, NODE_W - 20, NODE_H - 22);
}
lockPanels[6].set("x", DUCK_COL_X + DUCK_COL_W - 14);
lockPanels[6].set("y", VIZ_Y + 9);
nodeLayout();

inline function randOn(code) { return Content.getComponent(RAND_POWER_IDS[code]).getValue() > 0.5; }

// a new sound's recipe: by weight among those the locks allow (a locked module that is off, or a
// locked FILTER of another type, rules one out); none fits: RAND_NO_RECIPE
inline function randPickRecipe()
{
	local fit = [];
	local total = 0;
	for (rrc in RAND_RECIPES)
	{
		local ok = true;
		for (rrm in rrc.on)
			if (randLocked[rrm] && !randOn(rrm))
				ok = false;
		if (isDefined(rrc.types) && randLocked[0] && rrc.types.indexOf(Math.round(kv("cmbFltType"))) == -1)
			ok = false;
		if (ok)
		{
			fit.push(rrc);
			total += rrc.weight;
		}
	}
	local r = Math.random() * total;
	for (rrc in fit)
	{
		r -= rrc.weight;
		if (r < 0)
			return rrc;
	}
	return fit.length > 0 ? fit[fit.length - 1] : RAND_NO_RECIPE;
}

// a knob's range in a new sound: the recipe's, CUTOFF's by FILTER TYPE, else RAND_KNOBS
inline function randRangeOf(rid, rc)
{
	if (isDefined(rc.knobs[rid]))
		return rc.knobs[rid];
	if (rid == "knbFltCutoff")
		return RAND_FLT_CUTOFF[Math.range(Math.round(kv("cmbFltType")) - 1, 0, RAND_FLT_CUTOFF.length - 1)];
	return RAND_KNOBS[rid];
}

inline function randRoll(mutate)
{
	randSnapshot();
	local rc = RAND_NO_RECIPE;
	if (!mutate)
	{
		// the recipe, then the combos (CUTOFF's range follows TYPE)
		rc = randPickRecipe();
		randLastRecipe = rc.name;
		for (rid in RAND_COMBOS)
		{
			if (!randFree(rid))
				continue;
			local items = (rid == "cmbFltType" && isDefined(rc.types)) ? rc.types : RAND_COMBOS[rid];
			randSet(rid, items[Math.floor(Math.random() * items.length)]);
		}
	}
	for (rid in RAND_KNOBS)
	{
		if (!randFree(rid))
			continue;
		local c = Content.getComponent(rid);
		local r = randRangeOf(rid, rc);
		local n = 0.0;
		if (mutate)
			n = randToNorm(c, c.getValue()) + (Math.random() * 2.0 - 1.0) * RAND_MUTATE;
		else
			n = randToNorm(c, r[0]) + Math.random() * (randToNorm(c, r[1]) - randToNorm(c, r[0]));
		local v = randFromNorm(c, n);
		if (rid == "knbDuckSplit" && !mutate && Math.random() < RAND_SPLIT_FULL)
			v = c.get("max");             // FULL
		if (rid == "knbDuckSplit" && mutate && c.getValue() >= c.get("max"))
			v = c.get("max");             // (FULL stays FULL: leaving it is a big change)
		randSet(rid, v);
	}
	if (!mutate)
	{
		// power: the recipe's modules on, the others by chance
		for (rid in RAND_POWER)
			if (randFree(rid))
				randSet(rid, (rc.on.indexOf(RAND_POWER_IDS.indexOf(rid)) != -1 || Math.random() < RAND_POWER[rid]) ? 1 : 0);
		// there is always a tail (no recipe fitted the locks): REVERB, else DELAY
		if (!randOn(3) && !randOn(2))
		{
			if (!randLocked[3])
				randSet("btnFx3On", 1);
			else if (!randLocked[2])
				randSet("btnFx2On", 1);
		}
		// DELAY as the only tail: repeats that last and are heard
		if (randOn(2) && !randOn(3) && !randLocked[2])
		{
			randSet("knbDlyFeedback", Math.max(kv("knbDlyFeedback"), 45));
			randSet("knbDlyMix", Math.max(kv("knbDlyMix"), 50));
		}
		// FILTER: a negative ENV takes CUTOFF no lower than RAND_FLT_FLOOR (HP: lower only opens it)
		local ft = Math.round(kv("cmbFltType"));
		if (!randLocked[0] && ft != 5 && ft != 6 && kv("knbFltCutoff") > RAND_FLT_FLOOR)
		{
			local envMin = 100.0 * Math.log(RAND_FLT_FLOOR / kv("knbFltCutoff")) / Math.log(2.0) / 7.0;
			if (kv("knbFltEnv") < envMin)
				randSet("knbFltEnv", Math.ceil(envMin));
		}
		// EQ's SUB CUT under a low LP keeps a band to pass
		if (!randLocked[4] && randOn(0) && RAND_LP_TYPES.indexOf(ft) != -1 && kv("knbFltCutoff") < 150)
			randSet("knbEqSubCut", Math.min(kv("knbEqSubCut"), 35));
		// there is always a rumble: one of FILTER, DIST, DELAY, REVERB on
		local anyOn = false;
		for (rk = 0; rk < 4; rk++)
			anyOn = anyOn || Content.getComponent("btnFx" + rk + "On").getValue() > 0.5;
		local freeFx = [];                // (one of the unlocked ones; all four locked: as they are)
		for (rk = 0; rk < 4; rk++)
			if (!randLocked[rk])
				freeFx.push(rk);
		if (!anyOn && freeFx.length > 0)
			randSet("btnFx" + freeFx[Math.floor(Math.random() * freeFx.length)] + "On", 1);
		// the duck curve: a preset and LENGTH (OFFSET stays)
		if (!randLocked[6])
		{
			local pts = [];
			local dn = DUCK_PRESET_NAMES[Math.floor(Math.random() * DUCK_PRESET_NAMES.length)];
			for (rpt in DUCK_PRESETS[dn])
				pts.push([rpt[0], rpt[1], rpt[2]]);
			pnlDuckCurve.setValue({"points": pts, "length": RAND_LENGTHS[Math.floor(Math.random() * RAND_LENGTHS.length)], "offset": curve.offset});
			pnlDuckCurve.changed();
			if (RAND_DUCK_HARD.indexOf(dn) != -1 && kv("knbDuckDepth") > RAND_DUCK_HARD_MAX)
				randSet("knbDuckDepth", RAND_DUCK_HARD_MAX);
		}
		// the chain order: the unlocked modules shuffled into the slots the locked ones leave
		// (ChainOrder codes: FILTER 0 .. REVERB 3, EQ 4, GRAIN 5; chainDecode gives node indices)
		local cur = [0, 1, 2, 3, 4, 5];
		local dec = chainDecode(Math.round(knbChainOrder.getValue()), 6);
		if (dec.length == 6)
		{
			for (rk = 0; rk < 6; rk++)
				cur[rk] = LOCK_NODE.indexOf(dec[rk]);
		}
		local mods = [];
		for (rk = 0; rk < 6; rk++)
			if (!randLocked[cur[rk]])
				mods.push(cur[rk]);
		local slots = [];
		for (rk = 0; rk < 6; rk++)
		{
			local m = cur[rk];
			if (!randLocked[m])
			{
				local pick = Math.floor(Math.random() * mods.length);
				m = mods[pick];
				mods.removeElement(pick);
			}
			slots.push(m);
		}
		// the recipe's order rules (a before b), where both may move; a few passes for two rules
		for (rpass = 0; rpass < 3; rpass++)
		{
			for (rule in rc.after)
			{
				local ia = slots.indexOf(rule[0]);
				local ib = slots.indexOf(rule[1]);
				if (ia > ib && !randLocked[rule[0]] && !randLocked[rule[1]])
				{
					slots[ia] = rule[1];
					slots[ib] = rule[0];
				}
			}
		}
		local cv = 0;
		for (rk = 0; rk < 6; rk++)
			cv += slots[rk] * Math.pow(8, rk);
		randSet("knbChainOrder", cv);
	}
}

inline function randUndoLast()
{
	if (randUndo.length > 0)
	{
		local s = randUndo[randUndo.length - 1];
		randUndo.removeElement(randUndo.length - 1);
		for (rid in s.values)
			randSet(rid, s.values[rid]);
		pnlDuckCurve.setValue(s.curve);
		pnlDuckCurve.changed();
		randSet("knbChainOrder", s.order);
	}
}

// the two buttons: a dice (five pips) and, right of it, an undo arrow, in the header left of the preset box
inline function addHeaderButton(name, x, tip)
{
	local p = Content.addPanel(name, x, Y_HEADER / 2 - 18);
	p.set("width", 36);
	p.set("height", 36);
	p.set("saveInPreset", false);
	p.set("allowCallbacks", "Clicks & Hover");
	p.set("tooltip", tip);
	p.data.hover = false;
	return p;
}
const var pnlDice = addHeaderButton("pnlDice", 440 - 8 - 36 - 4 - 36, "RANDOM: a new sound (shift-click: MUTATE, small changes)");
const var pnlRandUndo = addHeaderButton("pnlRandUndo", 440 - 8 - 36, "UNDO the last random roll");

inline function paintHeaderButton(g, p, on)
{
	g.setColour(p.data.hover && on ? 0xFF1E2024 : 0xFF16171A);
	g.fillRoundedRectangle([0, 0, 36, 36], 3.0);
	g.setColour(Theme.LINE);
	g.drawRoundedRectangle([0.5, 0.5, 35, 35], 3.0, 1.0);
	g.setColour(!on ? 0xFF3A3C42 : (p.data.hover ? Theme.TEXT : Theme.TEXT_DIM));
}
pnlDice.setPaintRoutine(function(g)
{
	// black on white: RANDOM should catch the eye
	g.setColour(this.data.hover ? 0xFFFFFFFF : 0xFFE8E8EA);
	g.fillRoundedRectangle([0, 0, 36, 36], 3.0);
	g.setColour(0xFF08090B);
	g.drawRoundedRectangle([9.5, 9.5, 17, 17], 3.0, 1.4);
	for (pip in [[13, 13], [23, 13], [18, 18], [13, 23], [23, 23]])
		g.fillEllipse([pip[0] - 1.6, pip[1] - 1.6, 3.2, 3.2]);
});
pnlRandUndo.setPaintRoutine(function(g)
{
	paintHeaderButton(g, this, randUndo.length > 0);
	// a hooked arrow pointing left
	var up = Content.createPath();
	up.startNewSubPath(0, 0);
	up.startNewSubPath(36, 36);
	up.startNewSubPath(12, 15);
	up.lineTo(21, 15);
	up.quadraticTo(26, 15, 26, 20);
	up.quadraticTo(26, 25, 21, 25);
	up.lineTo(15, 25);
	up.startNewSubPath(15, 11);
	up.lineTo(11, 15);
	up.lineTo(15, 19);
	g.drawPath(up, [0, 0, 36, 36], 1.5);
});
inline function onHeaderButtonMouse(p, event)
{
	if (event.hover != p.data.hover)
	{
		p.data.hover = event.hover;
		p.repaint();
	}
	if (event.clicked)
	{
		if (p == pnlDice)
			randRoll(event.shiftDown);
		else
			randUndoLast();
		pnlRandUndo.repaint();
	}
}
pnlDice.setMouseCallback(function(event) { onHeaderButtonMouse(this, event); });
pnlRandUndo.setMouseCallback(function(event) { onHeaderButtonMouse(this, event); });

// ---------------------------------------------------------------------------
// BOUNCE (2026-10-30; user: drag the sound into the host; "in the envelope header", "keep the
// normal button size, having the button white is enough", "always 1 bar", what to bounce "in a
// drop down, default to rumble"). At the right end of the visualizer's top row: cmbBounceStem
// (RUMBLE / KICK / MIX), then the white BOUNCE button. A mouse down on it has the engine write
// the last complete bar of the output (it records all the time; bv_engine.h's header), then the
// file is renamed after the preset, the stem, the tempo and KEY and dragged out. Nothing recorded
// yet (or silence): the button says PLAY FIRST. Files stay in AppData/Bounces (a host may only
// reference them). The stems: bv_engine.h's header (RUMBLE + KICK = MIX before the LIMITER).
const var BV_BOUNCE = 83;            // 0 -> 1: the engine writes Bounces/_bounce.wav
const var BV_BOUNCE_BARS = 84;
const var BV_BOUNCE_STEM = 85;        // 0 RUMBLE, 1 KICK, 2 MIX (cmbBounceStem's order)
const var BOUNCE_BARS = 1;
const var BOUNCE_STEMS = ["RUMBLE", "KICK", "MIX"];
const var bounceDir = FileSystem.getFolder(FileSystem.AppData).getChildFile("Bounces");
// in the header (2026-10-31, was the visualizer's top right): the stem combo and BOUNCE, left of KEY
const var BOUNCE_W = 90;
const var BOUNCE_H = 26;
const var BOUNCE_X = KEY_X - 52 - BOUNCE_W;   // 20 px before KEY's label

const var cmbBounceStem = addCombo("cmbBounceStem", BOUNCE_STEMS, BOUNCE_X - 8 - 80, Y_HEADER / 2 - 13, 80);
cmbBounceStem.set("height", BOUNCE_H);
cmbBounceStem.set("saveInPreset", false);
cmbBounceStem.set("tooltip", "What BOUNCE drags out: the RUMBLE, the KICK or the whole MIX");

const var pnlBounce = Content.addPanel("pnlBounce", BOUNCE_X, Y_HEADER / 2 - 13);
pnlBounce.set("width", BOUNCE_W);
pnlBounce.set("height", BOUNCE_H);
pnlBounce.set("saveInPreset", false);
pnlBounce.set("allowCallbacks", "Clicks, Hover & Dragging");
pnlBounce.set("tooltip", "BOUNCE: drag the last bar into your DAW");
pnlBounce.data.hover = false;
pnlBounce.data.fail = false;         // PLAY FIRST, for a moment
pnlBounce.data.file = undefined;     // the file of this mouse down
pnlBounce.data.dragged = false;

// "Blackveil_Deep-Tunnel_RUMBLE_128bpm_F"
inline function bounceName()
{
	local cur = pbCurrent();
	local nm = cur != undefined ? cur.name : Engine.getCurrentUserPresetName();
	if (nm == "")
		nm = "Init";
	for (ch in [" ", "/", "\\", ":", "*", "?", "\"", "<", ">", "|"])
		nm = nm.replace(ch, "-");
	local s = "Blackveil_" + nm + "_" + cmbBounceStem.getItemText() + "_" + Math.round(Engine.getHostBpm()) + "bpm";
	if (keyRoot >= 0)
		s += "_" + cmbKey.getItemText().replace("#", "s");
	return s;
}

// the bounce as a file of its own (never overwritten: a DAW may still use an older one)
inline function bounceRender()
{
	BvEngine.setAttribute(BV_BOUNCE_BARS, BOUNCE_BARS);
	BvEngine.setAttribute(BV_BOUNCE_STEM, cmbBounceStem.getValue() - 1);
	BvEngine.setAttribute(BV_BOUNCE, 0);
	BvEngine.setAttribute(BV_BOUNCE, 1);
	BvEngine.setAttribute(BV_BOUNCE, 0);   // (so the project saves 0)
	local src = bounceDir.getChildFile("_bounce.wav");
	if (!src.isFile())
		return undefined;
	local dst = bounceDir.getChildFile(bounceName() + ".wav");
	if (dst.isFile())
		dst = dst.getNonExistentSibling();
	if (!src.move(dst))
		return undefined;
	return dst;
}

// the drag icon (user's reference): four arrows out of a dot, around cx, cy
// (panel w x h: fillPath's anchors)
inline function bounceIcon(g, w, h, cx, cy)
{
	local r = 7.0;       // arrow tip from the centre
	local hd = 2.8;      // head: depth, and half its base
	local p = Content.createPath();
	p.startNewSubPath(0, 0);
	p.startNewSubPath(w, h);
	p.startNewSubPath(cx, cy - r);
	p.lineTo(cx + hd, cy - r + hd);
	p.lineTo(cx - hd, cy - r + hd);
	p.closeSubPath();
	p.startNewSubPath(cx, cy + r);
	p.lineTo(cx - hd, cy + r - hd);
	p.lineTo(cx + hd, cy + r - hd);
	p.closeSubPath();
	p.startNewSubPath(cx - r, cy);
	p.lineTo(cx - r + hd, cy + hd);
	p.lineTo(cx - r + hd, cy - hd);
	p.closeSubPath();
	p.startNewSubPath(cx + r, cy);
	p.lineTo(cx + r - hd, cy - hd);
	p.lineTo(cx + r - hd, cy + hd);
	p.closeSubPath();
	g.fillPath(p, [0, 0, w, h]);
	g.fillRect([cx - 0.6, cy - r + hd - 0.5, 1.2, 2 * (r - hd) + 1]);
	g.fillRect([cx - r + hd - 0.5, cy - 0.6, 2 * (r - hd) + 1, 1.2]);
	g.fillEllipse([cx - 1.9, cy - 1.9, 3.8, 3.8]);
}

// white, the drag icon and BOUNCE
pnlBounce.setPaintRoutine(function(g)
{
	g.setColour(this.data.hover ? 0xFFFFFFFF : 0xFFDCDDE1);
	g.fillRoundedRectangle([0, 0, BOUNCE_W, BOUNCE_H], 3.0);
	g.setColour(0xFF0B0C0E);
	g.setFontWithSpacing(Theme.FONT_BOLD, 11.5, 0.12);
	if (this.data.fail)
	{
		g.drawAlignedText("PLAY FIRST", [0, 0, BOUNCE_W, BOUNCE_H], "centred");
		return;
	}
	bounceIcon(g, BOUNCE_W, BOUNCE_H, 17, BOUNCE_H / 2);
	g.drawAlignedText("BOUNCE", [30, 0, BOUNCE_W - 34, BOUNCE_H], "left");
});

pnlBounce.setTimerCallback(function()
{
	this.data.fail = false;
	this.stopTimer();
	this.repaint();
});

pnlBounce.setMouseCallback(function(event)
{
	if (event.hover != this.data.hover)
	{
		this.data.hover = event.hover;
		this.repaint();
	}
	if (event.clicked)
	{
		this.data.dragged = false;
		this.data.file = bounceRender();
		if (this.data.file == undefined)
		{
			this.data.fail = true;
			this.startTimer(1500);
			this.repaint();
		}
	}
	if (event.drag && !this.data.dragged && this.data.file != undefined)
	{
		this.data.dragged = true;
		this.startExternalFileDrag(this.data.file, false, undefined);
	}
});

// ---------------------------------------------------------------------------
// GRIT (2026-10-30, user: "ways to add grain/texture?" -> a bit crusher and a noise layer).
// Before the PRESETS block (its browser stays the last component, on top); the host parameters
// follow the component ids, not their order (see the root CLAUDE.md), and join HOST_PARAMS.
// CRUSH: DIST's fourth knob, a rate and bit reducer after the curve (0 = off; RANDOM rolls it
// low). NOISE (footer, after SEND GATE): band-limited noise into the FX chain at the kick's
// envelope, so it lives with each kick and the chain smears it into texture; COLOR its band.
const var knbDstCrush = addKnob("knbDstCrush", "CRUSH", 0, 0, 0, 100, 0, "Linear", -1, "percent");
nodeKnob(1, knbDstCrush, 3);
knbDstCrush.setControlCallback(onNodeCtl);
ENGINE_CTL["knbDstCrush"] = [BV_DIST_CRUSH, 0.01];
RAND_KNOBS["knbDstCrush"] = [0, 30];

const var NOISE_X = 24 + FDR_W + 20 + 36;
const var sldNoise = addFader("sldNoise", "NOISE", NOISE_X);
sldNoise.set("width", FDR_W - 26);
sldNoise.set("max", 0);
sldNoise.set("defaultValue", -60);
sldNoise.set("middlePosition", -18);
sldNoise.set("tooltip", "NOISE: noise into the FX chain, following each kick (OFF at the bottom)");
sldNoise.setValue(-60);
sldNoise.setControlCallback(onFader);
ENGINE_CTL["sldNoise"] = [BV_NOISE_LEVEL, 1.0];

const var cmbNoiseColor = addCombo("cmbNoiseColor", ["DARK", "MID", "AIR"], NOISE_X + FDR_W - 26 + 8, FDR_Y + 3, 72);
cmbNoiseColor.set("defaultValue", 2);
cmbNoiseColor.set("tooltip", "NOISE's colour: DARK (~500 Hz), MID (~2 kHz), AIR (above 5 kHz)");
cmbNoiseColor.setValue(2);
cmbNoiseColor.setControlCallback(onNodeCtl);
ENGINE_CTL["cmbNoiseColor"] = [BV_NOISE_COLOR, "combo"];

nodeLayout();
uiDimUpdate();
for (gid in ["knbDstCrush", "sldNoise", "cmbNoiseColor"])
	engineSend(gid, Content.getComponent(gid).getValue());
for (hp in [["knbDstCrush", "Dist Crush"], ["sldNoise", "Noise"], ["cmbNoiseColor", "Noise Color"]])
{
	HOST_PARAMS.push(hp);              // (presetInit resets them too)
	var ghc = Content.getComponent(hp[0]);
	ghc.set("isPluginParameter", true);
	ghc.set("pluginParameterName", hp[1]);
}

// ---------------------------------------------------------------------------
// PRESETS (2026-10-30): the header box and the browser are the PRESET BROWSER block below
// (pnlPreset, pnlBrowser, pnlSave). A preset is a sound: loading one keeps the setup (PRESET_KEEP:
// SOURCE, its trigger and division, KEY, the kick), always (2026-10-31, user: "don't load kicks
// with presets"; before, an option loaded a SAMPLE preset's kick). A DAW session restores
// everything (isInternalPresetLoad). Factory presets: tools/make_presets.sh (presetInit,
// presetCurve; it strips the PRESET_KEEP values from the files), shipped with the plugin; HISE
// extracts them when the plugin's version changes (HISE_OVERWRITE_OLD_USER_PRESETS in
// project_info.xml).
const var PRESET_KEEP = ["cmbSrcMode", "cmbSrcTrig", "cmbSrcDiv", "cmbKey", "knbKickIndex", "lblKickFile"];
// the browser's settings (per user, not in presets): favourites (relative paths). (An older
// version's "loadKick" in the file is ignored.)
const var pbPrefsFile = FileSystem.getFolder(FileSystem.AppData).getChildFile("PresetBrowser.json");
const var pbPrefs = {"favs": []};
if (pbPrefsFile.isFile())
{
	var pbStored = pbPrefsFile.loadAsObject();
	if (typeof pbStored == "object" && isDefined(pbStored.favs))
		pbPrefs.favs = pbStored.favs;
}
const var uph = Engine.createUserPresetHandler();
uph.setEnableUserPresetPreprocessing(true, false);
uph.setPreCallback(function(presetData)
{
	if (uph.isInternalPresetLoad() || !isDefined(presetData.Content))
		return;
	// the setup stays as it is: its values in the preset are replaced by the current ones (added
	// where the preset has none, e.g. the stripped factory presets)
	var pkFound = [];
	for (pc in presetData.Content)
	{
		if (PRESET_KEEP.contains(pc.id))
		{
			pc.value = Content.getComponent(pc.id).getValue();
			pkFound.push(pc.id);
		}
	}
	for (pk in PRESET_KEEP)
		if (!pkFound.contains(pk))
			presetData.Content.push({"type": Content.getComponent(pk).get("type"), "id": pk,
			                         "value": Content.getComponent(pk).getValue()});
	// a preset made before a control existed (EQ TYPE, 2026-10-30): that control at its default
	// (else it would keep whatever the last sound had)
	var pkIds = [];
	for (pc in presetData.Content)
		pkIds.push(pc.id);
	for (hp in HOST_PARAMS)
		if (!pkIds.contains(hp[0]) && !PRESET_KEEP.contains(hp[0]))
			presetData.Content.push({"type": Content.getComponent(hp[0]).get("type"), "id": hp[0],
			                         "value": Content.getComponent(hp[0]).get("type") == "ScriptComboBox" ?
			                                  Math.max(1, Content.getComponent(hp[0]).get("defaultValue")) :
			                                  Content.getComponent(hp[0]).get("defaultValue")});
});

// The header box (2026-10-30, the browser below: pnlBrowser). PRESET_X: the box, the floppy
// disk right of it (pnlSaveBtn)
const var PRESET_X = 440;
const var PRESET_W = 300;
const var PRESET_ARROW = 34;         // the ‹ / › areas at both ends
const var pnlPreset = Content.addPanel("pnlPreset", PRESET_X, Y_HEADER / 2 - 18);
pnlPreset.set("width", PRESET_W);
pnlPreset.set("height", 36);
pnlPreset.set("saveInPreset", false);
pnlPreset.set("allowCallbacks", "Clicks & Hover");
pnlPreset.set("tooltip", "Presets: ‹ › step through the browser's category, click the name to browse");
pnlPreset.data.hover = -1;           // 0 ‹, 1 the name, 2 ›

// HISE's stock browser until 2026-10-30: kept, hidden (component ids are append-only)
const var fltPresets = Content.addFloatingTile("fltPresets", 24, Y_HEADER + 8);

// a duck curve preset and LENGTH (DUCK_LENGTHS index), OFFSET 0
inline function presetCurve(name, len)
{
	duckLoadPreset(name);
	duckLenIdx = DUCK_LEN_FIXED;       // (len: ignored since LENGTH is always 1/4)
	curve.offset = 0.0;
	duckStore();
	duckSend();
	duckRedraw();
}

// the factory presets' starting point (tools/make_presets.sh): every sound control at its
// default, the default chain order and duck curve; the setup (PRESET_KEEP) stays
inline function presetInit()
{
	for (pid in HOST_PARAMS)
	{
		if (!PRESET_KEEP.contains(pid[0]))
		{
			local c = Content.getComponent(pid[0]);
			randSet(pid[0], c.get("type") == "ScriptComboBox" ? Math.max(1, c.get("defaultValue")) : c.get("defaultValue"));
		}
	}
	knbDryLevel.setValue(sldKick.getValue());
	randSet("knbChainOrder", knbChainOrder.get("defaultValue"));
	knbFxOrder.setValue(knbFxOrder.get("defaultValue"));
	presetCurve("TIGHT", 3);
}

// the browser, over everything below the header (created last: on top)
fltPresets.set("width", W - 48);
fltPresets.set("height", Y_BOTTOM - Y_HEADER - 8);
fltPresets.set("visible", false);
fltPresets.setContentData({"Type": "PresetBrowser", "ShowSaveButton": true, "ShowExpansionsAsColumn": false,
                           "ShowFolderButton": true, "ShowNotes": false, "ShowEditButtons": true,
                           "NumColumns": 2, "Font": "Segoe UI", "FontSize": 15.0,
                           // opaque background, otherwise the nodes show through
                           "ColourData": {"bgColour": "0xFF0F1013", "textColour": "0xFFE9E9EC",
                                          "itemColour1": "0xFFB8BAC0", "itemColour2": "0xFF1C1E22"}});

// ---------------------------------------------------------------------------
// PRESET BROWSER (2026-10-30, user: "the preset system is not user friendly at all").
// - The header box shows CATEGORY / name, a dot when the sound changed since it was loaded or
//   saved (pbSnap: the host parameters and the chain order); ‹ › step through the browser's
//   category (wrapping). A click on the name opens the browser; a click outside it
//   (pnlPbShade) or ✕ closes it.
// - pnlBrowser, a dropdown under the box: categories (ALL with Init pinned on top, FAVORITES, the
//   factory folders, then the user's), a search (Enter or a click away applies it), a star per
//   preset (favourites, kept per user in AppData/PresetBrowser.json). A click loads and the
//   browser stays open, to audition. Right-click a preset of yours: Rename, Duplicate, Move to
//   category, Delete (asks first); a factory one: Duplicate to User. (Until 2026-10-31 a source
//   filter ALL / EXT / KICK, an EXT / KICK tag per preset and "KICK presets also load their
//   kick"; user: "too complicated".)
// - Factory presets are the shipped folders (PRESET_FACTORY): never overwritten, renamed or
//   deleted, and not offered as a save category.
// - The floppy disk (pnlSaveBtn) opens pnlSave: NAME (typed in place, Enter saves), CATEGORY
//   (cmbSaveCat: the user's, or a new one), SAVE / CANCEL; a name taken asks before
//   overwriting. A save reloads the file, so it's the current preset (in sessions too), and the
//   box flashes "Saved".
// Components: pnlSaveBtn, pnlPbShade, pnlBrowser, pnlSave, cmbSaveCat (after fltPresets: on top).

const var PRESET_FACTORY = ["Init", "Rumble", "Hypnotic", "Industrial", "Movement", "Sub"];
const var PB_W = 620;                 // the browser
const var PB_H = 460;
const var PB_X = PRESET_X + PRESET_W / 2 - PB_W / 2;
const var PB_Y = Y_HEADER / 2 + 22;
const var PB_TOP = 50;                // the search row
const var PB_FOOT = 38;
const var PB_CAT_W = 170;
const var PB_ROW = 32;
const var PB_LIST_X = PB_CAT_W + 8;
const var PB_LIST_W = PB_W - PB_LIST_X - 18;
const var PB_LIST_Y = PB_TOP + 8;
const var PB_VIS = Math.floor((PB_H - PB_FOOT - 8 - PB_LIST_Y) / PB_ROW);
const var PB_SEARCH_W = PB_W - 12 - 50;   // the search field, from x 12 to the ✕
const var PB_CONFIRM = [150, 160, 320, 130];
const var PB_SAVE_W = 340;            // the save popup
const var PB_SAVE_H = 204;
const var PB_MENU_FACTORY = "Duplicate to User";
const var PB_MOVE = "Move to::";      // the user's preset menu's submenu (pbMenuFor)
const var PB_NEW_CAT = "New category...";
const var pbRoot = FileSystem.getFolder(FileSystem.UserPresets);

const var pbList = [];                // {rel, name, cat, file, factory}
const var pbCats = [];                // the categories in order (Init is pinned in ALL, not listed)
const var pbRows = [];                // the browser's rows: indexes into pbList
const var pbSnap = [];
var pbCurRel = "";                    // the loaded preset ("Rumble/Deep Tunnel.preset")
var pbDirty = false;
var pbSnapPending = false;            // take the clean snapshot on the next timer tick
var pbFlash = "";
var pbFlashTicks = 0;
var pbCat = "ALL";
var pbQuery = "";
var pbScroll = 0;
var pbWheel = 0.0;                    // the mouse wheel's rows not scrolled yet
var pbHover = -1;                    // the area under the mouse (pbAreaAt)
var pbMenuRow = -1;                   // the pbList index the right-click menu is for
var pbEditRow = -1;                   // the row being renamed / moved (the mouse moves on meanwhile)
var pbConfirm = -1;                   // a pbList index to delete (asking), -1 none
var pbDragFrom = 0;
var pbSaveName = "";
var pbSaveCat = "User";
var pbSaveAsk = false;                // the name is taken: overwrite?
var pbI = 0;
var pbJ = 0;
var pbK = 0;

inline function pbRel(f) { return f.getRelativePathFrom(pbRoot).replace("\\", "/"); }

// a file name: no path characters, trimmed
inline function pbClean(s)
{
	local out = "";
	for (pbK = 0; pbK < s.length; pbK++)
	{
		local ch = s.charAt(pbK);
		if ("\\/:*?\"<>|".indexOf(ch) == -1)
			out += ch;
	}
	while (out.length > 0 && out.charAt(0) == " ")
		out = out.substring(1, out.length);
	while (out.length > 0 && out.charAt(out.length - 1) == " ")
		out = out.substring(0, out.length - 1);
	return out;
}

// the preset files: categories (factory first, then User, then the user's in order), names sorted
inline function pbScan()
{
	local raw = [];
	local userCats = [];
	for (f in FileSystem.findFiles(pbRoot, "*.preset", true))
	{
		local rel = pbRel(f);
		local slash = rel.lastIndexOf("/");
		local cat = slash > 0 ? rel.substring(0, slash) : "User";
		raw.push({"rel": rel, "name": f.toString(1), "cat": cat, "file": f, "factory": PRESET_FACTORY.contains(cat)});
		if (!PRESET_FACTORY.contains(cat) && cat != "User" && !userCats.contains(cat))
			userCats.push(cat);
	}
	userCats.sortNatural();
	pbCats.clear();
	for (c in PRESET_FACTORY)
		if (c != "Init")
			pbCats.push(c);
	pbCats.push("User");
	for (c in userCats)
		pbCats.push(c);
	pbList.clear();
	local order = ["Init"];
	for (c in pbCats)
		order.push(c);
	for (c in order)
	{
		local names = [];
		for (p in raw)
			if (p.cat == c)
				names.push(p.name);
		names.sortNatural();
		for (n in names)
			for (p in raw)
				if (p.cat == c && p.name == n)
					pbList.push(p);
	}
}

inline function pbIndexOf(rel)
{
	for (pbI = 0; pbI < pbList.length; pbI++)
		if (pbList[pbI].rel == rel)
			return pbI;
	return -1;
}

inline function pbInCat(p, c)
{
	if (p.cat == "Init")
		return c == "ALL";
	if (c == "ALL")
		return true;
	if (c == "FAVORITES")
		return pbPrefs.favs.contains(p.rel);
	return p.cat == c;
}
inline function pbCount(c)
{
	local n = 0;
	for (p in pbList)
		if (p.cat != "Init" && pbInCat(p, c))
			n++;
	return n;
}

inline function pbUpdateRows()
{
	pbRows.clear();
	local q = pbQuery.toLowerCase();
	for (pbJ = 0; pbJ < pbList.length; pbJ++)
	{
		local p = pbList[pbJ];
		if (q != "" ? (p.cat != "Init" && p.name.toLowerCase().indexOf(q) != -1) : pbInCat(p, pbCat))
			pbRows.push(pbJ);
	}
	pbScroll = Math.range(pbScroll, 0, Math.max(0, pbRows.length - PB_VIS));
}

// the sound's state, to tell when it changed (the dot in the box)
inline function pbState()
{
	local s = [knbChainOrder.getValue()];
	for (hp in HOST_PARAMS)
		if (!PRESET_KEEP.contains(hp[0]))
			s.push(Content.getComponent(hp[0]).getValue());
	return s;
}
inline function pbSnapTake()
{
	pbSnap.clear();
	for (v in pbState())
		pbSnap.push(v);
	pbDirty = false;
}

// ---------------------------------------------------------------------------
// The components

const var pnlSaveBtn = Content.addPanel("pnlSaveBtn", PRESET_X + PRESET_W + 4, Y_HEADER / 2 - 18);
pnlSaveBtn.set("width", 36);
pnlSaveBtn.set("height", 36);
pnlSaveBtn.set("saveInPreset", false);
pnlSaveBtn.set("allowCallbacks", "Clicks & Hover");
pnlSaveBtn.set("tooltip", "Save the current settings as a preset");
pnlSaveBtn.data.hover = false;

// under the browser: a click outside it closes it
const var pnlPbShade = Content.addPanel("pnlPbShade", 0, Y_HEADER);
pnlPbShade.set("width", W);
pnlPbShade.set("height", H - Y_HEADER);
pnlPbShade.set("saveInPreset", false);
pnlPbShade.set("allowCallbacks", "Clicks Only");
pnlPbShade.set("visible", false);

const var pnlBrowser = Content.addPanel("pnlBrowser", PB_X, PB_Y);
pnlBrowser.set("width", PB_W);
pnlBrowser.set("height", PB_H);
pnlBrowser.set("saveInPreset", false);
pnlBrowser.set("allowCallbacks", "All Callbacks");
pnlBrowser.set("popupMenuItems", PB_MENU_FACTORY);
pnlBrowser.set("popupOnRightClick", true);
pnlBrowser.set("visible", false);

const var pnlSave = Content.addPanel("pnlSave", PRESET_X, PB_Y);
pnlSave.set("width", PB_SAVE_W);
pnlSave.set("height", PB_SAVE_H);
pnlSave.set("saveInPreset", false);
pnlSave.set("allowCallbacks", "Clicks & Hover");
pnlSave.set("visible", false);
pnlSave.data.hover = -1;              // 0 the name, 1 CANCEL / BACK, 2 SAVE / OVERWRITE

const var cmbSaveCat = addCombo("cmbSaveCat", ["User"], PRESET_X + 16, PB_Y + 118, PB_SAVE_W - 32);
cmbSaveCat.set("height", 28);
cmbSaveCat.set("saveInPreset", false);
cmbSaveCat.set("visible", false);

// the text fields, over their panels: editable labels (the panels draw the boxes). The search
// and the name follow each key; lblEdit is the in-place editor (rename, move, a new category):
// Enter or a click away applies it, Esc cancels
inline function pbAddLabel(name, x, y, w, h)
{
	local l = Content.addLabel(name, x, y);
	l.set("width", w);
	l.set("height", h);
	l.set("saveInPreset", false);
	l.set("editable", true);
	l.set("multiline", false);
	l.set("fontName", Theme.FONT);
	l.set("fontSize", 15);
	l.set("alignment", "left");
	l.set("textColour", 0xFFE9E9EC);
	l.set("bgColour", 0x00000000);
	l.set("itemColour", 0x00000000);
	l.set("text", "");
	l.set("visible", false);
	return l;
}
const var lblSearch = pbAddLabel("lblSearch", PB_X + 40, PB_Y + 12, PB_SEARCH_W - 36, 26);
lblSearch.set("updateEachKey", true);
const var lblSaveName = pbAddLabel("lblSaveName", PRESET_X + 20, PB_Y + 58, PB_SAVE_W - 40, 28);
lblSaveName.set("updateEachKey", true);
const var lblEdit = pbAddLabel("lblEdit", 0, 0, 300, 26);
lblEdit.set("bgColour", 0xFF16171A);
lblEdit.set("itemColour", 0xFF8A8D94);
var pbEditMode = "";                  // what lblEdit is for: "rename", "move", "newcat"

// ---------------------------------------------------------------------------
// Open / close, load, step

inline function pbCurrent() { local i = pbIndexOf(pbCurRel); return i == -1 ? undefined : pbList[i]; }

inline function pbClose()
{
	pnlBrowser.set("visible", false);
	pnlSave.set("visible", false);
	cmbSaveCat.set("visible", false);
	lblSearch.set("visible", false);
	lblSaveName.set("visible", false);
	lblEdit.set("visible", false);
	pnlPbShade.set("visible", false);
	pbConfirm = -1;
	pnlPreset.repaint();
	pnlSaveBtn.repaint();
}

inline function pbOpenBrowser()
{
	pbClose();
	pbScan();
	pbQuery = "";
	local cur = pbCurrent();
	pbCat = isDefined(cur) && cur.cat != "Init" ? cur.cat : "ALL";
	pbUpdateRows();
	local at = pbRows.indexOf(pbIndexOf(pbCurRel));
	pbScroll = at == -1 ? 0 : Math.range(at - 3, 0, Math.max(0, pbRows.length - PB_VIS));
	pnlPbShade.set("visible", true);
	pnlBrowser.set("visible", true);
	lblSearch.set("text", "");
	lblSearch.set("visible", true);
	pnlBrowser.repaint();
	pnlPreset.repaint();
}

// a preset was loaded (the post-callback): it's the current one; the sound is clean
inline function pbLoaded(presetFile)
{
	if (isDefined(presetFile) && typeof presetFile == "object")
		pbCurRel = pbRel(presetFile);
	pbSnapPending = true;
	pnlPreset.repaint();
	if (pnlBrowser.get("visible"))
		pnlBrowser.repaint();
}

// ‹ › : the previous / next preset of the browser's category, wrapping
inline function pbStep(dir)
{
	pbScan();
	local seq = [];
	for (pbJ = 0; pbJ < pbList.length; pbJ++)
		if (pbInCat(pbList[pbJ], pbCat))
			seq.push(pbJ);
	if (seq.length == 0)
		return;
	local at = seq.indexOf(pbIndexOf(pbCurRel));
	local next = at == -1 ? (dir > 0 ? 0 : seq.length - 1) : (at + dir + seq.length) % seq.length;
	Engine.loadUserPreset(pbList[seq[next]].file);
}

// ---------------------------------------------------------------------------
// The browser: its areas (pbAreaAt), drawing, mouse

// 1 search, 3 close, 4 scrollbar, 6 / 7 the delete box's CANCEL / DELETE,
// 100 + k category k (CATS: ALL, FAVORITES, then pbCats),
// 200 + r row r (visible slot), 300 + r row r's star
inline function pbCatsShown()
{
	local cs = ["ALL", "FAVORITES"];
	for (c in pbCats)
		cs.push(c);
	return cs;
}
inline function pbAreaAt(x, y)
{
	if (pbConfirm != -1)
	{
		if (y >= PB_CONFIRM[1] + 82 && y < PB_CONFIRM[1] + 112)
		{
			if (x >= PB_CONFIRM[0] + 136 && x < PB_CONFIRM[0] + 216) return 6;
			if (x >= PB_CONFIRM[0] + 224 && x < PB_CONFIRM[0] + 304) return 7;
		}
		return -1;
	}
	if (y >= 10 && y < 40)
	{
		if (x >= 12 && x < 12 + PB_SEARCH_W) return 1;
		if (x >= PB_W - 42 && x < PB_W - 12) return 3;
		return -1;
	}
	if (y >= PB_H - PB_FOOT || y < PB_LIST_Y)
		return -1;
	if (x < PB_CAT_W)
	{
		local k = Math.floor((y - PB_LIST_Y) / PB_ROW);
		return k < pbCatsShown().length ? 100 + k : -1;
	}
	if (x >= PB_W - 16)
		return pbRows.length > PB_VIS ? 4 : -1;
	local r = Math.floor((y - PB_LIST_Y) / PB_ROW);
	if (r >= PB_VIS || pbScroll + r >= pbRows.length)
		return -1;
	return (x < PB_LIST_X + 28 ? 300 : 200) + r;
}

inline function pbButton(g, area, text, primary, hover)
{
	g.setColour(primary ? (hover ? 0xFFFFFFFF : 0xFFE9E9EC) : (hover ? 0xFF1E2024 : 0xFF16171A));
	g.fillRoundedRectangle(area, 3.0);
	if (!primary)
	{
		g.setColour(Theme.LINE);
		g.drawRoundedRectangle([area[0] + 0.5, area[1] + 0.5, area[2] - 1, area[3] - 1], 3.0, 1.0);
	}
	g.setColour(primary ? 0xFF08090B : (hover ? 0xFFFFFFFF : 0xFFB8BAC0));
	g.setFontWithSpacing(Theme.FONT_BOLD, 12.0, 0.1);
	g.drawAlignedText(text, area, "centred");
}

pnlBrowser.setPaintRoutine(function(g)
{
	g.setColour(0xFF0F1013);
	g.fillRoundedRectangle([0, 0, PB_W, PB_H], 4.0);
	g.setColour(0xFF3A3D43);
	g.drawRoundedRectangle([0.5, 0.5, PB_W - 1, PB_H - 1], 4.0, 1.0);
	g.setColour(0xFF1E2024);
	g.drawLine(1, PB_W - 1, PB_TOP, PB_TOP, 1.0);
	g.drawLine(PB_CAT_W, PB_CAT_W, PB_TOP, PB_H - PB_FOOT, 1.0);
	g.drawLine(1, PB_W - 1, PB_H - PB_FOOT, PB_H - PB_FOOT, 1.0);

	// the search field (a magnifier, the query or its placeholder)
	g.setColour(pbHover == 1 ? 0xFF1A1B1F : 0xFF16171A);
	g.fillRoundedRectangle([12, 10, PB_SEARCH_W, 30], 3.0);
	g.setColour(pbQuery != "" ? 0xFF6A6D74 : Theme.LINE);
	g.drawRoundedRectangle([12.5, 10.5, PB_SEARCH_W - 1, 29], 3.0, 1.0);
	g.setColour(Theme.TEXT_DIM);
	g.drawEllipse([22, 18, 10, 10], 1.4);
	g.drawLine(30.5, 35, 26.5, 31, 1.4);
	g.setFont(Theme.FONT, 15.0);
	g.setColour(pbQuery != "" ? Theme.TEXT : Theme.TEXT_FAINT);
	g.drawAlignedText(pbQuery != "" ? pbQuery : "Search presets", [42, 10, PB_SEARCH_W - 40, 30], "left");

	// ✕
	g.setColour(pbHover == 3 ? 0xFF1E2024 : 0xFF16171A);
	g.fillRoundedRectangle([PB_W - 42, 10, 30, 30], 3.0);
	g.setColour(Theme.LINE);
	g.drawRoundedRectangle([PB_W - 41.5, 10.5, 29, 29], 3.0, 1.0);
	g.setColour(pbHover == 3 ? 0xFFFFFFFF : 0xFFB8BAC0);
	g.drawLine(PB_W - 32, PB_W - 22, 20, 30, 1.5);
	g.drawLine(PB_W - 22, PB_W - 32, 20, 30, 1.5);

	// the categories
	var pbCs = pbCatsShown();
	for (pbI = 0; pbI < pbCs.length; pbI++)
	{
		var pbCa = [8, PB_LIST_Y + pbI * PB_ROW, PB_CAT_W - 16, PB_ROW - 2];
		var pbOn = pbCs[pbI] == pbCat && pbQuery == "";
		if (pbOn || pbHover == 100 + pbI)
		{
			g.setColour(pbOn ? 0xFF1E2024 : 0xFF1A1B1F);
			g.fillRoundedRectangle(pbCa, 3.0);
		}
		g.setColour(pbOn || pbHover == 100 + pbI ? 0xFFFFFFFF : 0xFF9A9DA4);
		g.setFontWithSpacing(Theme.FONT_BOLD, 11.5, 0.1);
		g.drawAlignedText(pbCs[pbI].toUpperCase(), [pbCa[0] + 12, pbCa[1], pbCa[2] - 40, pbCa[3]], "left");
		g.setColour(Theme.TEXT_FAINT);
		g.setFont(Theme.FONT, 12.0);
		g.drawAlignedText("" + pbCount(pbCs[pbI]), [pbCa[0], pbCa[1], pbCa[2] - 12, pbCa[3]], "right");
	}

	// the rows: star, name (the current one lit), category (in ALL, FAVORITES, a search), lock
	var pbShowCat = pbQuery != "" || pbCat == "ALL" || pbCat == "FAVORITES";
	for (pbI = 0; pbI < PB_VIS && pbScroll + pbI < pbRows.length; pbI++)
	{
		var pbP = pbList[pbRows[pbScroll + pbI]];
		var pbY = PB_LIST_Y + pbI * PB_ROW;
		var pbCur = pbP.rel == pbCurRel;
		var pbFav = pbPrefs.favs.contains(pbP.rel);
		if (pbCur || pbHover == 200 + pbI || pbHover == 300 + pbI)
		{
			g.setColour(pbCur ? 0xFF23252A : 0xFF1A1B1F);
			g.fillRoundedRectangle([PB_LIST_X, pbY, PB_LIST_W, PB_ROW - 2], 3.0);
		}
		// the star (filled: a favourite)
		var sp = Content.createPath();
		sp.startNewSubPath(0, 0);
		sp.startNewSubPath(1, 1);
		for (pbK = 0; pbK < 10; pbK++)
		{
			var pbAng = Math.PI * (pbK / 5.0) - Math.PI / 2;
			var pbRad = pbK % 2 == 0 ? 0.5 : 0.21;
			if (pbK == 0)
				sp.startNewSubPath(0.5 + pbRad * Math.cos(pbAng), 0.53 + pbRad * Math.sin(pbAng));
			else
				sp.lineTo(0.5 + pbRad * Math.cos(pbAng), 0.53 + pbRad * Math.sin(pbAng));
		}
		sp.closeSubPath();
		if (pbP.cat != "Init")
		{
			var pbSArea = [PB_LIST_X + 7, pbY + 8, 14, 14];
			if (pbFav)
			{
				g.setColour(Theme.TEXT);
				g.fillPath(sp, pbSArea);
			}
			else
			{
				g.setColour(pbHover == 300 + pbI ? Theme.TEXT_DIM : 0xFF4A4D54);
				g.drawPath(sp, pbSArea, 1.1);
			}
		}
		// the name
		g.setColour(pbCur ? 0xFFFFFFFF : (pbHover == 200 + pbI ? 0xFFFFFFFF : 0xFFC9CBD0));
		g.setFont(pbCur ? Theme.FONT_BOLD : Theme.FONT, 15.0);
		g.drawAlignedText(pbP.name, [PB_LIST_X + 34, pbY, PB_LIST_W - 200, PB_ROW - 2], "left");
		// right side, right to left: the lock, the category
		var pbRx = PB_LIST_X + PB_LIST_W - 10;
		if (pbP.factory)
		{
			g.setColour(0xFF6A6D74);
			g.drawRoundedRectangle([pbRx - 11, pbY + 13, 10, 7], 1.0, 1.1);
			g.drawLine(pbRx - 9, pbRx - 9, pbY + 13, pbY + 10.5, 1.1);
			g.drawLine(pbRx - 3, pbRx - 3, pbY + 13, pbY + 10.5, 1.1);
			g.drawLine(pbRx - 9, pbRx - 3, pbY + 9, pbY + 9, 1.1);
		}
		pbRx -= 20;
		if (pbP.cat != "Init" && pbShowCat)
		{
			g.setColour(Theme.TEXT_FAINT);
			g.setFontWithSpacing(Theme.FONT_BOLD, 10.5, 0.1);
			g.drawAlignedText(pbP.cat.toUpperCase(), [pbRx - 120, pbY, 120, PB_ROW - 2], "right");
		}
	}
	if (pbRows.length == 0)
	{
		g.setColour(Theme.TEXT_DIM);
		g.setFont(Theme.FONT, 14.0);
		g.drawAlignedText(pbQuery != "" ? "No preset matches." : "No preset here yet.", [PB_LIST_X + 12, PB_LIST_Y + 8, PB_LIST_W - 24, 24], "left");
	}

	// the scrollbar
	if (pbRows.length > PB_VIS)
	{
		var pbTrack = PB_VIS * PB_ROW - 2;
		var pbThumb = Math.max(24, pbTrack * PB_VIS / pbRows.length);
		var pbTy = PB_LIST_Y + (pbTrack - pbThumb) * pbScroll / (pbRows.length - PB_VIS);
		g.setColour(0xFF1A1B1F);
		g.fillRoundedRectangle([PB_W - 12, PB_LIST_Y, 5, pbTrack], 2.5);
		g.setColour(pbHover == 4 ? 0xFF8A8D94 : 0xFF4A4D54);
		g.fillRoundedRectangle([PB_W - 12, pbTy, 5, pbThumb], 2.5);
	}

	// the footer: the hint
	g.setFont(Theme.FONT, 12.5);
	g.setColour(Theme.TEXT_DIM);
	g.drawAlignedText("Click: load  ·  right-click yours: rename, delete", [12, PB_H - PB_FOOT, PB_W - 24, PB_FOOT], "right");

	// deleting: the confirmation box over the list
	if (pbConfirm != -1)
	{
		g.setColour(0xAA000000);
		g.fillRoundedRectangle([1, 1, PB_W - 2, PB_H - 2], 4.0);
		var pbB = PB_CONFIRM;
		g.setColour(0xFF0F1013);
		g.fillRoundedRectangle(pbB, 4.0);
		g.setColour(0xFF3A3D43);
		g.drawRoundedRectangle([pbB[0] + 0.5, pbB[1] + 0.5, pbB[2] - 1, pbB[3] - 1], 4.0, 1.0);
		g.setColour(0xFFFFFFFF);
		g.setFont(Theme.FONT, 15.0);
		g.drawAlignedText("Delete \"" + pbList[pbConfirm].name + "\"?", [pbB[0] + 16, pbB[1] + 14, pbB[2] - 32, 22], "left");
		g.setColour(0xFF9A9DA4);
		g.setFont(Theme.FONT, 13.0);
		g.drawAlignedText("This can't be undone.", [pbB[0] + 16, pbB[1] + 40, pbB[2] - 32, 20], "left");
		pbButton(g, [pbB[0] + 136, pbB[1] + 82, 80, 30], "CANCEL", false, pbHover == 6);
		g.setColour(pbHover == 7 ? 0xFFF0B090 : 0xFFE8A07A);
		g.fillRoundedRectangle([pbB[0] + 224, pbB[1] + 82, 80, 30], 3.0);
		g.setColour(0xFF08090B);
		g.setFontWithSpacing(Theme.FONT_BOLD, 12.0, 0.1);
		g.drawAlignedText("DELETE", [pbB[0] + 224, pbB[1] + 82, 80, 30], "centred");
	}
});

inline function pbSavePrefs() { pbPrefsFile.writeObject(pbPrefs); }

// the in-place editor (lblEdit) at x, y (the interface's coordinates), for mode
inline function pbEdit(mode, x, y, w, text)
{
	pbEditMode = mode;
	lblEdit.set("x", x);
	lblEdit.set("y", y);
	lblEdit.set("width", w);
	lblEdit.set("text", text);
	lblEdit.set("visible", true);
	lblEdit.grabFocus();
}

// the file operations on pbList[i] (the user's presets only)
inline function pbRename(i, newName)
{
	local nm = pbClean(newName);
	local p = pbList[i];
	if (nm == "" || nm == p.name || p.factory)
		return;
	local was = p.rel;
	local favAt = pbPrefs.favs.indexOf(was);
	if (p.file.rename(nm))
	{
		pbScan();
		local rel = was.substring(0, was.lastIndexOf("/") + 1) + nm + ".preset";
		if (pbCurRel == was)
			pbCurRel = rel;
		if (favAt != -1)
		{
			pbPrefs.favs[favAt] = rel;
			pbSavePrefs();
		}
	}
}

// a copy beside it ("Name copy", "Name copy 2" ...) or, for a factory preset, in User
inline function pbDuplicate(i)
{
	local p = pbList[i];
	local dir = p.factory ? pbRoot.getChildFile("User") : p.file.getParentDirectory();
	if (!dir.isDirectory())
		pbRoot.createDirectory("User");
	local base = p.factory ? p.name : p.name + " copy";
	local target = dir.getChildFile(base + ".preset");
	for (pbK = 2; target.isFile(); pbK++)
		target = dir.getChildFile(base + " " + pbK + ".preset");
	target.writeString(p.file.loadAsString());
	pbScan();
}

inline function pbMove(i, cat)
{
	local c = pbClean(cat);
	local p = pbList[i];
	if (c == "" || c == p.cat || PRESET_FACTORY.contains(c) || p.factory)
		return;
	local dir = pbRoot.getChildFile(c);
	if (!dir.isDirectory())
		pbRoot.createDirectory(c);
	local target = dir.getChildFile(p.name + ".preset");
	if (target.isFile())
		return;                       // (a preset of that name is there: nothing moves)
	local was = p.rel;
	if (p.file.move(target))
	{
		local rel = pbRel(target);
		if (pbCurRel == was)
			pbCurRel = rel;
		local favAt = pbPrefs.favs.indexOf(was);
		if (favAt != -1)
		{
			pbPrefs.favs[favAt] = rel;
			pbSavePrefs();
		}
		pbScan();
	}
}


inline function pbRefresh()
{
	pbUpdateRows();
	pnlBrowser.repaint();
	pnlPreset.repaint();
}


// ---------------------------------------------------------------------------
// The save popup

inline function pbSaveCats()
{
	local cs = [];
	for (c in pbCats)
		if (!PRESET_FACTORY.contains(c))
			cs.push(c);
	if (!cs.contains(pbSaveCat))
		cs.push(pbSaveCat);
	return cs;
}
inline function pbSaveCatsUpdate()
{
	local cs = pbSaveCats();
	cmbSaveCat.set("items", cs.join("\n") + "\n+ New category...");
	cmbSaveCat.setValue(cs.indexOf(pbSaveCat) + 1);
}

// saves into User / the category; a name taken asks first (force: the answer was OVERWRITE)
inline function pbDoSave(force)
{
	local nm = pbClean(pbSaveName);
	if (nm == "")
		return;
	local dir = pbRoot.getChildFile(pbSaveCat);
	if (!dir.isDirectory())
		pbRoot.createDirectory(pbSaveCat);
	local f = dir.getChildFile(nm + ".preset");
	if (f.isFile() && !force)
	{
		pbSaveName = nm;
		pbSaveAsk = true;
		cmbSaveCat.set("visible", false);
		lblSaveName.set("visible", false);
		pnlSave.repaint();
		return;
	}
	Engine.saveUserPreset(f);
	pbFlash = "Saved: " + pbSaveCat.toUpperCase() + " / " + nm;
	pbFlashTicks = 5;
	pbClose();
	pbScan();
	Engine.loadUserPreset(f);         // (the current preset now: the box, the arrows, a session)
}

// the name field (lblSaveName, each key sets pbSaveName)
inline function pbNameInput()
{
	lblSaveName.set("text", pbSaveName);
	lblSaveName.set("visible", true);
	// (no grabFocus: a field with focus swallowed the next click elsewhere)
}
inline function onSaveName(component, value) { pbSaveName = value; }
lblSaveName.setControlCallback(onSaveName);

inline function pbOpenSave()
{
	pbClose();
	pbScan();
	local cur = pbCurrent();
	pbSaveName = isDefined(cur) && cur.cat != "Init" ? (cur.factory ? cur.name + " 2" : cur.name) : "My Preset";
	pbSaveCat = isDefined(cur) && !cur.factory ? cur.cat : "User";
	pbSaveAsk = false;
	pbSaveCatsUpdate();
	pnlPbShade.set("visible", true);
	pnlSave.set("visible", true);
	cmbSaveCat.set("visible", true);
	pnlSave.repaint();
	pnlSaveBtn.repaint();
	pbNameInput();
}

inline function onSaveCat(component, value)
{
	local cs = pbSaveCats();
	if (value <= cs.length)
	{
		pbSaveCat = cs[value - 1];
		return;
	}
	// a new category: typed where the combo is (onEditDone)
	cmbSaveCat.set("visible", false);
	pbEdit("newcat", PRESET_X + 16, PB_Y + 118, PB_SAVE_W - 32, "");
}
cmbSaveCat.setControlCallback(onSaveCat);

// the search: each key filters
inline function onSearch(component, value)
{
	pbQuery = value;
	pbScroll = 0;
	pbUpdateRows();
	pnlBrowser.repaint();
}
lblSearch.setControlCallback(onSearch);

// lblEdit applied (Enter or a click away): rename, move, or a new save category
inline function onEditDone(component, value)
{
	local mode = pbEditMode;
	pbEditMode = "";
	lblEdit.set("visible", false);
	if (mode == "rename")
		pbRename(pbEditRow, value);
	else if (mode == "move")
		pbMove(pbEditRow, value);
	else if (mode == "newcat")
	{
		local nc = pbClean(value);
		if (nc != "" && !PRESET_FACTORY.contains(nc))
			pbSaveCat = nc;
		pbSaveCatsUpdate();
		if (pnlSave.get("visible") && !pbSaveAsk)
			cmbSaveCat.set("visible", true);
		pnlSave.repaint();
		return;
	}
	pbRefresh();
}
lblEdit.setControlCallback(onEditDone);


// ---------------------------------------------------------------------------
// The header box

pnlPreset.setPaintRoutine(function(g)
{
	var pbOpen = pnlBrowser.get("visible");
	g.setColour(this.data.hover == 1 || pbOpen ? 0xFF1E2024 : 0xFF16171A);
	g.fillRoundedRectangle([0, 0, PRESET_W, 36], 3.0);
	g.setColour(pbFlashTicks > 0 ? Theme.TEXT : (pbOpen ? 0xFF6A6D74 : Theme.LINE));
	g.drawRoundedRectangle([0.5, 0.5, PRESET_W - 1, 35], 3.0, 1.0);
	g.setFont(Theme.FONT, 15.0);
	g.setColour(this.data.hover == 0 ? Theme.TEXT : Theme.TEXT_DIM);
	g.drawAlignedText("‹", [0, 0, PRESET_ARROW, 36], "centred");
	g.setColour(this.data.hover == 2 ? Theme.TEXT : Theme.TEXT_DIM);
	g.drawAlignedText("›", [PRESET_W - PRESET_ARROW, 0, PRESET_ARROW, 36], "centred");
	if (pbFlashTicks > 0)
	{
		g.setColour(0xFFFFFFFF);
		g.setFont(Theme.FONT, 13.0);
		g.drawAlignedText("✓  " + pbFlash, [PRESET_ARROW, 0, PRESET_W - 2 * PRESET_ARROW, 36], "centred");
		return;
	}
	var pbCurP = pbCurrent();
	var pbCatTxt = isDefined(pbCurP) && pbCurP.cat != "Init" ? pbCurP.cat.toUpperCase() + "  /  " : "";
	var pbNameTxt = isDefined(pbCurP) ? pbCurP.name : (Engine.getCurrentUserPresetName() == "" ? "Init" : Engine.getCurrentUserPresetName());
	g.setFontWithSpacing(Theme.FONT_BOLD, 10.5, 0.08);
	var pbW1 = g.getStringWidth(pbCatTxt);
	g.setFont(Theme.FONT, 14.0);
	var pbW2 = g.getStringWidth(pbNameTxt);
	var pbX0 = Math.max(PRESET_ARROW, PRESET_W / 2 - (pbW1 + pbW2 + (pbDirty ? 12 : 0)) / 2);
	g.setColour(Theme.TEXT_DIM);
	g.setFontWithSpacing(Theme.FONT_BOLD, 10.5, 0.08);
	g.drawAlignedText(pbCatTxt, [pbX0, 0, pbW1 + 2, 36], "left");
	g.setFont(Theme.FONT, 14.0);
	g.setColour(this.data.hover == 1 ? 0xFFFFFFFF : (pbDirty ? 0xFFC9CBD0 : Theme.TEXT));
	g.drawAlignedText(pbNameTxt, [pbX0 + pbW1, 0, PRESET_W - PRESET_ARROW - pbX0 - pbW1, 36], "left");
	if (pbDirty)
	{
		g.setColour(Theme.TEXT);
		g.fillEllipse([Math.min(pbX0 + pbW1 + pbW2 + 6, PRESET_W - PRESET_ARROW - 4), 16, 5, 5]);
	}
});

pnlPreset.setMouseCallback(function(event)
{
	var ppart = !event.hover && !event.clicked ? -1 : (event.x < PRESET_ARROW ? 0 : (event.x >= PRESET_W - PRESET_ARROW ? 2 : 1));
	if (ppart != this.data.hover)
	{
		this.data.hover = ppart;
		this.repaint();
	}
	if (event.clicked)
	{
		if (ppart == 0 || ppart == 2)
			pbStep(ppart == 0 ? -1 : 1);
		else if (pnlBrowser.get("visible"))
			pbClose();
		else
			pbOpenBrowser();
	}
});

// the dot (the sound changed since it was loaded or saved) and the "Saved" flash
pnlPreset.setTimerCallback(function()
{
	// (the first tick: the stored values were restored after onInit, the sound is clean)
	if (pbSnapPending)
	{
		pbSnapPending = false;
		pbSnapTake();
	}
	var pbNow = pbState();
	var pbD = pbSnap.length != pbNow.length;
	for (pbI = 0; pbI < pbNow.length && !pbD; pbI++)
		pbD = Math.abs(pbNow[pbI] - pbSnap[pbI]) > 0.0001;
	if (pbFlashTicks > 0)
	{
		pbFlashTicks--;
		this.repaint();
	}
	if (pbD != pbDirty)
	{
		pbDirty = pbD;
		this.repaint();
	}
});
pnlPreset.startTimer(300);

// a floppy disk
pnlSaveBtn.setPaintRoutine(function(g)
{
	var pbLit = this.data.hover || pnlSave.get("visible");
	g.setColour(pbLit ? 0xFF1E2024 : 0xFF16171A);
	g.fillRoundedRectangle([0, 0, 36, 36], 3.0);
	g.setColour(pnlSave.get("visible") ? 0xFF6A6D74 : Theme.LINE);
	g.drawRoundedRectangle([0.5, 0.5, 35, 35], 3.0, 1.0);
	g.setColour(pbLit ? 0xFFFFFFFF : Theme.TEXT_DIM);
	var fp = Content.createPath();
	fp.startNewSubPath(0, 0);
	fp.startNewSubPath(36, 36);
	fp.startNewSubPath(10.5, 10.5);
	fp.lineTo(22.5, 10.5);
	fp.lineTo(25.5, 13.5);
	fp.lineTo(25.5, 25.5);
	fp.lineTo(10.5, 25.5);
	fp.closeSubPath();
	fp.startNewSubPath(13.5, 10.5);
	fp.lineTo(13.5, 14.5);
	fp.lineTo(20.5, 14.5);
	fp.lineTo(20.5, 10.5);
	fp.startNewSubPath(13, 25.5);
	fp.lineTo(13, 19.5);
	fp.lineTo(23, 19.5);
	fp.lineTo(23, 25.5);
	g.drawPath(fp, [0, 0, 36, 36], 1.4);
});
pnlSaveBtn.setMouseCallback(function(event)
{
	if (event.hover != this.data.hover)
	{
		this.data.hover = event.hover;
		this.repaint();
	}
	if (event.clicked)
	{
		if (pnlSave.get("visible"))
			pbClose();
		else
			pbOpenSave();
	}
});

pnlPbShade.setPaintRoutine(function(g) { g.fillAll(0x55000000); });
pnlPbShade.setMouseCallback(function(event)
{
	if (event.clicked)
		pbClose();
});
// a row's right-click menu: a factory preset PB_MENU_FACTORY; one of the user's Rename,
// Duplicate, Move to > (the user's categories but its own, New category...), Delete
// (2026-10-31, user: a preset "cannot be moved": before, Move to category typed a name in place,
// with no list)
inline function pbMenuFor(p)
{
	if (p.factory)
		return PB_MENU_FACTORY;
	local items = ["Rename", "Duplicate"];
	for (c in pbSaveCats())
		if (c != p.cat)
			items.push(PB_MOVE + c);
	items.push(PB_MOVE + PB_NEW_CAT);
	items.push("Delete");
	return items.join("\n");
}

// a right-click menu item (its text, a submenu's with its "Move to::") for pbList[i]
inline function pbMenuAction(item, i)
{
	if (i == -1)
		return;
	pbEditRow = i;
	local rowY = PB_LIST_Y + (pbRows.indexOf(i) - pbScroll) * PB_ROW;
	if (item == "Rename")
		pbEdit("rename", PB_X + PB_LIST_X + 30, PB_Y + rowY + 2, 300, pbList[i].name);
	else if (item == PB_MOVE + PB_NEW_CAT)
		pbEdit("move", PB_X + PB_LIST_X + 30, PB_Y + rowY + 2, 300, "New category");
	else if (item.indexOf(PB_MOVE) == 0)
		pbMove(i, item.substring(PB_MOVE.length, item.length));
	else if (item == "Delete")
		pbConfirm = i;
	else
		pbDuplicate(i);
	pbRefresh();
}

pnlBrowser.setMouseCallback(function(event)
{
	// the right-click menu (its items follow the row under the mouse)
	if (isDefined(event.result) && event.result > 0)
	{
		pbMenuAction(event.itemText, pbMenuRow);
		return;
	}

	// the mouse wheel scrolls the list, 3 rows a notch (a Windows notch is a wheelDeltaY of
	// about 0.234, up positive; trackpads send smaller steps: pbWheel adds them up). HISE sends
	// panels no wheel; our HISE patch does (tools/hise-patches, 2026-10-31, user: "the scrollwheel
	// does not work in the preset list")
	if (isDefined(event.mouseWheel) && event.mouseWheel)
	{
		if (pbRows.length > PB_VIS && pbConfirm == -1)
		{
			pbWheel += event.wheelDeltaY / 0.234 * 3.0;
			var pbSteps = pbWheel > 0 ? Math.floor(pbWheel) : Math.ceil(pbWheel);
			pbWheel -= pbSteps;
			if (pbSteps != 0)
			{
				pbScroll = Math.range(pbScroll - pbSteps, 0, pbRows.length - PB_VIS);
				this.repaint();
			}
		}
		return;
	}

	var pbA = event.hover || event.clicked || event.drag ? pbAreaAt(event.x, event.y) : -1;
	if (pbA != pbHover)
	{
		pbHover = pbA;
		// the menu for the row under the mouse: the user's own, or a factory one's
		if (pbA >= 200 && pbA < 400)
		{
			pbMenuRow = pbRows[pbScroll + pbA % 100];
			this.set("popupMenuItems", pbMenuFor(pbList[pbMenuRow]));
		}
		else
			pbMenuRow = -1;
		this.repaint();
	}

	if (event.drag && pbA == 4 || (event.drag && this.data.scrolling))
	{
		var pbTrackH = PB_VIS * PB_ROW;
		pbScroll = Math.range(Math.round(pbDragFrom + event.dragY / pbTrackH * pbRows.length), 0, pbRows.length - PB_VIS);
		this.repaint();
		return;
	}
	if (event.mouseUp)
		this.data.scrolling = false;

	if (!event.clicked || event.rightClick)
		return;

	// a click elsewhere ends an edit in place (applied if the field lost focus first)
	if (lblEdit.get("visible") && pbEditMode != "newcat")
	{
		pbEditMode = "";
		lblEdit.set("visible", false);
	}

	if (pbConfirm != -1)
	{
		if (pbA == 7)
		{
			var pbDel = pbList[pbConfirm];
			var pbFavDel = pbPrefs.favs.indexOf(pbDel.rel);
			if (pbFavDel != -1)
			{
				pbPrefs.favs.removeElement(pbFavDel);
				pbSavePrefs();
			}
			pbDel.file.deleteFileOrDirectory();
			pbScan();
		}
		if (pbA == 6 || pbA == 7)
			pbConfirm = -1;
		pbRefresh();
		return;
	}

	if (pbA == 1)
		lblSearch.grabFocus();
	else if (pbA == 3)
		pbClose();
	else if (pbA == 4)
	{
		// the track: jump there, then drag
		var pbFrac = (event.y - PB_LIST_Y) / (PB_VIS * PB_ROW);
		pbScroll = Math.range(Math.round(pbFrac * pbRows.length - PB_VIS / 2), 0, pbRows.length - PB_VIS);
		pbDragFrom = pbScroll;
		this.data.scrolling = true;
	}
	else if (pbA >= 100 && pbA < 200)
	{
		pbCat = pbCatsShown()[pbA - 100];
		pbQuery = "";
		lblSearch.set("text", "");
		pbScroll = 0;
	}
	else if (pbA >= 300)
	{
		var pbSr = pbList[pbRows[pbScroll + pbA - 300]];
		if (pbSr.cat != "Init")
		{
			var pbFi = pbPrefs.favs.indexOf(pbSr.rel);
			if (pbFi == -1)
				pbPrefs.favs.push(pbSr.rel);
			else
				pbPrefs.favs.removeElement(pbFi);
			pbSavePrefs();
		}
	}
	else if (pbA >= 200)
		Engine.loadUserPreset(pbList[pbRows[pbScroll + pbA - 200]].file);
	pbRefresh();
});
pnlSave.setPaintRoutine(function(g)
{
	g.setColour(0xFF0F1013);
	g.fillRoundedRectangle([0, 0, PB_SAVE_W, PB_SAVE_H], 4.0);
	g.setColour(0xFF3A3D43);
	g.drawRoundedRectangle([0.5, 0.5, PB_SAVE_W - 1, PB_SAVE_H - 1], 4.0, 1.0);
	var pbBtnY = PB_SAVE_H - 46;
	if (pbSaveAsk)
	{
		g.setColour(0xFFFFFFFF);
		g.setFont(Theme.FONT, 16.0);
		g.drawAlignedText("Overwrite \"" + pbSaveName + "\"?", [16, 18, PB_SAVE_W - 32, 24], "left");
		g.setColour(0xFF9A9DA4);
		g.setFont(Theme.FONT, 13.5);
		g.drawMultiLineText(pbSaveCat.toUpperCase() + " already has a preset with this name.", [16, 66], PB_SAVE_W - 32, "left", 0.0);
		g.drawMultiLineText("Overwriting replaces it with the current settings.", [16, 86], PB_SAVE_W - 32, "left", 0.0);
		pbButton(g, [PB_SAVE_W - 16 - 110 - 8 - 70, pbBtnY, 70, 30], "BACK", false, this.data.hover == 1);
		pbButton(g, [PB_SAVE_W - 16 - 110, pbBtnY, 110, 30], "OVERWRITE", true, this.data.hover == 2);
		return;
	}
	g.setColour(Theme.TEXT_DIM);
	g.setFontWithSpacing(Theme.FONT_BOLD, 11.5, 0.14);
	g.drawAlignedText("SAVE PRESET", [16, 12, 200, 20], "left");
	g.setFontWithSpacing(Theme.FONT_BOLD, 10.5, 0.12);
	g.drawAlignedText("NAME", [16, 38, 200, 16], "left");
	g.drawAlignedText("CATEGORY", [16, 100, 200, 16], "left");
	// the name field (lblSaveName over it)
	g.setColour(this.data.hover == 0 ? 0xFF1A1B1F : 0xFF16171A);
	g.fillRoundedRectangle([16, 56, PB_SAVE_W - 32, 32], 3.0);
	g.setColour(0xFF8A8D94);
	g.drawRoundedRectangle([16.5, 56.5, PB_SAVE_W - 33, 31], 3.0, 1.0);
	pbButton(g, [PB_SAVE_W - 16 - 80 - 8 - 80, pbBtnY, 80, 30], "CANCEL", false, this.data.hover == 1);
	pbButton(g, [PB_SAVE_W - 16 - 80, pbBtnY, 80, 30], "SAVE", true, this.data.hover == 2);
});

pnlSave.setMouseCallback(function(event)
{
	var pbBy = PB_SAVE_H - 46;
	var pbSp = -1;
	if (event.hover || event.clicked)
	{
		if (!pbSaveAsk && event.y >= 56 && event.y < 88 && event.x >= 16 && event.x < PB_SAVE_W - 16)
			pbSp = 0;
		else if (event.y >= pbBy && event.y < pbBy + 30)
		{
			var pbBw = pbSaveAsk ? 110 : 80;
			var pbB2 = PB_SAVE_W - 16 - pbBw;
			if (event.x >= pbB2 && event.x < PB_SAVE_W - 16)
				pbSp = 2;
			else if (event.x >= pbB2 - 8 - (pbSaveAsk ? 70 : 80) && event.x < pbB2 - 8)
				pbSp = 1;
		}
	}
	if (pbSp != this.data.hover)
	{
		this.data.hover = pbSp;
		this.repaint();
	}
	if (!event.clicked)
		return;
	if (pbSp == 0)
		pbNameInput();
	else if (pbSp == 1)
	{
		if (pbSaveAsk)
		{
			pbSaveAsk = false;
			cmbSaveCat.set("visible", true);
			this.repaint();
			pbNameInput();
		}
		else
			pbClose();
	}
	else if (pbSp == 2)
		pbDoSave(pbSaveAsk);
});

uph.setPostCallback(function(presetFile)
{
	pbLoaded(presetFile);
	randUndo.clear();                // (the undo steps were the previous sound's)
	pnlRandUndo.repaint();
});

// the preset the plugin opened with (by name: a session or the last one), the sound as it is
pbScan();
for (pbP0 in pbList)
	if (pbCurRel == "" && pbP0.name == Engine.getCurrentUserPresetName())
		pbCurRel = pbP0.rel;
pbSnapPending = true;

// SAMPLE + MIDI: a note plays the kick at its offset in the audio block, with its velocity
function onNoteOn()
{
	if (srcMode == 1 && trigMode == 0)
	{
		BvEngine.setAttribute(BV_HIT_OFFSET, Message.getTimestamp());
		BvEngine.setAttribute(BV_HIT_VELOCITY, Message.getVelocity() / 127.0);
		bvHits = (bvHits + 1) % 1000000;
		BvEngine.setAttribute(BV_HIT, bvHits);
	}
}
function onNoteOff()
{
	
}
 function onController()
{
	
}
 function onTimer()
{
	
}
 function onControl(number, value)
{
	
}
 