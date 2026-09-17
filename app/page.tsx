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

        const rawConfigs = bookingData.fieldConfigs || [];
        const configMap = new Map<string, boolean>();
        rawConfigs.forEach((cfg: any) => {
          if (cfg.form_type === 'booking') {
            configMap.set(cfg.field_name, cfg.is_active);
          }
        });

        const defaultDefs = [
          { id: 'def-1', field_name: 'client_name', field_label: 'full name', field_type: 'text', is_required: true, display_order: 1 },
          { id: 'def-2', field_name: 'client_email', field_label: 'email address', field_type: 'email', is_required: true, display_order: 2 },
          { id: 'def-3', field_name: 'client_phone', field_label: 'phone number', field_type: 'tel', is_required: true, display_order: 3 },
          { id: 'def-4', field_name: 'notes', field_label: 'special requests / notes', field_type: 'textarea', is_required: false, display_order: 4 }
        ];

        let standardFields = defaultDefs
          .filter((def) => {
            if (configMap.has(def.field_name)) {
              return configMap.get(def.field_name) === true;
            }
            return true;
          })
          .map((def) => {
            const match = rawConfigs.find((c: any) => c.form_type === 'booking' && c.field_name === def.field_name);
            return {
              ...def,
              field_label: match?.field_label ? match.field_label.toLowerCase() : def.field_label,
              is_required: match?.is_required !== undefined ? match.is_required : def.is_required,
              display_order: match?.display_order !== undefined ? match.display_order : def.display_order,
              is_custom: false
            };
          });
          
        const customFields = (bookingData.customFields || [])
          .filter((f: any) => f.form_type === 'booking')
          .map((f: any) => ({ ...f, is_custom: true, is_active: true, field_name: f.field_label, field_label: f.field_label.toLowerCase() }));

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

  const handleenquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingForm(true);
    setFormError('');

    const clientName = formData.client_name || formData['full name'] || 'enquiry client';
    const clientEmail = formData.client_email || formData['email address'] || '';
    const clientPhone = formData.client_phone || formData['phone number'] || '';

    if (!clientEmail) {
      setFormError('please provide a valid email address.');
      setSubmittingForm(false);
      return;
    }

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName,
          clientEmail: clientEmail,
          clientPhone: clientPhone,
          notes: JSON.stringify(formData),
          is_enquiry: true,
          isAdminBypass: true
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed to send enquiry.');
      
      setFormSuccess(true);
      setFormData({});
    } catch (err: any) {
      setFormError(err.message || 'something went wrong.');
    } finally {
      setSubmittingForm(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center font-sans text-[#2C332B]">
        <div className="text-xs lowercase tracking-widest text-gray-400">{content.loading_text ? content.loading_text.toLowerCase() : 'loading relaxation...'}</div>
      </div>
    );
  }

  const displayedGallery = galleryImages;
  const displayedReviews = reviews;

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#2C332B] font-sans selection:bg-[#693F00] selection:text-white overflow-x-hidden space-y-8 py-6">
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

      <section className="py-6 px-6 max-w-4xl mx-auto text-center space-y-3">
        <div className="flex justify-center mb-1">
          <img src="/logo.png" alt="sanctuary logo" className="h-16 w-auto object-contain" />
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl text-gray-900 font-bold tracking-tight lowercase">
          {content.hero_heading ? content.hero_heading.toLowerCase() : 'rest, restore, and reconnect.'}
        </h1>
        <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto font-light leading-relaxed lowercase">
          {content.hero_subtext ? content.hero_subtext.toLowerCase() : 'tailored massages and holistic rituals designed to ease tension and bring balance to your wellbeing.'}
        </p>
      </section>

      <section id="book" className="py-8 px-6 max-w-4xl mx-auto border-t border-[#E5E7EB]">
        <div className="text-center mb-5">
          <span className="text-xs lowercase tracking-widest text-[#693F00] font-semibold">begin your journey</span>
          <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mt-2 mb-2 lowercase">
            {content.booking_title ? content.booking_title.toLowerCase() : 'request a sanctuary appointment'}
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto text-xs sm:text-sm leading-relaxed lowercase">
            {content.booking_subtext ? content.booking_subtext.toLowerCase() : 'to ensure a bespoke and restorative experience, treatments are booked on a personal request basis.'}
          </p>
        </div>

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
                <div className="lowercase">
                  <h3 className="font-medium text-gray-900 mb-0.5">message on {link.platform.toLowerCase()}</h3>
                  <p className="text-xs text-gray-500">tap to open in a new window.</p>
                </div>
              </a>
            ))}
          </div>
        )}

        <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-2xl border shadow-sm mt-6">
          <h3 className="font-serif text-xl text-gray-900 mb-5 text-center border-b pb-4 lowercase">
            {content.enquiry_heading ? content.enquiry_heading.toLowerCase() : 'or submit an enquiry directly'}
          </h3>
          
          {formSuccess ? (
            <div className="text-center py-6 space-y-4 lowercase">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <Send className="w-6 h-6" />
              </div>
              <h4 className="font-serif text-xl font-bold">enquiry sent successfully</h4>
              <p className="text-sm text-gray-600">thank you. we will be in touch shortly to confirm availability.</p>
              <button onClick={() => setFormSuccess(false)} className="mt-4 px-6 py-2 bg-[#FAF9F6] border text-xs lowercase rounded-full">send another</button>
            </div>
          ) : (
            <form onSubmit={handleenquirySubmit} className="space-y-4">
              {formError && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200 lowercase">{formError}</div>}
              
              {bookingFields.map((field) => (
                <div key={field.id}>
                  <label className="block text-xs font-semibold lowercase tracking-wider mb-1 text-gray-700">
                    {field.field_label} {field.is_required && <span className="text-red-500">*</span>}
                  </label>
                  
                  {field.field_type === 'textarea' || field.field_name === 'notes' ? (
                    <textarea
                      required={field.is_required}
                      rows={3}
                      value={formData[field.field_name!] || ''}
                      onChange={(e) => handleFieldChange(field.field_name!, e.target.value)}
                      className="w-full p-2.5 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00] transition lowercase"
                    />
                  ) : field.field_type === 'select' && field.options ? (
                    <select
                      required={field.is_required}
                      value={formData[field.field_name!] || ''}
                      onChange={(e) => handleFieldChange(field.field_name!, e.target.value)}
                      className="w-full p-2.5 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00] transition lowercase"
                    >
                      <option value="">select an option...</option>
                      {field.options.split(',').map((opt, i) => (
                        <option key={i} value={opt.trim()}>{opt.trim().toLowerCase()}</option>
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
                      <span className="text-xs text-gray-600 lowercase">yes</span>
                    </div>
                  ) : (
                    <input
                      type={field.field_type || (field.field_name === 'client_email' ? 'email' : field.field_name === 'client_phone' ? 'tel' : 'text')}
                      required={field.is_required}
                      value={formData[field.field_name!] || ''}
                      onChange={(e) => handleFieldChange(field.field_name!, e.target.value)}
                      className="w-full p-2.5 border rounded-xl text-sm bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#693F00] transition lowercase"
                    />
                  )}
                </div>
              ))}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submittingForm}
                  className="w-full py-3 bg-[#693F00] text-white text-xs font-semibold lowercase tracking-widest rounded-full hover:bg-[#523100] transition shadow-sm disabled:opacity-50"
                >
                  {submittingForm ? 'sending enquiry...' : 'submit enquiry'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      <section className="py-8 px-6 max-w-5xl mx-auto border-t border-[#E5E7EB]">
        <div className="text-center mb-5">
          <h2 className="font-serif text-2xl sm:text-3xl text-gray-900 lowercase">our signature treatments</h2>
          <p className="text-xs text-gray-500 lowercase tracking-wider mt-1">bespoke holistic sessions tailored for you</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {treatments.map((t) => (
            <div key={t.id} className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col justify-between space-y-3 hover:border-[#693F00] transition duration-300">
              <div className="lowercase">
                <h3 className="font-serif text-xl text-gray-900 mb-1">{t.title.toLowerCase()}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{t.description.toLowerCase()}</p>
              </div>
              <div className="pt-3 border-t border-[#FAF9F6] flex items-center justify-between lowercase">
                <span className="text-xs font-semibold tracking-wider text-[#693F00]">{t.duration_minutes} mins</span>
                <span className="font-serif text-lg text-gray-900">£{t.price_gbp}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {galleryImages.length > 0 && (
        <section className="border-t border-[#E5E7EB] pt-8">
          <div className="max-w-6xl mx-auto px-4 text-center space-y-1 mb-4 lowercase">
            <h2 className="font-serif text-2xl sm:text-3xl text-gray-900">{content.gallery_heading ? content.gallery_heading.toLowerCase() : 'calm drift sanctuary space'}</h2>
            <p className="text-xs text-gray-500 tracking-wider">{content.gallery_subtext ? content.gallery_subtext.toLowerCase() : 'a glimpse into our restorative environment'}</p>
          </div>
          
          <div className="w-full overflow-x-auto pb-4 pt-2 scrollbar-none">
            <div className="flex gap-4 px-6 md:justify-center w-max mx-auto">
              {displayedGallery.map((img) => (
                <div key={img.id} className="w-[300px] sm:w-[340px] flex-shrink-0 overflow-hidden rounded-2xl border border-[#E5E7EB] shadow-sm bg-white">
                  <img src={img.image_url} alt={img.caption || 'calm drift sanctuary'} className="w-full h-64 object-cover hover:scale-105 transition duration-500" />
                  {img.caption && <div className="p-2 text-xs text-center text-gray-600 lowercase">{img.caption.toLowerCase()}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {reviews.length > 0 && (
        <section className="border-t border-[#E5E7EB] pt-8 pb-4">
          <div className="max-w-5xl mx-auto px-4 text-center space-y-1 mb-4 lowercase">
            <h2 className="font-serif text-2xl sm:text-3xl text-gray-900">{content.reviews_heading ? content.reviews_heading.toLowerCase() : 'client experiences'}</h2>
            <p className="text-xs text-gray-500 tracking-wider">{content.reviews_subtext ? content.reviews_subtext.toLowerCase() : 'words from those who have visited our sanctuary'}</p>
          </div>

          <div className="w-full overflow-x-auto pb-4 pt-2 scrollbar-none">
            <div className="flex gap-4 px-6 md:justify-center w-max mx-auto">
              {displayedReviews.map((rev) => (
                <div key={rev.id} className="w-[300px] sm:w-[340px] flex-shrink-0 bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-3 flex flex-col justify-between">
                  <div className="space-y-2 lowercase">
                    <div className="flex text-amber-500">
                      {[...Array(rev.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700 italic leading-relaxed">"{rev.comment.toLowerCase()}"</p>
                  </div>
                  <div className="text-xs font-semibold tracking-wider text-[#693F00] lowercase">
                    — {rev.client_name.toLowerCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="py-6 px-6 border-t border-[#E5E7EB] text-center text-xs text-gray-500 lowercase">
        <p>© {new Date().getFullYear()} calm drift sanctuary. all rights reserved.</p>
      </footer>

      <style jsx global>{`
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </main>
  );
}