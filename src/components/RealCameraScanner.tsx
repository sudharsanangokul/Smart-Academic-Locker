import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Camera,
  CheckCircle2,
  HelpCircle,
  Keyboard,
  Lock,
  Maximize2,
  QrCode,
  RefreshCw,
  Sparkles,
  Unlock,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { Book, ValidationStatus } from '../types';
import { api } from '../services/api';

interface RealCameraScannerProps {
  studentId: string;
  studentClass: string;
  studentName: string;
  onScanSuccess?: () => void;
}

export const RealCameraScanner: React.FC<RealCameraScannerProps> = ({
  studentId,
  studentClass,
  studentName,
  onScanSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [actionType, setActionType] = useState<'ADD' | 'REMOVE'>('ADD');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [manualInput, setManualInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Result popup modal
  const [scanResult, setScanResult] = useState<{
    status: ValidationStatus;
    colorBadge: 'GREEN' | 'YELLOW' | 'RED';
    title: string;
    message: string;
    book: Book | null;
    isLockerUnlock?: boolean;
    lockerNumber?: string;
  } | null>(null);

  // Test QR generator on screen for instant webcam testing
  const [testQrBookId, setTestQrBookId] = useState<string | null>(null);
  const [testQrDataUrl, setTestQrDataUrl] = useState<string | null>(null);

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported on this browser/device.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsCameraActive(true);
        setIsScanning(true);
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings or use manual input below.'
          : err.message || 'Unable to access video camera on this device.'
      );
      setIsCameraActive(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsScanning(false);
  };

  // Beep sound feedback
  const playBeep = (type: 'success' | 'warning' | 'error') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.setValueAtTime(1760, ctx.currentTime + 0.08); // A6
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'warning') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(160, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      // Audio context might be restricted before user gesture
    }
  };

  // Process detected raw code
  const handleDecodedBookId = async (rawCode: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const cleanId = rawCode.trim().toUpperCase();

    // Check if QR code is a Locker Unit Unlock request (e.g. LOCKER:LK-8A-01, LK-8A-01, UNLOCK)
    if (cleanId.startsWith('LOCKER:') || cleanId.startsWith('LK-') || cleanId === 'UNLOCK') {
      try {
        const studentRes = await api.getStudent(studentId);
        await api.toggleLockerStatus(studentRes.locker.id, 'OPEN');
        playBeep('success');

        setScanResult({
          status: 'VALID_REQUIRED',
          colorBadge: 'GREEN',
          title: 'Locker Unit Unlocked via QR',
          message: `Authenticated Smart Locker Unit #${studentRes.locker.lockerNumber} has been verified and unlocked successfully.`,
          book: null,
          isLockerUnlock: true,
          lockerNumber: studentRes.locker.lockerNumber,
        });

        if (onScanSuccess) {
          onScanSuccess();
        }
      } catch (err: any) {
        playBeep('error');
        setScanResult({
          status: 'INVALID_BOOK',
          colorBadge: 'RED',
          title: 'Locker Unlock Failed',
          message: err.message || 'Server failed to authenticate and open locker.',
          book: null,
        });
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    try {
      const res = await api.scanValidateBook(studentId, cleanId, actionType);
      
      if (res.colorBadge === 'GREEN') playBeep('success');
      else if (res.colorBadge === 'YELLOW') playBeep('warning');
      else playBeep('error');

      setScanResult({
        status: res.validationStatus,
        colorBadge: res.colorBadge,
        title: res.title,
        message: res.message,
        book: res.book,
      });

      if (onScanSuccess) {
        onScanSuccess();
      }
    } catch (err: any) {
      playBeep('error');
      setScanResult({
        status: 'INVALID_BOOK',
        colorBadge: 'RED',
        title: 'Validation Error',
        message: err.message || 'Server failed to process book validation.',
        book: null,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Continuous frame analysis loop
  useEffect(() => {
    let animationFrameId: number;
    let lastScanTime = 0;

    const scanFrame = (time: number) => {
      if (isScanning && videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        // Scan every 150ms to save CPU
        if (time - lastScanTime > 150) {
          lastScanTime = time;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (ctx) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code && code.data) {
              // Pause scanning momentarily and process
              setIsScanning(false);
              handleDecodedBookId(code.data);
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(scanFrame);
    };

    if (isCameraActive) {
      animationFrameId = requestAnimationFrame(scanFrame);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isCameraActive, isScanning, actionType, studentId, isProcessing]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Generate test QR preview on screen
  const generateTestQr = (bookId: string) => {
    setTestQrBookId(bookId);
    import('qrcode').then(QRCode => {
      QRCode.toDataURL(bookId, {
        width: 260,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      }).then(url => {
        setTestQrDataUrl(url);
      });
    });
  };

  return (
    <div id="real-camera-scanner-module" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
      {/* Scanner Header & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Real Camera QR Scanner</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Scanning for Student <span className="font-semibold text-slate-700">{studentName}</span> ({studentClass})
          </p>
        </div>

        {/* Action Toggle (Add/Deposit vs Remove/Checkout) & Sound */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/80">
            <button
              id="mode-deposit-btn"
              onClick={() => setActionType('ADD')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                actionType === 'ADD'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              Deposit in Locker
            </button>
            <button
              id="mode-checkout-btn"
              onClick={() => setActionType('REMOVE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                actionType === 'REMOVE'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" />
              Remove from Locker
            </button>
          </div>

          <button
            id="toggle-sound-btn"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute audio feedback' : 'Unmute audio feedback'}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 border border-slate-200/60 transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-600" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Scanner Viewport Area */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Camera Screen */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative w-full aspect-4/3 max-w-lg bg-slate-950 rounded-2xl overflow-hidden shadow-inner border border-slate-800 flex items-center justify-center">
            {/* Hidden Canvas for QR decoding */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Video Feed */}
            <video
              ref={videoRef}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isCameraActive ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Active Camera Viewfinder Overlay with Laser Line */}
            {isCameraActive && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                {/* Target Frame */}
                <div className="relative w-64 h-64 border-2 border-indigo-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(15,23,42,0.65)] overflow-hidden">
                  {/* Corner Accent Marks */}
                  <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-indigo-400 rounded-tl-sm" />
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-indigo-400 rounded-tr-sm" />
                  <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-indigo-400 rounded-bl-sm" />
                  <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-indigo-400 rounded-br-sm" />

                  {/* Animated Red/Cyan Laser Scan Line with Smooth Sweep */}
                  <div className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-laser-sweep" />
                </div>

                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <span className="bg-slate-900/90 text-slate-100 text-xs px-3 py-1.5 rounded-full font-medium tracking-wide shadow-md backdrop-blur-xs">
                    Align book or locker QR code inside the box
                  </span>
                </div>
              </div>
            )}

            {/* Inactive Camera State Card */}
            {!isCameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-300">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-800 mb-3 shadow-lg">
                  <QrCode className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="font-semibold text-slate-100 text-base">Real Camera QR Scanner</h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
                  Scan book QR codes to deposit/retrieve items or scan your Locker QR code to unlock your unit.
                </p>

                {cameraError && (
                  <div className="mt-3 p-2.5 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-200 text-xs max-w-xs flex items-start gap-2 text-left">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{cameraError}</span>
                  </div>
                )}

                <button
                  id="open-camera-btn"
                  onClick={startCamera}
                  className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Open Camera
                </button>
              </div>
            )}
          </div>

          {/* Camera Controls bar */}
          <div className="flex items-center gap-3 mt-4">
            {isCameraActive ? (
              <>
                <button
                  id="stop-camera-btn"
                  onClick={stopCamera}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Stop Camera
                </button>
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live scanning active
                </span>
              </>
            ) : null}
          </div>
        </div>

        {/* Right / Manual Input & Quick Demo Testing Suite */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-5">
          {/* Manual Input Fallback */}
          <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-800 mb-2">
              <Keyboard className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-sm">Manual QR ID Entry</h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Type a Book ID (e.g. <code className="font-mono text-indigo-600">B-MATH-08-001</code>) or Locker Unlock code (<code className="font-mono text-indigo-600">LOCKER:LK-8A-01</code>).
            </p>

            <form
              onSubmit={e => {
                e.preventDefault();
                if (manualInput.trim()) {
                  handleDecodedBookId(manualInput.trim());
                  setManualInput('');
                }
              }}
              className="flex gap-2"
            >
              <input
                id="manual-book-id-input"
                type="text"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                placeholder="e.g. B-MATH-08-001 or LOCKER:LK-8A-01"
                className="flex-1 px-3.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <button
                id="submit-manual-scan-btn"
                type="submit"
                disabled={!manualInput.trim() || isProcessing}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Validate
              </button>
            </form>
          </div>

          {/* Quick Demo Scenario Scan Chips */}
          <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Demo QR Scenarios & Unit Unlock</span>
              </div>
              <span className="text-[10px] text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full font-medium">
                1-Click Test
              </span>
            </div>

            <div className="space-y-2 mt-3">
              {/* Locker Unit Unlock QR chip */}
              <button
                id="demo-scan-locker-unlock-btn"
                onClick={() => handleDecodedBookId('LOCKER:LK-8A-01')}
                className="w-full text-left p-2.5 bg-white hover:bg-emerald-50/80 border border-emerald-300 hover:border-emerald-500 rounded-xl flex items-center justify-between transition-all group shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg group-hover:scale-105 transition-transform">
                    <Unlock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-mono text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                      LOCKER:LK-8A-01
                    </div>
                    <div className="text-[11px] text-slate-500">Scan QR to Unlock Locker Unit</div>
                  </div>
                </div>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-600" />
                  Unlock
                </span>
              </button>

              <button
                id="demo-scan-math-btn"
                onClick={() => handleDecodedBookId('B-MATH-08-001')}
                className="w-full text-left p-2.5 bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-xl flex items-center justify-between transition-all group cursor-pointer"
              >
                <div>
                  <div className="font-mono text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                    B-MATH-08-001
                  </div>
                  <div className="text-[11px] text-slate-500">Mathematics Textbook (Required)</div>
                </div>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-md">
                  ✓ Valid
                </span>
              </button>

              <button
                id="demo-scan-sci-btn"
                onClick={() => handleDecodedBookId('B-SCI-08-001')}
                className="w-full text-left p-2.5 bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-xl flex items-center justify-between transition-all group cursor-pointer"
              >
                <div>
                  <div className="font-mono text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                    B-SCI-08-001
                  </div>
                  <div className="text-[11px] text-slate-500">Science Textbook (Test Scheduled)</div>
                </div>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-md">
                  ✓ Valid
                </span>
              </button>

              <button
                id="demo-scan-hist-btn"
                onClick={() => handleDecodedBookId('B-HIST-08-001')}
                className="w-full text-left p-2.5 bg-white hover:bg-amber-50/60 border border-slate-200 hover:border-amber-300 rounded-xl flex items-center justify-between transition-all group cursor-pointer"
              >
                <div>
                  <div className="font-mono text-xs font-bold text-slate-900 group-hover:text-amber-700">
                    B-HIST-08-001
                  </div>
                  <div className="text-[11px] text-slate-500">History (Not in Tomorrow's Timetable)</div>
                </div>
                <span className="text-[11px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-md">
                  ⚠️ Extra
                </span>
              </button>
            </div>

            {/* Test Camera with on-screen QR */}
            <div className="mt-4 pt-3 border-t border-indigo-100/80 flex items-center justify-between">
              <span className="text-[11px] text-indigo-950 font-medium">Test webcam with on-screen QR?</span>
              <div className="flex items-center gap-2">
                <button
                  id="show-locker-test-qr-btn"
                  onClick={() => generateTestQr('LOCKER:LK-8A-01')}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                >
                  Locker QR
                </button>
                <span className="text-slate-300">•</span>
                <button
                  id="show-test-qr-btn"
                  onClick={() => generateTestQr('B-MATH-08-001')}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                >
                  Book QR
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Feedback Modal Popup */}
      {scanResult && (
        <div id="scan-validation-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Status Header */}
            <div
              className={`px-6 py-4 flex items-center justify-between transition-colors duration-500 ${
                scanResult.colorBadge === 'GREEN'
                  ? 'bg-emerald-600 text-white'
                  : scanResult.colorBadge === 'YELLOW'
                  ? 'bg-amber-500 text-white'
                  : 'bg-rose-600 text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {scanResult.isLockerUnlock ? (
                  <div className="p-1 bg-white/20 rounded-lg animate-shackle-pop">
                    <Unlock className="w-6 h-6 text-white" />
                  </div>
                ) : scanResult.colorBadge === 'GREEN' ? (
                  <CheckCircle2 className="w-6 h-6 animate-shackle-pop" />
                ) : scanResult.colorBadge === 'YELLOW' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <AlertCircle className="w-6 h-6" />
                )}
                <div>
                  <h3 className="font-bold text-base">{scanResult.title}</h3>
                  <p className="text-xs opacity-90">{scanResult.status}</p>
                </div>
              </div>

              <button
                id="close-scan-result-modal-btn"
                onClick={() => {
                  setScanResult(null);
                  if (isCameraActive) setIsScanning(true);
                }}
                className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content & Locker Animated Status Indicator */}
            <div className="p-6">
              <p className="text-sm text-slate-700 leading-relaxed mb-4">{scanResult.message}</p>

              {/* Locker Unlock Highlight Banner */}
              {scanResult.isLockerUnlock && (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/90 flex items-center justify-between shadow-xs animate-locker-glow transition-all duration-500">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-mono font-bold text-sm shadow-sm">
                      {scanResult.lockerNumber || 'LK-8A-01'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        Solenoid Latch Released
                      </div>
                      <div className="text-[11px] text-emerald-700 mt-0.5">
                        Physical door status: <strong className="uppercase font-bold">UNLOCKED</strong>
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg uppercase tracking-wider">
                    Ready
                  </span>
                </div>
              )}

              {scanResult.book && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Book Name:</span>
                    <span className="font-bold text-slate-900">{scanResult.book.bookName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Book ID:</span>
                    <span className="font-mono font-bold text-slate-800">{scanResult.book.id}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Subject / Class:</span>
                    <span className="font-semibold text-slate-800">
                      {scanResult.book.subject} (Class {scanResult.book.classLevel})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Material Weight:</span>
                    <span className="font-semibold text-emerald-700">{scanResult.book.weightKg} kg</span>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  id="dismiss-scan-modal-btn"
                  onClick={() => {
                    setScanResult(null);
                    if (isCameraActive) setIsScanning(true);
                  }}
                  className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
                >
                  Continue Scanning
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test QR Preview Modal */}
      {testQrDataUrl && testQrBookId && (
        <div id="test-qr-popup-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center border border-slate-200 shadow-2xl">
            <h4 className="font-bold text-slate-900 text-base mb-1">Test QR Code</h4>
            <p className="text-xs text-slate-500 mb-4">
              Point your physical phone camera or external webcam at this screen to test real decoding!
            </p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 inline-block mb-3 shadow-inner">
              <img src={testQrDataUrl} alt="Test QR" className="w-52 h-52 bg-white p-2 rounded-lg" />
            </div>
            <div className="font-mono font-bold text-sm bg-slate-100 text-slate-800 py-1 px-3 rounded-md mb-4 inline-block">
              {testQrBookId}
            </div>
            <button
              id="close-test-qr-btn"
              onClick={() => {
                setTestQrDataUrl(null);
                setTestQrBookId(null);
              }}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
