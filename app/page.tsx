'use client';

import React, { useState, useEffect } from 'react';
import Script from 'next/script';
import PromoPopup from '@/components/PromoPopup';
import { Sparkles, Star } from 'lucide-react';

interface Treatment {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  price_gbp: number;
}

interface GalleryImage {
  id: string;
  image_url: string;
  caption?: string;
}

interface Review {
  id: string;
  client_name: string;
  rating: number;
  comment: string;
  is_visible: boolean;
}

export default function HomePage() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [content, setContent] = useState<Record<string, string>>({});
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/bookings?bookings=true').then((res) => res.json()),
      fetch('/api/gallery').then((res) => res.json()).catch(() => ({ images: [] })),
      fetch('/api/reviews').then((res) => res.json()).catch(() => ({ reviews: [] }))
    ])
      .then(([bookingData, galleryData, reviewData]) => {
        if (bookingData.treatments && bookingData.treatments.length > 0) {
          setTreatments(bookingData.treatments);
        }
        if (bookingData.pageContent) {
          const contentMap: Record<string, string> = {};
          bookingData.pageContent.forEach((item: any) => {
            contentMap[item.key] = item.value;
          });
          setContent(contentMap);
        }
        if (galleryData.images) {
          setGalleryImages(galleryData.images);
        }
        if (reviewData.reviews) {
          setReviews(reviewData.reviews.filter((r: Review) => r.is_visible));
        }
        setLoadingInitial(false);
      })
      .catch((err) => {
        console.error('Failed to load initial data', err);
        setLoadingInitial(false);
      });
  }, []);

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center font-sans text-[#2C332B]">
        <div className="text-xs uppercase tracking-widest text-gray-400">Loading Sanctuary...</div>
      </div>
    );
  }

  const displayedGallery = galleryImages.length > 3 ? [...galleryImages, ...galleryImages] : galleryImages;
  const displayedReviews = reviews.length > 3 ? [...reviews, ...reviews] : reviews;

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#2C332B] font-sans selection:bg-[#693F00] selection:text-white overflow-hidden space-y-16 py-12">
      {/* Google Analytics GA4 */}
      <Script
        strategy="afterInteractive"
        src="https://www.googletagmanager.com/gtag/js?id=G-PGKM31T7FP"
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-PGKM31T7FP', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />

      <PromoPopup />

      {/* HERO SECTION */}
      <section className="py-12 px-6 max-w-4xl mx-auto text-center space-y-4">
        <div className="flex justify-center mb-2">
          <img 
            src="/logo.png" 
            alt="Sanctuary Logo" 
            className="h-16 w-auto object-contain" 
          />
        </div>
        <span className="inline-flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-widest text-[#693F00]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Calm Drift Sanctuary</span>
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl text-gray-900 font-bold tracking-tight">
          {content.hero_heading || 'rest, restore, and reconnect.'}
        </h1>
        <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto font-light leading-relaxed">
          {content.hero_subtext || 'Tailored massages and holistic rituals designed to ease tension and bring balance to your wellbeing.'}
        </p>
      </section>

      {/* TREATMENTS LIST */}
      <section className="py-12 px-6 max-w-5xl mx-auto border-t border-[#E5E7EB]">
        <div className="text-center mb-10">
          <h2 className="font-serif text-2xl sm:text-3xl text-gray-900">Our Signature Treatments</h2>
          <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Bespoke holistic sessions tailored for you</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {treatments.map((t) => (
            <div key={t.id} className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-serif text-xl text-gray-900 mb-1">{t.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{t.description}</p>
              </div>
              <div className="pt-4 border-t border-[#FAF9F6] flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#693F00]">{t.duration_minutes} mins</span>
                <span className="font-serif text-lg text-gray-900">£{t.price_gbp}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SOCIAL-FIRST BOOKING & INQUIRY SECTION */}
      <section id="book" className="py-16 px-6 max-w-4xl mx-auto text-center border-t border-[#E5E7EB]">
        <span className="text-xs uppercase tracking-widest text-[#693F00] font-semibold">Begin Your Journey</span>
        <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mt-2 mb-3">
          {content.booking_title || 'Request a Sanctuary Appointment'}
        </h2>
        <p className="text-gray-600 max-w-xl mx-auto mb-10 text-xs sm:text-sm leading-relaxed">
          {content.booking_subtext || 'To ensure a bespoke and restorative experience, all treatments are booked on a personal request basis. Reach out to us directly on social media to check availability for your preferred date and time.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Instagram DM Option */}
          <a
            href="https://instagram.com/calmdriftsanctuary"
            target="_blank"
            rel="noopener noreferrer"
            className="p-8 rounded-2xl border border-[#E5E7EB] bg-white hover:border-[#693F00] transition flex flex-col items-center text-center group shadow-sm"
          >
            <div className="w-12 h-12 rounded-full bg-[#693F00] text-white flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Message on Instagram</h3>
            <p className="text-xs text-gray-500">Chat with us directly in DMs to request your preferred date.</p>
          </a>

          {/* Facebook Option */}
          <a
            href="https://facebook.com/calmdriftsanctuary"
            target="_blank"
            rel="noopener noreferrer"
            className="p-8 rounded-2xl border border-[#E5E7EB] bg-white hover:border-[#693F00] transition flex flex-col items-center text-center group shadow-sm"
          >
            <div className="w-12 h-12 rounded-full bg-[#693F00] text-white flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.371 14.5 5 15.5 5H18V0h-3.808C10.5 0 9 1.583 9 4.615V8z"/>
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Message on Facebook</h3>
            <p className="text-xs text-gray-500">Send us a message on Messenger to secure your personalised slot.</p>
          </a>
        </div>
      </section>

      {/* GALLERY SECTION */}
      {galleryImages.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 space-y-6 border-t border-[#E5E7EB] pt-12">
          <div className="text-center space-y-1">
            <h2 className="font-serif text-2xl sm:text-3xl text-gray-900">{content.gallery_heading || 'Calm Drift Sanctuary Space'}</h2>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{content.gallery_subtext || 'A glimpse into our restorative environment'}</p>
          </div>
          
          <div className="relative w-full overflow-hidden">
            <div className={`flex gap-6 ${galleryImages.length > 3 ? 'animate-marquee' : 'justify-center'}`}>
              {displayedGallery.map((img, idx) => (
                <div key={`${img.id}-${idx}`} className="w-[340px] flex-shrink-0 overflow-hidden rounded-2xl border border-[#E5E7EB] shadow-sm bg-white">
                  <img src={img.image_url} alt={img.caption || 'Calm Drift Sanctuary'} className="w-full h-64 object-cover hover:scale-105 transition duration-500" />
                  {img.caption && <div className="p-3 text-xs text-center text-gray-600">{img.caption}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* REVIEWS SECTION */}
      {reviews.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 space-y-6 border-t border-[#E5E7EB] pt-12 pb-6">
          <div className="text-center space-y-1">
            <h2 className="font-serif text-2xl sm:text-3xl text-gray-900">{content.reviews_heading || 'Client Experiences'}</h2>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{content.reviews_subtext || 'Words from those who have visited our sanctuary'}</p>
          </div>

          <div className="relative w-full overflow-hidden">
            <div className={`flex gap-6 ${reviews.length > 3 ? 'animate-marquee' : 'justify-center'}`}>
              {displayedReviews.map((rev, idx) => (
                <div key={`${rev.id}-${idx}`} className="w-[340px] flex-shrink-0 bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex text-amber-500">
                      {[...Array(rev.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700 italic leading-relaxed">"{rev.comment}"</p>
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#693F00]">
                    — {rev.client_name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="py-8 px-6 border-t border-[#E5E7EB] text-center text-xs text-gray-500">
        <p>© {new Date().getFullYear()} Calm Drift Sanctuary. All rights reserved.</p>
      </footer>

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee 35s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </main>
  );
}