const githubService = require('../services/github.service');
const ScannerService = require('../engine/scanner.service');

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
    // TODO: Pass detectedLeaks to MongoDB to save
    // TODO: Fire Slack Alert
  } else {
    console.log(`Scan complete. No secrets found in push.`);
  }
};