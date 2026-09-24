const githubService = require('../services/github.service');
const ScannerService = require('../engine/scanner.service');
const Scan = require('../models/Scan');
const slackService = require('../services/slack.service');

exports.handleGithubPush = async (req, res) => {
  res.status(202).send("Webhook queued");
  if (req.headers['x-github-event'] !== 'push') return;
  const payload = req.body;
  const repository = payload.repository;
  const owner = repository.owner.login;
  const repo = repository.name;
  const commits = payload.commits;
  if (!commits || commits.length === 0) return;
  console.log(`\n[SCAN JOB INITIATED] Repo: ${owner}/${repo} | Commits: ${commits.length}`);
  //fetches the promises and maps them to commit 
  const diffPromises = commits.map(commit => 
    githubService.getCommitDiffs(owner, repo, commit.id)
      .then(diffs => ({ commitId: commit.id, author: commit.author.email, diffs }))
  );
  // execute the fetches regularly
  // ensures if one API fails, the other still process
  const results = await Promise.allSettled(diffPromises);
  const validDiffs = results
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);
  console.log(`Successfully fetched diffs for ${validDiffs.length} commits.`);

  // Regex Engine
  const detectedLeaks = ScannerService.scanCommits(validDiffs);
  if (detectedLeaks.length > 0) {
    console.log(`DANGER: Found ${detectedLeaks.length} secrets in push!`);
    console.table(detectedLeaks);
    for (const commit of validDiffs) {
      const commitLeaks = detectedLeaks.filter(l => l.commitId === commit.commitId);
      if (commitLeaks.length > 0) {
        await Scan.create({
          repository: `${owner}/${repo}`,
          commitId: commit.commitId,
          authorEmail: commit.author,
          status: 'LEAK_DETECTED',
          leaks: commitLeaks
        });
        await slackService.sendAlert(
          `${owner}/${repo}`, 
          commit.commitId, 
          commit.author, 
          commitLeaks
        );
        const markdownLeaks = commitLeaks.map(l => 
          `- **${l.ruleName}** in \`${l.file}\` (Line ${l.lineNumber})\n  *Masked:* \`${l.maskedSecret}\``
        ).join('\n\n');

        const githubWarningMessage = `## 🚨 SECURITY ALERT: Hardcoded Secrets Detected\n\nGitScan identified ${commitLeaks.length} potential secret(s) in this commit. Please rotate them immediately to prevent unauthorized access.\n\n${markdownLeaks}\n\n> *Note: This is an automated security scan. Please do not reply to this bot.*`;

        await githubService.createCommitComment(
          owner, 
          repo, 
          commit.commitId, 
          githubWarningMessage
        );
      }
    }
    console.log(`Scans successfully saved to MongoDB.`);
  } else {
    console.log(`Scan complete. No secrets found in push.`);
    for (const commit of validDiffs) {
      await Scan.create({
        repository: `${owner}/${repo}`,
        commitId: commit.commitId,
        authorEmail: commit.author,
        status: 'CLEAN',
        leaks: []
      });
    }
  }
};