# Zipper-noise check for renders made with renderhost "~Param": high-frequency energy (3rd difference)
# in the 367-sample window (one period of C3 at 48 kHz) after each 25 ms parameter step, divided by
# the window before it. About 1.0 = smooth; clicks push the mean and 90th percentile up.
# Usage: StepClicks.ps1 -File out.wav
param([string]$File)
$code = @"
using System; using System.IO; using System.Text; using System.Collections.Generic;
public static class SC {
  public static string Run(string path) {
    var b = File.ReadAllBytes(path);
    int pos = 12, fmt = 1, ch = 2, sr = 44100, bits = 16, dp = -1, dl = 0;
    while (pos + 8 <= b.Length) {
      string id = Encoding.ASCII.GetString(b, pos, 4); int len = BitConverter.ToInt32(b, pos + 4);
      if (id == "fmt ") { fmt = BitConverter.ToInt16(b, pos+8); ch = BitConverter.ToInt16(b,pos+10); sr = BitConverter.ToInt32(b,pos+12); bits = BitConverter.ToInt16(b,pos+22); if (fmt==-2) fmt = BitConverter.ToInt16(b,pos+32); }
      if (id == "data") { dp = pos + 8; dl = Math.Min(len, b.Length - dp); break; }
      pos += 8 + len + (len & 1);
    }
    int bps = bits/8, n = dl/(bps*ch); var x = new double[n];
    for (int i=0;i<n;i++){ int o = dp + i*bps*ch; x[i] = fmt==3 ? BitConverter.ToSingle(b,o) : (bits==16 ? BitConverter.ToInt16(b,o)/32768.0 : (BitConverter.ToInt32(b,o)>>8)/8388608.0); }
    Func<int,int,double> hf = (s, ww) => { double sum=0; for (int i=s;i<s+ww;i++){ double d = x[i]-3*x[i-1]+3*x[i-2]-x[i-3]; sum+=d*d; } return Math.Sqrt(sum/ww); };
    int blk = 512, w = 367; var ratios = new List<double>(); int prevStep = -99;
    for (int p = 0; p < n - w; p += blk) {
      double t = (double)p/sr; if (t < 3.3 || t >= 4.8) continue;
      int step = (int)((t-3.2)/0.025); if (step == prevStep) continue; prevStep = step;
      ratios.Add(hf(p, w) / Math.Max(1e-9, hf(p-w, w)));
    }
    ratios.Sort(); double mean=0; foreach (var r in ratios) mean+=r; mean/=ratios.Count;
    return String.Format("steps {0}  median after/before {1:F2}  mean {2:F2}  90th pct {3:F2}", ratios.Count, ratios[ratios.Count/2], mean, ratios[(int)(ratios.Count*0.9)]);
  }
}
"@
Add-Type -TypeDefinition $code
[SC]::Run($File)
