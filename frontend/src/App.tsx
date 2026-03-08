import { useState, useEffect } from 'react';
import { UploadCloud, Home } from 'lucide-react';

type AppState = 'FRONT' | 'UPLOAD' | 'SALARY' | 'ANALYSIS' | 'COUNTDOWN' | 'RESULT';

export default function App() {
  const [appState, setAppState] = useState<AppState>('FRONT');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [salaryInput, setSalaryInput] = useState<string>('');
  const [loadingMsg, setLoadingMsg] = useState('Calculating affordability...');
  const [countdown, setCountdown] = useState(5);

  // Math Calculations & Constants
  const homePrice = 21950000;
  const loanAmount = homePrice * 0.8;
  const downPayment = homePrice * 0.2;
  const interestRate = 0.0525;
  const r = interestRate / 12;
  const n = 360;

  const monthlyMortgage = loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const monthlyHoa = 17730;
  const taxMonthly = 2184 / 12;
  const insuranceMonthly = 8000 / 12;
  const totalMonthlyHousingCost = monthlyMortgage + monthlyHoa + taxMonthly + insuranceMonthly;

  const annualSalary = parseFloat(salaryInput.replace(/[^0-9.]/g, '')) || 0;
  const monthlyIncome = annualSalary / 12;

  const dti = monthlyIncome > 0 ? (totalMonthlyHousingCost / monthlyIncome) * 100 : 0;
  const maxAffordableHousing = monthlyIncome * 0.43;

  const requiredMonthlyIncome = totalMonthlyHousingCost / 0.43;
  const requiredAnnualIncome = requiredMonthlyIncome * 12;
  const incomeGap = requiredAnnualIncome - annualSalary;

  // Formatting Helpers
  const formatMoney = (val: number) => "$" + Math.round(val).toLocaleString("en-US");
  const formatPercent = (val: number) => Math.round(val).toLocaleString("en-US") + "%";

  // Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPreviewUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => e.preventDefault();
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => e.preventDefault();
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setPreviewUrl(URL.createObjectURL(e.dataTransfer.files[0]));
    }
  };

  // Effects
  useEffect(() => {
    if (appState === 'ANALYSIS') {
      const msgs = [
        'Calculating affordability...',
        'Checking mortgage requirements...',
        'Analyzing debt-to-income ratio...'
      ];
      let step = 0;
      setLoadingMsg(msgs[step]);

      const idx = setInterval(() => {
        step = (step + 1) % msgs.length;
        setLoadingMsg(msgs[step]);
      }, 700);

      const to = setTimeout(() => {
        clearInterval(idx);
        setAppState('COUNTDOWN');
        setCountdown(5);
      }, 2100);

      return () => {
        clearInterval(idx);
        clearTimeout(to);
      };
    }
  }, [appState]);

  useEffect(() => {
    if (appState === 'COUNTDOWN') {
      if (countdown > 1) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 700);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => setAppState('RESULT'), 700);
        return () => clearTimeout(timer);
      }
    }
  }, [appState, countdown]);

  return (
    <div style={{ minHeight: '100vh', background: appState === 'COUNTDOWN' ? '#000' : '#ffffff', color: '#111827', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        * { box-sizing: border-box; }
        :root {
          --accent-blue: #2563eb;
          --status-red: #dc2626;
          --border-light: #e5e7eb;
          --text-secondary: #4b5563;
        }
        .full-screen-center {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          text-align: center;
          animation: fadeIn 0.5s ease-out;
        }
        .btn {
          background-color: var(--accent-blue);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: background-color 0.2s, transform 0.1s;
        }
        .btn:hover {
          background-color: #1d4ed8;
        }
        .btn:active {
          transform: scale(0.98);
        }
        .btn:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
          transform: none;
        }
        .result-section {
          background: white;
          padding: 1.5rem 2rem;
          border-radius: 12px;
          margin-bottom: 2rem;
          border: 1px solid var(--border-light);
        }
        .section-title {
          font-size: 1.25rem;
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 0.5rem;
          font-weight: 600;
        }
        .row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
          font-size: 1.1rem;
        }
        .row strong {
          font-size: 1.25rem;
          font-weight: 600;
        }
        .total-row {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-light);
          font-weight: bold;
          font-size: 1.25rem;
        }

        /* Cinematic Countdown */
        .countdown-bg {
          background-color: #000;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        .film-ring {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .film-crosshair-h {
          position: absolute;
          width: 400px;
          height: 2px;
          background: rgba(255,255,255,0.2);
        }
        .film-crosshair-v {
          position: absolute;
          height: 400px;
          width: 2px;
          background: rgba(255,255,255,0.2);
        }
        .countdown-number {
          font-size: 15rem;
          font-weight: bold;
          color: white;
          z-index: 10;
          animation: popIn 0.7s infinite;
        }

        @keyframes radialWipe {
          0% { stroke-dashoffset: 1130; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes popIn {
          0% { transform: scale(0.8); opacity: 0; }
          20% { transform: scale(1); opacity: 1; }
          80% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* PAGE 1 — FRONT PAGE */}
      {appState === 'FRONT' && (
        <div className="full-screen-center">
          <h1 style={{ fontSize: '4.5rem', marginBottom: '1rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#111827' }}>Can I Buy This House?</h1>
          <p style={{ fontSize: '1.5rem', marginBottom: '3rem', color: 'var(--text-secondary)', maxWidth: '600px' }}>
            Upload a house photo and enter your salary to see if you qualify.
          </p>
          <button className="btn" style={{ padding: '1rem 4rem', fontSize: '1.5rem' }} onClick={() => setAppState('UPLOAD')}>
            Start
          </button>
        </div>
      )}

      {/* PAGE 2 — IMAGE UPLOAD */}
      {appState === 'UPLOAD' && (
        <div className="full-screen-center">
          <h2 style={{ fontSize: '2.5rem', marginBottom: '2rem', fontWeight: '700' }}>Upload a photo of the house</h2>

          <label
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{ display: 'block', margin: '1rem 0', cursor: 'pointer', padding: '4rem', border: '2px dashed var(--accent-blue)', borderRadius: '16px', background: '#f9fafb' }}>
            <input type="file" onChange={handleFileChange} style={{ display: 'none' }} accept="image/*" />
            <UploadCloud size={64} style={{ color: 'var(--accent-blue)', margin: '0 auto 1.5rem' }} />
            <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>Click or drag image to upload</p>
          </label>

          {previewUrl && (
            <div style={{ margin: '2rem 0', animation: 'fadeIn 0.5s' }}>
              <img src={previewUrl} style={{ maxHeight: '350px', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Estimated Home Price</h3>
                <h1 style={{ color: 'var(--accent-blue)', fontSize: '4rem', fontWeight: '800' }}>{formatMoney(homePrice)}</h1>
              </div>
              <button className="btn" style={{ padding: '1rem 4rem', fontSize: '1.5rem', marginTop: '2rem' }} onClick={() => setAppState('SALARY')}>
                Continue
              </button>
            </div>
          )}
        </div>
      )}

      {/* PAGE 3 — SALARY INPUT */}
      {appState === 'SALARY' && (
        <div className="full-screen-center">
          <h2 style={{ fontSize: '3rem', marginBottom: '2.5rem', fontWeight: '700' }}>What is your annual salary?</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (salaryInput) setAppState('ANALYSIS'); }} style={{ width: '100%', maxWidth: '500px' }}>
            <input
              type="text"
              placeholder="$90,000"
              value={salaryInput}
              onChange={(e) => setSalaryInput(e.target.value)}
              style={{ fontSize: '2.5rem', padding: '1.5rem', width: '100%', textAlign: 'center', marginBottom: '2rem', borderRadius: '12px', border: '2px solid var(--border-light)', background: '#f9fafb', color: '#111827', fontWeight: 'bold' }}
              autoFocus
            />
            <button type="submit" className="btn" style={{ padding: '1.25rem 4rem', fontSize: '1.5rem', width: '100%' }} disabled={!salaryInput}>
              Analyze
            </button>
          </form>
        </div>
      )}

      {/* PAGE 4 — ANALYSIS SCREEN */}
      {appState === 'ANALYSIS' && (
        <div className="full-screen-center">
          <div style={{ margin: '0 auto 2.5rem', border: '5px solid var(--border-light)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', width: '80px', height: '80px', animation: 'spin 1s linear infinite' }}></div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem' }}>Mortgage AI Agent is analyzing...</h2>
          <p key={loadingMsg} style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', minHeight: '2em', animation: 'fadeIn 0.3s' }}>{loadingMsg}</p>
        </div>
      )}

      {/* PAGE 5 — COUNTDOWN SCREEN */}
      {appState === 'COUNTDOWN' && (
        <div className="countdown-bg">
          <div className="film-ring">
            <div className="film-crosshair-h"></div>
            <div className="film-crosshair-v"></div>

            <svg width="400" height="400" style={{ position: 'absolute' }}>
              <circle cx="200" cy="200" r="180" stroke="rgba(255,255,255,0.2)" strokeWidth="4" fill="none" />
              <circle cx="200" cy="200" r="180" stroke="white" strokeWidth="8" fill="none"
                strokeDasharray="1130" strokeDashoffset="0"
                style={{ animation: 'radialWipe 0.7s linear infinite', transformOrigin: 'center', transform: 'rotate(-90deg)' }} />
            </svg>

            <div className="countdown-number" key={`num-${countdown}`}>
              {countdown}
            </div>
          </div>
        </div>
      )}

      {/* PAGE 6 — RESULT SCREEN */}
      {appState === 'RESULT' && (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '4rem 1rem', animation: 'fadeIn 0.8s ease-out' }}>

          {previewUrl && (
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <img src={previewUrl} style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
            </div>
          )}

          <h1 style={{ color: 'var(--status-red)', fontSize: '4.5rem', textAlign: 'center', marginBottom: '4rem', fontWeight: '900', letterSpacing: '-0.02em', lineHeight: '1.1' }}>
            YOU ARE NOT QUALIFIED
          </h1>

          <div className="result-section">
            <h2 className="section-title">Home Price</h2>
            <div className="row"><span>Estimated Home Price</span> <strong>{formatMoney(homePrice)}</strong></div>
          </div>

          <div className="result-section">
            <h2 className="section-title">Mortgage Structure</h2>
            <div className="row"><span>Loan (80%)</span> <strong>{formatMoney(loanAmount)}</strong></div>
            <div className="row"><span>Down Payment (20%)</span> <strong>{formatMoney(downPayment)}</strong></div>
          </div>

          <div className="result-section">
            <h2 className="section-title">Monthly Mortgage Payment</h2>
            <div className="row"><span>Principal & Interest (5.25% for 30 yrs)</span> <strong>{formatMoney(monthlyMortgage)}</strong></div>
          </div>

          <div className="result-section">
            <h2 className="section-title">Additional Monthly Costs</h2>
            <div className="row"><span>HOA</span> <strong>{formatMoney(monthlyHoa)}</strong></div>
            <div className="row"><span>Property Tax</span> <strong>{formatMoney(taxMonthly)}</strong></div>
            <div className="row"><span>Insurance</span> <strong>{formatMoney(insuranceMonthly)}</strong></div>
          </div>

          <div className="result-section" style={{ background: '#f9fafb' }}>
            <h2 className="section-title">Total Monthly Housing Cost</h2>
            <div className="row"><span style={{ fontSize: '1.25rem' }}>Total Cost</span> <strong style={{ fontSize: '1.5rem', color: 'var(--accent-blue)' }}>{formatMoney(totalMonthlyHousingCost)}</strong></div>
          </div>

          <div className="result-section">
            <h2 className="section-title">User Income</h2>
            <div className="row"><span>Annual Income</span> <strong>{formatMoney(annualSalary)}</strong></div>
            <div className="row"><span>Monthly Income</span> <strong>{formatMoney(monthlyIncome)}</strong></div>
          </div>

          <div className="result-section" style={{ background: 'rgba(239, 68, 68, 0.03)', border: '2px solid rgba(239, 68, 68, 0.2)' }}>
            <h2 className="section-title" style={{ color: 'var(--status-red)' }}>DTI Calculation</h2>
            <div className="row"><span style={{ fontSize: '1.2rem' }}>Total Monthly Housing Cost</span> <strong style={{ fontSize: '1.2rem' }}>{formatMoney(totalMonthlyHousingCost)}</strong></div>
            <div className="row"><span style={{ fontSize: '1.2rem' }}>Monthly Income</span> <strong style={{ fontSize: '1.2rem' }}>{formatMoney(monthlyIncome)}</strong></div>
            <div className="row total-row" style={{ borderTop: '2px solid rgba(239, 68, 68, 0.3)', marginTop: '1.5rem', paddingTop: '1.5rem' }}>
              <span style={{ fontSize: '1.5rem', color: 'var(--status-red)' }}>Debt-to-Income Ratio</span>
              <strong style={{ fontSize: '3rem', color: 'var(--status-red)' }}>{formatPercent(dti)}</strong>
            </div>
            <p style={{ marginTop: '1rem', fontSize: '1.2rem', color: 'var(--status-red)', opacity: 0.9 }}>
              Most lenders require your housing costs to stay below <strong>43% of gross monthly income</strong>.
            </p>
          </div>

          <div className="result-section">
            <h2 className="section-title">Affordability Analysis</h2>
            <div className="row"><span>Maximum Affordable Monthly Housing</span> <strong>{formatMoney(maxAffordableHousing)}</strong></div>
            <div className="row"><span>Total Monthly Housing Cost</span> <strong style={{ color: 'var(--status-red)' }}>{formatMoney(totalMonthlyHousingCost)}</strong></div>
            <div className="row" style={{ marginTop: '2rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
              <span>Income Required to Afford This Home</span> <strong>{formatMoney(requiredAnnualIncome)}</strong>
            </div>
            <div className="row"><span>Your Annual Income</span> <strong>{formatMoney(annualSalary)}</strong></div>
            <div className="row total-row" style={{ color: 'var(--status-red)' }}>
              <span>Income Gap</span> <strong style={{ fontSize: '1.75rem' }}>{formatMoney(incomeGap)}</strong>
            </div>
          </div>

          <div style={{ background: '#111827', color: 'white', padding: '3rem', borderRadius: '16px', marginBottom: '4rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h3 style={{ color: 'var(--status-red)', fontSize: '2rem', marginBottom: '2rem', fontWeight: '800' }}>Final Explanation</h3>
            <p style={{ fontSize: '1.35rem', lineHeight: '1.6', marginBottom: '1.5rem', opacity: 0.9 }}>
              Based on your income, the monthly housing cost for this property is dramatically higher than what lenders allow.
            </p>
            <p style={{ fontSize: '1.35rem', lineHeight: '1.6', marginBottom: '1.5rem', opacity: 0.9 }}>
              Most lenders require housing costs to stay below 43% of gross income.
            </p>
            <p style={{ fontSize: '1.35rem', lineHeight: '1.6', marginBottom: '1.5rem', opacity: 0.9 }}>
              This property requires over $100,000 per month in housing costs.
            </p>
            <p style={{ fontSize: '1.5rem', lineHeight: '1.6', fontWeight: '700', color: 'white', marginTop: '2.5rem', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '2.5rem' }}>
              With an income of {formatMoney(annualSalary)} per year, this home is far outside the qualifying range.
            </p>
          </div>

          <div style={{ textAlign: 'center', paddingBottom: '4rem' }}>
            <button className="btn" style={{ padding: '1.25rem 4rem', fontSize: '1.5rem', background: '#2563eb' }} onClick={() => window.location.reload()}>
              Test Another Property
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
