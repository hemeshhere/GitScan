const axios = require('axios');
exports.sendAlert = async (repository, commitId, author, leaks) => {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;
  const leakBlocks = leaks.map(leak => {
    return {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Rule:* ${leak.ruleName} (${leak.severity})\n*File:* \`${leak.file}\` (Line ${leak.lineNumber})\n*Snippet:* \`${leak.contextSnippet}\``
      }
    };
  });

  const payload = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "CRITICAL: Hardcoded Secret Detected!",
          emoji: true
        }
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Repository:*\n${repository}` },
          { type: "mrkdwn", text: `*Commit:*\n<https://github.com/${repository}/commit/${commitId}|${commitId.substring(0, 7)}>` },
          { type: "mrkdwn", text: `*Author:*\n${author}` }
        ]
      },
      { type: "divider" },
      ...leakBlocks,
      { type: "divider" },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "This commit has been logged in the GitScan database. Please rotate the compromised credentials immediately."
          }
        ]
      }
    ]
  };

  try {
    await axios.post(webhookUrl, payload);
    console.log(`Slack alert fired successfully for commit ${commitId.substring(0,7)}`);
  } catch (error) {
    console.error(`Failed to send Slack alert: ${error.message}`);
  }
};