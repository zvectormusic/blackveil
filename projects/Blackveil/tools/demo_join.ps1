# demo_join.ps1 -Dry a.wav -Wet b.wav -Out c.wav [-Bpm 140]: joins render_demos.sh's two takes.
# Each take is trimmed to its first kick (the first sample above -40 dBFS, then back while the level
# falls); the dry take's first 8 beats (its last 64 samples faded), then the wet take to where its
# last kick's tail stays under -60 dBFS (50 ms windows, faded over 50 ms; at most 6 s, then faded
# over 300 ms). 24-bit PCM, as HISE records. Prints each take's kicks against the grid in samples
# (each kick matched with the take's first one; HISE rasters events to 8 samples: 0 / 4 alternate).
param([string]$Dry, [string]$Wet, [string]$Out, [double]$Bpm = 140)
$code = @"
using System; using System.IO; using System.Text;
public static class DemoJoin {
  static int sr, ch;
  static double[][] Read(string p) {
    var b = File.ReadAllBytes(p); int pos = 12, bits = 24, dp = -1, dl = 0;
    while (pos + 8 <= b.Length) { string id = Encoding.ASCII.GetString(b, pos, 4); int len = BitConverter.ToInt32(b, pos + 4);
      if (id == "fmt ") { ch = BitConverter.ToInt16(b, pos + 10); sr = BitConverter.ToInt32(b, pos + 12); bits = BitConverter.ToInt16(b, pos + 22); }
      if (id == "data") { dp = pos + 8; dl = Math.Min(len, b.Length - dp); break; } pos += 8 + len + (len & 1); }
    if (bits != 24) throw new Exception("not 24-bit: " + p);
    int n = dl / (3 * ch); var x = new double[ch][]; for (int c = 0; c < ch; c++) x[c] = new double[n];
    for (int i = 0; i < n; i++) for (int c = 0; c < ch; c++) { int o = dp + (i * ch + c) * 3; x[c][i] = ((b[o] << 8 | b[o+1] << 16 | b[o+2] << 24) >> 8) / 8388608.0; }
    return x; }
  static double Amp(double[][] x, int i) { double m = 0; foreach (var c in x) m = Math.Max(m, Math.Abs(c[i])); return m; }
  static int First(double[][] x) {
    double th = Math.Pow(10, -40 / 20.0), floor = Math.Pow(10, -70 / 20.0); int n = x[0].Length, s = -1;
    for (int i = 0; i < n; i++) if (Amp(x, i) > th) { s = i; break; }
    if (s < 0) throw new Exception("silent take");
    for (int k = 0; s > 0 && k < 64 && Amp(x, s - 1) < Amp(x, s) && Amp(x, s - 1) > floor; k++) s--;
    return s; }
  static string Grid(double[][] x, int s, int beats, int B) {
    var sb = new StringBuilder(); int W = 1024;
    for (int k = 1; k < beats && s + k * B + 600 + W < x[0].Length; k++) { int best = 0; double bc = double.MinValue;
      for (int d = -600; d <= 600; d++) { double c = 0; for (int j = 0; j < W; j++) c += x[0][s + j] * x[0][s + k * B + d + j]; if (c > bc) { bc = c; best = d; } }
      sb.Append(" " + best); }
    return sb.ToString(); }
  public static string Run(string dry, string wet, string outp, double bpm) {
    var d = Read(dry); var w = Read(wet); int B = (int)Math.Round(sr * 60.0 / bpm);
    int sd = First(d), sw = First(w); int nd = 8 * B;
    if (sd + nd > d[0].Length) throw new Exception("dry take too short");
    int last = sw + 16 * B, lim = Math.Min(w[0].Length, last + 6 * sr), win = sr / 20, endAt = lim; double th60 = Math.Pow(10, -60 / 20.0);
    for (int e = lim - win; e > last; e -= win) { double m = 0; for (int i = e; i < e + win; i++) m = Math.Max(m, Amp(w, i)); if (m > th60) { endAt = Math.Min(lim, e + 2 * win); break; } }
    int nw = endAt - sw, fade = endAt >= lim ? (int)(0.3 * sr) : win;
    var sb = new StringBuilder(); sb.Append("dry grid:" + Grid(d, sd, 8, B) + " | wet grid:" + Grid(w, sw, 17, B));
    int n = nd + nw; double peak = 0;
    using (var fs = new FileStream(outp, FileMode.Create)) using (var o = new BinaryWriter(fs)) {
      o.Write(Encoding.ASCII.GetBytes("RIFF")); o.Write(36 + n * 3 * ch); o.Write(Encoding.ASCII.GetBytes("WAVEfmt ")); o.Write(16);
      o.Write((short)1); o.Write((short)ch); o.Write(sr); o.Write(sr * 3 * ch); o.Write((short)(3 * ch)); o.Write((short)24);
      o.Write(Encoding.ASCII.GetBytes("data")); o.Write(n * 3 * ch);
      for (int i = 0; i < n; i++) for (int c = 0; c < ch; c++) {
        double v = i < nd ? d[c][sd + i] * Math.Min(1.0, (nd - i) / 64.0) : w[c][sw + i - nd] * Math.Min(1.0, (n - i) / (double)fade);
        peak = Math.Max(peak, Math.Abs(v));
        int q = (int)Math.Round(Math.Max(-1.0, Math.Min(1.0 - 1.0 / 8388608, v)) * 8388608.0);
        o.Write((byte)(q & 255)); o.Write((byte)((q >> 8) & 255)); o.Write((byte)((q >> 16) & 255)); } }
    sb.Append(string.Format(" | {0:F2} s, peak {1:F1} dBFS, tail {2:F2} s{3}", n / (double)sr, 20 * Math.Log10(peak), (endAt - last) / (double)sr, endAt >= lim ? " (capped)" : ""));
    return sb.ToString(); } }
"@
Add-Type -TypeDefinition $code
[DemoJoin]::Run($Dry, $Wet, $Out, $Bpm)
