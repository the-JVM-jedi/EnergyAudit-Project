# Start-MetricCollector.ps1
# VERSION: 2.2 (Production - Corrected)
# DESCRIPTION: Collects system performance metrics and sends them to a central repository.
# Designed to be run as a background scheduled task.

# --- SETUP ---
# Change current location to the script's directory to ensure relative paths work
cd $PSScriptRoot

# --- GLOBAL VARIABLES ---
$ConfigFile = "$PSScriptRoot\config.json"
$OperationalLogFile = "$PSScriptRoot\agent_log.txt"
$MaxLogSizeMB = 5
$ComputerName = $env:COMPUTERNAME

# --- LOGGING FUNCTION ---
function Write-Log {
    param ([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $LogLine = "$Timestamp - $Level - $Message"
    Add-Content -Path $OperationalLogFile -Value $LogLine

    if ((Test-Path $OperationalLogFile) -and (Get-Item $OperationalLogFile).Length -gt ($MaxLogSizeMB * 1MB)) {
        $OldLogFile = "$PSScriptRoot\agent_log.old.txt"
        Move-Item -Path $OperationalLogFile -Destination $OldLogFile -Force
        Write-Log "Rotated operational log file."
    }
}

# --- SCRIPT STARTS HERE ---
try {
    Write-Log "Collector script starting up for computer: $ComputerName"

    # 1. Load Configuration
    if (-not (Test-Path $ConfigFile)) {
        Write-Log "config.json not found. Exiting." -Level "FATAL"
        exit 1
    }
    $Config = Get-Content -Path $ConfigFile | ConvertFrom-Json
    $ComputerNumber = $Config.ComputerNumber
    if ([string]::IsNullOrWhiteSpace($ComputerNumber)) {
        Write-Log "ComputerNumber is not set in config.json. Using OS Hostname as fallback." -Level "WARN"
        $ComputerNumber = $ComputerName
    }

    # 2. Prepare environment
    if (-not (Test-Path $Config.LogDirectory)) {
        New-Item -Path $Config.LogDirectory -ItemType Directory | Out-Null
        Write-Log "Created log directory at $($Config.LogDirectory)"
    }
    $CurrentDataFile = "$($Config.LogDirectory)\$($ComputerName)-$(Get-Date -Format 'yyyyMMddHHmmss').csv"

    # 3. Define performance counters
    $CounterList = @(
        "\Processor(_Total)\% Processor Time",
        "\PhysicalDisk(_Total)\Disk Bytes/sec"
    )

    # --- FUNCTIONS ---
    function Send-DataToServer {
        # (This function's logic remains correct)
        Write-Log "Checking for data files to upload to $($Config.ServerUri)..."
        $DataFiles = Get-ChildItem -Path "$($Config.LogDirectory)\*.csv" -ErrorAction SilentlyContinue
        foreach ($File in $DataFiles) {
            try {
                $FileContent = Get-Content -Path $File.FullName -Raw
                if ([string]::IsNullOrWhiteSpace($FileContent)) {
                    Remove-Item -Path $File.FullName; continue
                }
                Invoke-RestMethod -Uri $Config.ServerUri -Method Post -Body $FileContent -ContentType "text/csv" -TimeoutSec 30
                Write-Log "Upload successful for $($File.Name)."
                Remove-Item -Path $File.FullName
            }
            catch {
                Write-Log "Failed to upload $($File.Name). Error: $($_.Exception.Message). Will retry later." -Level "WARN"
            }
        }
    }

    # --- MAIN EXECUTION ---
    Send-DataToServer
    $LastUploadTime = Get-Date
    while ($true) {
        try {
            # Collect metrics
            $Timestamp = [DateTime]::UtcNow.ToString("o")

            # *** FIX: Use -SampleInterval and -MaxSamples to get a valid rate reading ***
            # This command will now take a sample, wait 1 second, take a second sample, and then return.
            $PerfCounters = Get-Counter -Counter $CounterList -SampleInterval 1 -MaxSamples 2
            
            # The last sample in the returned array contains the calculated value
            $FinalSample = $PerfCounters | Select-Object -Last 1

            $cpuPercent = ($FinalSample.CounterSamples | Where-Object {$_.Path -like "*Processor*"}).CookedValue
            $diskBytesSec = ($FinalSample.CounterSamples | Where-Object {$_.Path -like "*PhysicalDisk*"}).CookedValue
            
            # Memory calculation is instantaneous and does not need special handling
            $memory = Get-CimInstance -ClassName Win32_OperatingSystem
            $totalMem = $memory.TotalVisibleMemorySize
            $freeMem = $memory.FreePhysicalMemory
            $memPercentUsed = if ($totalMem -gt 0) { (($totalMem - $freeMem) / $totalMem) * 100 } else { 0 }
            
            # Create the data line as a raw CSV string
            $csvLine = '"{0}","{1}","{2}",{3},{4},{5}' -f `
                $Timestamp, `
                $ComputerName, `
                $ComputerNumber, `
                ([math]::Round($cpuPercent, 2)), `
                ([math]::Round($memPercentUsed, 2)), `
                ([math]::Round($diskBytesSec, 0))

            Add-Content -Path $CurrentDataFile -Value $csvLine

        } catch {
            Write-Log "Failed to collect metrics. Error: $($_.Exception.Message)" -Level "ERROR"
        }

        # Check if it's time to upload
        if (((Get-Date) - $LastUploadTime).TotalSeconds -ge $Config.UploadIntervalSeconds) {
            Send-DataToServer
            $LastUploadTime = Get-Date
            $CurrentDataFile = "$($Config.LogDirectory)\$($ComputerName)-$(Get-Date -Format 'yyyyMMddHHmmss').csv"
        }
        
        # Adjust sleep time to account for the 1-second sample interval we just used
        $SleepDuration = $Config.SampleIntervalSeconds - 1
        if ($SleepDuration -lt 1) { $SleepDuration = 1 }
        Start-Sleep -Seconds $SleepDuration
    }
}
catch {
    Write-Log "An unhandled exception occurred. The script will now exit. Error: $($_.Exception.Message)" -Level "FATAL"
}