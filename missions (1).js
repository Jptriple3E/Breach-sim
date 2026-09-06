// Each mission is a scripted sequence of fictional terminal commands.
// This is a simulation: no real network calls or system access ever happen.
// Commands are matched loosely (case-insensitive, trimmed) against `match`.

const MISSIONS = [
  {
    id: 'm1',
    title: 'Perimeter Recon',
    difficulty: 'Easy',
    points: 100,
    briefing:
      "A fictional shell company, 'Vantage Holdings', has a public-facing server.\nYour task: identify open ports before attempting anything further.",
    steps: [
      {
        match: /^scan\s+(vantage|10\.0\.0\.\d+|target)/i,
        output:
          'Scanning target...\n' +
          'PORT     STATE   SERVICE\n' +
          '22/tcp   open    ssh\n' +
          '80/tcp   open    http\n' +
          '443/tcp  open    https\n' +
          '8080/tcp open    proxy (misconfigured)\n\n' +
          "Notice: 8080 is running an outdated admin proxy. Try 'enum 8080'.",
      },
      {
        match: /^enum\s+8080/i,
        output:
          'Enumerating service on 8080...\n' +
          "Found exposed panel: /admin-legacy/\n" +
          "Default credentials appear unchanged. Try 'login admin:admin123' to test it.",
      },
      {
        match: /^login\s+admin:admin123/i,
        output:
          'Authenticating...\n' +
          'ACCESS GRANTED (simulated)\n\n' +
          'MISSION COMPLETE: Perimeter Recon\n' +
          'Lesson: default credentials on exposed admin panels are one of the most common real-world breaches. Always change defaults and close unused ports.',
        completesMission: true,
      },
    ],
  },
  {
    id: 'm2',
    title: 'The Weak Hash',
    difficulty: 'Medium',
    points: 200,
    briefing:
      "You've obtained a fictional leaked database dump containing password hashes.\nOne user reused a weak, common password. Crack it.",
    steps: [
      {
        match: /^inspect\s+dump/i,
        output:
          'Reading dump.sql...\n' +
          "user: 'r.delgado'  hash: 5f4dcc3b5aa765d61d8327deb882cf99 (MD5)\n" +
          "Notice: MD5 is unsalted and fast to brute force. Try 'crack 5f4dcc3b5aa765d61d8327deb882cf99'.",
      },
      {
        match: /^crack\s+5f4dcc3b5aa765d61d8327deb882cf99/i,
        output:
          'Running dictionary attack (simulated)...\n' +
          "MATCH FOUND: 'password'\n\n" +
          'MISSION COMPLETE: The Weak Hash\n' +
          'Lesson: MD5 is broken for password storage. Real systems should use bcrypt, scrypt, or Argon2 with per-user salts — exactly what this app\'s own login uses.',
        completesMission: true,
      },
    ],
  },
  {
    id: 'm3',
    title: 'Phish Detection',
    difficulty: 'Easy',
    points: 100,
    briefing:
      "An internal fictional email claims to be from IT Support asking for a password reset.\nInvestigate the headers before deciding whether it's legitimate.",
    steps: [
      {
        match: /^inspect\s+headers/i,
        output:
          'From: "IT Support" <it-support@vantage-secure-logins.net>\n' +
          'Reply-To: support-help@mailrelay-free.co\n' +
          "Notice the sending domain does not match Vantage Holdings' real domain. Try 'verify domain'.",
      },
      {
        match: /^verify\s+domain/i,
        output:
          "vantage-secure-logins.net was registered 3 days ago.\n" +
          "This is a phishing attempt (simulated).\n\n" +
          'MISSION COMPLETE: Phish Detection\n' +
          "Lesson: always check the actual sending domain and registration age, not just the display name.",
        completesMission: true,
      },
    ],
  },
];

function getMissionSummaries() {
  return MISSIONS.map(({ id, title, difficulty, points, briefing }) => ({
    id,
    title,
    difficulty,
    points,
    briefing,
    totalSteps: MISSIONS.find((m) => m.id === id).steps.length,
  }));
}

function getMission(id) {
  return MISSIONS.find((m) => m.id === id) || null;
}

module.exports = { MISSIONS, getMissionSummaries, getMission };
