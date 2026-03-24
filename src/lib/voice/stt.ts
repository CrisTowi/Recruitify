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
