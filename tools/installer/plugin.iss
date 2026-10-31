; A ShadowDSP plugin's Windows installer (Inno Setup 6). Built by tools/build_installer.sh
; <Project>, which passes the defines below from the project's project_info.xml (Name, Version),
; user_info.xml (Company) and installer/ folder (app_id: the installer's fixed id, never changed,
; so a new version replaces the old one; THIRD-PARTY.txt: the vendored code's notices).
; It installs the VST3 bundle into Common Files\VST3 (replaced as a whole) and the licence files
; into Program Files\<Company>\<Name> (with the uninstaller). The user's data in
; %APPDATA%\<Company>\<Name> (presets, favourites, bounces) is never touched.
#ifndef AppName
  #error Build with tools/build_installer.sh <Project>
#endif

[Setup]
AppId={{{#AppId}}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#Company}
DefaultDirName={commonpf64}\{#Company}\{#AppName}
DisableDirPage=yes
DisableProgramGroupPage=yes
LicenseFile={#RepoDir}\LICENSE
OutputDir={#OutDir}
OutputBaseFilename={#AppName}-{#AppVersion}-Setup
Compression=lzma2/max
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
WizardStyle=modern
; a DAW holding the plugin: offer to close it (the files are locked while it runs)
CloseApplications=yes
RestartApplications=no
UninstallDisplayName={#AppName} {#AppVersion}
VersionInfoVersion={#AppVersion}
VersionInfoCompany={#Company}
VersionInfoDescription={#AppName} VST3 plugin installer

[Messages]
WelcomeLabel2=This installs the [name/ver] VST3 plugin into C:\Program Files\Common Files\VST3.%n%nClose your DAW before you continue. Your presets and settings are kept.
FinishedLabel=[name] is installed. Start your DAW and let it rescan its plugins: [name] appears from {#Company}.

[InstallDelete]
; the previous version's bundle, so no stale file is left inside it
Type: filesandordirs; Name: "{commoncf64}\VST3\{#AppName}.vst3"

[Files]
Source: "{#Bundle}\*"; DestDir: "{commoncf64}\VST3\{#AppName}.vst3"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#RepoDir}\LICENSE"; DestDir: "{app}"; DestName: "LICENSE.txt"; Flags: ignoreversion
Source: "{#ProjDir}\installer\THIRD-PARTY.txt"; DestDir: "{app}"; Flags: ignoreversion
