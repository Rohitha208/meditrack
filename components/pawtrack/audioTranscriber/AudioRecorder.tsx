import { useState, useEffect, useRef } from "react";

import { formatAudioTimestamp } from "./utils/AudioUtils";
import { webmFixDuration } from "./utils/BlobFix";
import { Mic } from 'lucide-react';

function getMimeType() {
    const types = [
        "audio/webm",
        "audio/mp4",
        "audio/ogg",
        "audio/wav",
        "audio/aac",
    ];
    for (let i = 0; i < types.length; i++) {
        if (MediaRecorder.isTypeSupported(types[i])) {
            return types[i];
        }
    }
    return undefined;
}

export default function AudioRecorder(props: {
    onRecordingComplete: (blob: Blob) => void;
}) {
    const [recording, setRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const streamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    const startRecording = async () => {
        // Reset recording (if any)
        setRecordedBlob(null);
        setErrorMessage(null);

        let startTime = Date.now();

        try {
            // Ensure environment supports media devices
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setErrorMessage("This browser doesn't support audio recording.");
                return;
            }

            // Find a valid audio input device if available
            const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
            const audioInputs = devices.filter((d) => d.kind === "audioinput");
            // Some browsers report 0 devices until permission is granted; do not early-return here
            const preferredDeviceId = audioInputs[0]?.deviceId;

            if (!streamRef.current) {
                // Try with a specific device first, then fall back to generic audio: true
                try {
                    streamRef.current = await navigator.mediaDevices.getUserMedia({
                        audio: preferredDeviceId ? { deviceId: { exact: preferredDeviceId } } : true,
                    });
                } catch (err: any) {
                    // Retry with relaxed constraints (some browsers reject exact deviceId)
                    try {
                        streamRef.current = await navigator.mediaDevices.getUserMedia({
                            audio: true,
                        });
                    } catch (fallbackErr: any) {
                        if (audioInputs.length === 0 && (fallbackErr?.name === "NotFoundError" || fallbackErr?.name === "DevicesNotFoundError")) {
                            setErrorMessage("No microphone found. Please connect a microphone and try again.");
                            return;
                        }
                        throw fallbackErr;
                    }
                }
            }

            const mimeType = getMimeType();
            const mediaRecorder = new MediaRecorder(streamRef.current, {
                mimeType,
            });

            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.addEventListener("dataavailable", async (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
                if (mediaRecorder.state === "inactive") {
                    const duration = Date.now() - startTime;

                    // Received a stop event
                    let blob = new Blob(chunksRef.current, { type: mimeType });

                    if (mimeType === "audio/webm") {
                        blob = await webmFixDuration(blob, duration, blob.type);
                    }

                    setRecordedBlob(blob);
                    props.onRecordingComplete(blob);

                    chunksRef.current = [];
                }
            });
            mediaRecorder.start();
            setRecording(true);
        } catch (error: any) {
            console.error("Error accessing microphone:", error);
            let message = "Unable to access microphone.";
            if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") {
                message = "Requested device not found. Please choose a valid microphone in your OS settings.";
            } else if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
                message = "Microphone permission denied. Please allow access and try again.";
            } else if (error?.name === "NotReadableError") {
                message = "Microphone is in use by another application. Close it and try again.";
            } else if (window && window.isSecureContext === false) {
                message = "Microphone requires a secure context (HTTPS or localhost).";
            }
            setErrorMessage(message);
        }
    };

    const stopRecording = () => {
        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state === "recording"
        ) {
            mediaRecorderRef.current.stop(); // set state to inactive
            setDuration(0);
            setRecording(false);
        }
    };

    useEffect(() => {
        let stream = streamRef.current;

        if (recording) {
            const timer = setInterval(() => {
                setDuration((prevDuration) => prevDuration + 1);
            }, 1000);

            return () => {
                clearInterval(timer);
            };
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
            }
        };
    }, [recording]);

    const handleToggleRecording = () => {
        if (recording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    return (
        <div className='flex flex-col items-center space-y-4'>
            <button
                type='button'
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 ${
                    recording
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-red-500 hover:bg-red-600"
                }`}
                onClick={handleToggleRecording}
            >
                <Mic className={`w-12 h-12 text-white ${recording ? "animate-pulse" : ""}`} />
            </button>

            <p className="text-center text-sm text-gray-500">
                {recording
                    ? `Listening... (${formatAudioTimestamp(duration)})`
                    : "Click to start recording"}
            </p>

            {errorMessage && (
                <p className="text-center text-sm text-red-600">{errorMessage}</p>
            )}

            {recordedBlob && (
                <audio className='w-full' ref={audioRef} controls>
                    <source
                        src={URL.createObjectURL(recordedBlob)}
                        type={recordedBlob.type}
                    />
                </audio>
            )}
        </div>
    );
}
