
import React, { useState, useRef, useCallback, useEffect } from 'react';
// FIX: The 'LiveSession' type is not exported from the @google/genai library.
import type { LiveServerMessage } from '@google/genai';
import { startLiveSession, decode, decodeAudioData, fetchNewsSummary, encode, finnishNostalgiaSongs, createSystemInstruction } from './services/geminiService';
import type { TranscriptMessage } from './types';
import RadioInterface from './components/RadioInterface';

const App: React.FC = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Click the dial to start');
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentOutput, setCurrentOutput] = useState('');
  const [nowPlaying, setNowPlaying] = useState<{ song: string; artist: string } | null>(null);

  // FIX: Replaced 'LiveSession' with 'any' as the type is not exported from the library.
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const musicAudioRef = useRef<HTMLAudioElement>(null);

  const currentInputRef = useRef('');
  const currentOutputRef = useRef('');

  useEffect(() => {
    currentInputRef.current = currentInput;
  }, [currentInput]);

  useEffect(() => {
    currentOutputRef.current = currentOutput;
  }, [currentOutput]);

    /**
   * Prompts the AI to start the conversation.
   * The Gemini Live API requires an initial audio input to trigger the model's first response.
   * We send a short, silent audio packet as a "nudge" to make the AI speak first,
   * according to its system instructions.
   */
  const sendSilentAudioPrompt = useCallback(() => {
    const silentData = new Float32Array(4096).fill(0);
    const l = silentData.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = silentData[i] * 32768;
    }
    const pcmBlob = {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };

    // Ensure we only send the prompt after the session is established.
    sessionPromiseRef.current?.then((session) => {
      session.sendRealtimeInput({ media: pcmBlob });
    }).catch(console.error);
  }, []);

  const handleStopMusic = useCallback(() => {
    if (musicAudioRef.current) {
        musicAudioRef.current.pause();
        musicAudioRef.current.currentTime = 0;
        musicAudioRef.current.src = '';
    }
    setNowPlaying(null);
  }, []);

  const cleanupAudio = useCallback(() => {
    if (scriptProcessorRef.current && mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        scriptProcessorRef.current.disconnect();
    }
    inputAudioContextRef.current?.close().catch(console.error);
    outputAudioContextRef.current?.close().catch(console.error);
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());

    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    mediaStreamRef.current = null;
    scriptProcessorRef.current = null;
    mediaStreamSourceRef.current = null;

    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const handleToggleSession = useCallback(async () => {
    if (isSessionActive) {
      if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close());
        sessionPromiseRef.current = null;
      }
      handleStopMusic();
      cleanupAudio();
      setIsSessionActive(false);
      setStatusMessage('Click the dial to start');
      return;
    }

    try {
      setStatusMessage('Getting microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      let songForPrompt: { song: string; artist: string } | null = null;

      await new Promise<void>(async (resolve) => {
        const songData = finnishNostalgiaSongs[Math.floor(Math.random() * finnishNostalgiaSongs.length)];
        setStatusMessage(`Finding a memory...`);
        let trackUrl: string | null = null;
        try {
          const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(songData.song)}+${encodeURIComponent(songData.artist)}&entity=song&limit=1&country=FI`);
          if (!response.ok) throw new Error('iTunes API request failed');
          const data = await response.json();
          if (data.resultCount > 0) {
            const track = data.results[0];
            const currentSong = { song: track.trackName, artist: track.artistName };
            setNowPlaying(currentSong);
            songForPrompt = currentSong;
            trackUrl = track.previewUrl;
          }
        } catch (e) {
          console.error("Error fetching song, skipping intro.", e);
        }

        if (trackUrl && musicAudioRef.current) {
          const audio = musicAudioRef.current;
          audio.src = trackUrl;
          audio.loop = false;
          const playPromise = audio.play();

          if (playPromise !== undefined) {
            playPromise.then(() => {
              setTimeout(() => {
                if (!audio.paused) {
                  audio.pause();
                }
                setNowPlaying(null);
                resolve();
              }, 10000); // Play for 10 seconds
            }).catch(error => {
              console.error("Audio playback failed:", error);
              setNowPlaying(null);
              songForPrompt = null; // Don't mention a song that didn't play
              resolve();
            });
          } else {
            songForPrompt = null;
            resolve();
          }
        } else {
          setNowPlaying(null);
          songForPrompt = null; // No track URL, so no song was played
          resolve();
        }
      });

      setStatusMessage('Connecting to companion...');
      setIsSessionActive(true);

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const callbacks = {
        onopen: () => {
          // FIX: Add a check to prevent a race condition where the session is closed
          // before it's fully opened. If the context or stream have been cleaned up,
          // it means the user has cancelled the session, so we should not proceed.
          if (!inputAudioContextRef.current || !mediaStreamRef.current) {
            console.warn("onopen triggered after session was closed. Aborting audio setup.");
            return;
          }
          setStatusMessage('Connected. Speak whenever you like.');
          
          // This is the crucial step: send a silent audio packet to make the AI start talking.
          sendSilentAudioPrompt();

          const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
          mediaStreamSourceRef.current = source;
          const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
          scriptProcessorRef.current = scriptProcessor;

          scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
            if (!sessionPromiseRef.current) return;
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const l = inputData.length;
            const int16 = new Int16Array(l);
            for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
            }
            const pcmBlob = {
              data: encode(new Uint8Array(int16.buffer)),
              mimeType: 'audio/pcm;rate=16000',
            };
            sessionPromiseRef.current?.then((session) => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContextRef.current.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.inputTranscription) {
            setCurrentInput(prev => prev + message.serverContent!.inputTranscription!.text);
          }
          if (message.serverContent?.outputTranscription) {
             setCurrentOutput(prev => prev + message.serverContent!.outputTranscription!.text);
          }
          if (message.serverContent?.turnComplete) {
              const fullInput = currentInputRef.current;
              const fullOutput = currentOutputRef.current;

              setTranscripts(prev => {
                  const newTranscripts = [...prev];
                  if (fullInput.trim()) newTranscripts.push({ speaker: 'user', text: fullInput });
                  if (fullOutput.trim()) newTranscripts.push({ speaker: 'model', text: fullOutput });
                  return newTranscripts;
              });

              setCurrentInput('');
              setCurrentOutput('');
          }
          
          if (message.toolCall) {
            for (const fc of message.toolCall.functionCalls) {
                let result: { result: string };
        
                if (fc.name === 'playMusic') {
                    const { song = 'a lovely tune', artist = 'an unknown artist' } = fc.args as { song?: string, artist?: string };
                    setStatusMessage(`Searching for "${song}" by ${artist}...`);
                    try {
                        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(song)}+${encodeURIComponent(artist)}&entity=song&limit=1`);
                        if (!response.ok) throw new Error('iTunes API request failed');
                        const data = await response.json();
                        if (data.resultCount > 0) {
                            const track = data.results[0];
                            setNowPlaying({ song: track.trackName, artist: track.artistName });
                            if (musicAudioRef.current) {
                                musicAudioRef.current.src = track.previewUrl;
                                musicAudioRef.current.loop = false;
                                musicAudioRef.current.play().catch(e => console.error("Error playing audio:", e));
                            }
                            result = { result: `Now playing "${track.trackName}" by ${track.artistName}.` };
                        } else {
                            setStatusMessage(`Could not find "${song}".`);
                            result = { result: `I'm sorry, I couldn't find "${song}" by ${artist}. Would you like to try another?` };
                        }
                    } catch (e) {
                        console.error("Error fetching song from iTunes:", e);
                        setStatusMessage("Error finding music.");
                        result = { result: "I'm having trouble connecting to the music library right now." };
                    }
                } else if (fc.name === 'stopMusic') {
                    handleStopMusic();
                    setStatusMessage('Music stopped. Speak whenever you like.');
                    result = { result: "I've stopped the music." };
                } else if (fc.name === 'getNewsHeadlines') {
                    setStatusMessage("Looking up the latest headlines...");
                    const summary = await fetchNewsSummary();
                    setStatusMessage("Here's the latest news.");
                    result = { result: summary };
                } else {
                    result = { result: 'Unknown function call.' };
                }
        
                sessionPromiseRef.current?.then((session) => {
                    session.sendToolResponse({
                        functionResponses: {
                            id: fc.id,
                            name: fc.name,
                            response: result,
                        }
                    });
                });
            }
          }

          const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (audioData) {
            const outputContext = outputAudioContextRef.current!;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputContext.currentTime);
            const audioBuffer = await decodeAudioData(decode(audioData), outputContext, 24000, 1);
            const source = outputContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputContext.destination);
            
            source.onended = () => {
                audioSourcesRef.current.delete(source);
            };

            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            audioSourcesRef.current.add(source);
          }
        },
        onerror: (e: ErrorEvent) => {
          console.error('Session error:', e);
          setStatusMessage('Connection error. Please try again.');
          setIsSessionActive(false);
          handleStopMusic();
          cleanupAudio();
        },
        onclose: (e: CloseEvent) => {
          console.log('Session closed:', e);
          handleStopMusic();
          cleanupAudio();
          setIsSessionActive(false);
          setStatusMessage('Connection closed. Click to restart.');
        },
      };

      const systemInstruction = createSystemInstruction(songForPrompt);
      sessionPromiseRef.current = startLiveSession(callbacks, systemInstruction);

    } catch (error) {
      console.error('Failed to start session:', error);
      setStatusMessage('Could not access microphone.');
      setIsSessionActive(false);
      cleanupAudio();
    }
  }, [isSessionActive, cleanupAudio, handleStopMusic, sendSilentAudioPrompt]);

  const getDisplayStatus = () => {
    if (nowPlaying) {
      return `Now Playing: "${nowPlaying.song}" by ${nowPlaying.artist}`;
    }
    if (isSessionActive) {
      if (currentInput) return 'Listening...';
      if (currentOutput) return 'Kindly is speaking...';
    }
    return statusMessage;
  };

  return (
    <div className="flex items-center justify-center min-h-screen font-serif bg-gradient-to-br from-[#F5F5DC] to-[#D2B48C]">
      <RadioInterface
        isActive={isSessionActive}
        statusMessage={getDisplayStatus()}
        transcripts={transcripts}
        currentInput={currentInput}
        currentOutput={currentOutput}
        onToggle={handleToggleSession}
      />
      <audio ref={musicAudioRef} onEnded={handleStopMusic} />
    </div>
  );
};

export default App;
