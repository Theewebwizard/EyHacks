import re

with open('backend/python/LLM.py', 'r') as f:
    code = f.read()

# Fix 1: Make Twilio always Customer
code = code.replace('speaker_name = "Agent" if speaker == 0 else "Customer"', 'speaker_name = "Customer"')

# Fix 2: Rewrite deepgram_connection_task to use raw websockets
old_dg_task = re.search(r'async def deepgram_connection_task\(\):.*?finally:\n        await connection\.finish\(\)', code, re.DOTALL)

if old_dg_task:
    new_dg_task = """async def deepgram_connection_task():
    global audio_queue
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        logger.error("Missing DEEPGRAM_API_KEY. Cannot stream audio.")
        return

    if audio_queue is None:
        logger.error("audio_queue not initialized.")
        return

    dg_url = "wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=false&diarize=true"
    
    import websockets
    async with websockets.connect(dg_url, additional_headers={"Authorization": f"Token {api_key}"}) as connection:
        
        async def receive_from_deepgram():
            try:
                async for msg in connection:
                    res = json.loads(msg)
                    if res.get("is_final"):
                        alt = res.get("channel", {}).get("alternatives", [{}])[0]
                        transcript = alt.get("transcript", "").strip()
                        if transcript:
                            speaker = alt.get("words", [{}])[0].get("speaker", 0) if alt.get("words") else 0
                            speaker_name = "Agent" if speaker == 0 else "Customer"
                            log_entry = f"{speaker_name}: {transcript}"
                            logger.info(f"Deepgram Transcript: {log_entry}")
                            requests.post('http://127.0.0.1:5000/internal_emit', json={'event': 'live_transcription', 'data': {'text': log_entry}})
                            threading.Thread(target=process_conversation, args=(log_entry,)).start()
            except Exception as e:
                logger.error(f"Deepgram receive error: {e}")

        asyncio.create_task(receive_from_deepgram())
        
        try:
            while True:
                chunk = await audio_queue.get()
                if chunk is None: 
                    break
                await connection.send(chunk)
        except Exception as e:
            logger.error(f"Deepgram sending error: {e}")
        finally:
            pass
"""
    code = code.replace(old_dg_task.group(0), new_dg_task)

with open('backend/python/LLM.py', 'w') as f:
    f.write(code)
print("Patched deepgram task")
