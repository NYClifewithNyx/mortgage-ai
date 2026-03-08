import { useState, useRef, useEffect } from 'react';
import { Mic, UploadCloud, FileText } from 'lucide-react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type AppState = 'upload' | 'analyzing' | 'interview' | 'countdown' | 'result';
type QualificationResult = 'QUALIFIED' | 'RISKY' | 'NOT_QUALIFIED' | null;
type TranscriptItem = { role: 'user' | 'agent'; text: string; };

export default function App() {
  const [appState, setAppState] = useState<AppState>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [propertyValue, setPropertyValue] = useState<number | null>(null);
  const [isDemoValue, setIsDemoValue] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);

  const [result, setResult] = useState<QualificationResult>(null);
  const [countdown, setCountdown] = useState(5);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const recognitionRef = useRef<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  };

  const startAnalysis = async () => {
    if (!file) return;
    setAppState('analyzing');

    const formData = new FormData();
    formData.append('file', file);

    try {
      // call backend, expect {"value": 1234, "is_demo": bool}
      const res = await fetch('http://localhost:8000/api/analyze-property', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setPropertyValue(data.value);
      setIsDemoValue(data.is_demo);
      setAppState('interview');
    } catch (err) {
      console.error(err);
      // fallback
      setPropertyValue(21950000);
      setIsDemoValue(true);
      setAppState('interview');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const audioCtx = new window.AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      // ScriptProcessor is deprecated but easiest for 16-bit PCM conversion across browsers
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      audioProcessorRef.current = processor;

      wsRef.current = new WebSocket('ws://localhost:8000/ws');
      wsRef.current.binaryType = 'arraybuffer';

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          const last = event.results.length - 1;
          const text = event.results[last][0].transcript;
          if (text.trim()) {
            setTranscript(prev => [...prev.slice(-3), { role: 'user', text }]);
          }
        };

        recognition.onend = () => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            try { recognition.start(); } catch (e) { }
          }
        };

        try {
          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.error("Speech recognition error:", e);
        }
      }

      const analyzer = audioCtx.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      const dataArray = new Uint8Array(analyzer.frequencyBinCount);

      const checkVolume = () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        analyzer.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setIsUserSpeaking(avg > 15);
        requestAnimationFrame(checkVolume);
      };

      wsRef.current.onopen = () => {
        setIsRecording(true);
        requestAnimationFrame(checkVolume);
        // Send initial setup
        wsRef.current?.send(JSON.stringify({
          type: 'setup',
          message: `The user has uploaded a property image. You analyzed it and estimated its value at $${propertyValue ? propertyValue.toLocaleString() : '21,950,000'}. Introduce yourself as the Mortgage Helper AI and start the conversation immediately to help them figure out if they can afford this home.`
        }));
      };

      // We will play received audio with another AudioContext since Gemini sends 24kHz natively (the server might be returning PCM)
      const playCtx = new window.AudioContext({ sampleRate: 24000 });
      if (playCtx.state === 'suspended') {
        playCtx.resume();
      }
      let nextStartTime = playCtx.currentTime;

      wsRef.current.onmessage = async (event) => {
        if (event.data instanceof ArrayBuffer) {
          // Received PCM audio data from Gemini backend
          const arrayBuffer = event.data;
          // The backend sends 16-bit PCM. We need to convert it to Float32 for Web Audio API
          const int16Array = new Int16Array(arrayBuffer);
          const float32Array = new Float32Array(int16Array.length);
          for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768.0;
          }

          const audioBuffer = playCtx.createBuffer(1, float32Array.length, 24000);
          audioBuffer.getChannelData(0).set(float32Array);

          const source = playCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(playCtx.destination);

          if (nextStartTime < playCtx.currentTime) {
            nextStartTime = playCtx.currentTime;
          }
          source.start(nextStartTime);
          nextStartTime += audioBuffer.duration;
        } else {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'transcript') {
              setTranscript(prev => [...prev.slice(-3), { role: 'agent', text: data.text }]);

              // Check for dramatic result in text
              const textUpper = data.text.toUpperCase();
              if (textUpper.includes("NOT QUALIFIED FOR THIS HOME")) {
                setResult('NOT_QUALIFIED');
                triggerCountdown();
              } else if (textUpper.includes("YOU ARE QUALIFIED")) {
                setResult('QUALIFIED');
                setAppState('result');
              } else if (textUpper.includes("RISKY")) {
                setResult('RISKY');
                setAppState('result');
              }
            }
          } catch (e) {
            console.error(e);
          }
        }
      };

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const float32Array = e.inputBuffer.getChannelData(0);
        // Convert to 16-bit PCM
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
          const s = Math.max(-1, Math.min(1, float32Array[i]));
          int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        wsRef.current.send(int16Array.buffer);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination); // Required for chrome

    } catch (err) {
      console.error("Error accessing mic: ", err);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) { }
    }
  };

  const triggerCountdown = () => {
    setAppState('countdown');
    setCountdown(5);
    const int = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(int);
          setAppState('result');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (appState === 'interview' && !isRecording) {
      startRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState]);

  return (
    <div className="app-container">
      <header id="header">
        <h1 className="title">Mortgage AI Agent</h1>
        <p className="subtitle">Ask a house if you can afford it. Get a reality check.</p>
      </header>

      {appState === 'upload' && (
        <div className="card">
          <label
            className={`upload-area ${isDragging ? 'active' : ''}`}
            style={{ display: 'block' }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}
            />
            <UploadCloud size={48} style={{ color: 'var(--accent-blue)', margin: '0 auto 1rem' }} />
            <h3>Upload House Photo</h3>
            <p style={{ color: 'var(--text-secondary)' }}>We'll use internal AI to estimate the value.</p>
          </label>

          {previewUrl && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <img src={previewUrl} alt="Preview" className="img-preview" />
              <br />
              <button className="btn" onClick={startAnalysis}>
                Analyze Property
              </button>
            </div>
          )}
        </div>
      )}

      {appState === 'analyzing' && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div className="spinner" style={{ margin: '0 auto 2rem', borderColor: 'var(--accent-blue)', borderTopColor: 'transparent', width: '40px', height: '40px' }}></div>
          <h2>Analyzing Property...</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Estimating NYC market value</p>
        </div>
      )}

      {appState === 'interview' && (
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ color: 'var(--accent-blue)', fontSize: '2rem', marginBottom: '0.5rem' }}>
              ${propertyValue?.toLocaleString()}
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              {isDemoValue ? 'Estimated Value (Demo Fallback)' : 'Estimated Market Value'}
            </p>
          </div>

          <div
            id="micButton"
            className={`mic-btn ${isUserSpeaking ? 'active' : ''}`}
            style={{ cursor: 'default' }}
          >
            <Mic />
          </div>

          <p style={{ textAlign: 'center', marginBottom: '1rem', color: isRecording ? 'var(--status-green)' : 'var(--status-amber)' }}>
            {isRecording ? 'Listening and talking...' : 'Starting microphone stream...'}
          </p>

          <div className="transcript-area" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {transcript.length === 0 ? (
              <span style={{ opacity: 0.5, margin: 'auto' }}>Transcript will appear here...</span>
            ) : (
              transcript.map((t, i) => (
                <div
                  key={i}
                  style={{
                    opacity: (i === transcript.length - 1) ? 1 : 0.6,
                    textAlign: t.role === 'user' ? 'right' : 'left',
                    color: t.role === 'user' ? 'var(--accent-blue)' : 'var(--text-primary)',
                    background: t.role === 'user' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    maxWidth: '85%',
                    alignSelf: t.role === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <strong style={{ opacity: 0.7, fontSize: '0.85em', display: 'block', marginBottom: '2px' }}>
                    {t.role === 'user' ? 'You' : 'AI'}
                  </strong>
                  {t.text}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {appState === 'countdown' && (
        <div>
          <h2 style={{ textAlign: 'center', fontSize: '3rem', color: 'var(--status-red)' }}>NOT QUALIFIED</h2>
          <div className="countdown">{countdown}</div>
        </div>
      )}

      {appState === 'result' && (
        <div className="card status-card">
          {result === 'QUALIFIED' && (
            <>
              <h1 className="status-title status-qualified">QUALIFIED</h1>
              <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Congratulations. You can proceed with financing.</p>
            </>
          )}

          {result === 'RISKY' && (
            <>
              <h1 className="status-title status-risky">RISKY</h1>
              <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Your debt-to-income or credit score puts you in a risky zone.</p>
              <div className="info-grid">
                <div className="info-box">
                  <h4>Recommended Max Price</h4>
                  <p>$ {Math.floor((propertyValue || 0) * 0.75).toLocaleString()}</p>
                </div>
              </div>
            </>
          )}

          {result === 'NOT_QUALIFIED' && (
            <>
              <h1 className="status-title status-not-qualified">NOT QUALIFIED</h1>
              <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                You are not qualified for this home with your current income.
              </p>

              <div className="info-grid" style={{ textAlign: 'left' }}>
                <div className="info-box">
                  <h4>Home Price</h4>
                  <p>${propertyValue?.toLocaleString()}</p>
                </div>
                <div className="info-box">
                  <h4>Required Down Payment (20%)</h4>
                  <p>${((propertyValue || 0) * 0.2).toLocaleString()}</p>
                </div>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', margin: '2rem 0', textAlign: 'left' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={20} /> Required Documents
                </h3>
                <ul style={{ marginLeft: '1.5rem', color: 'var(--text-secondary)' }}>
                  <li>Last 2 years W-2s</li>
                  <li>Last 2 years Tax Returns</li>
                  <li>Pay stubs for the last 30 days</li>
                  <li>Bank statements for the last 2 months</li>
                  <li>Explanation of DTI ratio exceeding 43%</li>
                </ul>
              </div>

              <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', marginTop: '2rem' }}>
                And if all else fails &mdash; we found a lovely kennel in Astoria well within your budget.
              </p>
            </>
          )}

          <button className="btn btn-secondary" style={{ marginTop: '2rem' }} onClick={() => window.location.reload()}>
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}
