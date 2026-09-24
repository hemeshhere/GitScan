const AstParser = require('./astParser');
// I see you extracted rules to rules.js in your screenshot! Perfect.
const rules = require('./rules'); 

class ScannerService {
  scanCommits(commits) {
    const detectedLeaks = [];

    for (const commit of commits) {
      for (const fileDiff of commit.diffs) {
        const fileName = fileDiff.filename || fileDiff.file;
        const patch = fileDiff.patch || '';

        // 🚨 STRICT CHECK 1: File Name Blocking (e.g. .env)
        if (fileName.includes('.env') || fileName.endsWith('.pem') || fileName.endsWith('.key')) {
          detectedLeaks.push({
            commitId: commit.commitId,
            file: fileName,
            lineNumber: 1,
            ruleId: 'BANNED_FILE_TYPE',
            ruleName: 'Environment or Key File Committed',
            severity: 'CRITICAL',
            maskedSecret: '********',
            contextSnippet: `Entire file banned: ${fileName}`
          });
          continue; 
        }

        // 🚨 AST PARSING for JS/TS Files
        if (fileName.match(/\.(js|jsx|ts|tsx)$/)) {
          // Reconstruct the added lines into a parseable block of code
          const addedLines = patch.split('\n')
            .filter(line => line.startsWith('+') && !line.startsWith('+++'))
            .map(line => line.substring(1)) // Remove the '+'
            .join('\n');

          if (addedLines.trim()) {
            const astFindings = AstParser.findSecretsInCode(addedLines, rules);
            
            astFindings.forEach(finding => {
              detectedLeaks.push({
                commitId: commit.commitId,
                file: fileName,
                lineNumber: finding.lineNumber, // Provided by tree-sitter
                ruleId: finding.ruleId,
                ruleName: finding.ruleName,
                severity: finding.severity,
                maskedSecret: finding.secret.substring(0, 4) + '*'.repeat(finding.secret.length - 4),
                contextSnippet: "AST Matched String Literal"
              });
            });
          }
          continue; // Skip standard regex for JS/TS files
        }

        // 🚨 FALLBACK: Standard Line-by-Line Regex for all other file types (Python, YAML, etc.)
        const lines = patch.split('\n');
        lines.forEach((line, index) => {
          if (line.startsWith('+') && !line.startsWith('+++')) {
            const cleanLine = line.substring(1); 
            for (const rule of rules) {
              const matches = cleanLine.match(rule.regex);
              if (matches) {
                matches.forEach(match => {
                  detectedLeaks.push({
                    commitId: commit.commitId,
                    file: fileName,
                    lineNumber: index + 1,
                    ruleId: rule.id,
                    ruleName: rule.name,
                    severity: rule.severity,
                    maskedSecret: match.substring(0, 4) + '*'.repeat(match.length - 4),
                    contextSnippet: cleanLine.trim().substring(0, 100)
                  });
                });
              }
            }
          }
        });
      }
    }

    return detectedLeaks;
  }
}

module.exports = new ScannerService();