'use client';

import React from 'react';


// Sections
import TestimonialsSection from '@/components/home/TestimonialsSection';
import CTASection from '@/components/home/CTASection';
import LogosSection from '@/components/common/LogosSection';

// Data
import { TESTIMONIALS } from '@/data/homeData';

export default function ReviewsPage() {
    return (
        <div className="bg-[#181818] pt-32 pb-0">
            <h1 className="sr-only">Reviews</h1>
            {/* Brands We've Supported */}
            <div id="trusted-by" className="bg-[#0f1115]">
                <LogosSection />
            </div>

            {/* Testimonials */}
            <div id="testimonials">
                <TestimonialsSection testimonials={TESTIMONIALS} />
            </div>

            {/* Inquiries */}
            <div id="contact">
                <CTASection />
            </div>
        </div>
    );
}
