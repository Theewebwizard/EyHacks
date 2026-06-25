import re

with open('backend/python/LLM.py', 'r') as f:
    code = f.read()

# 1. Add /internal_emit endpoint
internal_emit_code = """
import requests

@app.route('/internal_emit', methods=['POST'])
def internal_emit():
    data = request.json
    socketio.emit(data['event'], data['data'])
    return jsonify({"status": "emitted"}), 200
"""
code = code.replace("def test_emit():", internal_emit_code + "\ndef test_emit():")

# 2. Replace all socketio.emit in process_conversation and twilio_ws_handler
def replace_emit(match):
    event = match.group(1)
    data = match.group(2)
    return f"requests.post('http://127.0.0.1:5000/internal_emit', json={{'event': {event}, 'data': {data}}})"

code = re.sub(r"socketio\.emit\((['\"].*?['\"]),\s*(.*?)\)", replace_emit, code)

# 3. But wait, replacing ALL socketio.emit might break the /test_emit or /internal_emit themselves!
# Let's just restore /test_emit and /internal_emit to use raw socketio.emit
code = code.replace("requests.post('http://127.0.0.1:5000/internal_emit', json={'event': data['event'], 'data': data['data']})", "socketio.emit(data['event'], data['data'])")
code = code.replace("requests.post('http://127.0.0.1:5000/internal_emit', json={'event': 'live_transcription', 'data': {'text': 'TEST TRANSCRIPT FROM HTTP'}})", "socketio.emit('live_transcription', {'text': 'TEST TRANSCRIPT FROM HTTP'})")
code = code.replace("requests.post('http://127.0.0.1:5000/internal_emit', json={'event': 'new_suggestion', 'data': {'response': 'TEST SUGGESTION FROM HTTP'}})", "socketio.emit('new_suggestion', {'response': 'TEST SUGGESTION FROM HTTP'})")
code = code.replace("requests.post('http://127.0.0.1:5000/internal_emit', json={'event': 'live_transcription', 'data': {'text': data['text']}})", "socketio.emit('live_transcription', {'text': data['text']})")


with open('backend/python/LLM.py', 'w') as f:
    f.write(code)
print("Patched Emit")
