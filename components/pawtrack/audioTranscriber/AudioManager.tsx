import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AudioPlayer from "./AudioPlayer";
import Constants from "./utils/Constants";
import { Transcriber } from "./hooks/useTranscriber";
import Progress from "./Progress";
import AudioRecorder from "./AudioRecorder";

interface AudioManagerProps {
    open: boolean;
    onClose: () => void;
    onTranscriptionComplete: (transcript: string) => void;
    transcriber: Transcriber;
}

export function AudioManager(props: AudioManagerProps) {
    const [progress, setProgress] = useState<number | undefined>(undefined);
    const [audioData, setAudioData] = useState<{
        buffer: AudioBuffer;
        url: string;
        mimeType: string;
    } | undefined>(undefined);

    const resetAudio = () => {
        setAudioData(undefined);
        setProgress(undefined);
    };

    const setAudioFromRecording = async (data: Blob) => {
        resetAudio();
        setProgress(0);
        return new Promise((resolve, reject) => {
            try {
                const blobUrl = URL.createObjectURL(data);
                const fileReader = new FileReader();

                fileReader.onprogress = (event) => {
                    setProgress(event.loaded / event.total || 0);
                };

                fileReader.onloadend = async () => {
                    const audioCTX = new AudioContext({
                        sampleRate: Constants.SAMPLING_RATE,
                    });
                    const arrayBuffer = fileReader.result as ArrayBuffer;
                    const decoded = await audioCTX.decodeAudioData(arrayBuffer);
                    setProgress(undefined);
                    setAudioData({
                        buffer: decoded,
                        url: blobUrl,
                        mimeType: data.type,
                    });
                    resolve({
                        buffer: decoded,
                        url: blobUrl,
                        mimeType: data.type,
                    });
                };

                fileReader.readAsArrayBuffer(data);
            } catch (error) {
                reject(error);
            }
        });
    };

    const handleTranscription = async (audioData: {
        buffer: AudioBuffer;
        url: string;
        mimeType: string;
    }) => {
        if (audioData) {
            await props.transcriber.start(audioData.buffer);
            props.onClose();
        }
    };



    const onSubmit = async () => {
        await handleTranscription(audioData as {
            buffer: AudioBuffer;
            url: string;
            mimeType: string;
        });
    };

    const onClose = () => {
        resetAudio();
        props.onClose();
    };

    const onRecordingComplete = async (blob: Blob) => {
        props.transcriber.onInputChange();
        await setAudioFromRecording(blob).then((audioData) => {
            handleTranscription(audioData as {
                buffer: AudioBuffer;
                url: string;
                mimeType: string;
            });
        }).catch((error) => {
            console.error(error);
        });
    };

    return (
        <Dialog open={props.open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Audio Transcription</DialogTitle>
                </DialogHeader>

                <div className='space-y-4'>
                    <div className='flex flex-col justify-center items-center rounded-lg'>
                        <div className='flex flex-row space-x-2 py-2 w-full px-2'>
                            {navigator.mediaDevices && (
                                <div className="space-y-4 w-full">
                                    <AudioRecorder onRecordingComplete={onRecordingComplete} />
                                </div>
                            )}
                        </div>
                    </div>

                    {audioData && (
                        <>
                            <AudioPlayer
                                audioUrl={audioData.url}
                                mimeType={audioData.mimeType}
                            />

                            {props.transcriber.progressItems.length > 0 && (
                                <div className='relative z-10 w-full'>
                                    <label>
                                        Loading model files... (only run once)
                                    </label>
                                    {props.transcriber.progressItems.map((data) => (
                                        <div key={data.file}>
                                            <Progress
                                                text={data.file}
                                                percentage={data.progress}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    {audioData && (
                        <Button
                            onClick={onSubmit}
                            disabled={!audioData || props.transcriber.isBusy || props.transcriber.isModelLoading}
                        >
                            {props.transcriber.isBusy ? 'Transcribing...' : 'Transcribe'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
