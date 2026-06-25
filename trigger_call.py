import os
from twilio.rest import Client

def load_env():
    if os.path.exists('.env'):
        with open('.env') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    k, v = line.strip().split('=', 1)
                    os.environ[k] = v

load_env()

# 1. Grab these from your Twilio Console Dashboard (twilio.com/console)
account_sid = os.getenv('TWILIO_ACCOUNT_SID', '')
auth_token = os.getenv('TWILIO_AUTH_TOKEN', '')

# 2. Your numbers
twilio_number = os.getenv('TWILIO_PHONE_NUMBER', '')
your_jio_number = os.getenv('YOUR_PHONE_NUMBER', '')

# 3. Your ngrok/localtunnel public URL for port 5000
webhook_url = 'https://eyhacks-5000-twilio.loca.lt/twilio/voice'

print(f"Triggering call from {twilio_number} to {your_jio_number}...")

client = Client(account_sid, auth_token)

try:
    call = client.calls.create(
        url=webhook_url,
        to=your_jio_number,
        from_=twilio_number
    )
    print(f"Call successfully triggered! SID: {call.sid}")
    print("Your phone should ring in a few seconds. When you answer, start talking!")
except Exception as e:
    print(f"Failed to trigger call: {e}")
