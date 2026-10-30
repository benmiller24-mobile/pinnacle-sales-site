// Pinnacle Sales team as shown on /about/. One entry per person; a rep or territory
// change is a one-line edit here. `territory` uses state codes from src/data/footprint.ts.
// Photos live in /public/images/team/; without one, the card shows initials.

export interface TeamMember {
  name: string;
  title: string;
  territory: string;
  email: string;
  photo?: string;
}

export const TEAM: TeamMember[] = [
  { name: 'Scott Miller', title: 'Principal', territory: 'AZ, ID, MT', email: 'scott@pinnaclesales.biz', photo: '/images/team/scott-miller.jpg' },
  { name: 'Ben Miller', title: 'Partner', territory: 'CA, NV', email: 'ben@pinnaclesales.biz', photo: '/images/team/ben-miller.jpg' },
  { name: 'Kara Hayes', title: 'Territory Sales Manager', territory: 'CO', email: 'kara@pinnaclesales.biz' },
  { name: 'Josh Polvogt', title: 'Territory Sales & Marketing Manager', territory: 'WA, OR', email: 'josh@pinnaclesales.biz', photo: '/images/team/josh-polvogt.jpg' },
  { name: 'Gillian Patriquin', title: 'Dealer & Training Specialist', territory: 'All territories', email: 'gillian@pinnaclesales.biz', photo: '/images/team/gillian-patriquin.jpg' },
];

export const initials = (name: string) => name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
