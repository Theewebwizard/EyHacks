import os
import queue
from dotenv import load_dotenv
import asyncio
import numpy as np
import requests
import datetime

import sys

try:
    import sounddevice as sd
except Exception as e:
    print(f"FATAL ERROR: Sounddevice/PortAudio error: {e}. Audio hardware or libraries missing. Exiting.")
    sys.exit(1)

try:
    from deepgram import AsyncDeepgramClient
except Exception as e:
    print(f"FATAL ERROR: Deepgram SDK error (missing AsyncDeepgramClient): {e}. Exiting.")
    sys.exit(1)

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

def emit_live_transcript(text):
    url = f"http://{LLM_SERVER_IP}:{LLM_PORT}/emit_transcription"
    payload = {"text": text}
    try:
        requests.post(url, json=payload, timeout=2)
    except Exception as e:
        pass


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



async def main():
    agent_stream = None
    customer_stream = None

    if sd is None or AsyncDeepgramClient is None:
        print("Missing required libraries. Exiting.")
        import sys
        sys.exit(1)

    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        print("Missing DEEPGRAM_API_KEY. Exiting.")
        import sys
        sys.exit(1)

    try:
        # Define devices (update these IDs accordingly based on your system)
        agent_device = None  # None uses system default microphone
        customer_device = 25  # 'dummy_source' from PulseAudio for customer

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
            smart_format=True,
            encoding="linear16",
            sample_rate=32000,
            endpointing=True,
            interim_results=False,
        ) as agent_connection, deepgram.listen.v1.connect(
            model="nova-2",
            smart_format=True,
            encoding="linear16",
            sample_rate=32000,
            endpointing=True,
            interim_results=False,
        ) as customer_connection:

            conversation_buffer = []  # Store chunks of conversation
            sentence_buffers = {"Agent": "", "Customer": ""}
            last_update_time = {"Agent": 0.0, "Customer": 0.0}

            async def flush_buffer_loop():
                import time
                while True:
                    await asyncio.sleep(0.2)
                    now = time.time()
                    for label in ["Agent", "Customer"]:
                        if sentence_buffers[label] and (now - last_update_time[label]) > 0.8:
                            final_sentence = sentence_buffers[label]
                            sentence_buffers[label] = ""
                            
                            log_entry = f"{label}: {final_sentence}\n"
                            print(f"[FLUSH] {log_entry.strip()}")
                            asyncio.create_task(asyncio.to_thread(emit_live_transcript, log_entry.strip()))
                            conversation_buffer.append(log_entry)
                            with open("conversation_log.txt", "a", encoding="utf-8") as log_file:
                                log_file.write(log_entry)

                            if len(conversation_buffer) >= 2:
                                conversation_text = "\n".join(conversation_buffer)
                                asyncio.create_task(asyncio.to_thread(send_to_llm, conversation_text))
                                conversation_buffer.clear()

            async def process_transcript(label, result):
                import time
                try:
                    if getattr(result, "type", None) != "Results":
                        return
                    transcript = result.channel.alternatives[0].transcript.strip()
                    if not transcript:
                        return
                    
                    sentence_buffers[label] += " " + transcript
                    sentence_buffers[label] = sentence_buffers[label].strip()
                    last_update_time[label] = time.time()
                    
                    # We rely purely on the 0.8s background flush to emit the sentence.
                    # This guarantees the transcript appears instantly when the user pauses.
                    # We still keep a safety length check to prevent massive memory strings.
                    if len(sentence_buffers[label]) > 400:
                        final_sentence = sentence_buffers[label]
                        sentence_buffers[label] = ""  # reset
                        
                        log_entry = f"{label}: {final_sentence}\n"
                        print(log_entry.strip())
                        
                        # Send instantly to UI without blocking the audio stream
                        asyncio.create_task(asyncio.to_thread(emit_live_transcript, log_entry.strip()))
                        
                        conversation_buffer.append(log_entry)

                        # Append to log file
                        with open("conversation_log.txt", "a", encoding="utf-8") as log_file:
                            log_file.write(log_entry)

                        # Send to LLM after 2 conversation chunks
                        if len(conversation_buffer) >= 2:
                            conversation_text = "\n".join(conversation_buffer)
                            # Run heavy LLM request in background thread
                            asyncio.create_task(asyncio.to_thread(send_to_llm, conversation_text))
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
            flush_task = asyncio.create_task(flush_buffer_loop())

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
                flush_task.cancel()
                if agent_stream.stream:
                    agent_stream.stream.stop()
                    agent_stream.stream.close()
                if customer_stream.stream:
                    customer_stream.stream.stop()
                    customer_stream.stream.close()

    except Exception as e:
        print(f"\nCRASH: {e}")
        import traceback
        traceback.print_exc()
        print("Mock Mode is disabled. Exiting.")
        import sys
        sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nStopped by user")
