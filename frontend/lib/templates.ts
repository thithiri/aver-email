export interface RegexValidation {
  regex: string;
  field: string;
}

export interface Template {
  id: string;
  blobId: string;
  name: string;
  description: string;
  regexes: RegexValidation[];
}

export const templates: Template[] = [
  {
    id: 'student-2025',
    blobId: 'nFjY2prUYcspSAVdOzi3B8LKo_PGdo5SfCt9KJGYJaU',
    name: 'Active Student in 2025',
    description: 'Recipient email address ends with .edu, received in 2025',
    regexes: [
      { field: 'recipient', regex: '.*\\.edu$'},
      { field: 'date', regex: '>=2025-01-01' },
    ],
  },
  {
    id: 'mystenlabs-sender',
    blobId: 'icNwGO_6STbBeNLB3mAcb2qelYAk9A3mXMRN_dEncUU',
    name: 'Mysten Labs (Sender)',
    description: 'Sender email address contains @mystenlabs.com',
    regexes: [
      { field: 'sender', regex: '.*@mystenlabs\\.com$'},
    ],
  },
  {
    id: 'main-party-invite',
    blobId: '-BhJKCo6ChCRLii3xfCydwVGD3aeJlMPVEkDGuln_4k',
    name: 'Main Party Invite',
    description: 'Check it is from walrus@aver.email, grab the secret code',
    regexes: [
      { field: 'sender', regex: '^walrus@aver\\.email$'},
      { field: 'subject', regex: 'invitation to "([^"]+)"'},
      { field: 'body', regex: 'your secret code is #([A-Z0-9]{10})'},
    ],
  },
  {
    id: 'after-party-invite',
    blobId: 'eauMBPVTQuvEpMdwoD5zRncFVDcjqDhqOZut6TpXZOc',
    name: 'After Party Invite',
    description: 'Check it is from walrus@aver.email, grab the secret code',
    regexes: [
      { field: 'sender', regex: '^walrus@aver\\.email$'},
      { field: 'subject', regex: 'invitation to "([^"]+)"'},
      { field: 'body', regex: 'your secret code is #([A-Z0-9]{10})'},
    ],
  },
];

export function getTemplateById(id: string): Template | undefined {
  return templates.find(t => t.id === id);
}

