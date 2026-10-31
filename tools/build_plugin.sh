#!/bin/bash
# Exports a HISE project of this repository and compiles its VST3, then wraps it in a VST3
# bundle folder.
# Usage: bash tools/build_plugin.sh <Project>      (a folder in projects/, e.g. Blackveil)
# Output: projects/<Project>/Binaries/Bundle/<Name>.vst3, <Name> from its project_info.xml.
# HISE's current project folder is set to the project (export_ci requires it), so the HISE
# editor opens that project next time it starts.
set -e
PROJECT="$1"
if [ -z "$PROJECT" ] || [ ! -f "$(dirname "$0")/../projects/$PROJECT/project_info.xml" ]; then
	echo "usage: bash tools/build_plugin.sh <Project>   (one of: $(ls "$(dirname "$0")/../projects" | tr '\n' ' '))"
	exit 1
fi
cd "$(dirname "$0")/../projects/$PROJECT"
HISE="/c/dev/HISE/projects/standalone/Builds/VisualStudio2022/x64/Release/App/HISE.exe"
NAME=$(grep -o '<Name value="[^"]*"' project_info.xml | sed 's/<Name value="//; s/"$//')
# the project's preset XML (its only XML in XmlPresetBackups)
XML=$(ls XmlPresetBackups/*.xml | head -1)
# the plugin type: a project's plugin_type file (instrument, effect or midi), else instrument
TYPE=$(cat plugin_type 2>/dev/null || echo instrument)

"$HISE" set_project_folder "-p:$(cygpath -w "$PWD")"

# clear stale output so an old plugin name can't be bundled by mistake
rm -rf Binaries/Compiled Binaries/Bundle

"$HISE" export_ci "$XML" -t:$TYPE -p:VST3 -a:x64
# export_ci writes the batch file but doesn't run it here
powershell -NoProfile -Command "& '$(cygpath -w "$PWD/Binaries/batchCompile.bat")'; exit \$LASTEXITCODE"

B="Binaries/Bundle/$NAME.vst3/Contents/x86_64-win"
mkdir -p "$B"
cp "Binaries/Compiled/VST3/$NAME.vst3" "$B/"
echo "BUILD OK: projects/$PROJECT/Binaries/Bundle/$NAME.vst3"
