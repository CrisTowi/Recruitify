export async function transcribeWithOpenAI(audioFile: File, apiKey: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioFile, 'audio.webm');
  formData.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI STT error: ${error}`);
  }

  const data = await response.json() as { text: string };
  return data.text;
}

export async function transcribeWithDeepgram(audioFile: File, apiKey: string): Promise<string> {
  const audioBuffer = await audioFile.arrayBuffer();

  const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'audio/webm',
    },
    body: audioBuffer,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Deepgram STT error: ${error}`);
  }

  const data = await response.json() as {
    results: { channels: Array<{ alternatives: Array<{ transcript: string }> }> };
  };

  return data.results.channels[0]?.alternatives[0]?.transcript ?? '';
}
