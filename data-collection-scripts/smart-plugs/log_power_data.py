# log_power_data.py
import tinytuya
import json
import time
import os
import csv
from datetime import datetime

# --- SETUP ---
# Import device credentials from the separate config file
import tuya_config

# Define the path to the shared PowerShell configuration file
# This assumes the python script is in the same directory as the PowerShell scripts
CONFIG_FILE_PATH = 'config.json'
OUTPUT_CSV_FILE = 'power_consumption_log.csv'

def load_shared_config():
    """Loads the shared config.json file and returns the sample interval."""
    try:
        with open(CONFIG_FILE_PATH, 'r') as f:
            config = json.load(f)
        sample_interval = config.get('SampleIntervalSeconds', 20) # Default to 20 if not found
        print(f"Successfully loaded configuration. Using sample interval: {sample_interval} seconds.")
        return int(sample_interval)
    except FileNotFoundError:
        print(f"FATAL: Shared configuration file not found at '{CONFIG_FILE_PATH}'. Exiting.")
        exit(1)
    except Exception as e:
        print(f"FATAL: Error reading or parsing config.json: {e}. Exiting.")
        exit(1)

def main():
    """Main function to initialize the device and start the logging loop."""
    print("--- Power Consumption Logger Starting ---")
    
    # 1. Load configuration
    sample_interval = load_shared_config()
    
    # 2. Setup Tuya Device
    try:
        device = tinytuya.OutletDevice(
            dev_id=tuya_config.DEVICE_ID,
            address=tuya_config.DEVICE_IP,
            local_key=tuya_config.LOCAL_KEY
        )
        device.set_version(tuya_config.DEVICE_VERSION)
        device.set_socketPersistent(True) # Use a persistent connection for reliability
        print(f"Successfully connected to Tuya device at {tuya_config.DEVICE_IP}")
    except Exception as e:
        print(f"FATAL: Could not initialize Tuya device: {e}. Check credentials and network. Exiting.")
        exit(1)

    # 3. Setup CSV Logging
    file_exists = os.path.isfile(OUTPUT_CSV_FILE)
    try:
        csv_file = open(OUTPUT_CSV_FILE, 'a', newline='', encoding='utf-8')
        csv_writer = csv.writer(csv_file)
        # Write header only if the file is new
        if not file_exists:
            csv_writer.writerow(['timestamp_utc_iso', 'wattage'])
            csv_file.flush() # Ensure header is written immediately
            print(f"Created new log file: {OUTPUT_CSV_FILE}")
    except IOError as e:
        print(f"FATAL: Could not open or write to log file {OUTPUT_CSV_FILE}: {e}. Exiting.")
        exit(1)

    # 4. Main Logging Loop
    print("\n--- Starting main data collection loop. Press Ctrl+C to stop. ---")
    try:
        while True:
            # Align the "tick" as closely as possible with the start of the interval
            loop_start_time = time.time()
            
            wattage = 0.0 # Default to 0 if an error occurs
            try:
                # Get the device status
                status = device.status()
                
                if status and 'dps' in status and '19' in status['dps']:
                    # DPS '19' is typically power (in tenths of a Watt)
                    power_raw = status['dps']['19']
                    wattage = power_raw / 10.0
                else:
                    print(f"WARNING: Received incomplete data from plug. Status: {status}")

            except Exception as e:
                print(f"ERROR: Could not get status from plug: {e}. Logging 0.0 W for this interval.")

            # Get timestamp in the same ISO 8601 format as the PowerShell script
            timestamp_utc = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            
            # Log the collected data
            print(f"{timestamp_utc} - Power: {wattage:.2f} W")
            csv_writer.writerow([timestamp_utc, f"{wattage:.2f}"])
            csv_file.flush() # Ensure data is written to disk every cycle

            # Calculate how long to sleep to maintain the interval
            loop_end_time = time.time()
            elapsed_time = loop_end_time - loop_start_time
            sleep_duration = sample_interval - elapsed_time
            
            if sleep_duration > 0:
                time.sleep(sleep_duration)

    except KeyboardInterrupt:
        print("\n--- Script stopped by user. Cleaning up. ---")
    finally:
        if csv_file:
            csv_file.close()
        print("Log file closed. Exiting.")

if __name__ == "__main__":
    main()