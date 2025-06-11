import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { GoogleGenAI, Modality } from "@google/genai";
import pkg from "wavefile";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const { WaveFile } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: "AIzaSyCD95_MIFyvJQLeEFyWmrSJITQe-D2yyjs" });
const model = "gemini-2.0-flash-live-001";

// Store active sessions per socket
const activeSessions = new Map();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Main route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔗 Client connected:', socket.id);

  socket.on('start-conversation', async () => {
    try {
      console.log('🎙️ Starting live conversation for client:', socket.id);
      await startLiveConversation(socket);
    } catch (error) {
      console.error('❌ Error starting conversation:', error);
      socket.emit('error', { message: 'Failed to start conversation' });
    }
  });

  socket.on('audio-stream', async (audioData) => {
    try {
      const session = activeSessions.get(socket.id);
      if (!session || !session.geminiSession) {
        console.log('⚠️ No active session for audio stream from', socket.id);
        return;
      }

      if (!session.setupComplete) {
        console.log('⏳ Setup not complete, skipping audio stream from', socket.id);
        return;
      }

      if (!audioData || audioData.length === 0) {
        console.log('⚠️ Empty audio data received from', socket.id);
        return;
      }

      console.log('🎵 Streaming audio data to Gemini... (length:', audioData.length, ')');
      
      // Add validation for base64 data
      try {
        const testDecode = Buffer.from(audioData, 'base64');
        console.log('✅ Audio data is valid base64, decoded length:', testDecode.length);
      } catch (e) {
        console.error('❌ Invalid base64 audio data:', e.message);
        return;
      }
      
      // Send audio as realtime input with proper format
      session.geminiSession.sendRealtimeInput({
        audio: {
          data: audioData,
          mimeType: "audio/pcm;rate=16000",
        },
      });
      
      console.log('📤 Audio sent to Gemini successfully');
    } catch (error) {
      console.error('❌ Error streaming audio:', error);
      socket.emit('error', { message: 'Failed to stream audio: ' + error.message });
    }
  });

  socket.on('send-text', (text) => {
    try {
      const session = activeSessions.get(socket.id);
      if (session && session.geminiSession && session.setupComplete) {
        console.log('💬 Sending text to Gemini:', text);
        session.geminiSession.sendRealtimeInput({
          text: text
        });
        console.log('📤 Text sent to Gemini successfully');
      } else {
        console.log('⚠️ Cannot send text - session not ready:', {
          hasSession: !!session,
          hasGeminiSession: !!session?.geminiSession,
          setupComplete: session?.setupComplete
        });
      }
    } catch (error) {
      console.error('❌ Error sending text:', error);
    }
  });

  socket.on('stop-conversation', () => {
    console.log('⏹️ Stopping conversation for client:', socket.id);
    stopLiveConversation(socket.id);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
    stopLiveConversation(socket.id);
  });
});

async function startLiveConversation(socket) {
  const config = {
    responseModalities: ['audio'],
    systemInstruction: "You are a helpful AI assistant. Respond naturally and conversationally. Keep responses concise but informative. Always respond when the user speaks to you. Provide both text and audio responses when possible."
  };

  try {
    const geminiSession = await ai.live.connect({
      model,
      config,
      callbacks: {
        onopen: () => {
          console.log("🔗 Gemini live session opened for", socket.id);
          socket.emit('conversation-started');
        },
        onmessage: (message) => {
          console.log("📨 Received message from Gemini:", JSON.stringify(message, null, 2));
          handleGeminiMessage(socket, message);
        },
        onerror: (error) => {
          console.error("❌ Gemini session error:", error);
          socket.emit('error', { message: 'Gemini session error', error: error.message });
        },
        onclose: (event) => {
          console.log("🔌 Gemini session closed for", socket.id, "Code:", event.code, "Reason:", event.reason);
          // Don't call cleanupSession here as stopLiveConversation handles it
          // Just remove from activeSessions to avoid double cleanup
          activeSessions.delete(socket.id);
          socket.emit('conversation-ended');
        }
      }
    });

    // Store session
    activeSessions.set(socket.id, {
      geminiSession,
      startTime: Date.now(),
      lastActivity: Date.now(),
      setupComplete: false
    });

    console.log("✅ Live conversation started for", socket.id);

  } catch (error) {
    console.error("❌ Failed to start live conversation:", error);
    socket.emit('error', { message: 'Failed to start conversation', error: error.message });
  }
}

// Add PCM to WAV conversion function
function pcmToWav(pcmData, sampleRate = 24000, channels = 1, bitDepth = 16) {
  try {
    console.log(`🔧 Converting PCM to WAV: ${pcmData.length} bytes, ${sampleRate}Hz, ${channels} channels, ${bitDepth}-bit`);
    
    // Decode base64 PCM data
    const pcmArray = new Uint8Array(Buffer.from(pcmData, 'base64'));
    const samples = new Int16Array(pcmArray.buffer);
    
    console.log(`📊 PCM samples: ${samples.length} samples`);
    
    const length = samples.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * bitDepth / 8, true);
    view.setUint16(32, channels * bitDepth / 8, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Copy PCM data to WAV
    for (let i = 0; i < samples.length; i++) {
      view.setInt16(44 + i * 2, samples[i], true);
    }
    
    console.log(`✅ WAV conversion complete: ${arrayBuffer.byteLength} bytes`);
    return arrayBuffer;
    
  } catch (error) {
    console.error("❌ Error in PCM to WAV conversion:", error);
    throw error;
  }
}

function handleGeminiMessage(socket, message) {
  const session = activeSessions.get(socket.id);
  if (!session) return;

  // Update last activity
  session.lastActivity = Date.now();

  try {
    // Handle setup completion
    if (message.setupComplete) {
      console.log("✅ Gemini setup completed for", socket.id);
      if (session) {
        session.setupComplete = true;
        // Initialize audio collection for this session
        session.audioChunks = [];
        session.isCollectingAudio = false;
      }
      socket.emit('setup-complete');
      
      // Send a test message to trigger AI response
      setTimeout(() => {
        try {
          const currentSession = activeSessions.get(socket.id);
          if (currentSession && currentSession.geminiSession && currentSession.setupComplete) {
            console.log("🧪 Sending test message to verify connection...");
            currentSession.geminiSession.sendRealtimeInput({
              text: "Hello, can you hear me? Please respond to confirm the connection is working."
            });
            console.log("📤 Test message sent successfully");
          } else {
            console.log("⚠️ Cannot send test message - session not ready");
          }
        } catch (error) {
          console.error("❌ Error sending test message:", error);
        }
      }, 1000);
      
      return;
    }

    // Handle server content
    if (message.serverContent) {
      // Handle model turn (start of AI response)
      if (message.serverContent.modelTurn) {
        console.log("🤖 Model turn detected");
        // Start collecting audio chunks
        session.isCollectingAudio = true;
        session.audioChunks = [];
        
        // Handle text response
        if (message.serverContent.modelTurn.parts) {
          for (const part of message.serverContent.modelTurn.parts) {
            if (part.text) {
              console.log("💬 AI Text Response:", part.text);
              socket.emit('ai-response', { text: part.text });
            }
            
            // Collect audio chunks instead of playing immediately
            if (part.inlineData && part.inlineData.mimeType === "audio/pcm;rate=24000") {
              console.log("🔊 Collecting AI audio chunk...");
              session.audioChunks.push(part.inlineData.data);
            }
          }
        }
      }

      // Handle generation complete - combine and send all audio
      if (message.serverContent.generationComplete) {
        console.log("✅ Generation completed for", socket.id);
        
        if (session.audioChunks && session.audioChunks.length > 0) {
          console.log(`🎵 Combining ${session.audioChunks.length} audio chunks for playback`);
          
          try {
            // Combine all audio chunks
            const combinedAudioData = session.audioChunks.join('');
            
            // Convert combined PCM to WAV (pass base64 string directly)
            console.log("🔧 Converting combined PCM to WAV:", combinedAudioData.length, "base64 chars");
            
            const wavBuffer = pcmToWav(combinedAudioData, 24000, 1, 16);
            const wavBase64 = Buffer.from(wavBuffer).toString('base64');
            
            console.log("✅ Combined WAV conversion complete:", wavBuffer.byteLength, "bytes");
            console.log("🎵 Sending combined WAV audio to client");
            
            socket.emit('ai-audio-response', { 
              audio: wavBase64,
              format: 'wav'
            });
            
            // Clear audio chunks
            session.audioChunks = [];
            session.isCollectingAudio = false;
            
          } catch (error) {
            console.error("❌ Error processing combined audio:", error);
          }
        }
      }

      // Handle turn complete
      if (message.serverContent.turnComplete) {
        console.log("🔄 Turn completed for", socket.id);
        // Ensure audio collection is stopped
        if (session) {
          session.isCollectingAudio = false;
        }
      }
    }

  } catch (error) {
    console.error("❌ Error handling Gemini message:", error);
  }
}

function stopLiveConversation(socketId) {
  const session = activeSessions.get(socketId);
  if (session) {
    try {
      // Only close if the session is still active
      if (session.geminiSession && session.geminiSession.readyState !== WebSocket.CLOSED) {
        session.geminiSession.close();
      }
      activeSessions.delete(socketId);
      console.log("🛑 Live conversation stopped for", socketId);
    } catch (error) {
      console.error("❌ Error stopping conversation:", error);
      // Still remove from active sessions even if close fails
      activeSessions.delete(socketId);
    }
  }
}

// Add the missing cleanupSession function
function cleanupSession(socketId) {
  const session = activeSessions.get(socketId);
  if (session) {
    try {
      // Close the Gemini session if it's still open
      if (session.geminiSession) {
        session.geminiSession.close();
      }
      // Remove from active sessions
      activeSessions.delete(socketId);
      console.log("🧹 Session cleaned up for", socketId);
    } catch (error) {
      console.error("❌ Error cleaning up session:", error);
    }
  }
}

// Cleanup inactive sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  const timeout = 5 * 60 * 1000; // 5 minutes

  for (const [socketId, session] of activeSessions.entries()) {
    if (now - session.lastActivity > timeout) {
      console.log("🧹 Cleaning up inactive session:", socketId);
      cleanupSession(socketId);
    }
  }
}, 60000); // Check every minute

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🎤 Live streaming conversation mode enabled`);
}); 