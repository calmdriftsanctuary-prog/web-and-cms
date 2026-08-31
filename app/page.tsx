'use client';

import React, { useState, useEffect } from 'react';
import Script from 'next/script';
import PromoPopup from '@/components/PromoPopup';
import { Sparkles, Star, Send } from 'lucide-react';

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

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon_url?: string;
  is_active: boolean;
}

interface FormField {
  id: string;
  field_name?: string;
  field_label: string;
  field_type?: string;
  options?: string;
  is_required: boolean;
  is_active?: boolean;
  display_order: number;
  is_custom: boolean;
}

export default function HomePage() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [content, setContent] = useState<Record<string, string>>({});
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [bookingFields, setBookingFields] = useState<FormField[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form state
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submittingForm, setSubmittingForm] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/bookings?bookings=true').then((res) => res.json()),
      fetch('/api/gallery').then((res) => res.json()).catch(() => ({ images: [] })),
      fetch('/api/reviews').then((res) => res.json()).catch(() => ({ reviews: [] }))
    ])
      .then(([bookingData, galleryData, reviewData]) => {
        if (bookingData.treatments) setTreatments(bookingData.treatments);
        
        if (bookingData.pageContent) {
          const contentMap: Record<string, string> = {};
          bookingData.pageContent.forEach((item: any) => {
            contentMap[item.key] = item.value;
          });
          setContent(contentMap);
        }

        if (bookingData.socialLinks) {
          setSocialLinks(bookingData.socialLinks.filter((s: SocialLink) => s.is_active));
        }

        // Combine standard configs and custom fields for the booking form
        let standardFields = (bookingData.fieldConfigs || [])
          .filter((f: any) => f.form_type === 'booking' && f.is_active)
          .map((f: any) => ({ ...f, is_custom: false, field_type: 'text' }));
          
        const customFields = (bookingData.customFields || [])
          .filter((f: any) => f.form_type === 'booking')
          .map((f: any) => ({ ...f, is_custom: true, is_active: true, field_name: f.field_label }));

        // Fallback if the database has no fields configured yet
        if (standardFields.length === 0 && customFields.length === 0) {
          standardFields = [
            { id: 'def-1', field_name: 'client_name', field_label: 'Full Name', field_type: 'text', is_required: true, is_custom: false, display_order: 1 },
            { id: 'def-2', field_name: 'client_email', field_label: 'Email Address', field_type: 'email', is_required: true, is_custom: false, display_order: 2 },
            { id: 'def-3', field_name: 'client_phone', field_label: 'Phone Number', field_type: 'tel', is_required: true, is_custom: false, display_order: 3 },
            { id: 'def-4', field_name: 'notes', field_label: 'Special Requests / Notes', field_type: 'textarea', is_required: false, is_custom: false, display_order: 4 }
          ];
        }

        const combined = [...standardFields, ...customFields].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        setBookingFields(combined);

        if (galleryData.images) setGalleryImages(galleryData.images);
        if (reviewData.reviews) setReviews(reviewData.reviews.filter((r: Review) => r.is_visible));
        
        setLoadingInitial(false);
      })
      .catch((err) => {
        console.error('Failed to load initial data', err);
        setLoadingInitial(false);
      });
  }, []);

  const handleFieldChange = (name: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: String(value) }));
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingForm(true);
    setFormError('');

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: formData.client_name || 'Inquiry',
          clientEmail: formData.client_email || 'no-email@provided.com',
          clientPhone: formData.client_phone || 'N/A',
          notes: JSON.stringify(formData),
          is_inquiry: true 
        }),
      });

      if (!res.ok) throw new Error('Failed to send inquiry. Please try again or contact us via social media.');
      
      setFormSuccess(true);
      setFormData({});
    } catch (err: any) {
      setFormError(err.message || 'Something went wrong.');
    } finally {
      setSubmittingForm(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center font-sans text-[#2C332B]">
        <div className="text-xs uppercase tracking-widest text-gray-400">{content.loading_text || 'loading relaxation...'}</div>
      </div>
    );
  }

  const displayedGallery = galleryImages.length > 3 ? [...galleryImages, ...galleryImages] : galleryImages;
  const displayedReviews = reviews.length > 3 ? [...reviews, ...reviews] : reviews;

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#2C332B] font-sans selection:bg-[#693F00] selection:text-white overflow-hidden space-y-8 py-6">
      <Script strategy="afterInteractive" src="https://www.googletagmanager.com/gtag/js?id=G-PGKM31T7FP" />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-PGKM31T7FP', { page_path: window.location.pathname });
          `,
        }}
      />

      <PromoPopup />

      {/* HERO SECTION */}
      <section className="py-6 px-6 max-w-4xl mx-auto text-center space-y-2">
        <div className="flex justify-center mb-1">
          <img src="/logo.png" alt="Sanctuary Logo" className="h-16 w-auto object-contain" />
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

      {/* BOOKING & INQUIRY SECTION */}
      <section id="book" className="py-8 px-6 max-w-4xl mx-auto border-t border-[#E5E7EB]">
        <div className="text-center mb-5">
          <span className="text-xs uppercase tracking-widest text-[#693F00] font-semibold">Begin Your Journey</span>
          <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mt-2 mb-2">
            {content.booking_title || 'Request a Sanctuary Appointment'}
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto text-xs sm:text-sm leading-relaxed">
            {content.booking_subtext || 'To ensure a bespoke and restorative experience, treatments are booked on a personal request basis. Reach out to us via our platforms below or submit an inquiry.'}
          </p>
        </div>

        {/* Dynamic Social Links from CMS */}
        {socialLinks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-6">
            {socialLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-5 rounded-2xl border border-[#E5E7EB] bg-white hover:border-[#693F00] transition flex items-center space-x-4 group shadow-sm"
              >
                <div className="w-12 h-12 rounded-full bg-[#693F00] text-white flex items-center justify-center group-hover:scale-105 transition shrink-0">
                  {link.icon_url ? (
                    <img src={link.icon_url} alt={link.platform} className="w-6 h-6 object-contain filter invert brightness-0" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-0.5">Message on {link.platform}</h3>
                  <p className="text-xs text-gray-500">Tap to open in a new window.</p>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Dynamic CMS Inquiry Form */}
        <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-2xl border shadow-sm mt-6">
          <h3 className="font-serif text-xl text-gray-900 mb-5 text-center border-b pb-4">
            {content.inquiry_heading || 'Or Submit an Inquiry Directly'}
          </h3>
          
          {formSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <Send className="w-6 h-6" />
              </div>
              <h4 className="font-serif text-xl font-bold">Inquiry Sent Successfully</h4>
              <p className="text-sm text-gray-600">Thank you. We will be in touch shortly to confirm availability.</p>
              <button onClick={() => setFormSuccess(false)} className="mt-4 px-6 py-2 bg-[#FAF9F6] border text-xs uppercase rounded-full">Send Another</button>
            </div>
          ) : (
            <form onSubmit={handleInquirySubmit} className="space-y-4">
              {formError && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200">{formError}</div>}
              
              {bookingFields.map((field) => (
                <div key={field.id}>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-700">
                    {field.field_label} {field.is_required && <span className="text-red-500">*</span>}
                  </label>
                  
                  {field.field_type === 'textarea' || field.field_name === 'notes' ? (
                    <textarea
                      required={field.is_required}
                      rows={3}
                      value={formData[field.field_name!] || ''}
                      onChange={(e) => handleFieldChange(field.field_name!, e.target.value)}
                      className="w-full p-2.5 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00] transition"
                    />
                  ) : field.field_type === 'select' && field.options ? (
                    <select
                      required={field.is_required}
                      value={formData[field.field_name!] || ''}
                      onChange={(e) => handleFieldChange(field.field_name!, e.target.value)}
                      className="w-full p-2.5 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00] transition"
                    >
                      <option value="">Select an option...</option>
                      {field.options.split(',').map((opt, i) => (
                        <option key={i} value={opt.trim()}>{opt.trim()}</option>
                      ))}
                    </select>
                  ) : field.field_type === 'checkbox' ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        required={field.is_required}
                        checked={formData[field.field_name!] === 'true'}
                        onChange={(e) => handleFieldChange(field.field_name!, e.target.checked)}
                        className="w-4 h-4 text-[#693F00]"
                      />
                      <span className="text-xs text-gray-600">Yes</span>
                    </div>
                  ) : (
                    <input
                      type={field.field_type || (field.field_name === 'client_email' ? 'email' : field.field_name === 'client_phone' ? 'tel' : 'text')}
                      required={field.is_required}
                      value={formData[field.field_name!] || ''}
                      onChange={(e) => handleFieldChange(field.field_name!, e.target.value)}
                      className="w-full p-2.5 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00] transition"
                    />
                  )}
                </div>
              ))}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submittingForm}
                  className="w-full py-3 bg-[#693F00] text-white text-xs font-semibold uppercase tracking-widest rounded-full hover:bg-[#523100] transition shadow-sm disabled:opacity-50"
                >
                  {submittingForm ? 'Sending Inquiry...' : 'Submit Inquiry'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* TREATMENTS LIST */}
      <section className="py-8 px-6 max-w-5xl mx-auto border-t border-[#E5E7EB]">
        <div className="text-center mb-5">
          <h2 className="font-serif text-2xl sm:text-3xl text-gray-900">Our Signature Treatments</h2>
          <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Bespoke holistic sessions tailored for you</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {treatments.map((t) => (
            <div key={t.id} className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col justify-between space-y-3 hover:border-[#693F00] transition duration-300">
              <div>
                <h3 className="font-serif text-xl text-gray-900 mb-1">{t.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{t.description}</p>
              </div>
              <div className="pt-3 border-t border-[#FAF9F6] flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#693F00]">{t.duration_minutes} mins</span>
                <span className="font-serif text-lg text-gray-900">£{t.price_gbp}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* GALLERY SECTION */}
      {galleryImages.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 space-y-4 border-t border-[#E5E7EB] pt-8">
          <div className="text-center space-y-1">
            <h2 className="font-serif text-2xl sm:text-3xl text-gray-900">{content.gallery_heading || 'Calm Drift Sanctuary Space'}</h2>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{content.gallery_subtext || 'A glimpse into our restorative environment'}</p>
          </div>
          
          <div className="relative w-full overflow-hidden">
            <div className={`flex gap-4 ${galleryImages.length > 3 ? 'animate-marquee' : 'justify-center'}`}>
              {displayedGallery.map((img, idx) => (
                <div key={`${img.id}-${idx}`} className="w-[340px] flex-shrink-0 overflow-hidden rounded-2xl border border-[#E5E7EB] shadow-sm bg-white">
                  <img src={img.image_url} alt={img.caption || 'Calm Drift Sanctuary'} className="w-full h-64 object-cover hover:scale-105 transition duration-500" />
                  {img.caption && <div className="p-2 text-xs text-center text-gray-600">{img.caption}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* REVIEWS SECTION */}
      {reviews.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 space-y-4 border-t border-[#E5E7EB] pt-8 pb-4">
          <div className="text-center space-y-1">
            <h2 className="font-serif text-2xl sm:text-3xl text-gray-900">{content.reviews_heading || 'Client Experiences'}</h2>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{content.reviews_subtext || 'Words from those who have visited our sanctuary'}</p>
          </div>

          <div className="relative w-full overflow-hidden">
            <div className={`flex gap-4 ${reviews.length > 3 ? 'animate-marquee' : 'justify-center'}`}>
              {displayedReviews.map((rev, idx) => (
                <div key={`${rev.id}-${idx}`} className="w-[340px] flex-shrink-0 bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-3 flex flex-col justify-between">
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
      <footer className="py-6 px-6 border-t border-[#E5E7EB] text-center text-xs text-gray-500">
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