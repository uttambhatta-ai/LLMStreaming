import { GoogleGenAI, Modality } from "@google/genai";
import record from "node-record-lpcm16";
import fs from "fs";
import player from "play-sound";
import pkg from "wavefile";

const { WaveFile } = pkg;

const ai = new GoogleGenAI({ apiKey: "AIzaSyCD95_MIFyvJQLeEFyWmrSJITQe-D2yyjs" });
const model = "gemini-2.0-flash-live-001";

const config = {
  responseModalities: [Modality.AUDIO],
  inputAudioTranscription: {},
  outputAudioTranscription: {}
};

async function liveSendAudio(base64Audio) {
  console.log("🔄 Starting Gemini live session...");
  const responseQueue = [];

  async function waitMessage() {
    while (true) {
      const message = responseQueue.shift();
      if (message) return message;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  async function handleTurn() {
    const turns = [];
    let turnTimeout = setTimeout(() => {
      console.log("⏰ Turn timeout - no complete message received in 30 seconds");
    }, 30000);

    while (true) {
      const message = await waitMessage();
      console.log("📨 Received message from Gemini:", JSON.stringify(message, null, 2));
      turns.push(message);
      if (message.serverContent?.turnComplete) {
        console.log("✅ Turn completed");
        clearTimeout(turnTimeout);
        break;
      }
    }
    return turns;
  }

  try {
    const session = await ai.live.connect({
      model,
      config,
      callbacks: {
        onopen: () => console.log("🔗 Session opened successfully"),
        onmessage: (message) => {
          console.log("📩 New message received", message);
          responseQueue.push(message);
        },
        onerror: (e) => {
          console.error("❌ Session error:", e.message);
          console.error("❌ Full error:", e);
        },
        onclose: (e) => {
          console.log("🔐 Session closed");
          console.log("🔐 Close reason:", e?.reason || "No reason provided");
          console.log("🔐 Close code:", e?.code || "No code provided");
        },
      },
    });

    console.log("📤 Sending audio to Gemini...");
    console.log("🎵 Audio data length:", base64Audio.length, "characters");
    
    // Send audio as realtime input
    session.sendRealtimeInput({
      audio: {
        data: base64Audio,
        mimeType: "audio/pcm;rate=24000",
      },
    });

    console.log("✅ Audio sent successfully, waiting for response...");

    // Wait for responses with timeout
    console.log("⏳ Waiting for Gemini to process audio...");
    const turns = await Promise.race([
      handleTurn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Response timeout after 45 seconds")), 45000)
      )
    ]);

    console.log("🔍 Processing", turns.length, "turn(s) from Gemini...");

    // Process received turns
    for (const turn of turns) {
      if (turn.serverContent?.outputTranscription) {
        console.log("📝 Transcription:", turn.serverContent.outputTranscription.text);
      }
      if (turn.serverContent?.outputAudio) {
        console.log("🔊 Received audio response, saving to response.wav...");
        const audioResponse = turn.serverContent.outputAudio;
        fs.writeFileSync("response.wav", audioResponse);
        console.log("▶️ Playing audio response...");
        player().play("response.wav", (err) => {
          if (err) console.error("❌ Audio play error:", err);
          else console.log("✅ Audio played successfully");
        });
      }
      if (turn.text) {
        console.log("💬 Text response:", turn.text);
      }
    }

    console.log("🔚 Closing session...");
    session.close();
    
  } catch (error) {
    console.error("❌ LiveSendAudio error:", error.message);
    console.error("❌ Full error stack:", error.stack);
  }
}

async function main() {
  console.log("🎙️ Starting voice recording... Press Ctrl+C to stop.");

  const recorder = record.record({
    sampleRateHertz: 16000,
    threshold: 0,
    verbose: false,
    recordProgram: "sox",
    silence: "10.0",
  });

//   console.log("🔴 Recording started with settings:");
//   console.log("   - Sample Rate: 16000 Hz");
//   console.log("   - Format: PCM");
//   console.log("   - Auto-stop after 10s silence");

  const file = fs.createWriteStream("input.wav", { encoding: "binary" });
  recorder.stream().pipe(file);

  await new Promise((resolve) => {
    process.on("SIGINT", async () => {
      console.log("\n⏹️ Stopping recording...");
      recorder.stop();

      file.end(async () => {
        console.log("💾 Recording saved to input.wav");

        try {
          // Read recorded file
          console.log("📖 Reading recorded audio file...");
          const fileBuffer = fs.readFileSync("input.wav");
          console.log("📏 File size:", fileBuffer.length, "bytes");

          // Convert and encode with wavefile
          console.log("🔄 Converting audio format with WaveFile...");
          const wav = new WaveFile();
          wav.fromBuffer(fileBuffer);
          
          console.log("📊 Original audio info:");
          console.log("   - Sample Rate:", wav.fmt.sampleRate, "Hz");
          console.log("   - Bit Depth:", wav.bitDepth, "bits");
          console.log("   - Channels:", wav.fmt.numChannels);
          
          wav.toSampleRate(16000);
          wav.toBitDepth("16");
          
          console.log("✅ Audio converted to:");
          console.log("   - Sample Rate: 16000 Hz");
          console.log("   - Bit Depth: 16 bits");
          
          console.log("🔤 Encoding to base64...");
          const base64Audio = wav.toBase64();
          console.log("✅ Base64 encoding complete, length:", base64Audio.length, "characters");

          // Send to Gemini live
          console.log("🚀 Sending audio to Gemini API...");
          await liveSendAudio(base64Audio);

        } catch (err) {
          console.error("❌ Error processing/sending audio:", err);
          console.error("Stack trace:", err.stack);
        } finally {
          console.log("🏁 Process completed");
          resolve();
        }
      });
    });
  });
}

main();
