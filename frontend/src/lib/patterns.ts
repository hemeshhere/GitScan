// Real regex patterns for the Playground scanner
// 10 patterns covering major secret types

export interface Pattern {
  id: string;
  name: string;
  severity: "critical" | "high" | "medium" | "low";
  provider: string;
  regex: RegExp;
  mask: (match: string) => string;
}

export const scanPatterns: Pattern[] = [
  {
    id: "aws-access-key-id",
    name: "AWS Access Key ID",
    severity: "critical",
    provider: "AWS",
    regex: /AKIA[0-9A-Z]{16}/g,
    mask: (m) => m.slice(0, 4) + "****" + m.slice(-4),
  },
  {
    id: "github-pat",
    name: "GitHub Personal Access Token",
    severity: "high",
    provider: "GitHub",
    regex: /ghp_[0-9a-zA-Z]{36}/g,
    mask: (m) => m.slice(0, 6) + "****" + m.slice(-4),
  },
  {
    id: "stripe-live-secret-key",
    name: "Stripe Live Secret Key",
    severity: "critical",
    provider: "Stripe",
    regex: /sk_live_[0-9a-zA-Z]{24,}/g,
    mask: (m) => m.slice(0, 10) + "****" + m.slice(-4),
  },
  {
    id: "stripe-test-secret-key",
    name: "Stripe Test Secret Key",
    severity: "low",
    provider: "Stripe",
    regex: /sk_test_[0-9a-zA-Z]{24,}/g,
    mask: (m) => m.slice(0, 10) + "****" + m.slice(-4),
  },
  {
    id: "slack-bot-token",
    name: "Slack Bot Token",
    severity: "high",
    provider: "Slack",
    regex: /xoxb-[0-9]{11,}-[0-9]{11,}-[0-9a-zA-Z]{24}/g,
    mask: (m) => "xoxb-****-****-" + m.slice(-6),
  },
  {
    id: "private-key-header",
    name: "Private Key Header",
    severity: "high",
    provider: "Generic",
    regex: /-----BEGIN (?:RSA |EC |PGP |OPENSSH )?PRIVATE KEY-----/g,
    mask: (m) => m.slice(0, 12) + "***",
  },
  {
    id: "jwt-token",
    name: "JWT Token",
    severity: "medium",
    provider: "Generic",
    regex: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    mask: (m) => m.slice(0, 12) + "****" + m.slice(-4),
  },
  {
    id: "google-api-key",
    name: "Google API / Gemini Key",
    severity: "critical",
    provider: "Google Cloud",
    regex: /AIza[0-9A-Za-z\-_]{35}/g,
    mask: (m) => m.slice(0, 6) + "****" + m.slice(-4),
  },
  {
    id: "env-secret-assignment",
    name: "Exposed API Secret Assignment",
    severity: "critical",
    provider: "Generic",
    regex: /(?:GOOGLE_API_KEY|GEMINI_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|AWS_SECRET_ACCESS_KEY|API_KEY|SECRET_KEY|AUTH_TOKEN)\s*=\s*['"]?([a-zA-Z0-9_\-\.\:\@\/\+\=]{10,})['"]?/gi,
    mask: (m) => {
      const parts = m.split("=");
      const keyName = parts[0].trim();
      const val = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
      return `${keyName}=${val.slice(0, 4)}****${val.slice(-4)}`;
    },
  },
  {
    id: "generic-password",
    name: "Generic Password Assignment",
    severity: "medium",
    provider: "Generic",
    regex: /(?:password|passwd|pwd)\s*[=:]\s*['"]([^'"]{8,})['"]|(?:PASSWORD|PASSWD|PWD)\s*=\s*['"]?([^'"\s]{8,})['"]?/gi,
    mask: (_m) => "password=****",
  },
  {
    id: "db-connection-string",
    name: "Database Connection String",
    severity: "medium",
    provider: "Generic",
    regex: /(?:postgresql|mysql|mongodb|redis|jdbc):\/\/[^:]+:[^@]+@[^/\s]+/g,
    mask: (m) => {
      const proto = m.split("://")[0];
      return `${proto}://****:****@[host]`;
    },
  },
];

export interface ScanMatch {
  patternId: string;
  patternName: string;
  severity: "critical" | "high" | "medium" | "low";
  provider: string;
  line: number;
  col: number;
  matchStart: number;
  matchEnd: number;
  masked: string;
  raw: string;
}

export function scanText(text: string): ScanMatch[] {
  const results: ScanMatch[] = [];
  const lines = text.split("\n");

  for (const pattern of scanPatterns) {
    // Reset regex state
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const beforeMatch = text.slice(0, match.index);
      const lineNum = beforeMatch.split("\n").length;
      const lastNewline = beforeMatch.lastIndexOf("\n");
      const col = lastNewline === -1 ? match.index : match.index - lastNewline - 1;

      results.push({
        patternId: pattern.id,
        patternName: pattern.name,
        severity: pattern.severity,
        provider: pattern.provider,
        line: lineNum,
        col,
        matchStart: match.index,
        matchEnd: match.index + match[0].length,
        masked: pattern.mask(match[0]),
        raw: match[0],
      });
    }
  }

  return results.sort((a, b) => a.matchStart - b.matchStart);
}
