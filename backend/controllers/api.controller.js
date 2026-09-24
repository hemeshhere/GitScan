const Scan = require('../models/Scan');
const githubService = require('../services/github.service');
const ScannerService = require('../engine/scanner.service');
const slackService = require('../services/slack.service');

exports.getRecentScans = async (req, res) => {
  try {
    const scans = await Scan.find()
      .sort({ scannedAt: -1 }) 
      .limit(50);
    
    res.status(200).json({
      success: true,
      count: scans.length,
      data: scans
    });
  } catch (error) {
    console.error("Error fetching scans:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getScanStats = async (req, res) => {
  try {
    const totalScans = await Scan.countDocuments();
    const leaksFound = await Scan.countDocuments({ status: 'LEAK_DETECTED' });
    
    res.status(200).json({
      success: true,
      data: { totalScans, leaksFound }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.scanHistoricalRepo = async (req, res) => {
  const { owner, repo } = req.body;

  if (!owner || !repo) {
    return res.status(400).json({ success: false, message: "Missing owner or repo" });
  }

  try {
    let newLeaksCount = 0;
    const allLeaks = [];
    try {
      // Get the repository info to find the default branch (main/master)
      const { data: repoInfo } = await githubService.octokit.rest.repos.get({
        owner,
        repo
      });
      
      // Fetch every single file path in the repository recursively
      const { data: treeData } = await githubService.octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: repoInfo.default_branch,
        recursive: '1' 
      });

      // Search all paths for .env, .pem, or .key
      const bannedFiles = treeData.tree.filter(file => 
        file.type === 'blob' && 
        (file.path.includes('.env') || file.path.endsWith('.pem') || file.path.endsWith('.key'))
      );

      for (const file of bannedFiles) {
        newLeaksCount++;
        const leakData = {
          commitId: 'ENTIRE_REPO_TREE', 
          file: file.path,
          lineNumber: 1,
          ruleId: 'BANNED_FILE_TYPE',
          ruleName: 'Environment or Key File Committed',
          severity: 'CRITICAL',
          maskedSecret: '********',
          contextSnippet: `Found active banned file at: ${file.path}`
        };
        
        allLeaks.push(leakData);

        // Save to DB and Alert Slack
        await Scan.create({
          repository: `${owner}/${repo}`,
          commitId: 'ENTIRE_REPO_TREE',
          authorEmail: 'unknown (existing file)',
          status: 'LEAK_DETECTED',
          leaks: [leakData]
        });

        await slackService.sendAlert(`${owner}/${repo}`, 'ENTIRE_REPO_TREE', 'unknown', [leakData]);
      }
    } catch (treeError) {
      console.log(`Note: Could not fetch recursive tree for ${owner}/${repo}: ${treeError.message}`);
    }

    // 2. Fetch and scan the last 10 commits (Your existing logic)
    const commits = await githubService.getRecentCommits(owner, repo, 10);
    
    const diffPromises = commits.map(commit => 
      githubService.getCommitDiffs(owner, repo, commit.sha)
        .then(diffs => ({ 
          commitId: commit.sha, 
          author: commit.commit.author.email, 
          diffs 
        }))
    );

    const results = await Promise.allSettled(diffPromises);
    const validDiffs = results
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);

    const detectedLeaks = ScannerService.scanCommits(validDiffs);

    for (const commit of validDiffs) {
      const existingScan = await Scan.findOne({ commitId: commit.commitId });
      if (existingScan) continue;

      const commitLeaks = detectedLeaks.filter(l => l.commitId === commit.commitId);
      
      await Scan.create({
        repository: `${owner}/${repo}`,
        commitId: commit.commitId,
        authorEmail: commit.author,
        status: commitLeaks.length > 0 ? 'LEAK_DETECTED' : 'CLEAN',
        leaks: commitLeaks
      });

      if (commitLeaks.length > 0) {
        newLeaksCount += commitLeaks.length;
        allLeaks.push(...commitLeaks);
        await slackService.sendAlert(`${owner}/${repo}`, commit.commitId, commit.author, commitLeaks);
      }
    }

    res.status(200).json({
      success: true,
      message: `Historical scan complete. Analyzed 1 tree and ${validDiffs.length} commits.`,
      leaksFound: newLeaksCount,
      leaks: allLeaks
    });

  } catch (error) {
    console.error("Historical Scan Error:", error);
    res.status(500).json({ success: false, message: "Failed to scan repository" });
  }
};