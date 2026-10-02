# One-off: kill orphaned MCP server node processes left by the stopped
# backtest run (they hold .backtest-tmp files with Windows locks).
$procs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -match 'backtest-tmp' -or $_.CommandLine -match 'server-filesystem' -or $_.CommandLine -match 'diag' }
if (-not $procs) { Write-Output "no orphans found"; exit 0 }
$procs | ForEach-Object { Write-Output ("killing " + $_.ProcessId + ": " + $_.CommandLine.Substring(0, [Math]::Min(90, $_.CommandLine.Length))) }
$procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Write-Output ("killed " + @($procs).Count)
