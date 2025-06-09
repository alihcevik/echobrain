# EchoBrain

EchoBrain is an AI brainstorming partner that demonstrates the power of Google's Gemini Live API through WebSockets using the Google GenAI SDK. It brainstorms with you and maintains structured notes of your conversations in real-time through tool use as the conversation happens.

## Features

- 🤖 **Real-time Voice Interaction**: Engage in natural conversations with the AI assistant
- 📝 **Live Note-Taking**: Automatic, structured note-taking during conversations
- 🎯 **Smart Brainstorming**: Proactive assistance with thought-provoking questions and insights
- 📊 **Markdown Formatting**: Well-organized notes with hierarchical structure
- 🎙️ **Voice Input/Output**: Seamless audio interaction using microphone input and voice responses

## Technical Stack

- **Frontend**: Next.js 
- **AI Integration**: Google Gemini Live API (through Google GenAI JS SDK)
- **Real-time Communication**: WebSocket 
- **Audio Processing**: Custom microphone recorder implementation
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Valid API credentials stored in .env.local file as GEMINI_API_KEY=... (you can get a Gemini API key for free at ai.google.dev)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/alihcevik/echobrain.git
   cd echobrain
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add your Gemini API credentials:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Click the "Start" button to begin a conversation
2. Speak naturally - the AI will respond and take notes simultaneously
3. The notes will appear in real-time in the panel below
4. Click "Stop" to end the session

## Project Structure

```
echobrain/
├── app/
│   ├── page.js          # Main application component
│   └── layout.js        # Root layout
├── components/          # React components
├── util/
│   ├── geminiLive.js    # Gemini API integration
│   └── micRecorder.js   # Microphone handling
└── public/             # Static assets
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Google Gemini Live API for providing the AI capabilities
- Next.js team for the amazing framework
- All contributors who have helped shape this project
