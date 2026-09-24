const { Octokit } = require('@octokit/rest');

// Authenticate using a Personal Access Token (PAT) from your .env
const octokit = new Octokit({
  auth: process.env.GITHUB_PAT
});
exports.octokit = octokit;
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

exports.getRecentCommits = async (owner, repo, limit = 10) => {
  try {
    const response = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: limit 
    });
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch commit history: ${error.message}`);
    throw error;
  }
};
// Add this to services/github.service.js

exports.createCommitComment = async (owner, repo, commitSha, message) => {
  try {
    await octokit.rest.repos.createCommitComment({
      owner,
      repo,
      commit_sha: commitSha,
      body: message
    });
    console.log(`GitHub bot successfully commented on commit ${commitSha.substring(0, 7)}`);
  } catch (error) {
    console.error(`Failed to post GitHub comment: ${error.message}`);
  }
};