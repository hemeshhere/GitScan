const { Octokit } = require('@octokit/rest');

// Authenticate using a Personal Access Token (PAT) from your .env
const octokit = new Octokit({
  auth: process.env.GITHUB_PAT
});

/**
 * Fetches the raw code diffs for a specific commit.
 * @param {string} owner - Repository owner (e.g., "octocat")
 * @param {string} repo - Repository name (e.g., "Hello-World")
 * @param {string} commitSha - The commit hash
 * @returns {Promise<Array>} Array of modified files and their patch strings
 */
exports.getCommitDiffs = async (owner, repo, commitSha) => {
  try {
    const response = await octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: commitSha,
    });

    const files = response.data.files;
    if (!files) return [];

    // Filters binary files, deleted files, and images.
    return files
      .filter(file => file.patch && file.status !== 'removed')
      .map(file => ({
        filename: file.filename,
        status: file.status,
        patch: file.patch 
      }));

  } catch (error) {
    console.error(`Failed to fetch diff for commit ${commitSha}:`, error.message);
    throw error;
  }
};