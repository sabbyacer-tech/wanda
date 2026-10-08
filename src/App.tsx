/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Download,
  Printer,
  RefreshCw,
  Bell,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Maximize2,
  Wifi,
  Battery,
} from 'lucide-react';
import { ScanState, ScanReportData, RiskLevel, SecurityVulnerability } from './types';
import {
  SCAN_PHASES,
  getScanPhaseForSecond,
  generateScanResults,
  downloadReportAsFile,
} from './utils/scanEngine';
import {
  requestNotificationPermission,
  getNotificationPermission,
  sendPushNotification,
  playCompletionChime,
} from './utils/notifications';
import { RiskDistributionChart } from './components/RiskDistributionChart';

const TOTAL_SCAN_SECONDS = 120; // 2 minutes

export default function App() {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [report, setReport] = useState<ScanReportData | null>(null);
  const [expandedVulnId, setExpandedVulnId] = useState<string | null>(null);
  const [showIosPushBanner, setShowIosPushBanner] = useState(false);
  const [pushBannerDetails, setPushBannerDetails] = useState<{ title: string; body: string }>({
    title: '',
    body: '',
  });
  const [deviceFrameMode, setDeviceFrameMode] = useState<boolean>(true);

  const timerRef = useRef<number | null>(null);

  // Check notification permission on mount
  useEffect(() => {
    setNotificationPermission(getNotificationPermission());
  }, []);

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      triggerIosBanner('Notifications Enabled', 'You will receive an alert when the 2-minute scan finishes.');
    }
  };

  const triggerIosBanner = (title: string, body: string) => {
    setPushBannerDetails({ title, body });
    setShowIosPushBanner(true);
    setTimeout(() => {
      setShowIosPushBanner(false);
    }, 7000);
  };

  const validateEmail = (val: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!val.trim()) {
      setEmailError('Please enter an email address.');
      return false;
    }
    if (!re.test(val.trim())) {
      setEmailError('Please enter a valid email address.');
      return false;
    }
    setEmailError('');
    return true;
  };

  const startScan = (targetEmail?: string) => {
    const emailToScan = targetEmail || email;
    if (!validateEmail(emailToScan)) return;

    if (notificationPermission === 'default') {
      requestNotificationPermission().then((perm) => setNotificationPermission(perm));
    }

    setScanState('scanning');
    setSecondsElapsed(0);
    setReport(null);
    setExpandedVulnId(null);
    setShowIosPushBanner(false);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = window.setInterval(() => {
      setSecondsElapsed((prev) => {
        const next = prev + 1;
        if (next >= TOTAL_SCAN_SECONDS) {
          if (timerRef.current) clearInterval(timerRef.current);
          completeScan(emailToScan);
          return TOTAL_SCAN_SECONDS;
        }
        return next;
      });
    }, 1000);
  };

  const completeScan = (scannedEmail: string) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const generated = generateScanResults(scannedEmail);
    setReport(generated);
    setScanState('completed');

    playCompletionChime();

    // Browser Notification API
    sendPushNotification('MACAntivirus Scan Complete', {
      body: `${generated.totalVulnerabilitiesCount} vulnerabilities identified for ${scannedEmail}.`,
    });

    // iOS Glass Notification Banner
    triggerIosBanner(
      'Scan Complete',
      `${generated.totalVulnerabilitiesCount} vulnerabilities identified for ${scannedEmail}. Tap to review.`
    );
  };

  const cancelScan = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setScanState('idle');
    setSecondsElapsed(0);
  };

  const resetToIdle = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setScanState('idle');
    setSecondsElapsed(0);
    setReport(null);
    setShowIosPushBanner(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const remainingSeconds = Math.max(0, TOTAL_SCAN_SECONDS - secondsElapsed);
  const progressPercent = Math.min(100, Math.round((secondsElapsed / TOTAL_SCAN_SECONDS) * 100));
  const currentPhase = getScanPhaseForSecond(secondsElapsed);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-200/70 to-slate-100 flex flex-col items-center justify-start p-0 sm:py-6 selection:bg-slate-200 font-sans">
      {/* Desktop Helper Toolbar */}
      <div className="hidden sm:flex items-center justify-between w-full max-w-sm mb-3 px-3 text-xs text-slate-500 no-print">
        <div className="flex items-center gap-1.5 font-medium">
          <Smartphone className="w-3.5 h-3.5 text-slate-700" />
          <span>iPhone Glassmorphic · MACAntivirus</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDeviceFrameMode(!deviceFrameMode)}
            className="flex items-center gap-1 hover:text-slate-900 border border-slate-300/80 bg-white/80 backdrop-blur-md px-2 py-0.5 rounded text-[11px] transition-colors"
          >
            <Maximize2 className="w-3 h-3" />
            <span>{deviceFrameMode ? 'Borderless' : 'iPhone Frame'}</span>
          </button>
        </div>
      </div>

      {/* iPhone Chassis Container */}
      <div
        className={`w-full transition-all duration-200 relative flex flex-col ${
          deviceFrameMode
            ? 'sm:max-w-[402px] sm:h-[860px] sm:rounded-[50px] sm:border-[10px] sm:border-slate-900 sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden'
            : 'max-w-md min-h-screen shadow-sm'
        }`}
      >
        {/* Ambient Gradient Background Elements (Refracted through frosted glass panels) */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-slate-100/80 to-blue-50/30 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-100/50 blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -left-20 w-64 h-64 rounded-full bg-indigo-50/60 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 right-0 w-80 h-80 rounded-full bg-slate-200/50 blur-3xl pointer-events-none" />

        {/* iOS Dynamic Island & Glass Status Bar */}
        <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-2xl pt-2 px-6 pb-2.5 border-b border-white/60 shadow-sm no-print relative">
          {/* Top Notch / Dynamic Island */}
          <div className="flex items-center justify-between text-xs font-semibold text-slate-900 h-7">
            <span className="text-[14px] tracking-tight">9:41</span>

            {/* Dynamic Island Pill */}
            <div className="w-24 h-5 bg-black/90 backdrop-blur-md rounded-full flex items-center justify-center px-2 shadow-inner">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 mr-auto border border-slate-700" />
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-auto" title="System Ready" />
            </div>

            <div className="flex items-center gap-1.5 text-slate-800">
              <Wifi className="w-3.5 h-3.5" />
              <Battery className="w-4 h-4" />
            </div>
          </div>

          {/* iOS App Navigation Bar */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-white/80 border border-white/80 flex items-center justify-center shadow-sm">
                <Shield className="w-3.5 h-3.5 text-slate-900" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-slate-900">
                MACAntivirus
              </span>
            </div>

            <div className="flex items-center gap-2">
              {notificationPermission !== 'granted' ? (
                <button
                  onClick={handleEnableNotifications}
                  className="flex items-center gap-1 text-[11px] text-slate-700 bg-white/60 hover:bg-white/90 border border-white/80 rounded-full px-2.5 py-1 shadow-sm transition-all"
                  title="Enable notifications"
                >
                  <Bell className="w-3 h-3 text-slate-600" />
                  <span>Alerts</span>
                </button>
              ) : (
                <div className="flex items-center gap-1 text-[11px] text-slate-600 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span className="text-[10px] font-medium text-emerald-800">Alerts on</span>
                </div>
              )}

              {scanState !== 'idle' && (
                <button
                  onClick={resetToIdle}
                  className="text-xs text-slate-600 hover:text-slate-900 px-1 py-1 font-medium"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Authentic iOS Glassmorphism Push Notification Banner */}
        {showIosPushBanner && (
          <div className="absolute top-14 left-3 right-3 z-50 animate-in fade-in slide-in-from-top-4 duration-300 no-print">
            <div className="glass-banner-ios rounded-2xl p-3.5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900/90 backdrop-blur-md text-white flex items-center justify-center shrink-0 shadow-md">
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-0.5">
                  <span className="font-semibold uppercase tracking-wider text-slate-700">MACAntivirus</span>
                  <span>now</span>
                </div>
                <div className="text-xs font-semibold text-slate-900 leading-snug">
                  {pushBannerDetails.title}
                </div>
                <div className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                  {pushBannerDetails.body}
                </div>
              </div>
              <button
                onClick={() => setShowIosPushBanner(false)}
                className="text-slate-400 hover:text-slate-700 p-1 text-xs"
                aria-label="Dismiss banner"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Mobile Body with Refined Glass Panels */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 relative z-10">
          {/* ========================================================================= */}
          {/* STATE 1: IDLE / EMAIL ENTRY (GLASSMORPHISM) */}
          {/* ========================================================================= */}
          {scanState === 'idle' && (
            <div className="space-y-4 pt-1">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Security Scan
                </h1>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Enter an email address to perform a thorough 2-minute diagnostic check for spyware, malware, and security vulnerabilities.
                </p>
              </div>

              {/* Glassmorphic Form Card */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  startScan();
                }}
                className="glass-panel rounded-3xl p-4 space-y-4"
              >
                <div className="space-y-1.5">
                  <label
                    htmlFor="iosEmailInput"
                    className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600"
                  >
                    Target Email
                  </label>
                  <input
                    id="iosEmailInput"
                    type="email"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
                    }}
                    placeholder="name@company.com"
                    className={`w-full h-12 px-4 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 transition-all ${
                      emailError
                        ? 'bg-red-50/40 border border-red-300 focus:bg-white focus:ring-2 focus:ring-red-500'
                        : 'glass-input focus:bg-white/90 focus:ring-2 focus:ring-slate-900'
                    }`}
                  />
                  {emailError ? (
                    <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{emailError}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Duration: 2 minutes (120s). Push notification upon completion.
                    </p>
                  )}
                </div>

                {/* Quick Presets with Frosted Glass Chips */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] text-slate-500 block">Quick test presets:</span>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('audit.target@security-example.com');
                        setEmailError('');
                      }}
                      className="w-full text-left py-2 px-3 rounded-lg text-xs font-mono text-slate-800 glass-panel-subtle hover:bg-white/80 transition-colors"
                    >
                      audit.target@security-example.com
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('clean.account@company.org');
                        setEmailError('');
                      }}
                      className="w-full text-left py-2 px-3 rounded-lg text-xs font-mono text-slate-800 glass-panel-subtle hover:bg-white/80 transition-colors"
                    >
                      clean.account@company.org
                    </button>
                  </div>
                </div>

                {/* Primary Thumb-Zone Glass CTA */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full h-12 glass-button text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                  >
                    <span>Start 2-Minute Scan</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* Glassmorphic Scope Checklist */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block px-1">
                  Diagnostic Scope
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-3 glass-panel-subtle rounded-2xl">
                    <span className="font-medium text-slate-800">Spyware & Keyloggers</span>
                    <span className="text-slate-500 text-[11px]">Telemetry check</span>
                  </div>
                  <div className="flex items-center justify-between p-3 glass-panel-subtle rounded-2xl">
                    <span className="font-medium text-slate-800">Malware & Trojans</span>
                    <span className="text-slate-500 text-[11px]">Attachment hashes</span>
                  </div>
                  <div className="flex items-center justify-between p-3 glass-panel-subtle rounded-2xl">
                    <span className="font-medium text-slate-800">Viruses & Payloads</span>
                    <span className="text-slate-500 text-[11px]">Threat database match</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STATE 2: SCAN IN PROGRESS (2 MINUTES GLASS PANEL) */}
          {/* ========================================================================= */}
          {scanState === 'scanning' && (
            <div className="space-y-4 pt-1">
              <div className="glass-panel rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/60">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                      Active Scan
                    </span>
                    <div className="text-xs font-semibold text-slate-900 truncate max-w-[200px]">
                      {email}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Remaining</span>
                    <div className="text-xl font-mono font-bold text-slate-900 tabular-nums">
                      {formatTime(remainingSeconds)}
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Percent */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs text-slate-700 font-medium">
                    <span>Progress</span>
                    <span className="font-mono font-semibold tabular-nums">{progressPercent}%</span>
                  </div>
                  <div
                    className="w-full bg-slate-200/60 backdrop-blur-sm h-3 rounded-full overflow-hidden border border-white/60 p-0.5 shadow-inner"
                    role="progressbar"
                    aria-valuenow={progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="bg-slate-900 h-full rounded-full transition-all duration-300 ease-out shadow-sm"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Elapsed: {formatTime(secondsElapsed)}</span>
                    <span>Total: 02:00</span>
                  </div>
                </div>

                {/* Live Inspection Step (Frosted Card) */}
                <div className="p-3.5 glass-panel-subtle rounded-2xl flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-white/90 border border-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <RefreshCw className="w-3 h-3 text-slate-700 animate-spin" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900 leading-snug">
                      {currentPhase.title}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                      {currentPhase.detail}
                    </div>
                  </div>
                </div>

                {/* Scan Actions */}
                <div className="pt-1 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={cancelScan}
                    className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors"
                  >
                    Cancel Scan
                  </button>
                </div>
              </div>

              {/* Phase Checklist for Mobile */}
              <div className="glass-panel rounded-3xl p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
                  Pipeline Steps
                </span>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {SCAN_PHASES.map((phase, idx) => {
                    const isFinished = secondsElapsed > phase.range[1];
                    const isCurrent =
                      secondsElapsed >= phase.range[0] && secondsElapsed <= phase.range[1];

                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between text-xs p-2 rounded-xl transition-colors ${
                          isCurrent
                            ? 'bg-white/90 font-medium text-slate-900 shadow-sm border border-white/80'
                            : isFinished
                            ? 'text-slate-500'
                            : 'text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          {isFinished ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : isCurrent ? (
                            <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 border border-slate-300 rounded-full shrink-0" />
                          )}
                          <span className={`truncate text-[11px] ${isFinished ? 'line-through text-slate-400' : ''}`}>
                            {phase.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono shrink-0">
                          {formatTime(phase.range[0])}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STATE 3: RESULTS (GLASSMORPHIC IPHONE PRESENTATION) */}
          {/* ========================================================================= */}
          {scanState === 'completed' && report && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-200">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                    Diagnostic Complete
                  </span>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    Scan Results
                  </h1>
                </div>
                <button
                  onClick={resetToIdle}
                  className="text-xs text-slate-700 hover:text-slate-900 font-medium bg-white/70 hover:bg-white border border-white/80 px-2.5 py-1.5 rounded-xl shadow-sm transition-all"
                >
                  New Scan
                </button>
              </div>

              {/* 1. Summary Card in Frosted Glass */}
              <div className="glass-panel rounded-3xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      Summary
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed mt-1">
                      Scan of <span className="font-semibold text-slate-900 break-all">{report.targetEmail}</span> completed in 2m. Found{' '}
                      <strong className="text-slate-900 font-bold">
                        {report.totalVulnerabilitiesCount} security {report.totalVulnerabilitiesCount === 1 ? 'vulnerability' : 'vulnerabilities'}
                      </strong>
                      {report.totalVulnerabilitiesCount > 0 ? (
                        <> ({report.criticalCount} Critical, {report.highCount} High).</>
                      ) : (
                        <>. All scanned vectors verified clean.</>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <span className="text-[10px] text-slate-500 block">Threats</span>
                    <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
                      {report.totalVulnerabilitiesCount}
                    </span>
                  </div>
                </div>

                {/* Compact Severity Counters */}
                <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-white/60 text-center text-xs">
                  <div className="p-1.5 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm">
                    <div className="text-[10px] text-red-700 font-medium">Critical</div>
                    <div className="font-mono font-bold text-red-800">{report.criticalCount}</div>
                  </div>
                  <div className="p-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 backdrop-blur-sm">
                    <div className="text-[10px] text-orange-700 font-medium">High</div>
                    <div className="font-mono font-bold text-orange-800">{report.highCount}</div>
                  </div>
                  <div className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-sm">
                    <div className="text-[10px] text-amber-700 font-medium">Medium</div>
                    <div className="font-mono font-bold text-amber-800">{report.mediumCount}</div>
                  </div>
                  <div className="p-1.5 rounded-xl bg-slate-500/10 border border-slate-500/20 backdrop-blur-sm">
                    <div className="text-[10px] text-slate-600 font-medium">Low</div>
                    <div className="font-mono font-bold text-slate-800">{report.lowCount}</div>
                  </div>
                </div>
              </div>

              {/* Data Visualization: Risk Level Distribution with Recharts */}
              <RiskDistributionChart report={report} />

              {/* 2. Prominent Status for Spyware, Malware, and Virus in Glass Cards */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block px-1">
                  Threat Category Status
                </span>

                <div className="space-y-2">
                  {/* Spyware Status */}
                  <div
                    className={`rounded-2xl p-3.5 backdrop-blur-xl border transition-all ${
                      report.spywareStatus.status === 'clean'
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-600">Spyware Status</div>
                        <div
                          className={`text-sm font-bold ${
                            report.spywareStatus.status === 'clean'
                              ? 'text-emerald-800'
                              : 'text-red-800'
                          }`}
                        >
                          {report.spywareStatus.label}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          {report.spywareStatus.details}
                        </div>
                      </div>
                      {report.spywareStatus.status === 'clean' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* Malware Status */}
                  <div
                    className={`rounded-2xl p-3.5 backdrop-blur-xl border transition-all ${
                      report.malwareStatus.status === 'clean'
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-600">Malware Status</div>
                        <div
                          className={`text-sm font-bold ${
                            report.malwareStatus.status === 'clean'
                              ? 'text-emerald-800'
                              : 'text-red-800'
                          }`}
                        >
                          {report.malwareStatus.label}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          {report.malwareStatus.details}
                        </div>
                      </div>
                      {report.malwareStatus.status === 'clean' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* Virus Status */}
                  <div
                    className={`rounded-2xl p-3.5 backdrop-blur-xl border transition-all ${
                      report.virusStatus.status === 'clean'
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-600">Virus Status</div>
                        <div
                          className={`text-sm font-bold ${
                            report.virusStatus.status === 'clean'
                              ? 'text-emerald-800'
                              : 'text-red-800'
                          }`}
                        >
                          {report.virusStatus.label}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          {report.virusStatus.details}
                        </div>
                      </div>
                      {report.virusStatus.status === 'clean' ? (
                        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Security Vulnerabilities Table (Glassmorphism Grouped List) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    Security Vulnerabilities List
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {report.vulnerabilities.length} items
                  </span>
                </div>

                {report.vulnerabilities.length === 0 ? (
                  <div className="p-6 text-center glass-panel rounded-3xl">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                    <div className="text-xs font-semibold text-slate-800">No Vulnerabilities Detected</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">All inbox headers, attachments, and domains verified clean.</p>
                  </div>
                ) : (
                  <div className="glass-panel rounded-3xl divide-y divide-white/60 overflow-hidden">
                    {report.vulnerabilities.map((vuln) => {
                      const isExpanded = expandedVulnId === vuln.id;

                      let riskTag = 'bg-slate-500/10 text-slate-700 border-slate-500/20';
                      if (vuln.riskLevel === 'Critical') {
                        riskTag = 'bg-red-500/15 text-red-800 border-red-500/30 font-bold';
                      } else if (vuln.riskLevel === 'High') {
                        riskTag = 'bg-orange-500/15 text-orange-800 border-orange-500/30 font-semibold';
                      } else if (vuln.riskLevel === 'Medium') {
                        riskTag = 'bg-amber-500/15 text-amber-800 border-amber-500/30';
                      } else if (vuln.riskLevel === 'Low') {
                        riskTag = 'bg-blue-500/15 text-blue-800 border-blue-500/30';
                      }

                      return (
                        <div key={vuln.id} className="transition-colors">
                          <button
                            type="button"
                            onClick={() => setExpandedVulnId(isExpanded ? null : vuln.id)}
                            className="w-full text-left p-3.5 flex items-start justify-between gap-3 hover:bg-white/50 min-h-[52px]"
                            aria-expanded={isExpanded}
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] uppercase px-1.5 py-0.5 border rounded-md backdrop-blur-sm ${riskTag}`}
                                >
                                  {vuln.riskLevel}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {vuln.category}
                                </span>
                              </div>
                              <div className="text-xs font-semibold text-slate-900 leading-snug">
                                {vuln.name}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono truncate">
                                {vuln.source}
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-1 text-slate-500 mt-1">
                              <span className="text-[11px] font-medium text-slate-800">
                                {vuln.status}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-600" />
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="px-3.5 pb-3.5 pt-1 bg-white/40 border-t border-white/60 text-xs space-y-2 backdrop-blur-md">
                              <div>
                                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                                  Description
                                </span>
                                <p className="text-slate-700 leading-relaxed mt-0.5">
                                  {vuln.description}
                                </p>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                                  Remediation
                                </span>
                                <p className="text-slate-700 leading-relaxed mt-0.5">
                                  {vuln.recommendation}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. Download Report CTA Buttons (Glassmorphic) */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => downloadReportAsFile(report)}
                  className="w-full h-12 glass-button text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Detailed Report (.txt)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="h-10 bg-white/70 hover:bg-white text-slate-800 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 border border-white/80 shadow-sm transition-all"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>Print / PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetToIdle}
                    className="h-10 bg-white/70 hover:bg-white text-slate-800 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 border border-white/80 shadow-sm transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                    <span>New Scan</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* iOS Glass Home Indicator Bar at the Bottom */}
        <div className="sticky bottom-0 bg-white/70 backdrop-blur-2xl pt-2 pb-3 flex justify-center border-t border-white/60 shadow-sm no-print relative z-20">
          <div className="w-32 h-1 bg-slate-400/80 rounded-full" />
        </div>
      </div>
    </div>
  );
}
