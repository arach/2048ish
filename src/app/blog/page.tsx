'use client';

import { useEffect } from 'react';

// Redirect to the new Astro blog

export default function BlogPage() {
  useEffect(() => {
    // Redirect to the new Astro blog
    window.location.href = '/blog/';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting to blog...</p>
    </div>
  );
}