// ─── GitHub Repository URL Parser & Validator ──────────────────────────────────
// Pure functions for validating, normalizing, and extracting owner, repo, and branch.

export type ParseRepoResult =
  | {
      ok: true;
      owner: string;
      repo: string;
      branch?: string;
      normalizedUrl: string;
    }
  | {
      ok: false;
      code: "INVALID_URL" | "UNSUPPORTED_HOST";
      message: string;
    };

// GitHub reserved paths that cannot be user/organization accounts
const RESERVED_GITHUB_PATHS = new Set([
  "settings",
  "orgs",
  "marketplace",
  "features",
  "topics",
  "explore",
  "notifications",
  "login",
  "join",
  "pricing",
  "security",
  "search",
  "pulls",
  "issues",
  "trending",
  "collections",
  "events",
  "sponsors",
  "about",
  "site",
  "contact",
  "enterprise",
  "nonprofit",
  "customer-stories",
  "readme",
  "stars",
]);

// Owner cannot start or end with hyphen, alphanumeric with single hyphens, 1-39 chars
const OWNER_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
// Repo allows alphanumeric, hyphens, underscores, dots, 1-100 chars
const REPO_REGEX = /^[a-zA-Z0-9_.-]{1,100}$/;

/**
 * Parses and validates an input string into a structured GitHub repository target.
 */
export function parseRepoUrl(rawInput: string | null | undefined): ParseRepoResult {
  if (rawInput === null || rawInput === undefined) {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "Enter a GitHub repository URL",
    };
  }

  // 1. Length check & whitespace trimming
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "Enter a GitHub repository URL",
    };
  }

  if (trimmed.length > 300) {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "Repository URL is too long (maximum 300 characters)",
    };
  }

  // 2. Handle surrounding newlines or multiple pasted tokens by picking the first URL/token
  // If user pasted multi-line text or space-separated items, look for the first valid candidate
  const firstToken = trimmed.split(/[\s\r\n]+/)[0];
  if (!firstToken) {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "Enter a GitHub repository URL",
    };
  }

  let candidate = firstToken;

  // Strip query string and hash first if present
  candidate = candidate.split("?")[0].split("#")[0];

  // 3. Normalization: Missing protocol or shorthands
  // e.g. git@github.com:owner/repo.git
  if (candidate.startsWith("git@github.com:")) {
    candidate = "https://github.com/" + candidate.slice("git@github.com:".length);
  } else if (!candidate.includes("://")) {
    if (candidate.toLowerCase().startsWith("github.com/")) {
      candidate = "https://" + candidate;
    } else if (candidate.includes("/") && !candidate.includes(".")) {
      // Shorthand: "owner/repo" or "owner/repo/tree/branch"
      candidate = "https://github.com/" + candidate;
    } else if (candidate.includes(".") && candidate.includes("/")) {
      // Look for a protocol-less domain e.g. "gitlab.com/owner/repo"
      candidate = "https://" + candidate;
    } else {
      return {
        ok: false,
        code: "INVALID_URL",
        message: "Enter a valid GitHub repository URL (e.g. github.com/owner/repo)",
      };
    }
  }

  // 4. URL Parse
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(candidate);
  } catch {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "Enter a valid GitHub repository URL",
    };
  }

  // If hostname doesn't have a dot and is not localhost, it's not a real URL
  if (!parsedUrl.hostname.includes(".")) {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "Enter a valid GitHub repository URL",
    };
  }

  // 5. Host validation
  const hostname = parsedUrl.hostname.toLowerCase();

  // Explicit check for lookalike domains or non-github hosts
  const isGithub = hostname === "github.com" || hostname === "www.github.com";

  if (!isGithub) {
    if (
      hostname === "gitlab.com" ||
      hostname.endsWith(".gitlab.com") ||
      hostname === "bitbucket.org" ||
      hostname.endsWith("github.io") ||
      hostname === "github.co" ||
      hostname.includes("g1thub") ||
      hostname.includes("github")
    ) {
      return {
        ok: false,
        code: "UNSUPPORTED_HOST",
        message: "GitScan currently only supports public GitHub repositories (github.com).",
      };
    }
    return {
      ok: false,
      code: "UNSUPPORTED_HOST",
      message: "Only public GitHub repositories (github.com) are currently supported.",
    };
  }

  // 6. Path segment extraction
  // Pathname: e.g. "/facebook/react.git/tree/main"
  const rawSegments = parsedUrl.pathname
    .split("/")
    .map(s => s.trim())
    .filter(Boolean);

  if (rawSegments.length === 0) {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "Enter a repository URL in the format github.com/owner/repo",
    };
  }

  const owner = rawSegments[0];

  // Reserved paths check
  if (RESERVED_GITHUB_PATHS.has(owner.toLowerCase())) {
    return {
      ok: false,
      code: "INVALID_URL",
      message: `"${owner}" is a reserved GitHub page, not a repository`,
    };
  }

  // Missing repo check
  if (rawSegments.length === 1) {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "Add the repository name (e.g. github.com/" + owner + "/repo)",
    };
  }

  let repo = rawSegments[1];

  // Strip .git suffix if present
  if (repo.endsWith(".git")) {
    repo = repo.slice(0, -4);
  }

  if (!repo) {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "Add the repository name",
    };
  }

  // 7. Validate owner and repo character rules
  if (!OWNER_REGEX.test(owner)) {
    return {
      ok: false,
      code: "INVALID_URL",
      message: `Invalid GitHub owner "${owner}". Owners may only contain alphanumeric characters and hyphens, and cannot start or end with a hyphen.`,
    };
  }

  if (!REPO_REGEX.test(repo)) {
    return {
      ok: false,
      code: "INVALID_URL",
      message: `Invalid repository name "${repo}". Repositories may only contain letters, numbers, hyphens, underscores, and periods.`,
    };
  }

  // 8. Extract optional branch from subpaths: /tree/:branch, /blob/:branch, etc.
  let branch: string | undefined;
  if (rawSegments.length >= 4) {
    const action = rawSegments[2].toLowerCase();
    if (action === "tree" || action === "blob") {
      // Branch can be nested e.g. "feat/new-auth"
      branch = rawSegments.slice(3).join("/");
    }
  }

  const normalizedUrl = `https://github.com/${owner}/${repo}`;

  return {
    ok: true,
    owner,
    repo,
    branch,
    normalizedUrl,
  };
}
