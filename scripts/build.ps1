param([string]$CsvPath = 'data/wedding.csv')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
if (-not [IO.Path]::IsPathRooted($CsvPath)) { $CsvPath = Join-Path $root $CsvPath }
$rows = @(Import-Csv -LiteralPath $CsvPath -Encoding UTF8)
$config = @{}
foreach ($row in $rows) {
    if (-not $row.key -or $null -eq $row.value) { throw 'CSV requires key,value columns.' }
    if ($config.ContainsKey($row.key)) { throw "Duplicate CSV key: $($row.key)" }
    $config[$row.key] = [string]$row.value
}
$required = @('groom_name','bride_name','bride_date','groom_date','bride_start','bride_end','groom_start','groom_reception','groom_end','bride_address','groom_address','church_address','pickup_one','pickup_two','rsvp_email')
foreach ($key in $required) {
    if (-not $config.ContainsKey($key) -or ($key -ne 'rsvp_email' -and [string]::IsNullOrWhiteSpace($config[$key]))) { throw "Missing CSV value: $key" }
}
foreach ($key in @('bride_zalo_url','groom_zalo_url','bride_zalo_qr','groom_zalo_qr')) {
    if (-not $config.ContainsKey($key)) { $config[$key] = '' }
    if ($key.EndsWith('_url') -and $config[$key] -and $config[$key] -notmatch '^https://zalo\.me/g/[a-zA-Z0-9]+$') { throw "Invalid Zalo group URL: $key" }
    if ($key.EndsWith('_qr') -and $config[$key]) {
        if ($config[$key] -notmatch '^assets/images/[a-zA-Z0-9/_-]+\.(png|jpg|webp|svg)$' -or -not (Test-Path -LiteralPath (Join-Path (Join-Path $root 'public') $config[$key]))) { throw "Missing or invalid QR image: $key" }
    }
}
$culture = [Globalization.CultureInfo]::GetCultureInfo('vi-VN')
foreach ($side in @('bride','groom')) {
    $date = [datetime]::ParseExact($config["${side}_date"], 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture)
    $config["${side}_date_short"] = $date.ToString('dd.MM.yyyy')
    $config["${side}_date_spaced"] = $date.ToString('dd · MM · yyyy')
    $config["${side}_date_long"] = $date.ToString("dd 'tháng' MM 'năm' yyyy", $culture)
    $config["${side}_date_break"] = $date.ToString("dd 'tháng' MM", $culture) + '<br />' + $date.ToString("'năm' yyyy")
    $config["${side}_day"] = $date.ToString('dd')
    $config["${side}_month_year"] = $date.ToString("'tháng' MM") + '<br />' + $date.ToString('yyyy')
    $config["${side}_weekday"] = $culture.TextInfo.ToTitleCase($date.ToString('dddd', $culture))
}
foreach ($key in @('bride_start','bride_end','groom_start','groom_reception','groom_end')) {
    [void][datetime]::ParseExact($config[$key], 'HH:mm', [Globalization.CultureInfo]::InvariantCulture)
}
foreach ($range in @(@('bride_start','bride_end'),@('groom_start','groom_reception'),@('groom_reception','groom_end'))) {
    if ([string]::CompareOrdinal($config[$range[0]], $config[$range[1]]) -ge 0) { throw "Invalid time order: $($range -join ', ')" }
}
function Expand-Template([string]$text, [bool]$javascript) {
    # GetNewClosure captures local variables; Actions invokes this script from
    # another script scope, so explicitly capture the template configuration.
    $templateConfig = $config
    return [regex]::Replace($text, '\{\{([a-z_]+)\}\}', {
        param($match)
        $key = $match.Groups[1].Value
        if (-not $templateConfig.ContainsKey($key)) { throw "Unknown template key: $key" }
        $value = $templateConfig[$key]
        if ($javascript) {
            $json = ConvertTo-Json -InputObject $value -Compress
            return $json.Substring(1, $json.Length - 2)
        }
        if ($key -match '_(date_break|month_year)$') { return $value }
        return [System.Net.WebUtility]::HtmlEncode($value)
    }.GetNewClosure())
}
# Validate and render everything before writing output.
$output = @{}
Get-ChildItem -LiteralPath (Join-Path $root 'src/pages') -Filter '*.html' | ForEach-Object {
    $output[$_.Name] = Expand-Template ([IO.File]::ReadAllText($_.FullName)) $false
}
$output['assets/js/app.js'] = Expand-Template ([IO.File]::ReadAllText((Join-Path $root 'src/scripts/app.js'))) $true
$output['assets/js/invitation.js'] = Expand-Template ([IO.File]::ReadAllText((Join-Path $root 'src/scripts/invitation.js'))) $true
$output['assets/js/qrcode.js'] = [IO.File]::ReadAllText((Join-Path $root 'scripts/vendor/qrcode.cjs'))
$output['assets/js/qrcode.LICENSE.txt'] = [IO.File]::ReadAllText((Join-Path $root 'scripts/vendor/LICENSE-qrcode.txt'))
$output['assets/css/styles.css'] = [IO.File]::ReadAllText((Join-Path $root 'src/styles/styles.css'))
$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Force $dist,(Join-Path $dist 'assets/css'),(Join-Path $dist 'assets/js') | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding($false)
foreach ($path in $output.Keys) { [IO.File]::WriteAllText((Join-Path $dist $path), $output[$path], $utf8) }
Copy-Item -LiteralPath (Join-Path $root 'public/assets/images') -Destination (Join-Path $dist 'assets') -Recurse -Force
Write-Host 'Built dist/: index.html, nha-gai.html, nha-trai.html and assets.'