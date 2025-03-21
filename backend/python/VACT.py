import os
import queue
import sounddevice as sd
from dotenv import load_dotenv
from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions
import asyncio
import numpy as np
import requests
import datetime

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

        # # Create an output stream only for the customer's audio
        # # if self.label == "Customer" and self.output_device is not None:
        # #     self.output_stream = sd.OutputStream(
        # #         samplerate=self.sample_rate,
        # #         channels=self.channels,
        # #         dtype="int16",
        # #         device=self.output_device
        # #     )
        # #     self.output_stream.start()
        # else:
        #     self.output_stream = None

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

        # If this is the customer, play the audio through the output stream
        # if self.output_stream:
        #     self.output_stream.write(indata)

    async def generator(self):
        while True:
            if not self.audio_queue.empty():
                yield self.audio_queue.get()
            await asyncio.sleep(0.01)


async def main():
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        raise ValueError("Missing DEEPGRAM_API_KEY in .env file")

    deepgram = DeepgramClient(api_key)
    options = LiveOptions(
        model="nova-2",
        punctuate=True,
        encoding="linear16",
        sample_rate=32000,
        interim_results=False,
    )

    # Define devices
    # Define devices (update these IDs accordingly)
    agent_device = 1  # Your microphone
    customer_device = 2  # Virtual Audio Cable input
    #output_speakers = 5  # Your speaker device ID (find using `sd.query_devices()`)

    # Initialize audio streams
    agent_stream = AudioStreamer(agent_device, "Agent")
    customer_stream = AudioStreamer(customer_device, "Customer")
    agent_stream.start()
    customer_stream.start()

    # Create Deepgram connections
    agent_connection = deepgram.listen.asyncwebsocket.v("1")
    customer_connection = deepgram.listen.asyncwebsocket.v("1")

    conversation_buffer = []  # Store chunks of conversation

    async def process_transcript(label, result):
        try:
            transcript = result.channel.alternatives[0].transcript
            if transcript.strip():
                log_entry = f"{label}: {transcript}\n"
                conversation_buffer.append(log_entry)

                # Append to log file
                with open("conversation_log.txt", "a", encoding="utf-8") as log_file:
                    log_file.write(log_entry)

            # Send to LLM after 10 conversation chunks
            if len(conversation_buffer) >= 5:
                conversation_text = "\n".join(conversation_buffer)
                send_to_llm(conversation_text)  # Send transcription to LLM API
                conversation_buffer.clear()  # Clear buffer after sending

        except Exception as e:
            print(f"Processing error: {e}")

    # Event handlers
    async def on_message_agent(_, result):
        await process_transcript("Agent", result)

    async def on_message_customer(_, result):
        await process_transcript("Customer", result)

    async def on_error(_, error):
        print(f"Deepgram error: {error}")

    agent_connection.on(LiveTranscriptionEvents.Transcript, on_message_agent)
    customer_connection.on(LiveTranscriptionEvents.Transcript, on_message_customer)
    agent_connection.on(LiveTranscriptionEvents.Error, on_error)
    customer_connection.on(LiveTranscriptionEvents.Error, on_error)

    # Start connections
    await agent_connection.start(options)
    await customer_connection.start(options)

    try:
        print("Start speaking... (Press Ctrl+C to stop)")
        while True:
            agent_chunk, customer_chunk = await asyncio.gather(
                agent_stream.generator().__anext__(),
                customer_stream.generator().__anext__()
            )
            await agent_connection.send(agent_chunk)
            await customer_connection.send(customer_chunk)

    except KeyboardInterrupt:
        print("\nStopping...")
    finally:
        await agent_connection.finish()
        await customer_connection.finish()
        agent_stream.stream.stop()
        agent_stream.stream.close()
        customer_stream.stream.stop()
        customer_stream.stream.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nStopped by user")

