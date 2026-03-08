import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, UploadCloud, FileText } from 'lucide-react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type AppState = 'upload' | 'analyzing' | 'conversation';
type ConvStep = 'intro' | 'finance' | 'result' | 'countdown';
type TranscriptItem = { role: 'user' | 'agent'; text: string; };

export default function App() {
  const [appState, setAppState] = useState<AppState>('upload');
  const [convStep, setConvStep] = useState<ConvStep>('intro');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [propertyValue, setPropertyValue] = useState<number | null>(null);
  const [isDemoValue, setIsDemoValue] = useState(false);

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);

  const [result, setResult] = useState<'QUALIFIED' | 'RISKY' | 'NOT_QUALIFIED' | null>(null);
  const [countdown, setCountdown] = useState(5);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const listeningRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const convStepRef = useRef<ConvStep>('intro');

  // Sync listening state to ref for callbacks
  useEffect(() => {
    listeningRef.current = listening;
    if (recognitionRef.current) {
      if (listening) {
        try { recognitionRef.current.start(); } catch (e) { }
      } else {
        try { recognitionRef.current.stop(); } catch (e) { }
      }
    }
  }, [listening]);

  useEffect(() => {
    convStepRef.current = convStep;
  }, [convStep]);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setPreviewUrl(URL.createObjectURL(f));
      startAnalysis(f);
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
      setPreviewUrl(URL.createObjectURL(f));
      startAnalysis(f);
    }
  };

  const startAnalysis = async (f: File) => {
    setAppState('analyzing');

    const formData = new FormData();
    formData.append('file', f);

    let val = 21950000;
    let demo = true;

    try {
      const res = await fetch('http://localhost:8000/api/analyze-property', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      val = data.value;
      demo = data.is_demo;
    } catch (err) {
      console.error(err);
    }

    setPropertyValue(val);
    setIsDemoValue(demo);
    setAppState('conversation');
    initConversation(val);
  };

  const initConversation = async (homeValue: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const audioCtx = new window.AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
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
            setTranscript(prev => [...prev, { role: 'user', text }]);
          }
        };

        recognition.onend = () => {
          if (listeningRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            try { recognition.start(); } catch (e) { }
          }
        };
        recognitionRef.current = recognition;
      }

      wsRef.current.onopen = () => {
        // Automatically start listening and send the initial greeting command to the single persistent session
        setListening(true);
        const homeStr = `$${homeValue.toLocaleString()}`;
        const loanStr = `$${(homeValue * 0.8).toLocaleString()}`;
        const downStr = `$${(homeValue * 0.2).toLocaleString()}`;
        const closingStr = `$${(homeValue * 0.8 * 0.04).toLocaleString()}`;
        const totalStr = `$${(homeValue * 0.2 + homeValue * 0.8 * 0.04).toLocaleString()}`;

        wsRef.current?.send(JSON.stringify({
          type: 'setup',
          message: `Say EXACTLY this word-for-word, do not add or skip any lines:\n"Hello. I am Mortgage Help AI powered by Gemini.\nI analyzed the property you uploaded.\nThe estimated value of this home is ${homeStr}.\nTypically lenders allow an 80 percent loan-to-value ratio.\nEighty percent of ${homeStr} is approximately ${loanStr}.\nThat would be your estimated loan amount.\nThe remaining twenty percent would be your down payment.\nTwenty percent of ${homeStr} is approximately ${downStr}.\nEstimated closing costs are about four percent of the loan amount.\nFour percent of ${loanStr} is approximately ${closingStr}.\nThat means the total cash required at closing would be approximately ${totalStr}.\nWould you like to see if you qualify for this home?"`
        }));
      };

      const playCtx = new window.AudioContext({ sampleRate: 24000 });
      if (playCtx.state === 'suspended') {
        playCtx.resume();
      }
      let nextStartTime = playCtx.currentTime;

      wsRef.current.onmessage = async (event) => {
        if (event.data instanceof ArrayBuffer) {
          const arrayBuffer = event.data;
          const int16Array = new Int16Array(arrayBuffer);
          const float32Array = new Float32Array(int16Array.length);
          for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768.0;
          }
          const audioBuffer = playCtx.createBuffer(1, float32Array.length, 24000);
          audioBuffer.getChannelData(0).set(float32Array);
          const sourceNode = playCtx.createBufferSource();
          sourceNode.buffer = audioBuffer;
          sourceNode.connect(playCtx.destination);

          if (nextStartTime < playCtx.currentTime) {
            nextStartTime = playCtx.currentTime;
          }
          sourceNode.start(nextStartTime);
          nextStartTime += audioBuffer.duration;
        } else {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'transcript') {
              setTranscript(prev => {
                if (prev.length === 0) return [{ role: 'agent', text: data.text }];
                const lastIdx = prev.length - 1;
                const last = prev[lastIdx];
                if (last.role === 'agent') {
                  const updated = [...prev];
                  // Append chunks, replacing double spaces just to keep it clean
                  updated[lastIdx] = { ...last, text: last.text + data.text };
                  return updated;
                }
                return [...prev, { role: 'agent', text: data.text }];
              });

              const textUpper = data.text.toUpperCase();
              if (textUpper.includes("NOT QUALIFIED FOR THIS HOME") || textUpper.includes("NOT QUALIFIED")) {
                if (convStepRef.current !== 'countdown' && convStepRef.current !== 'result') {
                  triggerResult('NOT_QUALIFIED');
                }
              } else if (textUpper.includes("YOU ARE QUALIFIED")) {
                triggerResult('QUALIFIED');
              } else if (textUpper.includes("RISKY")) {
                triggerResult('RISKY');
              }
            }
          } catch (e) {
            console.error(e);
          }
        }
      };

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        // ONLY send bytes to Gemini if the user has mic toggled on
        if (!listeningRef.current) return;

        const float32Array = e.inputBuffer.getChannelData(0);
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
          const s = Math.max(-1, Math.min(1, float32Array[i]));
          int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        wsRef.current.send(int16Array.buffer);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
    } catch (err) {
      console.error("Error accessing mic: ", err);
    }
  };

  const triggerResult = (res: 'QUALIFIED' | 'RISKY' | 'NOT_QUALIFIED') => {
    setResult(res);
    if (res === 'NOT_QUALIFIED') {
      setConvStep('countdown');
      let c = 5;
      setCountdown(c);
      const int = setInterval(() => {
        c -= 1;
        setCountdown(c);
        if (c <= 1) {
          clearInterval(int);
          setConvStep('result');
        }
      }, 1000);
    } else {
      setConvStep('result');
    }
  };

  const handleProceed = () => {
    // 1. Change the step state
    setConvStep('finance');
    // 2. Trigger the AI to speak the exact financing text on the SAME connection
    setTranscript(prev => [...prev, { role: 'user', text: '(Clicked Check if I qualify)' }]);
    const introPrompt = `The user clicked Check if I qualify. Ask them for their annual income to begin calculating their Debt-to-Income ratio. Output no other text.`;
    wsRef.current?.send(JSON.stringify({ type: 'setup', message: introPrompt }));
  };

  const toggleMic = () => {
    setListening(prev => !prev);
  };

  const loanAmount = propertyValue ? propertyValue * 0.8 : 0;
  const downPayment = propertyValue ? propertyValue * 0.2 : 0;
  const closingCost = loanAmount * 0.04;

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
        </div>
      )}

      {appState === 'analyzing' && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div className="spinner" style={{ margin: '0 auto 2rem', borderColor: 'var(--accent-blue)', borderTopColor: 'transparent', width: '40px', height: '40px' }}></div>
          <h2>Analyzing Property...</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Estimating NYC market value</p>
        </div>
      )}

      {appState === 'conversation' && (
        <div className="card" style={{ padding: '2rem' }}>
          {previewUrl && (
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <img src={previewUrl} alt="House Preview" style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--border-light)' }} />
            </div>
          )}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ color: 'var(--accent-blue)', fontSize: '3rem', marginBottom: '0.5rem' }}>
              ${propertyValue?.toLocaleString()}
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              {isDemoValue ? 'Estimated Value (Demo Fallback)' : 'Estimated Market Value'}
            </p>
          </div>

          <div className="info-grid" style={{ marginBottom: '2rem' }}>
            <div className="info-box">
              <h4 style={{ fontSize: '0.9rem' }}>Estimated Loan Amount (80%)</h4>
              <p>${loanAmount.toLocaleString()}</p>
            </div>
            <div className="info-box">
              <h4 style={{ fontSize: '0.9rem' }}>Estimated Down Payment (20%)</h4>
              <p>${downPayment.toLocaleString()}</p>
            </div>
            <div className="info-box">
              <h4 style={{ fontSize: '0.9rem' }}>Estimated Closing Cost (4%)</h4>
              <p>${closingCost.toLocaleString()}</p>
            </div>
            <div className="info-box" style={{ background: 'rgba(59, 130, 246, 0.15)', borderColor: 'var(--accent-blue)' }}>
              <h4 style={{ color: 'var(--accent-blue)', fontSize: '0.9rem' }}>Total Cash Needed at Closing</h4>
              <p style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>${(downPayment + closingCost).toLocaleString()}</p>
            </div>
          </div>

          {/* Transcript Area */}
          <div
            className="transcript-area"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: '350px',
              overflowY: 'auto',
              marginBottom: '2rem',
              padding: '1.5rem',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border-light)',
              borderRadius: '12px'
            }}
          >
            {transcript.length === 0 ? null : (
              transcript.map((t, i) => (
                <div
                  key={i}
                  style={{
                    textAlign: t.role === 'user' ? 'right' : 'left',
                    color: t.role === 'user' ? 'var(--text-primary)' : 'var(--text-primary)',
                    background: t.role === 'user' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    maxWidth: '85%',
                    border: t.role === 'user' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                    alignSelf: t.role === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <strong style={{ opacity: 0.7, fontSize: '0.85rem', display: 'block', marginBottom: '6px', color: t.role === 'user' ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>
                    {t.role === 'user' ? 'You' : 'AI Agent'}
                  </strong>
                  <span style={{ fontSize: '1.1rem', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{t.text}</span>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Controls: Intro vs Main Conversation */}
          {convStep === 'intro' ? (
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <button className="btn" style={{ padding: '0.75rem 2.5rem', fontSize: '1.1rem' }} onClick={handleProceed}>
                Check if I qualify
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', margin: '2rem 0 1rem' }}>
              <button
                className="btn btn-secondary"
                style={{
                  padding: '0.75rem 2rem',
                  fontSize: '1rem',
                  borderColor: listening ? 'var(--status-red)' : 'var(--border-light)',
                  color: listening ? 'var(--status-red)' : 'white',
                  background: listening ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
                }}
                onClick={toggleMic}
              >
                {listening ? (
                  <><MicOff size={20} style={{ marginRight: '8px' }} /> Stop Mic</>
                ) : (
                  <><Mic size={20} style={{ marginRight: '8px' }} /> Start Mic</>
                )}
              </button>
            </div>
          )}

          {/* Results Block */}
          {convStep === 'countdown' && (
            <div style={{ marginTop: '2rem', animation: 'fadeIn 0.5s' }}>
              <h2 style={{ textAlign: 'center', fontSize: '3rem', color: 'var(--status-red)' }}>NOT QUALIFIED</h2>
              <div className="countdown">{countdown}</div>
            </div>
          )}

          {convStep === 'result' && (
            <div className="status-card" style={{ marginTop: '2rem', borderTop: '1px solid var(--border-light)', paddingTop: '2rem' }}>
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
                </>
              )}
              {result === 'NOT_QUALIFIED' && (
                <>
                  <h1 className="status-title status-not-qualified">NOT QUALIFIED</h1>
                  <p style={{ fontSize: '1.2rem', color: 'var(--status-red)', marginBottom: '1rem' }}>You are not qualified for this home.</p>
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', textAlign: 'left' }}>
                    <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={20} /> Required Documents checklist sent.
                    </h3>
                  </div>
                </>
              )}
              <div style={{ textAlign: 'center' }}>
                <button className="btn btn-secondary" style={{ marginTop: '2rem' }} onClick={() => window.location.reload()}>Start Over</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
