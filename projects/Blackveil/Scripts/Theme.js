// ShadowDSP - theme: colours, fonts and the look-and-feel shared by all controls.
// Design reference: docs/design-mockup.png (dark, monochrome, white pointer knobs).

namespace Theme
{
	const var BG = 0xFF0B0C0E;
	const var SECTION = 0xFF0F1013;
	const var LINE = 0xFF2A2C31;
	const var LINE_SOFT = 0xFF1C1E22;
	const var TEXT = 0xFFE9E9EC;
	const var TEXT_DIM = 0xFF9A9CA3;
	const var TEXT_FAINT = 0xFF5C5F66;
	const var KNOB_TOP = 0xFF3A3C42;
	const var KNOB_BOTTOM = 0xFF0E0F12;

	// Segoe UI ships with every Windows install (the only target for now).
	const var FONT = "Segoe UI";
	const var FONT_BOLD = "Segoe UI Semibold";

	// Section title with letter spacing and a hairline running to the right edge.
	inline function drawSectionTitle(g, text, x, y, lineEnd)
	{
		g.setColour(TEXT);
		g.setFontWithSpacing(FONT_BOLD, 15.0, 0.18);
		g.drawAlignedText(text, [x, y, 200, 18], "left");
		local w = g.getStringWidth(text) + 16;
		g.setColour(LINE);
		g.drawLine(x + w, lineEnd, y + 9.5, y + 9.5, 1.0);
	}
}

// ---------------------------------------------------------------------------
// Value formatting (knob readouts)

namespace Fmt
{
	inline function time(ms)
	{
		if (ms >= 1000.0)
			return Engine.doubleToString(ms / 1000.0, 2) + " s";
		if (ms < 10.0)
			return Engine.doubleToString(ms, 1) + " ms";
		return Engine.doubleToString(Math.round(ms), 0) + " ms";
	}

	inline function freq(hz)
	{
		if (hz >= 1000.0)
			return Engine.doubleToString(hz / 1000.0, 1) + " kHz";
		return Engine.doubleToString(Math.round(hz), 0) + " Hz";
	}

	inline function percent(v) { return Engine.doubleToString(Math.round(v), 0) + "%"; }

	inline function signedPercent(v)
	{
		local r = Math.round(v);
		return (r > 0 ? "+" : "") + Engine.doubleToString(r, 0) + "%";
	}

	inline function decibel(v) { return Engine.doubleToString(v, 1) + " dB"; }

	inline function signedInt(v, unit)
	{
		local r = Math.round(v);
		return (r > 0 ? "+" : "") + Engine.doubleToString(r, 0) + " " + unit;
	}
}

// Per-control display info: title, range subtitle, min / max ring labels, formatter.
const var KNOB_INFO = {
	"knbAAtk":      ["ATTACK",    "0 ms — 10.0 s",     "0",     "10.0",   "time"],
	"knbADec":      ["DECAY",     "0 ms — 10.0 s",     "0",     "10.0",   "time"],
	"knbASus":      ["SUSTAIN",   "0 — 100%",          "0",     "100",    "percent"],
	"knbARel":      ["RELEASE",   "0 ms — 10.0 s",     "0",     "10.0",   "time"],
	"knbFAtk":      ["ATTACK",    "0 ms — 10.0 s",     "0",     "10.0",   "time"],
	"knbFDec":      ["DECAY",     "0 ms — 10.0 s",     "0",     "10.0",   "time"],
	"knbFSus":      ["SUSTAIN",   "0 — 100%",          "0",     "100",    "percent"],
	"knbFRel":      ["RELEASE",   "0 ms — 10.0 s",     "0",     "10.0",   "time"],
	"knbCutoff":    ["CUTOFF",    "",                       "20 Hz", "20 kHz", "freq"],
	"knbReso":      ["RESONANCE", "",                       "0.3",   "8.0",    "reso"],
	"knbFEnvAmt":   ["ENV AMT",   "",                       "-100",  "+100",   "signedPercent"],
	"knbVelCutoff": ["VEL > FILTER", "",             "",     "",     "percent"],
	"knbVolume":    ["VOLUME",    "",                "",     "",     "decibel"],
	"knbGlide":     ["GLIDE",     "",                "",     "",     "time"],
	"knbPitch":     ["PITCH",     "",                "",     "",     "semitones"],
	"knbFine":      ["FINE",      "",                "",     "",     "cents"],
	"knbRvbSize":   ["SIZE",      "0 — 100%",        "0",     "100",    "percent"],
	"knbRvbDamp":   ["DAMPING",   "0 — 100%",        "0",     "100",    "percent"],
	"knbRvbWidth":  ["WIDTH",     "0 — 100%",        "0",     "100",    "percent"],
	"knbRvbMix":    ["MIX",       "return level",       "0",     "100",    "percent"],
	"knbDlyTime":   ["TIME",      "1 ms — 2.00 s",   "1",     "2000",   "time"],
	"knbDlyNote":   ["TIME",      "note value",      "1/1",   "1/64T",  "tempo"],
	"knbDlyFdbk":   ["FEEDBACK",  "0 — 95%",         "0",     "95",     "percent"],
	"knbDlyTone":   ["TONE",      "feedback low-pass", "500 Hz", "20 kHz", "freq"],
	"knbDlyWobble": ["WOBBLE",    "wow + flutter",   "0",     "100",    "percent"],
	"knbDlyMix":    ["MIX",       "return level",       "0",     "100",    "percent"]
};

// (Blackveil) note names for KEY's readout
const var KEY_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
// (Blackveil) KEY: a frequency snapped to the nearest root or fifth of the key (keyRoot: 0 C ..
// 11 B, -1 OFF = unchanged), inside 60..400 Hz (EQ FREQ's range); keySnapNote = its MIDI note
inline function keySnapNote(hz)
{
	local best = -1;
	local bestD = 1000.0;
	local target = 69.0 + 12.0 * Math.log(hz / 440.0) / Math.log(2.0);
	for (ksk = 30; ksk <= 68; ksk++)          // F#1 46 Hz .. G#4 415 Hz (a loop variable of its own)
	{
		local kf = 440.0 * Math.pow(2.0, (ksk - 69) / 12.0);
		local deg = (ksk - keyRoot + 120) % 12;
		if ((deg == 0 || deg == 7) && kf >= 60.0 && kf <= 400.0 && Math.abs(ksk - target) < bestD)
		{
			bestD = Math.abs(ksk - target);
			best = ksk;
		}
	}
	return best;
}
inline function keySnapHz(hz)
{
	if (keyRoot < 0)
		return hz;
	local ksn = keySnapNote(hz);
	return ksn < 0 ? hz : 440.0 * Math.pow(2.0, (ksn - 69) / 12.0);
}

// (Blackveil) FILTER CUTOFF with TYPE COMB (fltComb) and a KEY: snapped to the key's root in the
// nearest octave (so the comb rings at the track's note); combSnapNote = its MIDI note, -1 = no snap
inline function combSnapNote(hz)
{
	if (!fltComb || keyRoot < 0)
		return -1;
	local target = 69.0 + 12.0 * Math.log(hz / 440.0) / Math.log(2.0);
	return Math.range(keyRoot + 12 * Math.round((target - keyRoot) / 12.0), 12 + keyRoot, 132 + keyRoot - 12);
}
inline function combSnapHz(hz)
{
	local csn = combSnapNote(hz);
	return csn < 0 ? hz : 440.0 * Math.pow(2.0, (csn - 69) / 12.0);
}
// ... its readout ("65 Hz C2")
inline function combFreqText(v)
{
	local cfn = combSnapNote(v);
	if (cfn < 0)
		return Fmt.freq(v);
	return Fmt.freq(combSnapHz(v)) + " " + KEY_NOTE_NAMES[cfn % 12] + Engine.doubleToString(Math.floor(cfn / 12) - 1, 0);
}

// (Blackveil) EQ FREQ's readout: with a KEY the snapped frequency and its note ("131 Hz C3")
inline function keyFreqText(v)
{
	local kfn = keyRoot >= 0 ? keySnapNote(v) : -1;
	if (kfn < 0)
		return Fmt.freq(v);
	return Engine.doubleToString(Math.round(keySnapHz(v)), 0) + " Hz " + KEY_NOTE_NAMES[kfn % 12] + Engine.doubleToString(Math.floor(kfn / 12) - 1, 0);
}

inline function formatValue(id, v)
{
	local kind = KNOB_INFO[id][4];
	if (kind == "keyfreq") return keyFreqText(v);
	if (kind == "combfreq") return combFreqText(v);

	if (kind == "semitones") return Fmt.signedInt(v, "st");
	if (kind == "cents") return Fmt.signedInt(v, "ct");
	if (kind == "octInt") return Fmt.signedInt(v, "oct");
	if (kind == "stInt") return Fmt.signedInt(v, "st");
	if (kind == "int") return Engine.doubleToString(Math.round(v), 0);
	if (kind == "resolution") return SEQ_RESOLUTIONS[Math.round(v)];
	if (kind == "seqnote") return SEQ_NOTE_LABELS[Math.round(v) + SEQ_DEGREES];
	if (kind == "seqfreq") return Engine.doubleToString(seqFreqToHz(v), 1) + " Hz";
	if (kind == "rndrange") return "±" + Engine.doubleToString(v, 0) + " st";
	if (kind == "octaves") return (v > 0.005 ? "+" : "") + Engine.doubleToString(v, 1) + " oct";
	if (kind == "seqaux" && seqAuxMode == 1) return Fmt.signedInt(v * SEQ_AUX_DB, "dB");
	if (kind == "seqaux" && seqAuxMode == 2) return Fmt.signedInt(v * SEQ_AUX_START * 100.0, "%");
	if (kind == "seqaux") return (v > 0.005 ? "+" : "") + Engine.doubleToString(v, 1) + " oct";
	if (kind == "tempo") return Engine.getTempoName(parseInt(v));
	if (kind == "seqaux2" && seqAux2Mode == 1) return Fmt.signedInt(v * SEQ_AUX_DB, "dB");
	if (kind == "seqaux2" && seqAux2Mode == 2) return Fmt.signedInt(v * SEQ_AUX_START * 100.0, "%");
	if (kind == "seqaux2") return (v > 0.005 ? "+" : "") + Engine.doubleToString(v, 1) + " oct";
	if (kind == "curve") return Math.abs(v) < 0.5 ? "LINEAR" : (v < 0 ? "LOG " : "EXP ") + Engine.doubleToString(Math.abs(Math.round(v)), 0);
	if (kind == "lfohz") return Engine.doubleToString(v, v < 1 ? 2 : 1) + " Hz";
	if (kind == "lfonote") return LFO_NOTE_NAMES[Math.round(v)];
	if (kind == "ducknote") return DUCK_NOTE_NAMES[Math.round(v)];
	if (kind == "degrees") return Engine.doubleToString(Math.round(v), 0) + "°";
	if (kind == "st") return Engine.doubleToString(v, 1) + " st";
	if (kind == "rate") return Engine.doubleToString(v, v < 10 ? 1 : 0) + " /s";
	if (kind == "stSigned") return (v > 0.05 ? "+" : "") + Engine.doubleToString(v, 1) + " st";

	if (kind == "time") return Fmt.time(v);
	if (kind == "freq") return Fmt.freq(v);
	if (kind == "splitfreq") return v >= 1990 ? "FULL" : Fmt.freq(v);   // (Blackveil's DUCK LOW END)
	if (kind == "monofreq") return v <= 20.5 ? "OFF" : Fmt.freq(v);       // (Blackveil's BASS MONO)
	if (kind == "percent") return Fmt.percent(v);
	if (kind == "signedPercent") return Fmt.signedPercent(v);
	if (kind == "decibel") return Fmt.decibel(v);
	return Engine.doubleToString(v, 2);
}

// ---------------------------------------------------------------------------
// Look and feel

const var laf = Content.createLocalLookAndFeel();

// Macro marks on assignable knobs (see "Macros" in Interface.js): a faint frame while a
// macro is being learned, and five dot slots (macros 1..4, then the LFO) starting at
// dotX, dotY once the knob is assigned (or while learning): filled = assigned to that macro.
inline function drawMacroMarks(g, id, w, h, dotX, dotY)
{
	local tid = isDefined(MOD_ALIAS[id]) ? MOD_ALIAS[id] : id;   // a mirror knob shows its target's dots
	if (!MACRO_TARGETS.contains(tid))
		return;

	local learning = macroLearn >= 0;
	if (learning)
	{
		g.setColour(0x0CFFFFFF);
		g.fillRoundedRectangle([1, 1, w - 2, h - 2], 4.0);
		g.setColour(0x30FFFFFF);
		g.drawRoundedRectangle([1, 1, w - 2, h - 2], 4.0, 1.0);
	}

	local md = macroDepth[tid];
	local any = isDefined(md) && (md[0] != 0 || md[1] != 0 || md[2] != 0 || md[3] != 0 || (md.length > 4 && md[4] != 0));
	if (!any && !learning)
		return;

	for (m = 0; m < 5; m++)   // macros 1..4, then the LFO (a little apart)
	{
		local on = isDefined(md) && m < md.length && md[m] != 0;
		local r = [dotX + m * 7 + (m == 4 ? 3 : 0), dotY, 4.5, 4.5];
		if (on)
		{
			g.setColour(0xFFF4F4F6);
			g.fillEllipse(r);
		}
		else
		{
			g.setColour(m == macroLearn ? 0xA0F4F4F6 : 0x40F4F4F6);
			g.drawEllipse(r, 0.8);
		}
	}
}

// Modulation ring (knobMod in Interface.js): outside the tick ring, a faint band over the
// LFO's swing, a bright arc from the knob's own position to where the modulation has it
// now, and a dot there. a0 / sweep are the knob's start angle and sweep (radians).
inline function drawModRing(g, id, cx, cy, r, norm, a0, sweep, thick)
{
	local km = knobMod[isDefined(MOD_ALIAS[id]) ? MOD_ALIAS[id] : id];
	if (!isDefined(km))
		return;
	local ra = [cx - r, cy - r, 2 * r, 2 * r];
	if (km[1] >= 0 && km[2] > km[1])
	{
		local band = Content.createPath();
		band.startNewSubPath(0, 0);   // anchors: drawPath scales the path's bounds to the area
		band.startNewSubPath(1, 1);
		band.addArc([0, 0, 1, 1], a0 + sweep * km[1], a0 + sweep * km[2]);
		g.setColour(0x60F4F4F6);
		g.drawPath(band, ra, thick);
	}
	if (Math.abs(km[0] - norm) > 0.002)
	{
		local arc = Content.createPath();
		arc.startNewSubPath(0, 0);
		arc.startNewSubPath(1, 1);
		arc.addArc([0, 0, 1, 1], a0 + sweep * Math.min(norm, km[0]), a0 + sweep * Math.max(norm, km[0]));
		g.setColour(0xFFF4F4F6);
		g.drawPath(arc, ra, thick);
	}
	local da = a0 + sweep * km[0];
	local dr = thick + 1.5;
	g.setColour(0xFFFFFFFF);
	g.fillEllipse([cx + Math.sin(da) * r - dr, cy - Math.cos(da) * r - dr, 2 * dr, 2 * dr]);
}

// ---- Hardware fader (the MAIN view's MIX strips, pnlMixFader* in Interface.js): title,
// a recessed slot with a printed scale (dB with a unity mark, or %), a ridged metal cap with
// a white index line (glowing like the knob pointers), the readout and the macro dots.
// The cap follows the macros (knobMod[id][3]); the LFO / sequencer show as a line beside the
// slot, like the bar sliders. FADER_GEOM: [slot top, slot bottom (cap centre range), cap w, h].
const var FADER_GEOM = [40, 128, 46, 22];

inline function faderY(n)
{
	return FADER_GEOM[1] - (FADER_GEOM[1] - FADER_GEOM[0]) * n;
}

inline function drawFader(g, id, w, h, hover)
{
	local info = KNOB_INFO[id];
	local c = Content.getComponent(id);
	local n = c.getValueNormalized();
	local km = knobMod[isDefined(MOD_ALIAS[id]) ? MOD_ALIAS[id] : id];
	local thin = w < 110;                            // the sends: a narrower cap and slot
	local cx = Math.round(w / 2) + (thin ? 6 : 0);    // (room for the scale labels on the left)
	local y0 = FADER_GEOM[0];
	local y1 = FADER_GEOM[1];
	local cw = thin ? 28 : FADER_GEOM[2];
	local hw = cw / 2;
	local sw = thin ? 2 : 3;                         // half the slot's width
	local ch = FADER_GEOM[3];

	// title (+ what a send sends, faint)
	g.setColour(Theme.TEXT);
	g.setFontWithSpacing(Theme.FONT_BOLD, 13.0, 0.08);
	g.drawAlignedText(info[0], [cx - w / 2, 0, w, 15], "centred");
	if (info[1] != "")
	{
		g.setColour(Theme.TEXT_FAINT);
		g.setFont(Theme.FONT, 11.5);
		g.drawAlignedText(info[1], [cx - w / 2, 15, w, 13], "centred");
	}

	// printed scale: ticks both sides of the slot, labels on the left
	local db = info[4] == "decibel";
	local marks = db ? [6, 0, -6, -12, -24, -60] : [100, 75, 50, 25, 0];
	g.setFont(Theme.FONT, 11.5);
	for (m in marks)
	{
		local ty = Math.round(faderY(macroNorm(c, m))) + 0.5;
		local unity = db && m == 0;
		g.setColour(unity ? 0xFFEDEDF0 : 0x99A8ABB2);
		g.drawLine(cx - hw - 11, cx - hw + (unity ? 1 : -3), ty, ty, unity ? 1.4 : 1.0);
		g.drawLine(cx + hw - (unity ? 1 : -3), cx + hw + 11, ty, ty, unity ? 1.4 : 1.0);
		g.setColour(unity ? Theme.TEXT : Theme.TEXT_DIM);
		g.drawAlignedText(db && m > 0 ? "+" + m : "" + m, [0, ty - 7, cx - hw - 15, 14], "right");
	}
	// minor ticks between the marks (every 1/16 of the travel)
	g.setColour(0x55A8ABB2);
	for (i = 0; i <= 16; i++)
	{
		local my = Math.round(y0 + (y1 - y0) * i / 16.0) + 0.5;
		g.drawLine(cx - hw - 7, cx - hw - 3, my, my, 0.8);
		g.drawLine(cx + hw + 3, cx + hw + 7, my, my, 0.8);
	}

	// the slot: a black groove, darker inside, a catch light on its lower right edge
	local sl = [cx - sw, y0 - 8, 2 * sw, y1 - y0 + 16];
	g.setColour(0xFF020203);
	g.fillRoundedRectangle(sl, sw);
	g.setColour(0x16FFFFFF);
	g.drawLine(cx + sw + 0.5, cx + sw + 0.5, y0 - 6, y1 + 6, 1.0);
	g.setColour(0xFF000000);
	g.drawLine(cx - sw - 0.5, cx - sw - 0.5, y0 - 6, y1 + 6, 1.0);

	// modulation beside the slot: the LFO's swing (faint), own value -> now (bright), a dot
	if (isDefined(km))
	{
		local mx = cx + sw + 6;
		if (km[1] >= 0 && km[2] > km[1])
		{
			g.setColour(0x60F4F4F6);
			g.fillRect([mx - 1, faderY(km[2]), 2, faderY(km[1]) - faderY(km[2])]);
		}
		g.setColour(0xFFF4F4F6);
		g.fillRect([mx - 1, Math.min(faderY(n), faderY(km[0])), 2, Math.abs(faderY(n) - faderY(km[0]))]);
		g.fillEllipse([mx - 3, faderY(km[0]) - 3, 6, 6]);
	}

	// the cap, where the macros have it
	local cy = Math.round(faderY(isDefined(km) ? km[3] : n));
	local cap = [cx - cw / 2, cy - ch / 2, cw, ch];
	g.drawDropShadow([cap[0] + 2, cap[1] + 5, cw - 4, ch], 0xE0000000, 12);
	g.drawDropShadow([cap[0], cap[1] + 2, cw, ch], 0xA0000000, 4);
	// body: light from above, like the knob rims
	g.setGradientFill([hover ? 0xFF73767D : 0xFF5E6167, 0, cap[1], 0xFF141517, 0, cap[1] + ch, false]);
	g.fillRoundedRectangle(cap, 3.0);
	// top face, a little inset, brushed: slightly lighter at the upper left
	g.setGradientFill([0xFF46494F, cap[0], cap[1], 0xFF1E1F23, cap[0] + cw, cap[1] + ch, false]);
	g.fillRoundedRectangle([cap[0] + 2, cap[1] + 2, cw - 4, ch - 4], 2.0);
	// grip ridges above and below the index line
	for (r in [-7, -4, 4, 7])
	{
		g.setColour(0xB0000000);
		g.drawLine(cap[0] + (thin ? 4 : 5), cap[0] + cw - (thin ? 4 : 5), cy + r - 0.5, cy + r - 0.5, 1.0);
		g.setColour(0x26FFFFFF);
		g.drawLine(cap[0] + (thin ? 4 : 5), cap[0] + cw - (thin ? 4 : 5), cy + r + 0.5, cy + r + 0.5, 1.0);
	}
	// index line with a glow (as the knob pointers)
	g.setColour(0x30FFFFFF);
	g.drawLine(cap[0] + 3, cap[0] + cw - 3, cy, cy, 4.5);
	g.setColour(0xFFF6F6F8);
	g.drawLine(cap[0] + 3, cap[0] + cw - 3, cy, cy, 2.0);
	// bevel: catch light on top, a hairline rim
	g.setColour(0x40FFFFFF);
	g.drawLine(cap[0] + 3, cap[0] + cw - 3, cap[1] + 0.5, cap[1] + 0.5, 1.0);
	g.setColour(hover ? 0x50FFFFFF : 0x20FFFFFF);
	g.drawRoundedRectangle(cap, 3.0, 1.0);

	// readout and macro dots
	g.setColour(Theme.TEXT);
	g.setFont(Theme.FONT_BOLD, 14.5);
	g.drawAlignedText(formatValue(id, isDefined(km) ? km[4] : c.getValue()), [cx - w / 2, y1 + 14, w, 18], "centred");
	drawMacroMarks(g, id, w, h, cx - 12.5, h - 5);
}

// ---- Knob face: a static "brushed cone" (the reflection doesn't turn with the knob).
// HISE has no conic gradient, so the face is made of thin pie wedges with a brightness
// that depends on their angle: a broad light from the upper left, a specular band at the
// upper right and a dark wedge at the lower right (see docs/design-mockup.png).

namespace KnobFace
{
	const var NUM_WEDGES = 120;
	const var wedges = [];
	const var shades = [];

	// angle in JUCE convention: 0 = 12 o'clock, clockwise
	inline function shadeAt(angle)
	{
		local broad = 0.5 + 0.5 * Math.cos(angle + 0.75);                // lit from the upper left
		local d1 = (angle - 0.62) / 0.26;
		local spec = Math.exp(-d1 * d1);                                  // highlight at upper right
		local d2 = (angle - 2.45) / 0.6;
		local dark = Math.exp(-d2 * d2);                                  // shadow wedge, lower right
		local v = 0.035 + 0.16 * broad + 0.20 * spec - 0.09 * dark;
		return Math.range(v, 0.01, 0.40);
	}

	inline function grey(v, alpha)
	{
		local c = Math.round(v * 255);
		return Colours.fromVec4([c / 255, c / 255, c / 255, alpha]);
	}

	for (i = 0; i < NUM_WEDGES; i++)
	{
		local a0 = i * 2 * Math.PI / NUM_WEDGES;
		local a1 = (i + 1.5) * 2 * Math.PI / NUM_WEDGES; // overlap hides the seams
		local p = Content.createPath();
		// anchor the unit square so fillPath doesn't stretch the wedge
		p.startNewSubPath(0, 0);
		p.startNewSubPath(1, 1);
		p.addPieSegment([0, 0, 1, 1], a0, a1, 0.0);
		wedges.push(p);
		shades.push(grey(shadeAt((a0 + a1) / 2), 1.0));
	}

	const var circle = Content.createPath();
	circle.addEllipse([0, 0, 1, 1]);
}

// Knob cell (130 x 150): title, range, tick ring, shadowed knob with pointer,
// min / max labels under the ring ends and the value readout.
// Cells under 120 px tall (sequencer stages, 110 x 96) get a compact version: smaller
// knob, no range line and no min / max labels.
// a control whose module / mode is switched off draws darker (uiDim[id] = true, set by the
// interface; still editable)
inline function dimColour(c, f) { return f >= 1.0 ? c : Colours.withMultipliedBrightness(c, f); }

laf.registerFunction("drawRotarySlider", function(g, obj)
{
	var info = KNOB_INFO[obj.id];
	var kd = uiDim[obj.id] == true ? 0.4 : 1.0;   // switched off (uiDim): darker
	var a = obj.area;
	var w = a[2];
	var norm = Content.getComponent(obj.id).getValueNormalized();
	var cx = w / 2;
	var compact = a[3] < 120;
	var mini = a[3] < 90;                            // envelope blocks (81 x 84): smaller still
	var sc = mini ? 0.56 : (compact ? 0.68 : 1.0);   // compact scale
	var cy = mini ? 40 : (compact ? 50 : 74);
	var kr = 31.0 * sc;                              // outer radius of the knob
	var fr = kr * 0.86;                              // radius of the face inside the rim
	var start = -2.356;                              // 270 degree sweep
	var range = 4.712;
	var knobArea = [cx - kr, cy - kr, 2 * kr, 2 * kr];
	var faceArea = [cx - fr, cy - fr, 2 * fr, 2 * fr];

	// title + range
	g.setColour(dimColour(compact ? Theme.TEXT_DIM : Theme.TEXT, kd));
	g.setFontWithSpacing(Theme.FONT_BOLD, mini ? 11.5 : (compact ? 12.0 : 14.5), 0.08);
	g.drawAlignedText(info[0], [0, 0, w, 16], "centred");
	if (!compact)
	{
		g.setColour(dimColour(Theme.TEXT_FAINT, kd));
		g.setFont(Theme.FONT, 13.0);
		g.drawAlignedText(info[1], [0, 16, w, 14], "centred");
	}

	// tick ring: dense faint minor ticks, bold major ticks every 45 degrees
	for (i = 0; i <= 60; i++)
	{
		var ang = start + range * i / 60.0;
		var major = (i % 10 == 0);
		var s = Math.sin(ang);
		var c = Math.cos(ang);
		var r1 = kr + (major ? 3.5 : 5.0) * sc;
		var r2 = kr + (major ? 11.0 : 8.0) * sc;
		g.setColour(dimColour(major ? 0xFFEDEDF0 : 0x99A8ABB2, kd));
		g.drawLine(cx + s * r1, cx + s * r2, cy - c * r1, cy - c * r2, major ? 1.6 : 0.8);
	}

	// modulation ring (macros, LFO, sequencer) just outside the ticks
	drawModRing(g, obj.id, cx, cy, kr + 14.0 * sc, norm, start, range, mini ? 1.6 : 2.0);

	// drop shadow under the knob (soft, slightly below)
	g.drawDropShadowFromPath(KnobFace.circle, knobArea, 0xF0000000, compact ? 14 : 22, [0, compact ? 5 : 8]);
	g.drawDropShadowFromPath(KnobFace.circle, knobArea, 0xC0000000, compact ? 4 : 6, [0, compact ? 2 : 3]);

	// rim: bevelled edge, light at the top, dark at the bottom
	g.setGradientFill([dimColour(obj.hover ? 0xFF65676D : 0xFF4E5055, kd), cx, cy - kr,
	                   dimColour(0xFF08090B, kd), cx, cy + kr, false]);
	g.fillEllipse(knobArea);

	// face: a solid base (so wedge seams can't show through), then the brushed cone
	g.setColour(dimColour(0xFF121315, kd));
	g.fillEllipse(faceArea);
	for (i = 0; i < KnobFace.NUM_WEDGES; i++)
	{
		g.setColour(dimColour(KnobFace.shades[i], kd));
		g.fillPath(KnobFace.wedges[i], faceArea);
	}

	// inner shadow where the face meets the rim, plus a hairline catch light on top
	g.drawInnerShadowFromPath(KnobFace.circle, faceArea, 0xB0000000, 6, [0, 2]);
	g.setColour(dimColour(0x22FFFFFF, kd));
	g.drawEllipse([cx - fr + 0.5, cy - fr + 0.5, 2 * fr - 1, 2 * fr - 1], 0.8);

	// pointer: from the centre to the face edge, with a faint glow; it follows the macros
	// (knobMod), the ring above still starts at the knob's own value
	var kmr = knobMod[isDefined(MOD_ALIAS[obj.id]) ? MOD_ALIAS[obj.id] : obj.id];
	var pa = start + range * (isDefined(kmr) ? kmr[3] : norm);
	var ps = Math.sin(pa);
	var pc = Math.cos(pa);
	g.setColour(dimColour(0x30FFFFFF, kd));
	g.drawLine(cx, cx + ps * (fr - 2.0), cy, cy - pc * (fr - 2.0), 4.5);
	g.setColour(dimColour(0xFFF6F6F8, kd));
	g.drawLine(cx, cx + ps * (fr - 2.0), cy, cy - pc * (fr - 2.0), 2.0);

	// min / max labels below the ends of the ring (not in compact cells)
	if (!compact)
	{
		var lx = Math.sin(start) * (kr + 11.0);
		var ly = cy + Math.cos(start) * -(kr + 11.0) + 6;
		g.setColour(dimColour(Theme.TEXT_DIM, kd));
		g.setFont(Theme.FONT, 13.0);
		g.drawAlignedText(info[2], [cx + lx - 30, ly, 60, 14], "centred");
		g.drawAlignedText(info[3], [cx - lx - 30, ly, 60, 14], "centred");
	}

	// value readout
	g.setColour(dimColour(Theme.TEXT, kd));
	g.setFont(Theme.FONT_BOLD, mini ? 13.0 : (compact ? 14.5 : 16.5));
	g.drawAlignedText(formatValue(obj.id, isDefined(kmr) ? kmr[4] : obj.value), [0, a[3] - (mini ? 17 : (compact ? 18 : 21)), w, 20], "centred");

	if (!compact)
		drawMacroMarks(g, obj.id, w, a[3], cx - 12.5, cy + kr + 4);   // in the gap at the bottom of the ring
	else
		drawMacroMarks(g, obj.id, w, a[3], cx - 12.5, cy + kr + 2);
});

// Bottom-bar slider (240 x 44): title, thin track with a white thumb, value at the right.
laf.registerFunction("drawLinearSlider", function(g, obj)
{
	var info = KNOB_INFO[obj.id];
	var a = obj.area;
	var w = a[2];
	var norm = Content.getComponent(obj.id).getValueNormalized();
	var trackW = w - 70;
	var ty = 30;

	// compact variant (sequencer RANGE, 92 wide): title and value on top, track below
	if (w < 120)
	{
		g.setColour(Theme.TEXT_DIM);
		g.setFontWithSpacing(Theme.FONT_BOLD, 12.5, 0.12);
		g.drawAlignedText(info[0], [0, 0, w, 14], "left");
		g.setFont(Theme.FONT, 13.5);
		g.drawAlignedText(formatValue(obj.id, obj.value), [0, 0, w, 14], "right");

		var cx = 5 + (w - 10) * norm;
		g.setColour(0xFF3A3D43);
		g.fillRoundedRectangle([5, 23, w - 10, 2], 1.0);
		g.setColour(0xFFD8D8DC);
		g.fillRoundedRectangle([5, 23, cx - 5, 2], 1.0);
		g.setColour(0xFFF4F4F6);
		g.fillEllipse([cx - 5, 19, 10, 10]);
		return;
	}

	g.setColour(Theme.TEXT_DIM);
	g.setFontWithSpacing(Theme.FONT_BOLD, 13.0, 0.12);
	g.drawAlignedText(info[0], [0, 0, w, 16], "left");

	g.setColour(0xFF3A3D43);
	g.fillRoundedRectangle([0, ty - 1, trackW, 2], 1.0);
	g.setColour(0xFFD8D8DC);
	var km = knobMod[obj.id];
	var tx = trackW * norm;                                // the slider's own value
	var thx = isDefined(km) ? trackW * km[3] : tx;         // the thumb follows the macros
	// symmetric ranges (pitch, fine) fill from the centre
	if (obj.min < 0 && obj.min == -obj.max)
	{
		var c0 = trackW * 0.5;
		g.fillRoundedRectangle([Math.min(c0, thx), ty - 1, Math.abs(thx - c0), 2], 1.0);
		g.fillRect([c0 - 0.5, ty - 4, 1, 8]);
	}
	else
		g.fillRoundedRectangle([0, ty - 1, thx, 2], 1.0);

	// modulation (knobMod in Interface.js): the LFO's swing as a faint band under the track,
	// a bright line from the slider's own value to where the modulation has it now, and a dot there
	if (isDefined(km))
	{
		if (km[1] >= 0 && km[2] > km[1])
		{
			g.setColour(0x60F4F4F6);
			g.fillRoundedRectangle([trackW * km[1], ty + 5, trackW * (km[2] - km[1]), 2], 1.0);
		}
		var mx = trackW * km[0];
		g.setColour(0xFFF4F4F6);
		g.fillRoundedRectangle([Math.min(tx, mx), ty + 5, Math.abs(mx - tx), 2], 1.0);
		g.fillEllipse([mx - 3, ty + 3, 6, 6]);
	}

	g.setColour(0xFFF4F4F6);
	g.fillEllipse([thx - 6, ty - 6, 12, 12]);
	if (obj.hover)
	{
		g.setColour(0x30FFFFFF);
		g.drawEllipse([thx - 9, ty - 9, 18, 18], 1.0);
	}

	g.setColour(Theme.TEXT_DIM);
	g.setFont(Theme.FONT, 14.0);
	g.drawAlignedText(formatValue(obj.id, isDefined(km) ? km[4] : obj.value), [trackW + 8, ty - 9, 62, 18], "right");

	// right after the title (VOLUME has its CLIP light further right)
	drawMacroMarks(g, obj.id, w, a[3], info[0].length * 9 + 8, 6);
});

// Small pill toggle (delay SYNC): outlined when off, dark fill with a light outline and white text when on.
laf.registerFunction("drawToggleButton", function(g, obj)
{
	var a = [0.5, 0.5, obj.area[2] - 1, obj.area[3] - 1];
	var on = obj.value > 0.5;

	// a node's power button (Blackveil, text "POWER"): a ring open at the top with the power
	// stroke, white when on, grey when off
	if (obj.text == "POWER")
	{
		var pcx = obj.area[2] / 2;
		var pcy = obj.area[3] / 2;
		var prr = Math.min(pcx, pcy) - 3;
		var pp = Content.createPath();
		pp.startNewSubPath(pcx - prr, pcy - prr);
		pp.startNewSubPath(pcx + prr, pcy + prr);
		pp.addArc([pcx - prr, pcy - prr, 2 * prr, 2 * prr], 0.7, 2.0 * Math.PI - 0.7);
		pp.startNewSubPath(pcx, pcy - prr - 1);
		pp.lineTo(pcx, pcy);
		g.setColour(on ? 0xFFF4F4F6 : (obj.over ? 0xFF8A8D94 : 0xFF5C5F66));
		g.drawPath(pp, [pcx - prr, pcy - prr - 1, 2 * prr, 2 * prr + 1], 1.6);
		return;
	}

	// sequencer step pads, styled like the knobs: drop shadow, bevelled rim, dark face
	// with an inner shadow, and an LED strip that glows when the step is on
	if (obj.id.indexOf("btnSeqStep") == 0)
	{
		var box = [4, 2, obj.area[2] - 8, obj.area[3] - 10];
		var face = [box[0] + 3, box[1] + 3, box[2] - 6, box[3] - 6];
		var boxPath = Content.createPath();
		boxPath.addRoundedRectangle(box, 6.0);
		var facePath = Content.createPath();
		facePath.addRoundedRectangle(face, 4.0);

		g.drawDropShadowFromPath(boxPath, box, 0xE0000000, 12, [0, 5]);
		g.drawDropShadowFromPath(boxPath, box, 0xA0000000, 4, [0, 2]);

		g.setGradientFill([obj.over ? 0xFF65676D : 0xFF4E5055, 0, box[1],
		                   0xFF08090B, 0, box[1] + box[3], false]);
		g.fillRoundedRectangle(box, 6.0);

		// the step that is playing gets a bright outline (seqPlayingStep: Interface.js)
		if (parseInt(obj.id.substring(10, 12)) - 1 == seqPlayingStep)
		{
			g.setColour(0xC0F4F4F6);
			g.drawRoundedRectangle([box[0] - 1.5, box[1] - 1.5, box[2] + 3, box[3] + 3], 7.0, 1.5);
		}

		// face: lit from above like the knob faces; slightly darker ("pressed") when on
		g.setGradientFill([on ? 0xFF222428 : 0xFF2A2C31, 0, face[1],
		                   on ? 0xFF0C0D0F : 0xFF111214, 0, face[1] + face[3], false]);
		g.fillRoundedRectangle(face, 4.0);
		g.drawInnerShadowFromPath(facePath, face, 0xB0000000, 5, [0, 2]);

		// LED strip
		var led = [face[0] + face[2] * 0.2, face[1] + face[3] / 2 - 2, face[2] * 0.6, 4];
		if (on)
		{
			g.setColour(0x30FFFFFF);
			g.fillRoundedRectangle([led[0] - 3, led[1] - 3, led[2] + 6, led[3] + 6], 4.0);
			g.setColour(0xFFF6F6F8);
		}
		else
			g.setColour(0xFF2A2C31);
		g.fillRoundedRectangle(led, 2.0);

		// beyond the sequence LENGTH (seqLength: Interface.js): veiled
		if (parseInt(obj.id.substring(10, 12)) > seqLength)
		{
			g.setColour(0xB00F1013);
			g.fillRoundedRectangle([box[0] - 2, box[1] - 2, box[2] + 4, box[3] + 4], 7.0);
		}
		return;
	}

	// sequencer NOTES / FREQ switch: two segments, the active one lit
	// the NOTES | FREQ switch (pitch row)
	var td = uiDim[obj.id] == true ? 0.4 : 1.0;   // switched off (uiDim): darker
	// any toggle whose text is "OFF|ON", "FREE|SYNC", ...: both positions written, the current one lit
	if (obj.id == "btnSeqFreq" || obj.id == "btnFilterParallel" || obj.text.indexOf("|") != -1)
	{
		var segs = obj.id == "btnSeqFreq" ? ["NOTES", "FREQ"] : (obj.id == "btnFilterParallel" ? ["SERIAL", "PARALLEL"] : obj.text.split("|"));
		var half = a[2] / 2;
		g.setColour(dimColour(0xFF16171A, td));
		g.fillRoundedRectangle(a, 3.0);
		g.setColour(dimColour(0xFF2E3035, td));
		g.fillRoundedRectangle([a[0] + (on ? half : 0) + 2, a[1] + 2, half - 4, a[3] - 4], 2.0);
		g.setColour(dimColour(obj.over ? 0xFF6A6D74 : Theme.LINE, td));
		g.drawRoundedRectangle(a, 3.0, 1.0);
		g.setFontWithSpacing(Theme.FONT_BOLD, 11.5, 0.12);
		g.setColour(dimColour(on ? Theme.TEXT_DIM : 0xFFF4F4F6, td));
		g.drawAlignedText(segs[0], [a[0], a[1], half, a[3]], "centred");
		g.setColour(dimColour(on ? 0xFFF4F4F6 : Theme.TEXT_DIM, td));
		g.drawAlignedText(segs[1], [a[0] + half, a[1], half, a[3]], "centred");
		return;
	}

	g.setColour(on ? 0xFF24262A : (obj.over ? 0xFF6A6D74 : Theme.LINE));
	if (on)
		g.fillRoundedRectangle(a, a[3] / 2);
	else
		g.drawRoundedRectangle(a, a[3] / 2, 1.0);
	if (on)
	{
		g.setColour(0xFF6A6D74);
		g.drawRoundedRectangle(a, a[3] / 2, 1.0);
	}
	g.setColour(on ? 0xFFF4F4F6 : Theme.TEXT_DIM);
	g.setFontWithSpacing(Theme.FONT_BOLD, 12.0, 0.14);
	g.drawAlignedText(obj.text, obj.area, "centred");
});

laf.registerFunction("drawComboBox", function(g, obj)
{
	var a = obj.area;
	var cd = uiDim[obj.id] == true ? 0.4 : 1.0;

	if (obj.id == "knbSound")
	{
		// the sample name, set large; the arrows next to it are separate panels
		g.setColour(dimColour(obj.hover ? 0xFFFFFFFF : Theme.TEXT, cd));
		g.setFont(Theme.FONT, 21.0);
		g.drawAlignedText(obj.text, [0, 0, a[2], a[3]], "left");
		return;
	}

	g.setColour(dimColour(0xFF121317, cd));
	g.fillRect([0, 0, a[2], a[3]]);
	g.setColour(dimColour(obj.hover ? 0xFF55585F : Theme.LINE, cd));
	g.drawRect([0, 0, a[2], a[3]], 1.0);
	g.setColour(dimColour(obj.enabled ? Theme.TEXT : 0xFF3A3C42, cd));
	g.setFont(Theme.FONT, a[2] < 110 ? 12.5 : 16.0);   // narrow (node) combos: smaller
	g.drawAlignedText(obj.text, [a[2] < 110 ? 8 : 12, 0, a[2] - (a[2] < 110 ? 26 : 34), a[3]], "left");

	// chevron
	var p = Content.createPath();
	p.startNewSubPath(0, 0);
	p.lineTo(0.5, 0.5);
	p.lineTo(1, 0);
	g.setColour(dimColour(Theme.TEXT_DIM, cd));
	g.drawPath(p, [a[2] - 24, a[3] / 2 - 2, 10, 5], 1.5);
});

laf.registerFunction("drawPopupMenuBackground", function(g, obj)
{
	g.fillAll(0xFF121317);
	g.setColour(Theme.LINE);
	g.drawRect([0, 0, obj.width, obj.height], 1.0);
});

laf.registerFunction("drawPopupMenuItem", function(g, obj)
{
	var a = obj.area;

	if (obj.isHighlighted)
	{
		g.setColour(0xFF23252A);
		g.fillRect(a);
	}

	g.setColour(obj.isTicked ? 0xFFFFFFFF : Theme.TEXT_DIM);
	g.setFont(obj.isTicked ? Theme.FONT_BOLD : Theme.FONT, 16.0);
	g.drawAlignedText(obj.text, [a[0] + 14, a[1], a[2] - 20, a[3]], "left");
});
