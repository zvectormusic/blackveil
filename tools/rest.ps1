# Helper: upload a HISEScript file to a script processor through the HISE REST API.
# The file holds onInit code followed by the callback functions (onNoteOn, ...), which
# are split into the "callbacks" object the API expects.
# Usage: rest.ps1 -ModuleId VoiceMode -File Scripts\VoiceMode.js
#        rest.ps1 -ModuleId Interface -Script 'include("Interface.js");'
param([string]$ModuleId, [string]$File, [string]$Script)

$s = if ($Script) { $Script } else { [IO.File]::ReadAllText((Resolve-Path $File)) }

$names = "onNoteOn", "onNoteOff", "onController", "onTimer", "onControl"
$callbacks = [ordered]@{}
$parts = [regex]::Split($s, "(?m)^(?=function (?:" + ($names -join "|") + ")\()")
$callbacks.onInit = $parts[0].TrimEnd() + "`n"

foreach ($p in $parts | Select-Object -Skip 1)
{
    $name = [regex]::Match($p, "^function (\w+)").Groups[1].Value
    $callbacks[$name] = $p.TrimEnd() + "`n"
}

foreach ($n in $names)
{
    if (-not $callbacks.Contains($n))
    {
        $args = if ($n -eq "onControl") { "number, value" } else { "" }
        $callbacks[$n] = "function $n($args)`n{`n`t`n}"
    }
}

$json = @{ moduleId = $ModuleId; callbacks = $callbacks; compile = $true } | ConvertTo-Json -Compress -Depth 4
$bytes = [Text.Encoding]::UTF8.GetBytes($json)

try
{
    (Invoke-WebRequest -UseBasicParsing -Method Post -Uri http://localhost:1900/api/set_script -ContentType "application/json" -Body $bytes).Content
}
catch
{
    $r = $_.Exception.Response
    (New-Object IO.StreamReader($r.GetResponseStream())).ReadToEnd()
}
