export type ScanState = 'idle' | 'scanning' | 'completed';

export type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export type ThreatCategory = 'Malware' | 'Spyware' | 'Virus' | 'Phishing' | 'Vulnerability';

export interface SecurityVulnerability {
  id: string;
  name: string;
  category: ThreatCategory;
  riskLevel: RiskLevel;
  source: string;
  status: 'Quarantined' | 'Blocked' | 'Action Required' | 'Resolved';
  description: string;
  recommendation: string;
}

export type ThreatStatus = 'clean' | 'threat_detected' | 'suspicious';

export interface ScanReportData {
  targetEmail: string;
  scanTimestamp: string;
  scanDurationSeconds: number;
  totalVulnerabilitiesCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  spywareStatus: {
    status: ThreatStatus;
    label: string;
    details: string;
  };
  malwareStatus: {
    status: ThreatStatus;
    label: string;
    details: string;
  };
  virusStatus: {
    status: ThreatStatus;
    label: string;
    details: string;
  };
  vulnerabilities: SecurityVulnerability[];
}
