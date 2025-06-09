import { EventEmitter } from "eventemitter3";
import {convertToLittleEndian, convertPCMToFloat32} from "@/util/converters";

class MicRecorder extends EventEmitter {
    constructor(sampleRate = 24000) {
        super();
        this.audioContext = null;
        this.source = null;
        this.processorNode = null;
        this.sampleRate = sampleRate;
        this.isRecording = false;
        this.audioQueue = [];
        this.isPlaying = false;
        this.scheduledTime = 0;
    }

    async startRecording() {
        try {
            console.log("🔹 Requesting microphone access...");
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            console.log("Microphone access granted!");

            // Create audio context with the target sample rate
            this.audioContext = new AudioContext({ sampleRate: this.sampleRate });

            // Create a source from the microphone stream
            this.source = this.audioContext.createMediaStreamSource(this.stream);

            // Load the audio worklet module
            await this.audioContext.audioWorklet.addModule("./audio-processing-worklet.js");

            // Create an instance of the worklet processor
            this.processorNode = new AudioWorkletNode(this.audioContext, "audio-processing-worklet");
            
            // Handle incoming PCM chunks
            this.processorNode.port.onmessage = (event) => {
                const { int16arrayBuffer } = event.data.data;
                
                if (int16arrayBuffer) {
                    // Convert Float32 to Int16 before sending
                    const int16PCM = new Int16Array(int16arrayBuffer);
                    
                    // Ensure it's Little Endian
                    const littleEndianBuffer = convertToLittleEndian(int16PCM);
                    
                    this.emit("dataavailable", littleEndianBuffer);
                }
            };

            // Connect nodes
            this.source.connect(this.processorNode);
            this.processorNode.connect(this.audioContext.destination); // Keep audio processing alive
            this.isRecording = true;

            console.log("🎤 Microphone recording started...");
        } catch (error) {
            console.error("❌ Error accessing microphone:", error);
            alert("Error accessing microphone: " + error.message);
        }
    }

    async playAudio(audioBuffer) {
        try {
            if (!audioBuffer || audioBuffer.byteLength === 0) {
                console.warn("⚠️ Empty or invalid audio buffer received.");
                return;
            }

            // Ensure AudioContext exists (recreate if needed)
            if (!this.audioContext || this.audioContext.state === "closed") {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: this.sampleRate });
            }

            // Convert PCM16 to Float32 for playback
            const float32Buffer = convertPCMToFloat32(audioBuffer);

            // Queue audio for smooth playback
            this.audioQueue.push(float32Buffer);

            if (!this.isPlaying) {
                this.isPlaying = true;
                this.scheduledTime = this.audioContext.currentTime + 0.1; // Small buffer delay
                this.scheduleNextBuffer();
            }
        } catch (error) {
            console.error("❌ Error in playAudio:", error);
        }
    }


    scheduleNextBuffer() {
        const SCHEDULE_AHEAD_TIME = 0.1; // buffer to avoid gaps

        while (
            this.audioQueue.length > 0 &&
            this.scheduledTime < this.audioContext.currentTime + SCHEDULE_AHEAD_TIME
        ) {
            const audioData = this.audioQueue.shift();
            const audioBuffer = this.audioContext.createBuffer(1, audioData.length, this.audioContext.sampleRate);
            audioBuffer.getChannelData(0).set(audioData);

            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);

            // Ensure we never schedule in the past
            const startTime = Math.max(this.scheduledTime, this.audioContext.currentTime);
            source.start(startTime);
            
            this.scheduledTime = startTime + audioBuffer.duration;

            // Handle when the last chunk is played
            if (this.audioQueue.length === 0) {
                source.onended = () => {
                    this.isPlaying = false;
                    console.log("Audio playback complete.");
                };
            }
        }

        if (this.audioQueue.length > 0) {
            // Keep checking every 100ms if more data arrives
            setTimeout(() => this.scheduleNextBuffer(), 100);
        }
    }

    stopPlayback() {
        this.isPlaying = false;
        this.audioQueue = [];
        this.scheduledTime = this.audioContext.currentTime;
        // if (this.audioContext) {
        //     this.audioContext.close();
        // }
    }

    stopRecording() {
        if (!this.isRecording) return;
        this.isRecording = false;

        if (this.processorNode) {
            this.processorNode.disconnect();
            this.processorNode = null;
        }

        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
        }

        console.log("⏹️ Microphone recording stopped.");
    }
}



export default MicRecorder;