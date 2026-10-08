import { SecurityVulnerability, ScanReportData } from '../types';

export const SCAN_PHASES = [
  {
    range: [0, 14],
    title: 'Resolving mail server and MX records',
    detail: 'Checking DNS configuration and mail relay route credibility',
  },
  {
    range: [15, 29],
    title: 'Auditing SPF, DKIM & DMARC authentication',
    detail: 'Validating domain spoofing protections and cryptographic signatures',
  },
  {
    range: [30, 44],
    title: 'Querying breached credential repositories',
    detail: 'Checking exposure across known leak indices and data dump archives',
  },
  {
    range: [45, 59],
    title: 'Inspecting inbound message headers & relays',
    detail: 'Scanning intermediate mail transfer agent hops for anomalies',
  },
  {
    range: [60, 74],
    title: 'Analyzing attachment file hashes',
    detail: 'Matching binary hashes against global malware threat signatures',
  },
  {
    range: [75, 89],
    title: 'Heuristic inspection for active spyware & keyloggers',
    detail: 'Evaluating background tracking scripts, beacon calls, and telemetry hooks',
  },
  {
    range: [90, 104],
    title: 'Scanning virus definition catalogs',
    detail: 'Cross-referencing polymorphic file markers with threat databases',
  },
  {
    range: [105, 120],
    title: 'Compiling security vulnerability matrix',
    detail: 'Assigning CVSS severity ratings and formatting final assessment',
  },
];

export function getScanPhaseForSecond(elapsedSeconds: number) {
  const current = SCAN_PHASES.find(
    (p) => elapsedSeconds >= p.range[0] && elapsedSeconds <= p.range[1]
  );
  return current || SCAN_PHASES[SCAN_PHASES.length - 1];
}

export function generateScanResults(email: string): ScanReportData {
  const isClean = email.toLowerCase().includes('clean');

  if (isClean) {
    return {
      targetEmail: email,
      scanTimestamp: new Date().toLocaleString(),
      scanDurationSeconds: 120,
      totalVulnerabilitiesCount: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      spywareStatus: {
        status: 'clean',
        label: 'Clean',
        details: 'No spyware, surveillance trackers, or telemetry hooks detected.',
      },
      malwareStatus: {
        status: 'clean',
        label: 'Clean',
        details: 'Zero malicious payloads or trojan hashes found.',
      },
      virusStatus: {
        status: 'clean',
        label: 'Clean',
        details: 'All email attachments match clean virus definitions.',
      },
      vulnerabilities: [],
    };
  }

  const vulnerabilities: SecurityVulnerability[] = [
    {
      id: 'SEC-8902',
      name: 'Trojan.Dropper.Generic (CVE-2024-21413)',
      category: 'Malware',
      riskLevel: 'Critical',
      source: 'Inbound attachment: invoice_update_882.docx',
      status: 'Quarantined',
      description: 'Execution trigger capable of bypassing Microsoft Outlook protected view to execute arbitrary code.',
      recommendation: 'Payload automatically placed in isolated quarantine. Apply Windows Security update KB5035885 immediately.',
    },
    {
      id: 'SEC-7419',
      name: 'AgentTesla Infostealer Telemetry Hook',
      category: 'Spyware',
      riskLevel: 'High',
      source: 'Phishing relay link: hxxps://secure-verify-auth.net',
      status: 'Blocked',
      description: 'Spyware binary designed to harvest clipboard buffers, keystrokes, and stored browser credentials.',
      recommendation: 'Domain blacklisted at gateway firewall. Terminate active sessions and enable hardware 2FA.',
    },
    {
      id: 'SEC-6124',
      name: 'Exposed Credential Hash in Public Breach',
      category: 'Vulnerability',
      riskLevel: 'High',
      source: 'Compromised hash collection (ComboList #4)',
      status: 'Action Required',
      description: 'Associated address and hashed password observed in recent third-party enterprise breach leak.',
      recommendation: 'Force immediate password reset on the identity provider and audit recent single sign-on activity.',
    },
    {
      id: 'SEC-5041',
      name: 'Permissive DMARC Policy (p=none)',
      category: 'Vulnerability',
      riskLevel: 'Medium',
      source: 'DNS Domain TXT Record',
      status: 'Action Required',
      description: 'Domain email reporting is set to monitor-only without rejecting unauthorized spoofed senders.',
      recommendation: 'Update DMARC policy from p=none to p=quarantine or p=reject to enforce strict anti-spoofing.',
    },
    {
      id: 'SEC-3108',
      name: 'Legacy TLS 1.1 Ingestion Cipher Supported',
      category: 'Vulnerability',
      riskLevel: 'Low',
      source: 'Mail transfer port 587 (SMTP)',
      status: 'Action Required',
      description: 'Mail exchanger accepts obsolete cryptographic ciphers susceptible to downgrade attacks.',
      recommendation: 'Disable TLS 1.0 and 1.1; enforce TLS 1.2 minimum with modern forward-secrecy suites.',
    },
  ];

  return {
    targetEmail: email,
    scanTimestamp: new Date().toLocaleString(),
    scanDurationSeconds: 120,
    totalVulnerabilitiesCount: vulnerabilities.length,
    criticalCount: vulnerabilities.filter((v) => v.riskLevel === 'Critical').length,
    highCount: vulnerabilities.filter((v) => v.riskLevel === 'High').length,
    mediumCount: vulnerabilities.filter((v) => v.riskLevel === 'Medium').length,
    lowCount: vulnerabilities.filter((v) => v.riskLevel === 'Low').length,
    spywareStatus: {
      status: 'threat_detected',
      label: 'Threat Detected',
      details: '1 active spyware telemetry hook identified and blocked.',
    },
    malwareStatus: {
      status: 'threat_detected',
      label: 'Threat Detected',
      details: '1 critical trojan dropper payload quarantined.',
    },
    virusStatus: {
      status: 'clean',
      label: 'Clean',
      details: '0 active virus signatures found across scanned mail archives.',
    },
    vulnerabilities,
  };
}

export function downloadReportAsFile(report: ScanReportData) {
  const content = `================================================================================
MACANTIVIRUS & EMAIL SECURITY SCAN REPORT
================================================================================
Generated: ${report.scanTimestamp}
Target Email: ${report.targetEmail}
Scan Duration: ${report.scanDurationSeconds} seconds (2 minutes)
Total Security Vulnerabilities Identified: ${report.totalVulnerabilitiesCount}
--------------------------------------------------------------------------------
RISK BREAKDOWN:
  - Critical : ${report.criticalCount}
  - High     : ${report.highCount}
  - Medium   : ${report.mediumCount}
  - Low      : ${report.lowCount}
--------------------------------------------------------------------------------
THREAT STATUS OVERVIEW:
  - Spyware Status : ${report.spywareStatus.label.toUpperCase()} (${report.spywareStatus.details})
  - Malware Status : ${report.malwareStatus.label.toUpperCase()} (${report.malwareStatus.details})
  - Virus Status   : ${report.virusStatus.label.toUpperCase()} (${report.virusStatus.details})
================================================================================
SECURITY VULNERABILITIES LIST
================================================================================
${
  report.vulnerabilities.length === 0
    ? 'No security vulnerabilities detected. System is clean and compliant.'
    : report.vulnerabilities
        .map(
          (v, idx) => `
[#${idx + 1}] ${v.name}
  Severity        : [${v.riskLevel.toUpperCase()}]
  Threat Category : ${v.category}
  Detection ID    : ${v.id}
  Status          : ${v.status}
  Source / Vector : ${v.source}
  Description     : ${v.description}
  Remediation     : ${v.recommendation}
`
        )
        .join('\n--------------------------------------------------------------------------------\n')
}
================================================================================
RECOMMENDED NEXT STEPS:
1. Review quarantined objects in your endpoint management console.
2. Invalidate exposed credential tokens and rotate passwords.
3. Harden DNS records with strict DMARC (p=reject) and SPF enforcement.
4. Schedule recurring automated scans.
================================================================================
Report finalized by MACAntivirus Security Engine.
`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const sanitizedEmail = report.targetEmail.replace(/[^a-zA-Z0-9]/g, '_');
  a.download = `macantivirus-report-${sanitizedEmail}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
