#!/bin/bash
# Builds a project's Windows installer (Inno Setup 6, tools/installer/plugin.iss) from its
# plugin bundle. Run tools/build_plugin.sh <Project> first: the installer packs that build.
# Usage: bash tools/build_installer.sh <Project>      (a folder in projects/, e.g. Blackveil)
# Output: projects/<Project>/Binaries/Installer/<Name>-<Version>-Setup.exe
# Needs: Inno Setup 6 (winget install JRSoftware.InnoSetup), the project's installer/app_id and
# installer/THIRD-PARTY.txt, the repository's LICENSE.
set -e
P="$1"
[ -n "$P" ] || { echo "usage: bash tools/build_installer.sh <Project>"; exit 1; }
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PD="$ROOT/projects/$P"
xmlval() { grep -o "<$2 value=\"[^\"]*\"" "$1" | head -1 | sed 's/.*value="\(.*\)"/\1/'; }
NAME="$(xmlval "$PD/project_info.xml" Name)"
VERSION="$(xmlval "$PD/project_info.xml" Version)"
COMPANY="$(xmlval "$PD/user_info.xml" Company)"
BUNDLE="$PD/Binaries/Bundle/$NAME.vst3"
[ -d "$BUNDLE" ] || { echo "no $BUNDLE: run tools/build_plugin.sh $P first"; exit 1; }
APPID="$(tr -d ' \r\n' < "$PD/installer/app_id")"
ISCC=""
for c in "$LOCALAPPDATA/Programs/Inno Setup 6/ISCC.exe" "/c/Program Files (x86)/Inno Setup 6/ISCC.exe" "/c/Program Files/Inno Setup 6/ISCC.exe"; do
	[ -f "$c" ] && { ISCC="$c"; break; }
done
[ -n "$ISCC" ] || { echo "Inno Setup 6 not found: winget install JRSoftware.InnoSetup"; exit 1; }
# the bundle must be newer than the script it was built from (a stale build would ship)
if [ "$PD/Scripts/Interface.js" -nt "$BUNDLE" ]; then
	echo "warning: Scripts/Interface.js is newer than the plugin bundle: rebuild with tools/build_plugin.sh $P"
fi
mkdir -p "$PD/Binaries/Installer"
w() { cygpath -w "$1"; }
# (Git Bash would turn the /D switches into paths)
MSYS2_ARG_CONV_EXCL="*" "$ISCC" /Q \
	"/DAppName=$NAME" "/DAppVersion=$VERSION" "/DCompany=$COMPANY" "/DAppId=$APPID" \
	"/DBundle=$(w "$BUNDLE")" "/DRepoDir=$(w "$ROOT")" "/DProjDir=$(w "$PD")" \
	"/DOutDir=$(w "$PD/Binaries/Installer")" "$(w "$ROOT/tools/installer/plugin.iss")"
OUT="$PD/Binaries/Installer/$NAME-$VERSION-Setup.exe"
[ -f "$OUT" ] || { echo "INSTALLER FAILED"; exit 1; }
echo "INSTALLER OK: ${OUT#$ROOT/} ($(( $(stat -c %s "$OUT") / 1024 / 1024 )) MB)"
