'use client';

import React from 'react';
import WhatWeDoSection from '@/components/sections/WhatWeDoSection';
import { SERVICES_DATA } from '@/data/homeData';

export default function WhatWeDoPage() {
    return (
        <div className="bg-[#181818] pt-20">
            <h1 className="sr-only">What We Do</h1>
            <WhatWeDoSection services={SERVICES_DATA} />
        </div>
    );
}
