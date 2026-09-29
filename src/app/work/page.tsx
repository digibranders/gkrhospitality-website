'use client';

import React from 'react';

// Sections
import LogosSection from '@/components/common/LogosSection';
import PortfolioSection from '@/components/home/PortfolioSection';

// Data
import {
    PORTFOLIO_PROJECTS
} from '@/data/homeData';

export default function WorkPage() {
    return (
        <div className="bg-[#181818] pt-32 pb-20">
            <h1 className="sr-only">Our Work</h1>
            {/* Portfolio Section - "Our Work" */}
            <div id="our-work">
                <PortfolioSection projects={PORTFOLIO_PROJECTS} />
            </div>



            {/* Logos Section - "Brands we've supported" */}
            <div id="trusted-by" className="bg-[#0f1115]">
                <LogosSection />
            </div>
        </div>
    );
}
