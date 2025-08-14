# Deploy-Collector.ps1
# This script sets up the workstation for metrics collection.
# MUST BE RUN AS ADMINISTRATOR.

Write-Host "--- Starting Workstation Monitor Deployment ---" -ForegroundColor Yellow

# --- Configuration ---
$InstallDir = "C:\ProgramData\WorkstationMonitor" # Using ProgramData for system-wide, non-user-specific data
$ScriptName = "Start-MetricCollector.ps1"
$ConfigFile = "config.json"
$TaskName = "WorkstationMetricsCollector"
$SourceDir = $PSScriptRoot # Assumes all required files are in the same folder as this deploy script.

# --- Main Deployment Steps ---

# 1. Create the installation directory
if (-not (Test-Path $InstallDir)) {
    Write-Host "Creating installation directory: $InstallDir"
    New-Item -Path $InstallDir -ItemType Directory | Out-Null
} else {
    Write-Host "Installation directory already exists."
}

# 2. Copy the necessary files
Write-Host "Copying agent script and configuration file..."
Copy-Item -Path "$SourceDir\$ScriptName" -Destination $InstallDir -Force
Copy-Item -Path "$SourceDir\$ConfigFile" -Destination $InstallDir -Force

# 3. Create the Scheduled Task to run the collector
Write-Host "Creating/Updating the Scheduled Task: $TaskName"

# Task Action: Run PowerShell silently, pointing to our script
$TaskAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$InstallDir\$ScriptName`""

# Task Trigger: Run at system startup
$TaskTrigger = New-ScheduledTaskTrigger -AtStartup

# Task Principal: Run as the SYSTEM account, so it's independent of any user
$TaskPrincipal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -RunLevel Highest

# Task Settings: Allow running on-demand, stop if it runs too long, etc.
$TaskSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Unregister any old version of the task before registering the new one
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $TaskName -Action $TaskAction -Trigger $TaskTrigger -Principal $TaskPrincipal -Settings $TaskSettings

# Verify the task was created
$Task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($Task) {
    Write-Host "Scheduled Task '$TaskName' created successfully." -ForegroundColor Green
    Write-Host "The collector will start automatically on the next system boot."
    Write-Host "To start it immediately for testing, run: Start-ScheduledTask -TaskName '$TaskName'"
} else {
    Write-Host "ERROR: Failed to create the scheduled task." -ForegroundColor Red
}

Write-Host "--- Deployment Complete ---" -ForegroundColor Yellow