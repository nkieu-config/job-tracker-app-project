// Canonicalise skill strings so set-based metrics compare fairly:
// "React.js", "reactjs", "React 18" and "react" all collapse to one token.

const ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  golang: "go",
  postgres: "postgresql",
  psql: "postgresql",
  pg: "postgresql",
  mongo: "mongodb",
  node: "node.js",
  nodejs: "node.js",
  react: "react",
  reactjs: "react",
  "react.js": "react",
  nextjs: "next.js",
  vue: "vue",
  vuejs: "vue",
  "vue.js": "vue",
  tailwind: "tailwindcss",
  k8s: "kubernetes",
  gcp: "google cloud platform",
  aws: "amazon web services",
  ci: "ci/cd",
  cd: "ci/cd",
  restful: "rest apis",
  "rest api": "rest apis",
  "graph ql": "graphql",
  ml: "machine learning",
  nlp: "natural language processing",
};

export function normalizeSkill(raw: string): string {
  let s = raw.trim().toLowerCase();
  s = s.replace(/[()[\]{}.,;:!?"']+$/g, ""); // trailing punctuation (keeps internal ".js")
  s = s.replace(/^[()[\]{}.,;:!?"']+/g, ""); // leading punctuation
  s = s.replace(/\s+/g, " "); // collapse whitespace
  s = s.replace(/\s*[-/]\s*/g, "/"); // "CI / CD" -> "ci/cd"
  s = s.replace(/\s+v?\d+(\.\d+)*$/g, "").trim(); // trailing version: "react 18", "python 3.11"
  return ALIASES[s] ?? s;
}

export function normalizeSet(skills: string[]): Set<string> {
  return new Set(skills.map(normalizeSkill).filter(Boolean));
}
