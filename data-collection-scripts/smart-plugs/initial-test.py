import tinytuya
import time

# --- DEVICE CREDENTIALS ---
DEVICE_ID = "bf7d7112af5c45620etril"
DEVICE_IP = "192.168.137.75"
LOCAL_KEY = "gF?1GOU1#WE{8hvy"

# --- SCRIPT CONFIGURATION ---
POLL_INTERVAL_SECONDS = 1  # Poll every second

# --- MAIN SCRIPT ---
print("Starting Energy Audit Script...")

# Create a device object
d = tinytuya.OutletDevice(DEVICE_ID, DEVICE_IP, LOCAL_KEY)
d.set_version(3.4)

# MAKE THE CONNECTION PERSISTENT FOR FASTER POLLING
d.set_socketPersistent(True)
# d.set_debug(True) # Uncomment for detailed logs if you have issues

# Main polling loop
while True:
    try:
        # The status() call will now be slightly faster
        status = d.status()

        if status and 'dps' in status:
            dps = status['dps']
            power_w = dps.get('19', 0) / 10.0

            # You can check if the value has changed before printing/storing
            # (This is just for demonstration)
            print(f"Current Power: {power_w} W")

            # Your database logic would go here
            # store_in_database(...)

        else:
            print("Could not get device status.")

    except Exception as e:
        print(f"An error occurred: {e}")
        # If the connection drops, persistent socket needs to be re-established
        # A more robust script would handle this, but for now we just print

    time.sleep(POLL_INTERVAL_SECONDS)