import React from 'react';
import type { Metadata } from 'next';
import ProcessSection from '@/components/home/ProcessSection';
import JsonLd from '@/components/seo/JsonLd';
import { breadcrumbSchema } from '@/lib/schema';
import { pageMetadata } from '@/lib/seo';
import { HOW_WE_WORK } from '@/data/homeData';

export const metadata: Metadata = pageMetadata({
    title: 'Our Process, Audit to Execution',
    description:
        'How GKR Hospitality runs an engagement: initial briefing, a clear audit and diagnosis, a practical plan, hands-on project management and measurable results.',
    path: '/how-we-work',
    ogDescription:
        'Initial briefing, audit and diagnosis, practical plan, project management, real results.',
});

export default function HowWeWorkPage() {
    return (
        <div className="bg-[#181818] min-h-screen">
            <JsonLd data={breadcrumbSchema([{ name: 'How We Work', path: '/how-we-work' }])} />
            <h1 className="sr-only">How We Work</h1>
            <ProcessSection steps={HOW_WE_WORK} />
        </div>
    );
}
