import { describe, it, expect } from "vitest";
import { parseRepoUrl } from "./parseRepoUrl";

describe("parseRepoUrl", () => {
  const testCases: Array<{
    name: string;
    input: string | null | undefined;
    expected:
      | { ok: true; owner: string; repo: string; branch?: string; normalizedUrl: string }
      | { ok: false; code: "INVALID_URL" | "UNSUPPORTED_HOST" };
  }> = [
    // 1-3: Empty and whitespace
    {
      name: "empty string",
      input: "",
      expected: { ok: false, code: "INVALID_URL" },
    },
    {
      name: "whitespace only",
      input: "    \t  \n  ",
      expected: { ok: false, code: "INVALID_URL" },
    },
    {
      name: "null or undefined",
      input: null,
      expected: { ok: false, code: "INVALID_URL" },
    },

    // 4-8: Standard valid GitHub URLs
    {
      name: "standard https url",
      input: "https://github.com/facebook/react",
      expected: {
        ok: true,
        owner: "facebook",
        repo: "react",
        normalizedUrl: "https://github.com/facebook/react",
      },
    },
    {
      name: "http url converted to https normalized",
      input: "http://github.com/torvalds/linux",
      expected: {
        ok: true,
        owner: "torvalds",
        repo: "linux",
        normalizedUrl: "https://github.com/torvalds/linux",
      },
    },
    {
      name: "www.github.com url",
      input: "https://www.github.com/vercel/next.js",
      expected: {
        ok: true,
        owner: "vercel",
        repo: "next.js",
        normalizedUrl: "https://github.com/vercel/next.js",
      },
    },
    {
      name: "url with .git suffix",
      input: "https://github.com/pallets/flask.git",
      expected: {
        ok: true,
        owner: "pallets",
        repo: "flask",
        normalizedUrl: "https://github.com/pallets/flask",
      },
    },
    {
      name: "url with trailing slash",
      input: "https://github.com/golang/go/",
      expected: {
        ok: true,
        owner: "golang",
        repo: "go",
        normalizedUrl: "https://github.com/golang/go",
      },
    },

    // 9-11: Missing protocol auto-fix
    {
      name: "missing protocol with domain",
      input: "github.com/tailwindlabs/tailwindcss",
      expected: {
        ok: true,
        owner: "tailwindlabs",
        repo: "tailwindcss",
        normalizedUrl: "https://github.com/tailwindlabs/tailwindcss",
      },
    },
    {
      name: "owner/repo shorthand without domain",
      input: "shadcn-ui/ui",
      expected: {
        ok: true,
        owner: "shadcn-ui",
        repo: "ui",
        normalizedUrl: "https://github.com/shadcn-ui/ui",
      },
    },
    {
      name: "git@ ssh style url",
      input: "git@github.com:facebook/jest.git",
      expected: {
        ok: true,
        owner: "facebook",
        repo: "jest",
        normalizedUrl: "https://github.com/facebook/jest",
      },
    },

    // 12-16: Subpaths and branch extraction
    {
      name: "tree subpath extracts branch",
      input: "https://github.com/owner/my-repo/tree/main",
      expected: {
        ok: true,
        owner: "owner",
        repo: "my-repo",
        branch: "main",
        normalizedUrl: "https://github.com/owner/my-repo",
      },
    },
    {
      name: "tree subpath with nested branch name",
      input: "https://github.com/owner/my-repo/tree/feat/secret-scanner",
      expected: {
        ok: true,
        owner: "owner",
        repo: "my-repo",
        branch: "feat/secret-scanner",
        normalizedUrl: "https://github.com/owner/my-repo",
      },
    },
    {
      name: "blob subpath extracts branch",
      input: "https://github.com/owner/my-repo/blob/v2.0/src/index.ts",
      expected: {
        ok: true,
        owner: "owner",
        repo: "my-repo",
        branch: "v2.0/src/index.ts",
        normalizedUrl: "https://github.com/owner/my-repo",
      },
    },
    {
      name: "issues subpath stripped cleanly",
      input: "https://github.com/owner/my-repo/issues/123",
      expected: {
        ok: true,
        owner: "owner",
        repo: "my-repo",
        normalizedUrl: "https://github.com/owner/my-repo",
      },
    },
    {
      name: "pull request subpath stripped cleanly",
      input: "https://github.com/owner/my-repo/pull/45",
      expected: {
        ok: true,
        owner: "owner",
        repo: "my-repo",
        normalizedUrl: "https://github.com/owner/my-repo",
      },
    },

    // 17-18: Query strings and hash fragments
    {
      name: "url with query parameters",
      input: "https://github.com/owner/my-repo?tab=readme-ov-file&utm_source=chat",
      expected: {
        ok: true,
        owner: "owner",
        repo: "my-repo",
        normalizedUrl: "https://github.com/owner/my-repo",
      },
    },
    {
      name: "url with hash anchor",
      input: "https://github.com/owner/my-repo#installation-instructions",
      expected: {
        ok: true,
        owner: "owner",
        repo: "my-repo",
        normalizedUrl: "https://github.com/owner/my-repo",
      },
    },

    // 19-23: Unsupported hosts and lookalike domains
    {
      name: "gitlab.com host",
      input: "https://gitlab.com/owner/project",
      expected: { ok: false, code: "UNSUPPORTED_HOST" },
    },
    {
      name: "bitbucket.org host",
      input: "https://bitbucket.org/owner/repo",
      expected: { ok: false, code: "UNSUPPORTED_HOST" },
    },
    {
      name: "github.io page",
      input: "https://facebook.github.io/react",
      expected: { ok: false, code: "UNSUPPORTED_HOST" },
    },
    {
      name: "lookalike domain github.co",
      input: "https://github.co/fake/repo",
      expected: { ok: false, code: "UNSUPPORTED_HOST" },
    },
    {
      name: "typosquat domain g1thub.com",
      input: "https://g1thub.com/owner/repo",
      expected: { ok: false, code: "UNSUPPORTED_HOST" },
    },

    // 24-25: Only owner without repository
    {
      name: "only owner github.com/owner",
      input: "https://github.com/facebook",
      expected: { ok: false, code: "INVALID_URL" },
    },
    {
      name: "only owner with trailing slash",
      input: "https://github.com/torvalds/",
      expected: { ok: false, code: "INVALID_URL" },
    },

    // 26-28: Reserved GitHub paths
    {
      name: "reserved path /settings",
      input: "https://github.com/settings",
      expected: { ok: false, code: "INVALID_URL" },
    },
    {
      name: "reserved path /marketplace",
      input: "https://github.com/marketplace",
      expected: { ok: false, code: "INVALID_URL" },
    },
    {
      name: "reserved path /features",
      input: "https://github.com/features",
      expected: { ok: false, code: "INVALID_URL" },
    },

    // 29-32: Owner & Repo character validation
    {
      name: "owner starting with hyphen",
      input: "https://github.com/-invalid-owner/repo",
      expected: { ok: false, code: "INVALID_URL" },
    },
    {
      name: "owner ending with hyphen",
      input: "https://github.com/invalid-owner-/repo",
      expected: { ok: false, code: "INVALID_URL" },
    },
    {
      name: "owner with invalid character @",
      input: "https://github.com/user@name/repo",
      expected: { ok: false, code: "INVALID_URL" },
    },
    {
      name: "valid repo with underscores and dots",
      input: "https://github.com/my-org/core_api.v2",
      expected: {
        ok: true,
        owner: "my-org",
        repo: "core_api.v2",
        normalizedUrl: "https://github.com/my-org/core_api.v2",
      },
    },

    // 33-35: Multiline, surrounding spaces, multiple URLs
    {
      name: "surrounding newlines and spaces",
      input: "\n\n   https://github.com/vitejs/vite   \n\n",
      expected: {
        ok: true,
        owner: "vitejs",
        repo: "vite",
        normalizedUrl: "https://github.com/vitejs/vite",
      },
    },
    {
      name: "multiple urls pasted takes first valid one",
      input: "https://github.com/denoland/deno https://github.com/nodejs/node",
      expected: {
        ok: true,
        owner: "denoland",
        repo: "deno",
        normalizedUrl: "https://github.com/denoland/deno",
      },
    },
    {
      name: "random non-url text",
      input: "hello world some random string",
      expected: { ok: false, code: "INVALID_URL" },
    },

    // 36: Over 300 characters
    {
      name: "very long input over 300 chars",
      input: "https://github.com/owner/" + "a".repeat(320),
      expected: { ok: false, code: "INVALID_URL" },
    },
  ];

  testCases.forEach((tc, index) => {
    it(`Case #${index + 1}: ${tc.name}`, () => {
      const res = parseRepoUrl(tc.input);
      if (tc.expected.ok) {
        expect(res.ok).toBe(true);
        if (res.ok) {
          expect(res.owner).toBe(tc.expected.owner);
          expect(res.repo).toBe(tc.expected.repo);
          if (tc.expected.branch) {
            expect(res.branch).toBe(tc.expected.branch);
          }
          expect(res.normalizedUrl).toBe(tc.expected.normalizedUrl);
        }
      } else {
        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.code).toBe(tc.expected.code);
          expect(res.message).toBeTruthy();
        }
      }
    });
  });
});
