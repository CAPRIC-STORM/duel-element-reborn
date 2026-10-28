param(
  [string]$SourceDirectory = "media-source/spirit-sequences",
  [string]$OutputDirectory = "apps/client/public/video/spirits"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  throw "FFmpeg est requis pour rendre les séquences des Spirits."
}

$grades = @{
  "spirit-diego"             = "rs=0.030:gs=0.018:bs=0.010"
  "spirit-flamberge"         = "rs=0.060:gs=0.010:bs=-0.045"
  "spirit-flame-god"         = "rs=0.075:gs=0.004:bs=-0.060"
  "spirit-god-serena"        = "rs=-0.020:gs=0.012:bs=0.060"
  "spirit-gold"              = "rs=0.055:gs=0.032:bs=-0.045"
  "spirit-isir"              = "rs=-0.035:gs=0.030:bs=0.075"
  "spirit-morgane"           = "rs=0.070:gs=-0.015:bs=-0.055"
  "spirit-roshi"             = "rs=-0.035:gs=0.045:bs=0.055"
  "spirit-rubberband"        = "rs=0.060:gs=0.035:bs=-0.040"
  "spirit-samya"             = "rs=0.005:gs=-0.005:bs=0.050"
  "spirit-shaka-arayashiki"  = "rs=0.035:gs=0.008:bs=0.050"
  "spirit-shaka-cycle"       = "rs=0.050:gs=0.030:bs=-0.035"
  "spirit-shaka"             = "rs=0.045:gs=0.035:bs=-0.025"
  "spirit-tiona"             = "rs=-0.030:gs=0.035:bs=0.070"
  "spirit-twin-stars"        = "rs=0.030:gs=0.000:bs=0.055"
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$posterDirectory = Join-Path $OutputDirectory "posters"
New-Item -ItemType Directory -Force -Path $posterDirectory | Out-Null

foreach ($source in Get-ChildItem -Path $SourceDirectory -Filter "*.mp4" | Sort-Object Name) {
  $id = $source.BaseName
  $grade = $grades[$id]
  if (-not $grade) {
    throw "Aucune signature colorimétrique définie pour $id."
  }

  $output = Join-Path $OutputDirectory $source.Name
  $temporaryOutput = "$output.rendering.mp4"
  # The watercolor treatment is baked into every frame: broad pigment washes,
  # reconstructed ink contours, moving paper grain and highlight bleed.
  $filter = "[0:v]fps=24,split=3[base][edges][bloom];" +
    "[base]bilateral=sigmaS=2.4:sigmaR=0.16," +
    "elbg=codebook_length=112:nb_steps=1:seed=37," +
    "colorbalance=$grade,eq=contrast=1.08:saturation=1.16:brightness=-0.01," +
    "noise=alls=3.2:allf=t+u[wash];" +
    "[edges]edgedetect=mode=wires:high=0.115:low=0.028," +
    "format=gray,negate,erosion,gblur=sigma=0.22,format=yuv420p[ink];" +
    "[wash][ink]blend=all_mode=multiply:all_opacity=0.32[painted];" +
    "[bloom]lutyuv=y='if(gte(val,175),val,0)':u=128:v=128," +
    "gblur=sigma=11,format=yuv420p[light];" +
    "[painted][light]blend=all_mode=screen:all_opacity=0.15," +
    "vignette=PI/8,format=yuv420p[out]"

  Write-Host "Rendu artistique : $id"
  & ffmpeg -hide_banner -loglevel error -y -i $source.FullName `
    -filter_complex $filter -map "[out]" -an -c:v libx264 -preset medium -crf 20 `
    -movflags +faststart $temporaryOutput
  if ($LASTEXITCODE -ne 0) { throw "Le rendu de $id a échoué." }
  Move-Item -Force $temporaryOutput $output

  $duration = [double](& ffprobe -v error -show_entries format=duration `
    -of default=noprint_wrappers=1:nokey=1 $output)
  $posterAt = [Math]::Max(0.15, [Math]::Min(2.0, $duration * 0.45))
  $poster = Join-Path $posterDirectory "$id.webp"
  & ffmpeg -hide_banner -loglevel error -y -ss $posterAt -i $output `
    -frames:v 1 -c:v libwebp -quality 84 $poster
  if ($LASTEXITCODE -ne 0) { throw "La création de l’affiche de $id a échoué." }
}

Write-Host "Les séquences artistiques et leurs affiches sont prêtes."
