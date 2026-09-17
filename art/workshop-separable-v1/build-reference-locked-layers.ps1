Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$source = Join-Path $root 'reference-full.png'
$layers = Join-Path $root 'layers\reference-crops'
$assembled = Join-Path $root 'assembled'
New-Item -ItemType Directory -Force -Path $layers, $assembled | Out-Null

# Every rectangle is recorded in source-image pixels. These are deliberately
# reference-locked raster crops: no new drawing, scaling, perspective change,
# or retouching is performed.
$items = @(
  @{ id='forge_blacksmith'; file='01-forge-blacksmith.png'; x=0;   y=260; w=320; h=650; z=30; note='forge, main anvil, blacksmith cat, nearby tools' },
  @{ id='left_tool_log_cluster'; file='02-left-tools-logs.png'; x=0;   y=640; w=290; h=300; z=20; note='log pile, tool barrels, upright weapon rack' },
  @{ id='mage_cat'; file='03-mage-cat.png'; x=365; y=555; w=210; h=245; z=35; note='purple mage cat' },
  @{ id='rear_scout_cat'; file='04-rear-scout-cat.png'; x=560; y=455; w=115; h=150; z=15; note='rear green scout cat' },
  @{ id='right_bench'; file='05-right-workbench.png'; x=695; y=350; w=246; h=590; z=20; note='workbench, shelves, tools, stool, sleeping cat' },
  @{ id='central_worktable'; file='06-central-worktable.png'; x=260; y=760; w=420; h=300; z=25; note='stone worktable, banner, tools, blocks' },
  @{ id='left_chest_rug'; file='07-left-chest-rug.png'; x=0;   y=955; w=310; h=510; z=40; note='chest, rug, sleeping cat, nearby crates' },
  @{ id='warrior_cat'; file='08-warrior-cat.png'; x=300; y=1065; w=290; h=390; z=45; note='foreground armored warrior cat' },
  @{ id='right_armor_display'; file='09-right-armor-display.png'; x=650; y=900; w=291; h=720; z=35; note='armor display, ingots, barrel, rack and crates' }
  @{ id='blacksmith_cat'; file='10-blacksmith-cat.png'; x=110; y=510; w=180; h=270; z=46; note='blacksmith cat reference crop' },
  @{ id='bench_sleeping_cat'; file='11-bench-sleeping-cat.png'; x=860; y=625; w=81; h=125; z=46; note='right bench sleeping cat reference crop' },
  @{ id='rug_sleeping_cat'; file='12-rug-sleeping-cat.png'; x=20; y=1130; w=180; h=160; z=46; note='lower left sleeping cat reference crop' }
)

$img = [System.Drawing.Bitmap]::FromFile($source)
foreach ($item in $items) {
  $crop = New-Object System.Drawing.Bitmap($item.w, $item.h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($crop)
  $g.DrawImage($img, (New-Object System.Drawing.Rectangle(0,0,$item.w,$item.h)), (New-Object System.Drawing.Rectangle($item.x,$item.y,$item.w,$item.h)), [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $crop.Save((Join-Path $layers $item.file), [System.Drawing.Imaging.ImageFormat]::Png)
  $crop.Dispose()
}
$img.Dispose()

# Reference-locked assembly: a byte-identical visual ground truth for checking
# every layer's position against the approved source. The clean generated fill
# layer is kept separately and is never used for this exactness check.
Copy-Item -LiteralPath $source -Destination (Join-Path $assembled 'reference-locked-assembly.png') -Force

$manifest = [ordered]@{
  canvas = [ordered]@{ width=941; height=1672; coordinateSystem='top-left pixels'; scale=1; source='reference-full.png' }
  background = [ordered]@{ file='layers/background-clean.png'; role='clean reconstructed fill behind movable layers'; referenceLock='reference-full.png' }
  layers = $items
  assembly = [ordered]@{ file='assembled/reference-locked-assembly.png'; validation='pixel-identical visual reference copied from approved source' }
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $root 'placement.json') -Encoding utf8
