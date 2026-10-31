// Minimal headless VST3 host: loads a plugin, plays a fixed note sequence and writes the
// output to a 32-bit float WAV. Used to check that the exported plugin finds its samples
// and makes sound without opening a DAW. A plugin with an audio input (an effect) also gets
// a synthetic kick on every beat (120 BPM) as its input.
//
// Usage: renderhost <plugin.vst3> <out.wav> ["Param Name=normalised value" ...]
//        e.g. renderhost Blackveil.vst3 out.wav "Mix=0.5"

#include "public.sdk/source/vst/hosting/eventlist.h"
#include "public.sdk/source/vst/hosting/hostclasses.h"
#include "public.sdk/source/vst/hosting/module.h"
#include "public.sdk/source/vst/hosting/parameterchanges.h"
#include "public.sdk/source/vst/hosting/plugprovider.h"
#include "public.sdk/source/vst/hosting/processdata.h"
#include "public.sdk/source/vst/utility/stringconvert.h"
#include "pluginterfaces/vst/ivstaudioprocessor.h"
#include "pluginterfaces/vst/ivstcomponent.h"
#include "pluginterfaces/vst/ivsteditcontroller.h"
#include "pluginterfaces/vst/ivstevents.h"

#include <windows.h>
#include <chrono>
#include <cmath>
#include <cstdio>
#include <fstream>
#include <thread>
#include <vector>

using namespace Steinberg;
using namespace Steinberg::Vst;

static const double kSampleRate = 48000.0;
static const int kBlock = 512;

struct NoteEvent
{
	double time;
	int pitch;
	bool on;
};

static void writeWav (const char* path, const std::vector<float>& l, const std::vector<float>& r)
{
	std::ofstream f (path, std::ios::binary);
	auto w32 = [&] (uint32_t v) { f.write ((const char*)&v, 4); };
	auto w16 = [&] (uint16_t v) { f.write ((const char*)&v, 2); };
	uint32_t n = (uint32_t)l.size ();
	f.write ("RIFF", 4); w32 (36 + n * 8); f.write ("WAVE", 4);
	f.write ("fmt ", 4); w32 (16); w16 (3); w16 (2); w32 ((uint32_t)kSampleRate);
	w32 ((uint32_t)kSampleRate * 8); w16 (8); w16 (32);
	f.write ("data", 4); w32 (n * 8);
	for (uint32_t i = 0; i < n; i++)
	{
		f.write ((const char*)&l[i], 4);
		f.write ((const char*)&r[i], 4);
	}
}

static void pumpMessages ()
{
	MSG msg;
	while (PeekMessage (&msg, nullptr, 0, 0, PM_REMOVE))
	{
		TranslateMessage (&msg);
		DispatchMessage (&msg);
	}
}

int main (int argc, char* argv[])
{
	if (argc < 3)
	{
		printf ("usage: renderhost <plugin.vst3> <out.wav> [\"Param Name=normalised value\" ...]\n");
		return 1;
	}

	std::string error;
	auto module = VST3::Hosting::Module::create (argv[1], error);
	if (!module)
	{
		printf ("could not load module: %s\n", error.c_str ());
		return 1;
	}

	auto hostApp = owned (new HostApplication ());
	PluginContextFactory::instance ().setPluginContext (hostApp);

	auto factory = module->getFactory ();
	VST3::Hosting::ClassInfo audioClass;
	bool found = false;
	for (auto& ci : factory.classInfos ())
	{
		if (ci.category () == kVstAudioEffectClass)
		{
			audioClass = ci;
			found = true;
			break;
		}
	}
	if (!found)
	{
		printf ("no audio effect class found\n");
		return 1;
	}
	printf ("plugin: %s (%s)\n", audioClass.name ().c_str (), audioClass.vendor ().c_str ());

	auto provider = owned (new PlugProvider (factory, audioClass, true));
	if (!provider->initialize ())
	{
		printf ("could not initialise plugin\n");
		return 1;
	}

	IPtr<IComponent> component = provider->getComponentPtr ();
	IPtr<IEditController> controller = provider->getControllerPtr ();
	FUnknownPtr<IAudioProcessor> processor (component);
	if (!processor)
	{
		printf ("no IAudioProcessor\n");
		return 1;
	}

	// optional "Name=normalisedValue" arguments, applied at 1 s (before the first note).
	// A bare number is the old form and sets "Sound".
	struct ParamSet
	{
		std::string name;
		double value;
		ParamID id = 0xFFFFFFFF;
	};
	std::vector<ParamSet> paramSets;
	// "~Param Name": steps that parameter every 25 ms during the single note (3.2..4.8 s),
	// 0.3 -> 0.8 -> 0.3 normalised, like a knob being dragged (for zipper-noise tests)
	ParamSet sweep {"", 0.0};
	for (int a = 3; a < argc; a++)
	{
		std::string s = argv[a];
		auto eq = s.find ('=');
		if (s[0] == '~')
			sweep.name = s.substr (1);
		else if (eq == std::string::npos)
			paramSets.push_back ({"Sound", atof (s.c_str ())});
		else
			paramSets.push_back ({s.substr (0, eq), atof (s.substr (eq + 1).c_str ())});
	}

	if (controller)
	{
		for (int32 i = 0; i < controller->getParameterCount (); i++)
		{
			ParameterInfo info;
			controller->getParameterInfo (i, info);
			auto title = VST3::StringConvert::convert (info.title);
			if (title.rfind ("MIDI CC", 0) != 0)
				printf ("  param %d: %s\n", (int)info.id, title.c_str ());
			for (auto& ps : paramSets)
				if (title == ps.name)
					ps.id = info.id;
			if (title == sweep.name)
				sweep.id = info.id;
		}
	}

	if (!sweep.name.empty () && sweep.id == 0xFFFFFFFF)
		printf ("warning: no parameter named '%s'\n", sweep.name.c_str ());

	for (auto& ps : paramSets)
		if (ps.id == 0xFFFFFFFF)
			printf ("warning: no parameter named '%s'\n", ps.name.c_str ());

	ProcessSetup setup {kRealtime, kSample32, kBlock, kSampleRate};
	if (processor->setupProcessing (setup) != kResultOk)
		printf ("warning: setupProcessing failed\n");

	component->activateBus (kAudio, kOutput, 0, true);
	const bool hasInput = component->getBusCount (kAudio, kInput) > 0;
	if (hasInput)
		component->activateBus (kAudio, kInput, 0, true);
	component->activateBus (kEvent, kInput, 0, true);
	component->setActive (true);
	processor->setProcessing (true);

	HostProcessData data;
	data.prepare (*component, kBlock, kSample32);
	EventList events;
	ParameterChanges inChanges, outChanges;
	ProcessContext ctx {};
	ctx.sampleRate = kSampleRate;
	ctx.tempo = 120.0;
	ctx.state = ProcessContext::kPlaying | ProcessContext::kTempoValid;
	data.inputEvents = &events;
	data.inputParameterChanges = &inChanges;
	data.outputParameterChanges = &outChanges;
	data.processContext = &ctx;

	// 3 s warm-up for sample loading, then a single note and a C major chord
	std::vector<NoteEvent> seq = {
		{3.0, 48, true}, {5.0, 48, false},
		{6.0, 48, true}, {6.0, 52, true}, {6.0, 55, true},
		{8.0, 48, false}, {8.0, 52, false}, {8.0, 55, false},
	};
	const double length = 9.5;
	const double paramChangeTime = 1.0;

	std::vector<float> outL, outR;
	int64 pos = 0;
	auto blockDuration = std::chrono::microseconds ((int64)(1e6 * kBlock / kSampleRate));

	while (pos < (int64)(length * kSampleRate))
	{
		auto start = std::chrono::steady_clock::now ();
		events.clear ();
		inChanges.clearQueue ();

		double t0 = pos / kSampleRate;
		double t1 = (pos + kBlock) / kSampleRate;

		// musical position like a DAW sends it (needed by tempo-synced code, e.g. the
		// sequencer's grid): 4/4, song position in quarter notes, bar start
		ctx.state = ProcessContext::kPlaying | ProcessContext::kTempoValid | ProcessContext::kProjectTimeMusicValid |
		            ProcessContext::kBarPositionValid | ProcessContext::kTimeSigValid;
		ctx.timeSigNumerator = 4;
		ctx.timeSigDenominator = 4;
		ctx.projectTimeSamples = pos;
		ctx.projectTimeMusic = t0 * ctx.tempo / 60.0;
		ctx.barPositionMusic = 4.0 * (double)(int64)(ctx.projectTimeMusic / 4.0);

		for (auto& ne : seq)
		{
			if (ne.time >= t0 && ne.time < t1)
			{
				Event e {};
				e.busIndex = 0;
				e.sampleOffset = (int32)((ne.time - t0) * kSampleRate);
				if (ne.on)
				{
					e.type = Event::kNoteOnEvent;
					e.noteOn.channel = 0;
					e.noteOn.pitch = (int16)ne.pitch;
					e.noteOn.velocity = 1.0f;
					e.noteOn.noteId = -1;
				}
				else
				{
					e.type = Event::kNoteOffEvent;
					e.noteOff.channel = 0;
					e.noteOff.pitch = (int16)ne.pitch;
					e.noteOff.velocity = 0.0f;
					e.noteOff.noteId = -1;
				}
				events.addEvent (e);
			}
		}

		if (paramChangeTime >= t0 && paramChangeTime < t1)
		{
			for (auto& ps : paramSets)
			{
				if (ps.id == 0xFFFFFFFF)
					continue;

				int32 qi = 0, pi = 0;
				if (auto q = inChanges.addParameterData (ps.id, qi))
					q->addPoint (0, ps.value, pi);
				if (controller)
					controller->setParamNormalized (ps.id, ps.value);
				printf ("set %s = %.3f\n", ps.name.c_str (), ps.value);
			}
		}

		if (sweep.id != 0xFFFFFFFF && t0 >= 3.2 && t0 < 4.8)
		{
			int step = (int)((t0 - 3.2) / 0.025);
			int prev = (int)((t0 - 3.2 - kBlock / kSampleRate) / 0.025);
			if (step != prev || t0 - 3.2 < kBlock / kSampleRate)
			{
				double x = (t0 - 3.2) / 0.8;   // 0..2
				double v = 0.3 + 0.5 * (x < 1.0 ? x : 2.0 - x);
				int32 qi = 0, pi = 0;
				if (auto q = inChanges.addParameterData (sweep.id, qi))
					q->addPoint (0, v, pi);
				if (controller)
					controller->setParamNormalized (sweep.id, v);
			}
		}

		// the input: a kick on every beat (falling pitch, fast decay), the same in both channels
		if (hasInput && data.numInputs > 0)
		{
			for (int32 c = 0; c < data.inputs[0].numChannels; c++)
			{
				auto* in = data.inputs[0].channelBuffers32[c];
				for (int i = 0; i < kBlock; i++)
				{
					const double t = (pos + i) / kSampleRate;
					const double s = t - 0.5 * (double)(int64)(t / 0.5);
					const double ph = 2.0 * 3.14159265358979 * (50.0 * s + 6.0 * (1.0 - std::exp (-s / 0.04)));
					in[i] = (float)(0.8 * std::exp (-s / 0.12) * std::sin (ph));
				}
			}
		}

		data.numSamples = kBlock;
		processor->process (data);

		auto* l = data.outputs[0].channelBuffers32[0];
		auto* r = data.outputs[0].numChannels > 1 ? data.outputs[0].channelBuffers32[1] : l;
		outL.insert (outL.end (), l, l + kBlock);
		outR.insert (outR.end (), r, r + kBlock);
		pos += kBlock;

		// keep the plugin's message thread and streaming threads happy: run in real time
		pumpMessages ();
		std::this_thread::sleep_until (start + blockDuration);
	}

	processor->setProcessing (false);
	component->setActive (false);
	data.unprepare ();

	writeWav (argv[2], outL, outR);
	printf ("wrote %s (%.1f s)\n", argv[2], outL.size () / kSampleRate);
	return 0;
}
