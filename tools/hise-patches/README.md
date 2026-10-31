# Local changes to the HISE checkout (`C:\dev\HISE`)

These are needed for this setup to work. Keep them in mind if you update HISE.

1. `projects/standalone/HISE Standalone.jucer`: VS2026 exporter switched to VS2022, `HISE_USE_VS2022=1`, Intel IPP disabled. The original is kept as `.jucer.orig`.
2. `hi_scripting/scripting/api/ScriptingApi.{h,cpp}`: added `Sampler.encodeAllMonoliths()`. It runs HISE's "encode all samplemaps to monolith" without the GUI dialog, which is what made the conversion scriptable.
3. `%APPDATA%\HISE\compilerSettings.xml`: HISE path, VS2022, IPP off.
4. `hi_core/hi_core/MiscComponents.{h,cpp}` (2026-10-31): script panels get the mouse wheel.
   `MouseCallbackComponent::mouseWheelMove` sends a panel set to "All Callbacks" an event with
   `mouseWheel` = true, `wheelDeltaX` and `wheelDeltaY` (JUCE's deltas, up positive), as a new
   `Action::MouseWheel`. A panel at any other level passes the wheel on as before. Stock HISE sends
   panels no wheel at all. Blackveil's preset list scrolls with it. The plugin export compiles
   HISE's modules from this checkout, so the patch is in the plugins too.

This folder holds `shadowdsp-local.diff` (changes 1, 2 and 4), the settings file, and the HISE commit they were made against (`BASE_COMMIT.txt`). To rebuild HISE from scratch:
1. Clone HISE at that commit and run `git submodule update --init JUCE`.
2. Run `git apply shadowdsp-local.diff` and unzip `tools/SDK/sdk.zip`.
3. Run `JUCE/projucer/Projucer.exe --resave "projects/standalone/HISE Standalone.jucer"`.
4. Build `Builds/VisualStudio2022/HISE Standalone.sln` (Release x64) with MSBuild `/m:4 /p:PreferredToolArchitecture=x64` (16 parallel jobs run out of memory).
5. Run `HISE set_hise_folder` and `HISE set_project_folder`.
