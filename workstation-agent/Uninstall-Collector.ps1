# Uninstall-Collector.ps1
# Completely removes all components of the Workstation Monitor.
# MUST BE RUN AS ADMINISTRATOR.

Write-Host "--- Starting Workstation Monitor Uninstallation ---" -ForegroundColor Yellow

# --- Configuration ---
$InstallDir = "C:\ProgramData\WorkstationMonitor"
$TaskName = "WorkstationMetricsCollector"

# --- Main Uninstallation Steps ---

# 1. Stop and remove the Scheduled Task
Write-Host "Step 1: Removing the scheduled task '$TaskName'..."
$Task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($Task) {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Scheduled task successfully removed." -ForegroundColor Green
} else {
    Write-Host "Scheduled task not found. Skipping." -ForegroundColor Yellow
}

# 2. Terminate the running collector process, if it exists
# This is a safety measure in case the task stop command failed.
Write-Host "Step 2: Terminating any running collector processes..."
$RunningProcess = Get-Process -Name "powershell" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*$($InstallDir.Replace('\','\\'))*" }

if ($RunningProcess) {
    Stop-Process -Id $RunningProcess.Id -Force
    Write-Host "Terminated running collector process (PID: $($RunningProcess.Id))." -ForegroundColor Green
} else {
    Write-Host "No active collector process found. Skipping." -ForegroundColor Yellow
}

# 3. Delete the installation directory and all its contents
Write-Host "Step 3: Deleting the installation directory '$InstallDir'..."
if (Test-Path $InstallDir) {
    try {
        Remove-Item -Path $InstallDir -Recurse -Force -ErrorAction Stop
        Write-Host "Installation directory and all its contents successfully deleted." -ForegroundColor Green
    } catch {
        Write-Host "ERROR: Could not delete the installation directory. A file might be in use. You may need to reboot and run this script again." -ForegroundColor Red
    }
} else {
    Write-Host "Installation directory not found. Skipping." -ForegroundColor Yellow
}

Write-Host "--- Uninstallation Complete ---" -ForegroundColor Green