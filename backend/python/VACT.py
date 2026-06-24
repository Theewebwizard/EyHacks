import os
import queue
from dotenv import load_dotenv
import asyncio
import numpy as np
import requests
import datetime

MOCK_MODE = False
try:
    import sounddevice as sd
except Exception as e:
    print(f"Sounddevice/PortAudio error: {e}. Switching to Mock Mode!")
    MOCK_MODE = True
    sd = None

try:
    from deepgram import AsyncDeepgramClient
except Exception as e:
    print(f"Deepgram SDK error/incompatibility (missing AsyncDeepgramClient): {e}. Switching to Mock Mode!")
    MOCK_MODE = True
    AsyncDeepgramClient = None

load_dotenv()
LLM_SERVER_IP = "127.0.0.1"  # Change this to the actual IP if running on another machine
LLM_PORT = 5000

LOG_FILE = os.path.join("conversation_log.txt")

def log_conversation(label, text):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {label}: {text}\n"
    with open(LOG_FILE, "a") as log:
        log.write(log_entry)

def send_to_llm(conversation_text):
    print(conversation_text)
    url = f"http://{LLM_SERVER_IP}:{LLM_PORT}/process_conversation"
    payload = {"conversation_text": conversation_text}

    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            print("\nLLM Response for Agent:\n", response.json()["response"])
        else:
            print("Error:", response.text)
    except requests.exceptions.RequestException as e:
        print("Failed to send data to LLM:", e)


class AudioStreamer:
    def __init__(self, device, label, output_device=None):
        self.sample_rate = 32000
        self.channels = 1
        self.audio_queue = queue.Queue()
        self.stream = None
        self.device = device
        self.label = label
        self.output_device = output_device  # Output device for playback

    def start(self):
        if sd is None or MOCK_MODE:
            print(f"[{self.label}] Stream mock started (Mock Mode active)")
            return
        try:
            self.stream = sd.InputStream(
                samplerate=self.sample_rate,
                channels=self.channels,
                dtype="int16",
                blocksize=4000,
                callback=self._audio_callback,
                device=self.device
            )
            self.stream.start()
        except Exception as e:
            print(f"{self.label} Audio Stream Error: {e}")
            raise

    def _audio_callback(self, indata, frames, time, status):
        self.audio_queue.put(indata.copy().tobytes())

    async def generator(self):
        while True:
            if not self.audio_queue.empty():
                yield self.audio_queue.get()
            await asyncio.sleep(0.01)


async def run_mock_mode():
    print("Running in Mock Mode! Simulating live call transcription...")
    # Simulated conversation blocks
    dialogues = [
        [
            "Agent: Hello, thank you for calling Saksham AI. How can I help you today?",
            "Customer: Hello, I have twisted my ankle and need to file a medical claim.",
            "Agent: I'm sorry to hear that. I can help. Can I have your name and claim ID?",
            "Customer: My name is Alice, and the claim ID is CLM-1002.",
            "Agent: Thank you. Let me check CLM-1002. Is it a financial or medical claim?"
        ],
        [
            "Customer: It is a medical claim, and the hospital bill is 5000 dollars.",
            "Agent: 5000 dollars. And what was the date of the incident?",
            "Customer: It happened yesterday, on June 24, 2026.",
            "Agent: Excellent. Please make sure to upload the medical report and invoice files in the client dashboard.",
            "Customer: Okay, I have uploaded the invoice and medical documents just now."
        ],
        [
            "Agent: Great. Let me check the documents now. The AI verification will review them.",
            "Customer: Perfect. Is there anything else you need from me?",
            "Agent: No. Once it is verified, I will approve your claim and resolve it.",
            "Customer: Thank you, I hope it is approved soon.",
            "Agent: You're welcome. Have a wonderful day, Alice!"
        ]
    ]
    
    for idx, block in enumerate(dialogues):
        await asyncio.sleep(5)  # wait 5 seconds between conversation blocks
        conversation_text = "\n".join(block)
        print(f"\n--- Simulating Conversation Block {idx+1} ---")
        print(conversation_text)
        
        # Log conversation and emit via socketio (by calling process_conversation in LLM.py)
        with open("conversation_log.txt", "a", encoding="utf-8") as log_file:
            for line in block:
                log_file.write(f"{line}\n")
        
        # Send to LLM
        send_to_llm(conversation_text)
        
    print("Mock conversation finished.")


async def main():
    if sd is None or MOCK_MODE or AsyncDeepgramClient is None:
        await run_mock_mode()
        return

    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        print("Missing DEEPGRAM_API_KEY. Falling back to Mock Mode!")
        await run_mock_mode()
        return

    try:
        # Define devices (update these IDs accordingly)
        agent_device = 1  # Your microphone
        customer_device = 2  # Virtual Audio Cable input

        # Initialize audio streams
        agent_stream = AudioStreamer(agent_device, "Agent")
        customer_stream = AudioStreamer(customer_device, "Customer")
        agent_stream.start()
        customer_stream.start()

        # Initialize Deepgram Async Client
        from deepgram.core.events import EventType
        deepgram = AsyncDeepgramClient(api_key=api_key)

        async with deepgram.listen.v1.connect(
            model="nova-2",
            punctuate=True,
            encoding="linear16",
            sample_rate=32000,
            interim_results=False,
        ) as agent_connection, deepgram.listen.v1.connect(
            model="nova-2",
            punctuate=True,
            encoding="linear16",
            sample_rate=32000,
            interim_results=False,
        ) as customer_connection:

            conversation_buffer = []  # Store chunks of conversation

            async def process_transcript(label, result):
                try:
                    if getattr(result, "type", None) != "Results":
                        return
                    transcript = result.channel.alternatives[0].transcript
                    if transcript.strip():
                        log_entry = f"{label}: {transcript}\n"
                        conversation_buffer.append(log_entry)

                        # Append to log file
                        with open("conversation_log.txt", "a", encoding="utf-8") as log_file:
                            log_file.write(log_entry)

                    # Send to LLM after 5 conversation chunks
                    if len(conversation_buffer) >= 5:
                        conversation_text = "\n".join(conversation_buffer)
                        send_to_llm(conversation_text)  # Send transcription to LLM API
                        conversation_buffer.clear()  # Clear buffer after sending

                except Exception as e:
                    print(f"Processing error: {e}")

            # Event handlers (support both old and new SDK callback signatures)
            async def on_message_agent(*args):
                result = args[0] if len(args) == 1 else args[1]
                await process_transcript("Agent", result)

            async def on_message_customer(*args):
                result = args[0] if len(args) == 1 else args[1]
                await process_transcript("Customer", result)

            async def on_error(*args):
                error = args[0] if len(args) == 1 else args[1]
                print(f"Deepgram error: {error}")

            agent_connection.on(EventType.MESSAGE, on_message_agent)
            customer_connection.on(EventType.MESSAGE, on_message_customer)
            agent_connection.on(EventType.ERROR, on_error)
            customer_connection.on(EventType.ERROR, on_error)

            # Start listener background tasks
            agent_listen_task = asyncio.create_task(agent_connection.start_listening())
            customer_listen_task = asyncio.create_task(customer_connection.start_listening())

            try:
                print("Start speaking... (Press Ctrl+C to stop)")
                while True:
                    agent_chunk, customer_chunk = await asyncio.gather(
                        agent_stream.generator().__anext__(),
                        customer_stream.generator().__anext__()
                    )
                    await agent_connection.send_media(agent_chunk)
                    await customer_connection.send_media(customer_chunk)

            except KeyboardInterrupt:
                print("\nStopping...")
            finally:
                await agent_connection.send_finalize()
                await customer_connection.send_finalize()
                agent_listen_task.cancel()
                customer_listen_task.cancel()
                if agent_stream.stream:
                    agent_stream.stream.stop()
                    agent_stream.stream.close()
                if customer_stream.stream:
                    customer_stream.stream.stop()
                    customer_stream.stream.close()

    except Exception as e:
        print(f"\nReal-mode failed or not supported in this environment: {e}")
        print("Falling back to Mock Mode...")
        agent_stream_obj = locals().get('agent_stream')
        if agent_stream_obj and getattr(agent_stream_obj, 'stream', None):
            try:
                agent_stream_obj.stream.stop()
                agent_stream_obj.stream.close()
            except Exception:
                pass
        customer_stream_obj = locals().get('customer_stream')
        if customer_stream_obj and getattr(customer_stream_obj, 'stream', None):
            try:
                customer_stream_obj.stream.stop()
                customer_stream_obj.stream.close()
            except Exception:
                pass
        await run_mock_mode()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nStopped by user")
