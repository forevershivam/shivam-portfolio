import { getAllProjects, type Project } from '@/lib/projects';
import { navLinks, socials } from '@/lib/site';
import type { StackCategory } from '@/components/sections/TechStack';

export type TimelineEntry = { year: string; title: string; organization: string; stat: string; type: string };
export type SkillEntry = { id: string; title: string; description: string; items: string[] };
export type MenuLink = { name: string; href: string; menuOnly?: boolean };
export type PortfolioData = {
  hero: { firstName: string; lastName: string; description: string; typing: string; roles: string[] };
  about: { intro: string; body: string; photoUrl: string };
  timeline: { items: TimelineEntry[] };
  skills: { description: string; services: SkillEntry[]; stack: StackCategory[] };
  projects: { items: Project[] };
  navigation: { links: MenuLink[] };
  socials: { github: string; linkedin: string; instagram: string };
  seo: { title: string; description: string };
  theme: { accent: string };
};
export const editableSections = ['hero', 'about', 'timeline', 'skills', 'projects', 'navigation', 'socials', 'seo', 'theme'] as const;
export type EditableSection = (typeof editableSections)[number];

export const portfolioDefaults: PortfolioData = {
  hero: {
    firstName: 'Shivam',
    lastName: 'Sharma',
    description: 'Fresher Data Analyst who cleans messy records, writes SQL and creates clear Excel dashboards and MIS reports. Currently learning Power BI.',
    typing: '47 WPM typing speed · 98% accuracy',
    roles: ['Back Office Executive', 'MIS Executive', 'Associate Analyst', 'Data Entry'],
  },
  about: {
    intro: 'I am a B.Sc. Life Sciences student developing practical Data Analytics, Excel, SQL and Business Intelligence skills.',
    body: 'I study Botany, Zoology and Chemistry at IGNOU while building hands-on Data Analytics skills.\n\nMy projects include an Excel dashboard covering 52,351 sales records and a 138,000-order retail analytics project using Excel and MySQL.\n\nI focus on data quality, trustworthy metrics and clear business reports. Power BI is in progress.',
    photoUrl: '',
  },
  timeline: { items: [
    { year: 'MAR 2023', title: 'Completed Class 12th', organization: 'Higher Secondary Education', stat: 'Completed Class 12 and began preparing for medical entrance exams.', type: 'Education' },
    { year: '2023–2024', title: 'First NEET Drop', organization: 'NEET Preparation', stat: 'Dedicated the year to NEET preparation; did not secure selection.', type: 'Preparation' },
    { year: '2024–2025', title: 'Second NEET Drop + IPU CET', organization: 'NEET & IPU CET (Paramedical)', stat: 'Continued NEET preparation and appeared for IPU CET Paramedical.', type: 'Preparation' },
    { year: 'MAY 2025', title: 'IPU CET — Rank 552', organization: 'IPU CET (Paramedical)', stat: 'Secured rank 552. Chose not to participate in counselling.', type: 'Achievement' },
    { year: 'JUN 2025', title: 'B.Sc. Life Sciences', organization: 'Indira Gandhi National Open University', stat: 'Joined B.Sc. Life Sciences (Botany, Zoology and Chemistry) while continuing NEET preparation.', type: 'Education' },
    { year: 'JAN 2026', title: 'Concluded NEET Preparation', organization: 'Career Turning Point', stat: 'Decided to move beyond medical entrance preparation and reconsider my career direction.', type: 'Transition' },
    { year: 'AUG 2026', title: 'Switched My Career to Data Analytics', organization: 'A New Professional Direction', stat: 'Began building practical skills in Excel, SQL, MIS Reporting and business analysis.', type: 'Career Switch' },
    { year: '2026–PRESENT', title: 'The Journey Continues...', organization: 'Learning • Building • Growing', stat: 'Developing my Data Analytics, MIS Reporting and Business Intelligence skills while exploring entry-level opportunities.', type: 'Current Chapter' },
  ] },
  skills: {
    description: 'I analyze data with Excel and SQL, prepare MIS reports and am developing Power BI skills to communicate business performance.',
    services: [
      { id: '01', title: 'Data Cleaning & Analysis', description: 'Cleaning, validating and transforming raw data into useful insights.', items: ['Excel', 'SQL', 'Power Query', 'PivotTables'] },
      { id: '02', title: 'MIS & KPI Reporting', description: 'Developing clear performance reports and business metrics.', items: ['MIS Reporting', 'Sales Analysis', 'KPI Monitoring'] },
      { id: '03', title: 'Dashboards & Visualization', description: 'Building easy-to-explore dashboards, charts and data summaries.', items: ['Excel Dashboards', 'Data Visualization', 'Power BI (in progress)'] },
    ],
    stack: [
      { id: 'frontend', title: 'CORE TOOLS', technologies: [{ name:'Microsoft Excel', category:'frontend', icon:'/Services/excel.svg' }, { name:'MySQL / SQL', category:'frontend', icon:'/Services/sql.svg' }, { name:'Power Query', category:'frontend', icon:'/Services/query.svg' }] },
      { id: 'backend', title: 'ANALYSIS', technologies: [{ name:'Data Cleaning', category:'backend', icon:'/Services/analysis.svg' }, { name:'PivotTables', category:'backend', icon:'/Services/excel.svg' }, { name:'Sales Analysis', category:'backend', icon:'/Services/analysis.svg' }] },
      { id: 'database', title: 'REPORTING', technologies: [{ name:'MIS Reporting', category:'database', icon:'/Services/analysis.svg' }, { name:'KPI Reporting', category:'database', icon:'/Services/analysis.svg' }, { name:'Power BI (Learning)', category:'database', icon:'/Services/powerbi.svg' }] },
    ],
  },
  projects: { items: getAllProjects() },
  navigation: { links: navLinks.map(link => ({ ...link })) },
  socials: { github: socials.github.href, linkedin: socials.linkedin.href, instagram: socials.instagram.href },
  seo: { title: 'Shivam Sharma | Data Analytics Portfolio', description: 'Shivam Sharma — Excel dashboards, SQL, data analytics and MIS reporting portfolio.' },
  theme: { accent: '#34D399' },
};

export function mergePortfolio(overrides: Partial<PortfolioData>): PortfolioData {
  const result = { ...portfolioDefaults } as PortfolioData;
  for (const key of editableSections) {
    const value = overrides[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      (result as unknown as Record<string, unknown>)[key] = { ...portfolioDefaults[key], ...value };
    }
  }
  return result;
}
