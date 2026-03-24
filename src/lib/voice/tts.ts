export async function speakWithDeepgram(text: string, apiKey: string, voiceId: string): Promise<Response> {
  const model = voiceId || 'aura-asteria-en';

  const response = await fetch(`https://api.deepgram.com/v1/speak?model=${model}&encoding=mp3`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Deepgram TTS error (${response.status}):`, error);
    throw new Error(`Deepgram TTS error ${response.status}: ${error}`);
  }

  return response;
}
