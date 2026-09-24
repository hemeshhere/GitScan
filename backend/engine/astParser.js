const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');

const parser = new Parser();
parser.setLanguage(JavaScript);

class AstParser {
  /**
   * Parses JavaScript/TypeScript code and extracts secrets ONLY from string literals,
   * completely ignoring comments, console logs, and function names.
   */
  static findSecretsInCode(codeSnippet, rules) {
    // 1. Convert the raw code into an Abstract Syntax Tree
    const tree = parser.parse(codeSnippet);
    const findings = [];

    // 2. Recursive function to walk down the branches of the tree
    const walkNode = (node) => {
      // 🚨 AST MAGIC: We ONLY inspect nodes that the compiler identifies as 'string'
      if (node.type === 'string') {
        const stringText = node.text;

        // Run our regex rules ONLY against the contents of this string
        for (const rule of rules) {
          const matches = stringText.match(rule.regex);
          
          if (matches) {
            matches.forEach(match => {
              findings.push({
                ruleId: rule.id,
                ruleName: rule.name,
                severity: rule.severity,
                secret: match,
                // Tree-sitter is 0-indexed for rows, we add 1 for the UI
                lineNumber: node.startPosition.row + 1 
              });
            });
          }
        }
      }

      // Check all children recursively
      for (let i = 0; i < node.childCount; i++) {
        walkNode(node.child(i));
      }
    };

    // Start walking from the root of the file
    walkNode(tree.rootNode);
    
    return findings;
  }
}

module.exports = AstParser;