# EchoBrain

EchoBrain is an AI brainstorming partner that demonstrates the power of Google's Gemini Live API through WebSockets using the Google GenAI SDK. 

It brainstorms with you and maintains structured notes of your conversations in real-time through tool use as the conversation happens.

It uses the `gemini-2.0-flash-live-001` model that produces output through semi-cascade method. 

> **Note**: For more information about Live API and SDKs, refer to [Gemini API docs](https://ai.google.dev/docs).

## Features

- 🤖 **Real-time Voice Interaction**: Engage in natural conversations with the AI assistant
- 📝 **Live Note-Taking**: Automatic, structured note-taking during conversations (through tool use)
- 🎯 **Smart Brainstorming**: Proactive assistance with thought-provoking questions and insights
- 📊 **Markdown Formatting**: Well-organized notes with hierarchical structure
- 🎙️ **Voice Input/Output**: Seamless audio interaction using microphone input and voice responses

## Technical Stack

- **Frontend**: Next.js 
- **Gemini Integration**: [Google GenAI SDK](https://ai.google.dev/gemini-api/docs/libraries)
- **Real-time Communication**: WebSocket 
- **Audio Processing**: Custom microphone recorder implementation
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Gemini API key (you can get one for free at [ai.google.dev](https://ai.google.dev))

> **Security Note**: Do not use Gemini API key for production environments as it's not safe. Consider using ephemeral tokens. For more information, refer to [ai.google.dev/docs](https://ai.google.dev/docs)

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
   ```env
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

## Documentation

For detailed information about the Gemini API and SDKs, visit:
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)