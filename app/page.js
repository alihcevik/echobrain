'use client';
import { useState, useEffect } from "react";
import GeminiLiveClient from "@/util/geminiLive"; 
import MicRecorder from "@/util/micRecorder"; 
import ReactMarkdown from "react-markdown";


const micRecorder = new MicRecorder(); 
const geminiClient = new GeminiLiveClient();

const setNotesSchema = {
  name: "set_notes",
  description: "Sets meeting notes.",
  parameters: {
    type: "object",
    properties: {
      notes: {
        type: "string",
        description: "Meeting notes to set",
      },
    },
    required: ["notes"],
  },
};

const prompt = `
  You are my **diligent and proactive brainstorming AND note taking partner**. 
  I am trying to brainstorm about a topic in a structured way.
  Your role is to listen to me and help me brainstorm by asking questions, providing insights and MOST IMPORTANTLY taking notes.

  At the **beginning of the conversation**, always ask a question.        
  
  (No need to mention note-taking—just do it in the background.)


    **How You Take Notes:**
    - **You must always update notes in parallel (by calling the tool) with the conversation as long as conversation progresses.**  If the discussion is happening and there's new information, notes need updating. This is non-negotiable.
    - **DO NOT WAIT LONG to start updating notes, as soon as user clarifies the topic, update the notes with the title of the topic already even if the rest of the content is not there.**
    - **Capture content, not conversation**—avoid "User asked about X," and instead **record the actual insights.**
    - **Structure notes** using **Markdown** for clarity (headings, bullet points, sections). Make sure to use '#', '##', '###' and like for hierarchical organization.
    - **Continuously refine** the document for clarity and completeness.
    - **Never interrupt the conversation** to confirm notes—just **update them seamlessly.**
    - **Try to move the notes forward, before trying to going back and changing them. Going back and changing them is fine when you really need to revisit, but ideally, notes should move forward as the discussion moves forward so that we're making progress. Think about it like meeting notes capturing the discussion, not a transcript.**
    ---

    **Rules You Must Follow:**
    1. **Always respond to the user conversationally**—you are both an assistant and a note-taker.
    2. **Always take structured, markdown-formatted notes in the background. Use bullet points, as well as subtitles**
    3. **Never summarize the conversation itself** (e.g., "User asked about Ukraine")—instead, **capture the key content.** Also don't include things like "Overview requested" or "Transition to discussing architecture". We're not summarizing events.

    DO NOT take notes like "User wants to learn about X" or "User is doing X". NEVER talk about User in third person. We're structuring conversations, not taking event log.
    
    4. **Never explicitly mention that you updated the notes**—it happens invisibly.
    5. **When given existing notes, refine and improve them instead of appending blindly.**


    ---

    **Example of Proper Notes:**
    
    **Wrong Approach (Conversational Log)**  
    > "User asked for four bullet points about the situation in Ukraine."
    
    **Correct Approach (Structured, Markdown Notes)**  
    ### Situation in Ukraine
    - **Political Developments**: [Key insights]
    - **Economic Impact**: [Key insights]
    - **Military Situation**: [Key insights]
    - **International Reactions**: [Key insights]    
  
`



export default function Home() 
{
  const [isRecording, setIsRecording] = useState(false);
  const [notes, setNotes] = useState("");
 
  const startRecording = async () => 
  {
    console.log("Start button clicked, initializing Gemini connection...");

    try {
      const geminiConfig = {
        model: "models/gemini-2.0-flash-live-001",
        generationConfig: {
          responseModalities: ["audio"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
          },
        },
        systemInstruction: {
          parts: [{ text: prompt }],
        },
        tools: [{ functionDeclarations: [setNotesSchema] }],
      };

      await geminiClient.connect(geminiConfig); // Ensure WebSocket is connected
      console.log("Connected to Gemini, starting recording...");

      await micRecorder.startRecording(); // Start Mic Recording

      setIsRecording(true);
    } catch (error) {
      console.error(" Error starting recording:", error);
    }
  };


  const stopRecording = async () => 
  {
    console.log("Stop button clicked...");
    await micRecorder.stopRecording(); // Stop Mic Recording
    geminiClient.disconnect(); // Stop WebSocket
    setIsRecording(false);
  };

  const handleTools = (toolCall) => 
  {
    console.log("Tool call");
    
    const fc = toolCall.functionCalls.find((fc) => fc.name === "set_notes");

    if (fc) {
      const newNotes = fc.args.notes;
      setNotes(newNotes);
    }
  };

  const handleAudioResponse = (audioBuffer) => {
    console.log("Received AI audio response, playing...");
    micRecorder.playAudio(audioBuffer);
  };
 
  const handleInterrupt = () => {
    console.log("Handle Interrupt called")
    micRecorder.stopPlayback();
  };

  useEffect(() => 
  {
    micRecorder.on("dataavailable", (chunk) => {
      geminiClient.sendAudioChunk(chunk);
    });

    geminiClient.on("audio", handleAudioResponse);
    geminiClient.on("toolcall", handleTools);
    geminiClient.on("interrupted", handleInterrupt);
    return () => {};
  }, []);

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">EchoBrain</h1>
      
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`px-4 py-2 rounded-md ${
          isRecording ? "bg-red-600" : "bg-indigo-600"
        }`}
      >
        {isRecording ? "Stop" : "Start"}
      </button>

      <div className="mt-4 p-4 bg-gray-800 rounded-md min-h-40">
        <h2 className="text-lg font-semibold mb-2">Live Notes</h2>
        <div className="prose prose-invert max-w-none list-disc prose-ul:list-disc">
          <ReactMarkdown>
            {notes || "*Start speaking to take notes...*"}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}