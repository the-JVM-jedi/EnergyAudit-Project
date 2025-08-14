# Control-CollectorTask.ps1
# Manages the Workstation Metrics Collector scheduled task.
# MUST BE RUN AS ADMINISTRATOR.

# This script accepts a parameter to decide what action to take.
# Usage:
#   .\Control-CollectorTask.ps1 -Action Stop
#   .\Control-CollectorTask.ps1 -Action Start
#   .\Control-CollectorTask.ps1 -Action Remove

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('Stop', 'Start', 'Remove')]
    [string]$Action
)

# --- Configuration ---
$TaskName = "WorkstationMetricsCollector"

# --- Main Logic ---
Write-Host "Attempting to find scheduled task: '$TaskName'..."
$Task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if (-not $Task) {
    Write-Host "Scheduled task '$TaskName' not found. No action taken." -ForegroundColor Yellow
    exit
}

Write-Host "Task '$TaskName' found. Current state: $($Task.State)"

switch ($Action) {
    'Stop' {
        Write-Host "Action: Stopping the task if it is running..."
        Stop-ScheduledTask -TaskName $TaskName
        Write-Host "Action: Disabling the task to prevent it from starting on boot..."
        Disable-ScheduledTask -TaskName $TaskName
        Write-Host "Task has been stopped and disabled." -ForegroundColor Green
    }
    'Start' {
        Write-Host "Action: Enabling the task..."
        Enable-ScheduledTask -TaskName $TaskName
        Write-Host "Action: Starting the task now..."
        Start-ScheduledTask -TaskName $TaskName
        Write-Host "Task has been enabled and started." -ForegroundColor Green
    }
    'Remove' {
        Write-Host "Action: Stopping the task if it is running..."
        Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        Write-Host "Action: Unregistering (deleting) the task..."
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "Task '$TaskName' has been permanently removed." -ForegroundColor Green
    }
}

Write-Host "--- Control action complete ---"