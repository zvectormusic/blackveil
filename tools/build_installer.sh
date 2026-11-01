#!/bin/bash
# Builds a project's Windows installer (Inno Setup 6, tools/installer/plugin.iss) from its
# plugin bundle. Run tools/build_plugin.sh <Project> first: the installer packs that build.
# Usage: bash tools/build_installer.sh <Project>      (a folder in projects/, e.g. Blackveil)
# Output: projects/<Project>/Binaries/Installer/<Name>-<Version>-Setup.exe, and
# <Name>-<Version>-VST3.zip (the bundle, LICENSE.txt, THIRD-PARTY.txt, INSTALL.txt) for a manual
# install: no program to run, so no SmartScreen warning, which the unsigned installer gets (user,
# 2026-11-01)
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

# the zip: the bundle as a top-level folder, entries with forward slashes (.NET's ZipArchive;
# PowerShell 5's Compress-Archive writes backslashes, which other unzip tools misread)
ZIP="$PD/Binaries/Installer/$NAME-$VERSION-VST3.zip"
STAGE="$PD/Binaries/Installer/_zip"
rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -r "$BUNDLE" "$STAGE/"
cp "$ROOT/LICENSE" "$STAGE/LICENSE.txt"
cp "$PD/installer/THIRD-PARTY.txt" "$STAGE/THIRD-PARTY.txt"
cat > "$STAGE/INSTALL.txt" <<EOF
$NAME $VERSION, VST3 for Windows (64-bit), by $COMPANY

1. Close your DAW.
2. Copy the $NAME.vst3 folder into C:\\Program Files\\Common Files\\VST3\\
   (Windows asks for administrator rights). To update, replace the old folder.
3. Start your DAW and let it rescan its plugins.

Manual: https://zvectormusic.github.io/blackveil/
Licence: GNU GPL v3 (LICENSE.txt); third-party notices: THIRD-PARTY.txt
EOF
sed -i 's/$/\r/' "$STAGE/INSTALL.txt"   # (CRLF, for Notepad)
rm -f "$ZIP"
ZPS="$PD/Binaries/Installer/_zip.ps1"
cat > "$ZPS" <<'EOF'
param([string]$Src, [string]$Zip)
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::Open($Zip, 'Create')
Get-ChildItem -LiteralPath $Src -Recurse -File | ForEach-Object {
	$rel = $_.FullName.Substring($Src.Length + 1).Replace('\', '/')
	[void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($z, $_.FullName, $rel, 'Optimal')
}
$z.Dispose()
EOF
powershell -NoProfile -File "$(w "$ZPS")" -Src "$(w "$STAGE")" -Zip "$(w "$ZIP")"
rm -rf "$STAGE" "$ZPS"
[ -f "$ZIP" ] || { echo "ZIP FAILED"; exit 1; }
echo "ZIP OK: ${ZIP#$ROOT/} ($(( $(stat -c %s "$ZIP") / 1024 / 1024 )) MB)"
