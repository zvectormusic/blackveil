# Prints an RMS envelope, high-frequency energy (rms of the first difference) and estimated fundamental (autocorrelation) of a WAV file,
# one line per window. Used to verify renders recorded through the HISE REST API.
# Usage: Analyze.ps1 -File out.wav [-WindowMs 250]

param([string]$File, [int]$WindowMs = 250)

$code = @"
using System;
using System.IO;
using System.Text;

public static class Ana
{
    public static string Run(string path, int windowMs)
    {
        var b = File.ReadAllBytes(path);
        int pos = 12, fmt = 1, ch = 2, sr = 44100, bits = 16, dataPos = -1, dataLen = 0;
        while (pos + 8 <= b.Length)
        {
            string id = Encoding.ASCII.GetString(b, pos, 4);
            int len = BitConverter.ToInt32(b, pos + 4);
            if (id == "fmt ")
            {
                fmt = BitConverter.ToInt16(b, pos + 8); ch = BitConverter.ToInt16(b, pos + 10);
                sr = BitConverter.ToInt32(b, pos + 12); bits = BitConverter.ToInt16(b, pos + 22);
                if (fmt == -2) fmt = BitConverter.ToInt16(b, pos + 32); // WAVE_FORMAT_EXTENSIBLE
            }
            if (id == "data") { dataPos = pos + 8; dataLen = Math.Min(len, b.Length - dataPos); break; }
            pos += 8 + len + (len & 1);
        }
        int bps = bits / 8, frames = dataLen / (bps * ch);
        var x = new double[frames];
        for (int i = 0; i < frames; i++)
        {
            double sum = 0;
            for (int c = 0; c < ch; c++)
            {
                int o = dataPos + (i * ch + c) * bps;
                double v;
                if (fmt == 3) v = BitConverter.ToSingle(b, o);
                else if (bits == 16) v = BitConverter.ToInt16(b, o) / 32768.0;
                else if (bits == 24) v = ((b[o] << 8 | b[o + 1] << 16 | b[o + 2] << 24) >> 8) / 8388608.0;
                else v = BitConverter.ToInt32(b, o) / 2147483648.0;
                sum += v;
            }
            x[i] = sum / ch;
        }

        var sb = new StringBuilder();
        sb.AppendLine(string.Format("{0} Hz, {1} ch, {2} bit, fmt {3}, {4:F2} s", sr, ch, bits, fmt, frames / (double)sr));
        int w = sr * windowMs / 1000;
        double peakAll = 0;
        for (int start = 0; start + w <= frames; start += w)
        {
            double rms = 0, peak = 0, hf = 0;
            for (int i = start; i < start + w; i++) { rms += x[i] * x[i]; peak = Math.Max(peak, Math.Abs(x[i])); if (i > 0) hf += (x[i] - x[i - 1]) * (x[i] - x[i - 1]); }
            hf = Math.Sqrt(hf / w);
            rms = Math.Sqrt(rms / w);
            peakAll = Math.Max(peakAll, peak);
            string f0 = "-";
            if (rms > 1e-4)
            {
                // normalised autocorrelation, lags for 30..1500 Hz
                int minLag = sr / 1500, maxLag = Math.Min(sr / 30, w / 2);
                double best = 0; int bestLag = 0;
                for (int lag = minLag; lag <= maxLag; lag++)
                {
                    double num = 0, e1 = 0, e2 = 0;
                    for (int i = start; i < start + w - lag; i++) { num += x[i] * x[i + lag]; e1 += x[i] * x[i]; e2 += x[i + lag] * x[i + lag]; }
                    double r = num / Math.Sqrt(e1 * e2 + 1e-20);
                    if (r > best + 1e-9) { best = r; bestLag = lag; }
                    if (best > 0.9 && r < best - 0.2) break; // first strong peak
                }
                if (bestLag > 0) f0 = string.Format("{0:F1} Hz (r={1:F2})", sr / (double)bestLag, best);
            }
            sb.AppendLine(string.Format("{0,6:F2}s  rms {1,7:F1} dB  peak {2,7:F1} dB  hf {4,7:F1} dB  f0 {3}",
                start / (double)sr, 20 * Math.Log10(rms + 1e-12), 20 * Math.Log10(peak + 1e-12), f0, 20 * Math.Log10(hf + 1e-12)));
        }
        sb.AppendLine(string.Format("overall peak {0:F1} dB", 20 * Math.Log10(peakAll + 1e-12)));
        return sb.ToString();
    }
}
"@

Add-Type -TypeDefinition $code -Language CSharp
[Ana]::Run((Resolve-Path $File).Path, $WindowMs)
