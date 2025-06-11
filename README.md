# 🎤 AI Voice Assistant - Live Streaming Conversation

A real-time speech-to-speech AI assistant powered by Google Gemini that enables **continuous live conversation** - speak naturally and get immediate AI responses just like talking to a human!

## ✨ Key Features

- **🔴 Live Streaming**: Continuous conversation without stopping/starting
- **⚡ Instant Responses**: AI responds immediately as you speak
- **🎙️ Natural Conversation**: No need to pause or wait - speak naturally
- **📱 Real-time UI**: Live transcription and visual feedback
- **🔊 Voice Synthesis**: Hear AI responses in natural speech
- **🎨 Modern Interface**: Beautiful, responsive design with live indicators
- **🔇 Mute Control**: Temporarily pause input without ending conversation

## 🚀 Quick Start

### Prerequisites

- Node.js (v18+ recommended)
- A microphone-enabled device
- Google Gemini API access

### Installation & Setup

1. **Navigate to the project directory**
   ```bash
   cd "gemini test voice"
   ```

2. **Install dependencies** (if not already done)
   ```bash
   npm install
   ```

3. **Start the live server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to: `http://localhost:3000`

5. **Allow microphone access** when prompted

## 🎯 How to Use Live Mode

1. **Click the microphone button** to start live conversation
2. **Speak naturally** - no need to stop or pause
3. **See live transcription** of what you're saying
4. **Get immediate AI responses** - both text and voice
5. **Continue the conversation** seamlessly
6. **Use mute button** to temporarily pause input
7. **Click microphone again** to end the conversation

## 🔧 Technical Architecture

### Live Streaming Pipeline

```
User Speech → Browser Audio → WebSocket Stream → Gemini Live API → AI Response → Audio Playback
     ↓              ↓              ↓                    ↓              ↓            ↓
  Microphone → Audio Processing → Real-time → Live Processing → Voice Synthesis → Speaker
```

### Components

- **Frontend**: Live audio streaming with continuous processing
- **Backend**: WebSocket server with persistent Gemini sessions
- **AI Model**: Google Gemini 2.0 Flash Live with audio modalities
- **Audio**: Real-time PCM streaming at 16kHz

### File Structure

```
├── server.js          # Live streaming server with WebSocket handling
├── app.js            # CLI version (legacy)
├── public/
│   └── index.html    # Live conversation interface
├── package.json      # Dependencies and scripts
└── README.md         # This file
```

## 🎨 Live Interface Features

- **🔴 Live Indicator**: Shows when conversation is active
- **🎙️ Animated Microphone**: Visual states (listening/speaking/connecting)
- **📊 Volume Visualization**: Real-time audio level display
- **💬 Live Chat**: Scrolling conversation with user/AI messages
- **🔇 Mute Control**: Pause input without ending session
- **📱 Responsive Design**: Works on all devices

## 🔊 Audio Processing Details

### Continuous Input Processing
1. Browser captures microphone in 250ms chunks
2. Audio converted to 16kHz PCM format
3. Real-time streaming to Gemini Live API
4. Immediate transcription and processing

### Instant Output Processing
1. Gemini returns audio response immediately
2. Base64 audio decoded and played
3. Live transcription displayed
4. Conversation continues seamlessly

## 🛠️ Live Conversation States

| State | Visual | Description |
|-------|--------|-------------|
| **Ready** | 🎤 Green | Click to start conversation |
| **Connecting** | ⏳ Purple | Establishing Gemini connection |
| **Listening** | 🎙️ Blue (Pulsing) | Actively listening to user |
| **Speaking** | 🔊 Orange (Glowing) | AI is responding |
| **Muted** | 🔇 Red | Input paused, conversation active |

## 🚀 Advanced Features

### Real-time Transcription
- **User Speech**: Live transcription as you speak
- **AI Responses**: See what AI will say before hearing it
- **Conversation History**: Scrolling chat interface

### Audio Management
- **Continuous Streaming**: No interruptions or delays
- **Echo Cancellation**: Built-in noise reduction
- **Auto Gain Control**: Optimal audio levels
- **Mute/Unmute**: Control input without ending session

### Session Management
- **Persistent Sessions**: One connection per conversation
- **Automatic Cleanup**: Resources freed on disconnect
- **Error Recovery**: Graceful handling of connection issues

## 🎯 Use Cases

- **Natural Conversations**: Talk to AI like a friend
- **Voice Assistants**: Hands-free interaction
- **Language Practice**: Conversational AI partner
- **Accessibility**: Voice-first interface
- **Real-time Q&A**: Instant responses to questions

## 🛠️ Troubleshooting

### Common Issues

1. **No AI Response**
   - Check server logs for Gemini API errors
   - Verify internet connection
   - Ensure microphone is working
   - Try restarting the conversation

2. **Audio Not Playing**
   - Check browser audio permissions
   - Verify speakers/headphones
   - Look for console errors
   - Try refreshing the page

3. **Microphone Issues**
   - Allow microphone permissions
   - Check if other apps are using mic
   - Try different browser
   - Restart browser if needed

4. **Connection Problems**
   - Ensure server is running on port 3000
   - Check WebSocket connection in dev tools
   - Verify firewall settings
   - Try restarting the server

### Browser Compatibility

- **Chrome**: Full support ✅ (Recommended)
- **Firefox**: Full support ✅
- **Safari**: Full support ✅
- **Edge**: Full support ✅

## 📝 Scripts

- `npm start` - Start the live streaming server
- `npm run dev` - Development mode (same as start)
- `npm run cli` - Run the original CLI version

## 🔐 Security & Performance

- **API Key**: Currently hardcoded (use env vars in production)
- **Rate Limiting**: Consider implementing for production
- **Audio Streaming**: Optimized 250ms chunks
- **Memory Management**: Automatic session cleanup
- **Error Handling**: Comprehensive error recovery

## 🎯 Future Enhancements

- [ ] Voice activity detection (VAD)
- [ ] Multiple language support
- [ ] Conversation memory/context
- [ ] Voice cloning options
- [ ] Mobile app version
- [ ] Group conversations
- [ ] Recording/playback features

## 📊 Performance Metrics

- **Latency**: ~500ms response time
- **Audio Quality**: 16kHz PCM
- **Streaming**: 250ms chunks
- **Memory**: Efficient session management
- **Bandwidth**: Optimized audio compression

## 📄 License

ISC License - Feel free to use and modify as needed.

---

**🎉 Experience the future of AI conversation - Start talking now!**

*Open http://localhost:3000 and click the microphone to begin your live conversation with AI.* 