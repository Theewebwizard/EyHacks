import subprocess
import time
import re
import os
import signal
import sys
from twilio.rest import Client

def load_env():
    env_vars = {}
    if os.path.exists('.env'):
        with open('.env', 'r') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    k, v = line.strip().split('=', 1)
                    env_vars[k] = v
                    os.environ[k] = v
    return env_vars

def save_env(env_vars):
    if os.path.exists('.env'):
        with open('.env', 'r') as f:
            lines = f.readlines()
            
        with open('.env', 'w') as f:
            for line in lines:
                if '=' in line and not line.startswith('#'):
                    k = line.split('=')[0]
                    if k in env_vars:
                        f.write(f"{k}={env_vars[k]}\n")
                        del env_vars[k]
                    else:
                        f.write(line)
                else:
                    f.write(line)
                    
            # Write any remaining new vars
            for k, v in env_vars.items():
                f.write(f"{k}={v}\n")

def spawn_tunnel(port):
    print(f"Starting cloudflared tunnel for port {port}...")
    # Cloudflared outputs the URL to stderr
    proc = subprocess.Popen(
        ["cloudflared", "tunnel", "--url", f"http://localhost:{port}"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    url = None
    # Read stderr line by line until we find the trycloudflare.com URL
    while True:
        line = proc.stderr.readline()
        if not line and proc.poll() is not None:
            break
        
        match = re.search(r'(https://[a-zA-Z0-9-]+\.trycloudflare\.com)', line)
        if match:
            url = match.group(1)
            break
            
    if url:
        print(f"[SUCCESS] Tunnel established for port {port}: {url}")
    else:
        print(f"[ERROR] Failed to extract URL for port {port}")
        proc.kill()
        
    return proc, url

def update_twilio_webhook(account_sid, auth_token, phone_number, new_webhook_url):
    print(f"Updating Twilio webhook for phone number: {phone_number}...")
    client = Client(account_sid, auth_token)
    
    try:
        incoming_phone_numbers = client.incoming_phone_numbers.list(phone_number=phone_number)
        if not incoming_phone_numbers:
            print(f"[ERROR] Phone number {phone_number} not found in Twilio account.")
            return False
            
        number_sid = incoming_phone_numbers[0].sid
        
        # Update the voice url
        client.incoming_phone_numbers(number_sid).update(
            voice_url=new_webhook_url
        )
        print(f"[SUCCESS] Twilio Webhook successfully updated to {new_webhook_url}")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to update Twilio: {e}")
        return False

def main():
    print("========================================")
    print("Auto-Tunnel Setup & Twilio Sync")
    print("========================================")
    
    env_vars = load_env()
    
    # 1. Spawn Tunnels
    proc_5000, url_5000 = spawn_tunnel(5000)
    proc_5002, url_5002 = spawn_tunnel(5002)
    
    if not url_5000 or not url_5002:
        print("Failed to establish tunnels. Exiting.")
        if proc_5000: proc_5000.kill()
        if proc_5002: proc_5002.kill()
        sys.exit(1)
        
    # 2. Update ENV dictionary
    # Webhooks use HTTP, WebSockets use WSS
    env_vars['WEBHOOK_URL'] = url_5000
    env_vars['TWILIO_WSS_URL'] = url_5002.replace("https://", "wss://")
    
    # 3. Save to .env
    print("Updating .env file with new tunnel URLs...")
    save_env(env_vars)
    
    # 4. Update Twilio
    account_sid = env_vars.get('TWILIO_ACCOUNT_SID')
    auth_token = env_vars.get('TWILIO_AUTH_TOKEN')
    phone_number = env_vars.get('TWILIO_PHONE_NUMBER')
    
    if account_sid and auth_token and phone_number:
        full_webhook = f"{url_5000}/twilio/voice"
        update_twilio_webhook(account_sid, auth_token, phone_number, full_webhook)
    else:
        print("[WARNING] Missing Twilio credentials in .env. Skipping Twilio update.")
        
    # 5. Restart backend container to pick up new .env
    print("Restarting realtime-voice container to inject new environment variables...")
    os.system("docker compose up -d realtime-voice")
    
    print("\n========================================")
    print("ALL DONE! The system is fully operational.")
    print("Keep this script running in the background. Press CTRL+C to kill tunnels.")
    print("========================================\n")
    
    def cleanup(signum, frame):
        print("\nShutting down tunnels...")
        if proc_5000: proc_5000.kill()
        if proc_5002: proc_5002.kill()
        sys.exit(0)
        
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)
    
    # Keep main thread alive
    while True:
        time.sleep(1)

if __name__ == "__main__":
    main()
