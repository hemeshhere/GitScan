const rules = [
  {
    id: 'AWS_ACCESS_KEY',
    name: 'AWS Access Key ID',
    regex: /AKIA[0-9A-Z]{16}/g,
    severity: 'CRITICAL'
  },
  {
    id: 'GITHUB_PAT',
    name: 'GitHub Personal Access Token',
    regex: /ghp_[a-zA-Z0-9]{36}/g,
    severity: 'CRITICAL'
  },
  {
    id: 'SLACK_BOT_TOKEN',
    name: 'Slack Bot Token',
    regex: /xoxb-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}/g,
    severity: 'HIGH'
  },
  {
    id: 'STRIPE_SECRET_KEY',
    name: 'Stripe Secret Key',
    regex: /sk_(live|test)_[0-9a-zA-Z]{24,34}/g,
    severity: 'HIGH'
  }
];

module.exports = rules;