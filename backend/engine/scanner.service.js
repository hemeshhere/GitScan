const rules = require('./rules');

class ScannerService {
  static maskSecret(secret) {
    if (!secret || secret.length < 6) return '***';
    return secret.substring(0, 4) + '*'.repeat(secret.length - 4);
  }

  /**
   * Scans the fetched commit diffs for secrets.
   * @param {Array} commitsData - The array of commits containing patches from github.service
   * @returns {Array} An array of detected leak objects
   */
  static scanCommits(commitsData) {
    const leaks = [];

    for (const commit of commitsData) {
      for (const file of commit.diffs) {
        if (!file.patch) continue;
        const lines = file.patch.split('\n');
        let currentLineNumber = 0;
        for (const line of lines) {
          const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
          if (hunkMatch) {
            currentLineNumber = parseInt(hunkMatch[1], 10) - 1;
            continue;
          }
          if (!line.startsWith('-')) {
            currentLineNumber++;
          }
          if (line.startsWith('+') && !line.startsWith('+++')) {
            const cleanLine = line.substring(1); 
            for (const rule of rules) {
              const matches = cleanLine.match(rule.regex);
              if (matches) {
                matches.forEach(match => {
                  leaks.push({
                    commitId: commit.commitId,
                    author: commit.author,
                    file: file.filename,
                    lineNumber: currentLineNumber,
                    ruleId: rule.id,
                    ruleName: rule.name,
                    severity: rule.severity,
                    maskedSecret: this.maskSecret(match),
                    contextSnippet: cleanLine.replace(match, this.maskSecret(match)).trim()
                  });
                });
              }
            }
          }
        }
      }
    }
    return leaks;
  }
}

module.exports = ScannerService;