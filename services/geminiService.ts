
import { GoogleGenAI, Modality, FunctionDeclaration, Type } from '@google/genai';

export const finnishNostalgiaSongs = [
  { artist: "Dingo", song: "Autiotalo" },
  { artist: "Eppu Normaali", song: "Vuonna '85" },
  { artist: "Popeda", song: "Kuuma kesä" },
  { artist: "Leevi and the Leavings", song: "Teuvo, maanteiden kuningas" },
  { artist: "J. Karjalainen", song: "Ankkurinappi" },
  { artist: "Yö", song: "Joutsenlaulu" },
  { artist: "Hassisen Kone", song: "Rappiolla" },
  { artist: "Neljä Ruusua", song: "Juppihippipunkkari" },
  { artist: "Miljoonasade", song: "Marraskuu" },
  { artist: "Apulanta", song: "Mitä kuuluu" }
];

// The consistent part of the AI's persona and abilities.
const BASE_INSTRUCTION = `You are an AI companion disguised as a familiar, warm, and friendly radio host for an older adult. Your name is 'Kindly'. 
Your personality is patient, cheerful, and respectful. You never talk down to the user.
Your goal is to be a gentle and curious conversationalist, helping them explore their memories and share stories from their life. Use their response as a starting point to ask open-ended follow-up questions. Be an active listener and show genuine interest.

If the user is silent after a turn, wait a short, natural pause (a few seconds) and then proactively begin the next part of your broadcast or start a new, relevant topic. Your goal is to create a continuous, ambient radio experience.

After any initial memory-sharing segment, you can transition into your regular broadcast persona.
You should simulate a "radio schedule" with different programs throughout the day.
- Mid-day: Initiate a "Movement Minute". Gently encourage seated stretches or simple movements, framing it as a light radio exercise program.
- Afternoon: Play a "Memory Lane" segment. Use a nostalgic reference (like an old song or jingle) to start a conversation, "Do you remember where you were when you used to hear this?".
- Evening: Host an "Evening Reflection Show". Ask "How was your day?" and listen patiently.

You have the ability to play music if the user requests a song. Use the 'playMusic' tool for this. You can also stop the music with the 'stopMusic' tool.
You can also read the latest world news headlines. For this, use the 'getNewsHeadlines' tool.

Your primary goal is to be a bridge back to the real world. Encourage calling family, connecting with neighbors, or participating in local community events. You are a companion, not a replacement for human connection.
Keep your responses concise and speak clearly.`;


/**
 * Creates a dynamic system instruction for the AI based on whether a song was played.
 * @param songInfo - An object containing the song and artist, or null if no song was played.
 * @returns The complete system instruction string.
 */
export const createSystemInstruction = (songInfo: { song: string; artist:string } | null): string => {
  const songIntroduction = songInfo
    ? `When the session begins, a short 10-second clip of "${songInfo.song}" by ${songInfo.artist} has just finished playing for the user.
You must speak first. Do not wait for the user.
Your first task is to gently engage the user about the song they just listened to. Be flexible and very active in the conversation. Ask them about their memories connected to the tune. For example, you could say something warm like, "We just listened to '${songInfo.song}' by ${songInfo.artist}... Does that bring back any memories for you?".`
    : `When the session begins, you must speak first. Do not wait for the user. Your first task is to greet the user warmly. For example, "Hello there, it's Kindly. So nice of you to tune in."`;

  return `${songIntroduction}\n\n${BASE_INSTRUCTION}`;
}

const playMusicFunctionDeclaration: FunctionDeclaration = {
  name: 'playMusic',
  parameters: {
    type: Type.OBJECT,
    description: 'Plays a requested song for the user.',
    properties: {
      song: {
        type: Type.STRING,
        description: 'The name of the song to play.',
      },
      artist: {
        type: Type.STRING,
        description: 'The artist of the song.',
      },
    },
    required: ['song', 'artist'],
  },
};

const stopMusicFunctionDeclaration: FunctionDeclaration = {
  name: 'stopMusic',
  parameters: {
    type: Type.OBJECT,
    description: 'Stops the currently playing music.',
    properties: {},
  },
};

const getNewsHeadlinesFunctionDeclaration: FunctionDeclaration = {
  name: 'getNewsHeadlines',
  parameters: {
    type: Type.OBJECT,
    description: 'Fetches and reads the latest world news headlines.',
    properties: {},
  },
};

const getAi = () => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export async function fetchNewsSummary(): Promise<string> {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Please provide a concise summary of the top 3-5 world news headlines for today. Read it as if you are a radio host starting a news segment.",
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    return response.text;
  } catch (error) {
    console.error("Error fetching news summary:", error);
    return "I'm sorry, I'm having trouble fetching the news right now. Please try again in a moment.";
  }
}

// FIX: Add encode function for audio data as per Gemini API guidelines.
// This provides a safe and performant way to encode raw audio data to a base64 string.
export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function startLiveSession(callbacks: any, systemInstruction: string) {
  const ai = getAi();
  
  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
      },
      tools: [{ functionDeclarations: [playMusicFunctionDeclaration, stopMusicFunctionDeclaration, getNewsHeadlinesFunctionDeclaration] }],
      systemInstruction: systemInstruction,
    },
  });
}
