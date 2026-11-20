import ProjectDetails from '@/components/project/ProjectDetails';
import { getAllProjects } from '@/lib/projects';
import { getPublicPortfolio } from '@/lib/portfolio-supabase';
import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const { projects } = await getPublicPortfolio();
  const project = projects.items.find(p => p.slug === slug);
  if (!project) {
    return {
      title: 'Project Not Found',
    };
  }
  return {
    title: project.title,
    description: project.description,
    openGraph: {
      title: `${project.title} - Shivam Sharma`,
      description: project.description,
      images: [
        {
          url: project.hoverImage || project.images[0],
          width: 1200,
          height: 630,
          alt: project.title,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${project.title} - Shivam Sharma`,
      description: project.description,
      images: [project.hoverImage || project.images[0]],
    },
  };
}
export async function generateStaticParams() {
  const projects = getAllProjects();
  return projects.map((project) => ({
    slug: project.slug,
  }));
}
export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;
  const { projects } = await getPublicPortfolio();
  const project = projects.items.find(p => p.slug === slug);
  if (!project) notFound();
  return <ProjectDetails key={project.slug} project={project} projects={projects.items} />;
}
