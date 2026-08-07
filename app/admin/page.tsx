'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Trash2, Send, Plus, RefreshCw, XCircle, ArrowUp, ArrowDown } from 'lucide-react';

interface Booking {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  start_time: string;
  end_time: string;
  notes: string;
  status: string;
  marketing_opt_in?: boolean;
  marketing_opt_in_at?: string;
  treatments?: {
    id: string;
    title: string;
    duration_minutes: number;
    price_gbp: number;
  };
  consultations?: {
    id: string;
    medical_conditions: string;
    allergies: string;
    pressure_preference: string;
    emergency_contact: string;
    created_at: string;
  }[];
}

interface Treatment {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  price_gbp: number;
}

interface Review {
  id: string;
  client_name: string;
  client_email?: string;
  rating: number;
  comment: string;
  is_visible: boolean;
  created_at: string;
}

interface PopupConfig {
  id?: string;
  is_active: boolean;
  title: string;
  description: string;
  button_text: string;
  link_url: string;
}

interface GalleryItem {
  id: string;
  title: string;
  image_url: string;
  display_order: number;
}

interface SocialLinkItem {
  id: string;
  platform: string;
  url: string;
  icon_url: string;
  is_active: boolean;
  display_order: number;
}

interface CustomField {
  id: string;
  form_type: string;
  field_label: string;
  field_type: string;
  options: string;
  is_required: boolean;
  display_order?: number;
}

interface FieldConfig {
  id: string;
  form_type: string;
  field_name: string;
  field_label: string;
  is_required: boolean;
  is_active: boolean;
  display_order?: number;
}

interface SiteTemplate {
  key: string;
  title?: string;
  subject?: string;
  content: string;
  button_text?: string;
  button_url?: string;
}

const DEFAULT_TEMPLATES: Record<string, { subject: string; content: string; button_text: string }> = {
  confirmation_email: {
    subject: 'Your Sanctuary Appointment Confirmed',
    content: 'Dear [Client Name],\n\nYour appointment for [Treatment Title] on [Date & Time] has been officially confirmed. We look forward to welcoming you.',
    button_text: 'Complete Digital Consultation'
  },
  reschedule_email: {
    subject: 'Appointment Rescheduled - Sanctuary',
    content: 'Dear [Client Name],\n\nYour appointment has been successfully rescheduled to a new time slot.',
    button_text: 'View Booking Details'
  },
  cancellation_email: {
    subject: 'Appointment Cancelled - Sanctuary',
    content: 'Dear [Client Name],\n\nWe are writing to confirm that your appointment has been cancelled.',
    button_text: 'Book New Session'
  },
  consultation_email: {
    subject: 'Please Complete Your Sanctuary Consultation Form',
    content: 'Dear [Client Name],\n\nAs part of your preparation for your upcoming visit, please complete your intake consultation form securely online prior to arrival.',
    button_text: 'Complete Consultation Form'
  },
  review_email: {
    subject: 'Thank you for visiting Calm Drift Sanctuary',
    content: 'Dear [Client Name],\n\nWe hope you enjoyed your restorative experience with us. We would love to hear your feedback.',
    button_text: 'Leave a Review'
  },
  booking_thankyou: {
    subject: 'Thank you for your reservation',
    content: 'Thank you for booking with Calm Drift Sanctuary.',
    button_text: 'Return to Home'
  },
  consultation_thankyou: {
    subject: 'Consultation Submitted Successfully',
    content: 'Thank you for submitting your consultation form. Our practitioners have received your details.',
    button_text: 'Close Window'
  }
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'appointments' | 'crm' | 'cms' | 'popup' | 'gallery' | 'social' | 'content' | 'templates' | 'forms' | 'reviews' | 'reports'>('appointments');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([]);
  const [templates, setTemplates] = useState<SiteTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const [selectedClientEmail, setSelectedClientEmail] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<{ name: string; email: string; phone: string } | null>(null);

  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  const [popupConfig, setPopupConfig] = useState<PopupConfig>({
    is_active: false,
    title: 'Exclusive Offer',
    description: 'Enjoy 15% off your first sanctuary experience.',
    button_text: 'Claim Offer',
    link_url: '#',
  });

  const [heroHeading, setHeroHeading] = useState('rest, restore, and reconnect.');
  const [heroSubtext, setHeroSubtext] = useState('Tailored massages and holistic rituals designed to ease tension.');
  const [bookingTitle, setBookingTitle] = useState('reserve your session');
  const [bookingSubtext, setBookingSubtext] = useState('Select a holistic treatment below to begin your reservation.');
  const [galleryHeading, setGalleryHeading] = useState('Sanctuary Gallery');
  const [gallerySubtext, setGallerySubtext] = useState('A glimpse into our restorative space');
  const [reviewsHeading, setReviewsHeading] = useState('Client Experiences');
  const [reviewsSubtext, setReviewsSubtext] = useState('Words from those who have visited our sanctuary');
  const [savingContent, setSavingContent] = useState(false);

  const [editingTreatment, setEditingTreatment] = useState<Partial<Treatment> | null>(null);

  const [newImageTitle, setNewImageTitle] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [savingGallery, setSavingGallery] = useState(false);

  const [newPlatform, setNewPlatform] = useState('');
  const [newSocialUrl, setNewSocialUrl] = useState('');
  const [newIconUrl, setNewIconUrl] = useState('');
  const [savingSocial, setSavingSocial] = useState(false);

  // Form Builder State
  const [formTypeTab, setFormTypeTab] = useState<'booking' | 'consultation'>('booking');
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [fieldOptions, setFieldOptions] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [editingDefaultField, setEditingDefaultField] = useState<FieldConfig | null>(null);

  const [editingTemplateKey, setEditingTemplateKey] = useState('confirmation_email');
  const [templateSubject, setTemplateSubject] = useState(DEFAULT_TEMPLATES.confirmation_email.subject);
  const [templateContent, setTemplateContent] = useState(DEFAULT_TEMPLATES.confirmation_email.content);
  const [templateButtonText, setTemplateButtonText] = useState(DEFAULT_TEMPLATES.confirmation_email.button_text);
  const [templateButtonUrl, setTemplateButtonUrl] = useState('');

  const loadData = () => {
    setLoading(true);
    fetch('/api/admin/bookings?bookings=true')
      .then((res) => res.json())
      .then((data) => {
        const fetchedBookings = (data.bookings || []).map((b: any) => {
          const hasOptInExplicit = b.marketing_opt_in === true || b.marketing_opt_in === 1 || b.marketing_opt_in === 'true';
          const hasOptInNote = typeof b.notes === 'string' && b.notes.toLowerCase().includes('marketing opt-in: yes');
          return {
            ...b,
            marketing_opt_in: hasOptInExplicit || hasOptInNote,
          };
        });
        setBookings(fetchedBookings);
        setTreatments(data.treatments || []);
        if (data.popup) setPopupConfig(data.popup);
        setGallery(data.gallery || []);
        setSocialLinks(data.socialLinks || []);
        setCustomFields(data.customFields || []);
        setFieldConfigs(data.fieldConfigs || []);
        
        const loadedTemplates = data.templates || [];
        setTemplates(loadedTemplates);

        const contentMap = (data.pageContent || []).reduce((acc: any, item: any) => {
          acc[item.key] = item.value;
          return acc;
        }, {});
        if (contentMap.hero_heading !== undefined) setHeroHeading(contentMap.hero_heading);
        if (contentMap.hero_subtext !== undefined) setHeroSubtext(contentMap.hero_subtext);
        if (contentMap.booking_title !== undefined) setBookingTitle(contentMap.booking_title);
        if (contentMap.booking_subtext !== undefined) setBookingSubtext(contentMap.booking_subtext);
        if (contentMap.gallery_heading !== undefined) setGalleryHeading(contentMap.gallery_heading);
        if (contentMap.gallery_subtext !== undefined) setGallerySubtext(contentMap.gallery_subtext);
        if (contentMap.reviews_heading !== undefined) setReviewsHeading(contentMap.reviews_heading);
        if (contentMap.reviews_subtext !== undefined) setReviewsSubtext(contentMap.reviews_subtext);

        const activeTmpl = loadedTemplates.find((t: any) => t.key === editingTemplateKey);
        const defaults = DEFAULT_TEMPLATES[editingTemplateKey] || { subject: '', content: '', button_text: '' };
        
        setTemplateSubject(activeTmpl?.subject || defaults.subject);
        setTemplateContent(activeTmpl?.content || defaults.content);
        setTemplateButtonText(activeTmpl?.button_text || defaults.button_text);
        setTemplateButtonUrl(activeTmpl?.button_url || '');

        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load admin data:', err);
        setLoading(false);
      });

    fetch('/api/reviews')
      .then((res) => res.json())
      .then((data) => {
        if (data.reviews) setReviews(data.reviews);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTemplateChange = (key: string) => {
    setEditingTemplateKey(key);
    const found = templates.find((t) => t.key === key);
    const defaults = DEFAULT_TEMPLATES[key] || { subject: '', content: '', button_text: '' };

    setTemplateSubject(found?.subject || defaults.subject);
    setTemplateContent(found?.content || defaults.content);
    setTemplateButtonText(found?.button_text || defaults.button_text);
    setTemplateButtonUrl(found?.button_url || '');
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      type: 'template',
      key: editingTemplateKey,
      subject: templateSubject,
      content: templateContent,
      button_text: templateButtonText,
      button_url: templateButtonUrl,
    };

    const res = await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      alert('Email template updated successfully!');
    } else {
      alert('Failed to update email template.');
    }
  };

  const clientsMap = bookings.reduce((acc, booking) => {
    const email = booking.client_email.toLowerCase();
    if (!acc[email]) {
      acc[email] = {
        name: booking.client_name,
        email: booking.client_email,
        phone: booking.client_phone,
        marketingOptIn: !!booking.marketing_opt_in,
        marketingOptInAt: booking.marketing_opt_in_at,
        bookings: [],
        consultations: [],
        totalSpend: 0,
      };
    }
    acc[email].bookings.push(booking);
    if (booking.status !== 'cancelled') {
      acc[email].totalSpend += booking.treatments?.price_gbp || 0;
    }
    if (booking.marketing_opt_in) {
      acc[email].marketingOptIn = true;
      acc[email].marketingOptInAt = booking.marketing_opt_in_at || acc[email].marketingOptInAt;
    }
    if (booking.consultations && booking.consultations.length > 0) {
      acc[email].consultations.push(...booking.consultations);
    }
    return acc;
  }, {} as Record<string, { name: string; email: string; phone: string; marketingOptIn: boolean; marketingOptInAt?: string; bookings: Booking[]; consultations: any[]; totalSpend: number }>);

  const clientsList = Object.values(clientsMap);
  const selectedClient = selectedClientEmail ? clientsMap[selectedClientEmail.toLowerCase()] : null;

  const handleSaveClientDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !selectedClientEmail) return;

    await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'update_client_profile',
        old_email: selectedClientEmail,
        new_name: editingClient.name,
        new_email: editingClient.email,
        new_phone: editingClient.phone,
      }),
    });

    setSelectedClientEmail(editingClient.email);
    setEditingClient(null);
    loadData();
    alert('Client profile updated successfully!');
  };

  const handleSendConsultationEmail = async (clientEmail: string, clientName: string) => {
    if (!confirm(`Send consultation intake form request email to ${clientName} (${clientEmail})?`)) return;
    await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'send_consultation_email', email: clientEmail, name: clientName }),
    });
    alert('Consultation form email sent successfully!');
  };

  const handleSaveTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTreatment) return;

    const res = await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingTreatment),
    });

    if (res.ok) {
      setEditingTreatment(null);
      loadData();
    } else {
      alert('Failed to save treatment.');
    }
  };

  const handleDeleteTreatment = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    const res = await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'delete_treatment', id }),
    });

    if (res.ok) {
      loadData();
    } else {
      alert('Failed to delete treatment.');
    }
  };

  const handleSavePopup = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'site_popup', ...popupConfig }),
    });
    alert('Promotional Popup settings updated!');
    loadData();
  };

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingContent(true);
    try {
      const keys = [
        { key: 'hero_heading', value: heroHeading },
        { key: 'hero_subtext', value: heroSubtext },
        { key: 'booking_title', value: bookingTitle },
        { key: 'booking_subtext', value: bookingSubtext },
        { key: 'gallery_heading', value: galleryHeading },
        { key: 'gallery_subtext', value: gallerySubtext },
        { key: 'reviews_heading', value: reviewsHeading },
        { key: 'reviews_subtext', value: reviewsSubtext },
      ];

      for (const item of keys) {
        await fetch('/api/admin/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'page_content', key: item.key, value: item.value }),
        });
      }

      alert('Website copy updated successfully!');
      loadData();
    } finally {
      setSavingContent(false);
    }
  };

  const handleAddGalleryImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageUrl) return;

    setSavingGallery(true);
    try {
      await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'gallery_image', title: newImageTitle || 'Sanctuary Space', image_url: newImageUrl }),
      });
      setNewImageTitle('');
      setNewImageUrl('');
      loadData();
    } finally {
      setSavingGallery(false);
    }
  };

  const handleDeleteGalleryImage = async (id: string) => {
    if (!confirm('Remove this image?')) return;
    await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'delete_gallery_image', id }),
    });
    loadData();
  };

  const handleAddSocialLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlatform || !newSocialUrl) return;

    setSavingSocial(true);
    try {
      await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'social_link', platform: newPlatform, url: newSocialUrl, icon_url: newIconUrl, is_active: true }),
      });
      setNewPlatform('');
      setNewSocialUrl('');
      setNewIconUrl('');
      loadData();
    } finally {
      setSavingSocial(false);
    }
  };

  const handleToggleSocial = async (link: SocialLinkItem) => {
    await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'social_link', ...link, is_active: !link.is_active }),
    });
    loadData();
  };

  const handleDeleteSocialLink = async (id: string) => {
    if (!confirm('Remove this social link?')) return;
    await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'delete_social_link', id }),
    });
    loadData();
  };

  // Form Builder Handlers
  const handleAddCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldLabel) return;
    await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        type: 'custom_field', 
        form_type: formTypeTab, 
        field_label: fieldLabel, 
        field_type: fieldType, 
        options: fieldOptions, 
        is_required: isRequired,
        display_order: customFields.length + 10
      }),
    });
    setFieldLabel('');
    setFieldOptions('');
    setIsRequired(false);
    loadData();
  };

  const handleDeleteCustomField = async (id: string) => {
    if (!confirm('Delete this custom field?')) return;
    await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'delete_custom_field', id }),
    });
    loadData();
  };

  const handleSaveDefaultFieldConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDefaultField) return;
    await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'field_config', ...editingDefaultField }),
    });
    setEditingDefaultField(null);
    loadData();
    alert('Field configuration updated successfully!');
  };

  const handleMoveField = async (id: string, type: 'default' | 'custom', direction: 'up' | 'down') => {
    const list = type === 'default' ? [...filteredDefaultFields] : [...filteredCustomFields];
    const index = list.findIndex((item) => item.id === id);
    if (index < 0) return;

    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === list.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const updated = list.map((item, idx) => ({ ...item, display_order: idx }));

    if (type === 'default') {
      setFieldConfigs(prev => prev.map(fc => {
        const found = updated.find(u => u.id === fc.id);
        return found ? { ...fc, display_order: found.display_order } : fc;
      }));
      for (const item of updated) {
        await fetch('/api/admin/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'field_config', ...item }),
        });
      }
    } else {
      setCustomFields(prev => prev.map(cf => {
        const found = updated.find(u => u.id === cf.id);
        return found ? { ...cf, display_order: found.display_order } : cf;
      }));
      for (const item of updated) {
        await fetch('/api/admin/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'update_custom_field_order', id: item.id, display_order: item.display_order }),
        });
      }
    }
    loadData();
  };

  const handleCancelBooking = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment and notify the client?')) return;
    await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'update_booking_status', id, status: 'cancelled', trigger_email: 'cancellation' }),
    });
    setSelectedBooking(null);
    loadData();
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingBooking || !newDate || !newTime) return;

    const startDateTime = new Date(`${newDate}T${newTime}`);
    const duration = reschedulingBooking.treatments?.duration_minutes || 60;
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'update_booking_details',
        id: reschedulingBooking.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
      }),
    });

    setReschedulingBooking(null);
    setNewDate('');
    setNewTime('');
    loadData();
    alert('Appointment rescheduled successfully!');
  };

  const filteredDefaultFields = fieldConfigs.filter((fc) => fc.form_type === formTypeTab).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  const filteredCustomFields = customFields.filter((cf) => cf.form_type === formTypeTab).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const groupedBookings = bookings.reduce((acc: Record<string, Booking[]>, booking) => {
    const day = new Date(booking.start_time).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[day]) acc[day] = [];
    acc[day].push(booking);
    return acc;
  }, {});

  const totalRevenue = bookings.filter(b => b.status !== 'cancelled').reduce((acc, b) => acc + (b.treatments?.price_gbp || 0), 0);
  const completedBookingsCount = bookings.filter(b => b.status !== 'cancelled').length;
  const averageBookingValue = completedBookingsCount > 0 ? Math.round(totalRevenue / completedBookingsCount) : 0;

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#2C332B] font-sans p-4 sm:p-8 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#E5E7EB] pb-6 gap-4">
          <div>
            <span className="inline-flex items-center space-x-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#6B8E70]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sanctuary Operating Hub</span>
            </span>
            <h1 className="font-serif text-3xl md:text-4xl text-[#2C332B] mt-1">Practitioner Admin Portal</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap bg-white p-1 rounded-full border border-[#E5E7EB] shadow-sm items-center">
              <button onClick={() => setActiveTab('appointments')} className={`px-3 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition ${activeTab === 'appointments' ? 'bg-[#6B8E70] text-white' : 'text-[#6B7280]'}`}>
                Schedule
              </button>
              <Link href="/admin/calendar" className="px-3 py-2 rounded-full text-xs font-semibold uppercase tracking-wider text-[#6B7280] hover:text-[#2C332B] transition">
                Calendar ↗
              </Link>
              <button onClick={() => setActiveTab('crm')} className={`px-3 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition ${activeTab === 'crm' ? 'bg-[#6B8E70] text-white' : 'text-[#6B7280]'}`}>
                CRM
              </button>
              <button onClick={() => setActiveTab('cms')} className={`px-3 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition ${activeTab === 'cms' ? 'bg-[#6B8E70] text-white' : 'text-[#6B7280]'}`}>
                Treatments
              </button>
              <button onClick={() => setActiveTab('reports')} className={`px-3 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition ${activeTab === 'reports' ? 'bg-[#6B8E70] text-white' : 'text-[#6B7280]'}`}>
                Reports
              </button>
              <button onClick={() => setActiveTab('reviews')} className={`px-3 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition ${activeTab === 'reviews' ? 'bg-[#6B8E70] text-white' : 'text-[#6B7280]'}`}>
                Reviews
              </button>
              <button onClick={() => setActiveTab('popup')} className={`px-3 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition ${activeTab === 'popup' ? 'bg-[#6B8E70] text-white' : 'text-[#6B7280]'}`}>
                Popup
              </button>
              <button onClick={() => setActiveTab('gallery')} className={`px-3 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition ${activeTab === 'gallery' ? 'bg-[#6B8E70] text-white' : 'text-[#6B7280]'}`}>
                Gallery
              </button>
              <button onClick={() => setActiveTab('social')} className={`px-3 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition ${activeTab === 'social' ? 'bg-[#6B8E70] text-white' : 'text-[#6B7280]'}`}>
                Socials
              </button>
              <button onClick={() => setActiveTab('forms')} className={`px-3 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition ${activeTab === 'forms' ? 'bg-[#6B8E70] text-white' : 'text-[#6B7280]'}`}>
                Form Builder
              </button>
              <button onClick={() => setActiveTab('templates')} className={`px-3 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition ${activeTab === 'templates' ? 'bg-[#6B8E70] text-white' : 'text-[#6B7280]'}`}>
                Emails & Thanks
              </button>
              <button onClick={() => setActiveTab('content')} className={`px-3 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition ${activeTab === 'content' ? 'bg-[#6B8E70] text-white' : 'text-[#6B7280]'}`}>
                Copy CMS
              </button>
            </div>
          </div>
        </header>

        {activeTab === 'appointments' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Schedule Organised by Day</h2>
              {Object.keys(groupedBookings).length === 0 ? (
                <p className="text-xs text-[#6B7280]">No bookings found.</p>
              ) : (
                Object.entries(groupedBookings).map(([day, dayBookings]) => (
                  <div key={day} className="space-y-3">
                    <h3 className="font-serif text-lg text-[#6B8E70] border-b pb-1">{day}</h3>
                    <div className="space-y-3">
                      {dayBookings.map((item) => (
                        <div key={item.id} onClick={() => setSelectedBooking(item)} className={`p-5 rounded-2xl border bg-white cursor-pointer flex justify-between items-center transition ${selectedBooking?.id === item.id ? 'border-[#6B8E70] shadow-sm' : 'border-[#E5E7EB]'}`}>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-serif text-lg text-[#2C332B]">{item.client_name}</span>
                              <span className={`text-[10px] px-2 py-0.5 uppercase rounded-full ${item.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{item.status}</span>
                            </div>
                            <p className="text-xs text-[#6B7280]">{item.treatments?.title} • {new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <span className="text-xs text-[#6B8E70]">View Details &rarr;</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-4">Appointment Actions</h2>
              {selectedBooking ? (
                <div className="bg-white p-6 rounded-2xl border space-y-4">
                  <div>
                    <h3 className="font-serif text-xl">{selectedBooking.client_name}</h3>
                    <p className="text-xs text-[#6B7280]">{selectedBooking.client_email} • {selectedBooking.client_phone}</p>
                    <p className="text-xs font-medium text-[#6B8E70] mt-1">{selectedBooking.treatments?.title} (£{selectedBooking.treatments?.price_gbp})</p>
                    <p className="text-xs text-[#6B7280] mt-1">Time: {new Date(selectedBooking.start_time).toLocaleString()}</p>
                    <p className="text-xs text-[#6B7280] mt-1">Marketing Opt-In: {selectedBooking.marketing_opt_in ? `Yes (${selectedBooking.marketing_opt_in_at ? new Date(selectedBooking.marketing_opt_in_at).toLocaleString() : 'Recorded'})` : 'No'}</p>
                    {selectedBooking.notes && <p className="text-xs text-[#6B7280] mt-2 italic bg-[#FAF9F6] p-2.5 rounded-xl">Note: {selectedBooking.notes}</p>}
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Consultation Form Status</h4>
                    {selectedBooking.consultations && selectedBooking.consultations.length > 0 ? (
                      <div className="p-4 bg-[#FAF9F6] border rounded-xl space-y-2 text-xs">
                        <p className="text-emerald-700 font-medium">✓ Form Completed</p>
                        <p><strong>Medical:</strong> {selectedBooking.consultations[0].medical_conditions || 'None'}</p>
                        <p><strong>Allergies:</strong> {selectedBooking.consultations[0].allergies || 'None'}</p>
                        <p><strong>Pressure:</strong> {selectedBooking.consultations[0].pressure_preference || 'Standard'}</p>
                        <p><strong>Emergency:</strong> {selectedBooking.consultations[0].emergency_contact || 'None'}</p>
                      </div>
                    ) : (
                      <div className="p-4 bg-[#FAF9F6] border rounded-xl space-y-2 text-xs">
                        <p className="text-amber-700 italic">No consultation form completed yet.</p>
                        <button onClick={() => handleSendConsultationEmail(selectedBooking.client_email, selectedBooking.client_name)} className="mt-2 w-full py-2 bg-[#6B8E70] text-white text-[10px] uppercase rounded-lg flex items-center justify-center space-x-1">
                          <Send className="w-3 h-3" /> <span>Trigger Form Email</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <button onClick={() => setReschedulingBooking(selectedBooking)} className="w-full py-2.5 bg-[#FAF9F6] border text-xs uppercase rounded-xl flex items-center justify-center space-x-1.5 hover:bg-gray-50">
                      <RefreshCw className="w-3.5 h-3.5" /> <span>Reschedule</span>
                    </button>
                    <button onClick={() => handleCancelBooking(selectedBooking.id)} className="w-full py-2.5 bg-red-50 text-red-600 border border-red-200 text-xs uppercase rounded-xl flex items-center justify-center space-x-1.5 hover:bg-red-100">
                      <XCircle className="w-3.5 h-3.5" /> <span>Cancel Appointment</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-2xl border text-xs text-[#6B7280]">Select an appointment to view actions.</div>
              )}
            </div>
          </div>
        )}

        {reschedulingBooking && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white max-w-md w-full rounded-2xl p-6 space-y-4">
              <h3 className="font-serif text-xl">Reschedule Appointment</h3>
              <p className="text-xs text-[#6B7280]">Select a new date and time for {reschedulingBooking.client_name}.</p>
              <form onSubmit={handleRescheduleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs uppercase mb-1">New Date</label>
                  <input type="date" required value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full p-3 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs uppercase mb-1">New Time</label>
                  <input type="time" required value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full p-3 border rounded-xl text-sm" />
                </div>
                <div className="flex space-x-3 pt-2">
                  <button type="button" onClick={() => setReschedulingBooking(null)} className="w-1/2 py-2.5 border rounded-full text-xs uppercase">Cancel</button>
                  <button type="submit" className="w-1/2 py-2.5 bg-[#6B8E70] text-white rounded-full text-xs uppercase">Confirm Reschedule</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'crm' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`${selectedClient ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Client Records ({clientsList.length})</h2>
              <div className="grid gap-3">
                {clientsList.map((client) => (
                  <div key={client.email} onClick={() => setSelectedClientEmail(client.email)} className={`p-6 bg-white rounded-2xl border cursor-pointer flex justify-between items-center transition ${selectedClientEmail === client.email ? 'border-[#6B8E70] shadow-sm' : 'border-[#E5E7EB]'}`}>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-serif text-xl text-[#2C332B]">{client.name}</h3>
                        <span className={`text-[10px] px-2 py-0.5 uppercase rounded-full font-bold ${client.marketingOptIn ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                          {client.marketingOptIn ? 'Opted In' : 'No Consent'}
                        </span>
                      </div>
                      <p className="text-xs text-[#6B7280]">{client.email} • {client.phone} • £{client.totalSpend} total spend</p>
                    </div>
                    <span className="text-xs text-[#6B8E70]">View Profile &rarr;</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedClient && (
              <div className="bg-white p-6 sm:p-8 rounded-2xl border space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[#6B8E70]">Client Profile</span>
                    <h3 className="font-serif text-2xl text-[#2C332B] mt-0.5">{selectedClient.name}</h3>
                  </div>
                  <button onClick={() => setSelectedClientEmail(null)} className="text-xs text-[#6B7280] hover:text-black">Close</button>
                </div>

                <div className="space-y-3 pt-2 border-t text-xs">
                  <div className="flex justify-between items-center"><span className="text-[#6B7280]">Email:</span><span className="font-medium">{selectedClient.email}</span></div>
                  <div className="flex justify-between items-center"><span className="text-[#6B7280]">Phone:</span><span className="font-medium">{selectedClient.phone}</span></div>
                  <div className="flex justify-between items-center"><span className="text-[#6B7280]">Total Spend:</span><span className="font-medium text-[#6B8E70]">£{selectedClient.totalSpend}</span></div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#6B7280]">Marketing Opt-In:</span>
                    <span className={`font-medium ${selectedClient.marketingOptIn ? 'text-emerald-700' : 'text-gray-500'}`}>
                      {selectedClient.marketingOptIn ? `Yes (${selectedClient.marketingOptInAt ? new Date(selectedClient.marketingOptInAt).toLocaleDateString() : 'Recorded'})` : 'No'}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button onClick={() => setEditingClient({ name: selectedClient.name, email: selectedClient.email, phone: selectedClient.phone })} className="w-full py-2 bg-[#FAF9F6] border text-xs uppercase rounded-xl">Edit Client Details</button>
                </div>

                <div className="pt-4 border-t space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Latest Consultation Form</h4>
                    <button onClick={() => handleSendConsultationEmail(selectedClient.email, selectedClient.name)} className="px-2.5 py-1 bg-[#6B8E70] text-white text-[10px] uppercase rounded-lg flex items-center space-x-1">
                      <Send className="w-3 h-3" /> <span>Trigger Form Email</span>
                    </button>
                  </div>
                  {selectedClient.consultations.length > 0 ? (
                    <div className="p-4 bg-[#FAF9F6] border rounded-xl space-y-2 text-xs">
                      <p><strong>Medical:</strong> {selectedClient.consultations[0].medical_conditions || 'None'}</p>
                      <p><strong>Allergies:</strong> {selectedClient.consultations[0].allergies || 'None'}</p>
                      <p><strong>Pressure:</strong> {selectedClient.consultations[0].pressure_preference || 'Standard'}</p>
                      <p><strong>Emergency:</strong> {selectedClient.consultations[0].emergency_contact || 'None'}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-[#6B7280] italic">No consultation form completed yet.</p>
                  )}
                </div>
              </div>
            )}

            {editingClient && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-white max-w-md w-full rounded-2xl p-6 space-y-4">
                  <h3 className="font-serif text-xl">Edit Client Details</h3>
                  <form onSubmit={handleSaveClientDetails} className="space-y-3">
                    <div>
                      <label className="block text-xs uppercase mb-1">Name</label>
                      <input type="text" required value={editingClient.name} onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })} className="w-full p-3 border rounded-xl text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs uppercase mb-1">Email</label>
                      <input type="email" required value={editingClient.email} onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })} className="w-full p-3 border rounded-xl text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs uppercase mb-1">Phone</label>
                      <input type="text" required value={editingClient.phone} onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })} className="w-full p-3 border rounded-xl text-sm" />
                    </div>
                    <div className="flex space-x-3 pt-2">
                      <button type="button" onClick={() => setEditingClient(null)} className="w-1/2 py-2.5 border rounded-full text-xs uppercase">Cancel</button>
                      <button type="submit" className="w-1/2 py-2.5 bg-[#6B8E70] text-white rounded-full text-xs uppercase">Save Profile</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cms' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Treatments & Discounts</h2>
              <button onClick={() => setEditingTreatment({ title: '', description: '', duration_minutes: 60, price_gbp: 85 })} className="px-4 py-2 bg-[#6B8E70] text-white text-xs font-semibold uppercase tracking-wider rounded-full">
                <Plus className="w-3.5 h-3.5 inline mr-1" /> Add Treatment
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {treatments.map((t) => (
                <div key={t.id} className="bg-white p-6 rounded-2xl border space-y-3 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif text-xl">{t.title}</h3>
                    <p className="text-xs text-[#6B7280] mt-1">{t.description}</p>
                    <p className="text-xs font-semibold text-[#6B8E70] mt-2">£{t.price_gbp} ({t.duration_minutes} mins)</p>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <button onClick={() => setEditingTreatment(t)} className="w-1/2 py-2 bg-[#FAF9F6] border text-xs uppercase rounded-xl">Edit</button>
                    <button onClick={() => handleDeleteTreatment(t.id, t.title)} className="w-1/2 py-2 bg-red-50 text-red-600 border border-red-200 text-xs uppercase rounded-xl hover:bg-red-100 transition">Delete</button>
                  </div>
                </div>
              ))}
            </div>

            {editingTreatment && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-white max-w-lg w-full rounded-2xl p-6 space-y-4">
                  <h3 className="font-serif text-2xl">Edit Treatment</h3>
                  <form onSubmit={handleSaveTreatment} className="space-y-4">
                    <input type="text" required value={editingTreatment.title || ''} onChange={(e) => setEditingTreatment({ ...editingTreatment, title: e.target.value })} className="w-full p-3 border rounded-xl text-sm" placeholder="Title" />
                    <textarea rows={2} value={editingTreatment.description || ''} onChange={(e) => setEditingTreatment({ ...editingTreatment, description: e.target.value })} className="w-full p-3 border rounded-xl text-sm" placeholder="Description" />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="number" value={editingTreatment.duration_minutes || 60} onChange={(e) => setEditingTreatment({ ...editingTreatment, duration_minutes: parseInt(e.target.value) })} className="w-full p-3 border rounded-xl text-sm" placeholder="Duration" />
                      <input type="number" value={editingTreatment.price_gbp || 85} onChange={(e) => setEditingTreatment({ ...editingTreatment, price_gbp: parseFloat(e.target.value) })} className="w-full p-3 border rounded-xl text-sm" placeholder="Price" />
                    </div>
                    <div className="flex space-x-3 pt-2">
                      <button type="button" onClick={() => setEditingTreatment(null)} className="w-1/2 py-3 border rounded-full text-xs uppercase">Cancel</button>
                      <button type="submit" className="w-1/2 py-3 bg-[#6B8E70] text-white rounded-full text-xs uppercase">Save</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="max-w-4xl bg-white p-6 sm:p-8 rounded-2xl border space-y-8">
            <div>
              <h2 className="font-serif text-2xl text-[#2C332B]">Financial & Performance Reports</h2>
              <p className="text-xs text-[#6B7280] mt-0.5">Overview of revenue, booking volumes, and sanctuary performance metrics.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-6 bg-[#FAF9F6] border rounded-2xl space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Total Revenue</span>
                <p className="font-serif text-3xl text-[#6B8E70]">£{totalRevenue}</p>
                <p className="text-[11px] text-gray-500">From all confirmed appointments</p>
              </div>

              <div className="p-6 bg-[#FAF9F6] border rounded-2xl space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Confirmed Bookings</span>
                <p className="font-serif text-3xl text-[#2C332B]">{completedBookingsCount}</p>
                <p className="text-[11px] text-gray-500">Active reservations logged</p>
              </div>

              <div className="p-6 bg-[#FAF9F6] border rounded-2xl space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Avg. Booking Value</span>
                <p className="font-serif text-3xl text-[#6B8E70]">£{averageBookingValue}</p>
                <p className="text-[11px] text-gray-500">Per treatment session</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="max-w-4xl bg-white p-6 sm:p-8 rounded-2xl border space-y-6">
            <div>
              <h2 className="font-serif text-2xl text-[#2C332B]">Client Reviews Moderation</h2>
              <p className="text-xs text-[#6B7280] mt-0.5">Toggle reviews on or off to control what is displayed live on your homepage feed.</p>
            </div>

            <div className="space-y-3">
              {reviews.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-6">No client reviews submitted yet.</p>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="p-4 bg-[#FAF9F6] border rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-[#2C332B]">{review.client_name}</span>
                        <span className="text-xs text-amber-600 font-semibold">★ {review.rating}/5</span>
                      </div>
                      <p className="text-xs text-gray-600 italic">"{review.comment}"</p>
                    </div>

                    <button
                      onClick={async () => {
                        const newStatus = !review.is_visible;
                        const res = await fetch('/api/admin/reviews', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: review.id, is_visible: newStatus }),
                        });
                        if (res.ok) {
                          setReviews(reviews.map(r => r.id === review.id ? { ...r, is_visible: newStatus } : r));
                        } else {
                          alert('Failed to update review visibility');
                        }
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                        review.is_visible 
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {review.is_visible ? 'Visible on Site' : 'Hidden'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'popup' && (
          <div className="max-w-2xl bg-white p-6 sm:p-8 rounded-2xl border space-y-6">
            <h2 className="font-serif text-2xl">Promotional Overlay Modal</h2>
            <form onSubmit={handleSavePopup} className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#FAF9F6] border rounded-xl">
                <span>Popup Active</span>
                <input type="checkbox" checked={popupConfig.is_active} onChange={(e) => setPopupConfig({ ...popupConfig, is_active: e.target.checked })} className="h-5 w-5 text-[#6B8E70]" />
              </div>
              <input type="text" value={popupConfig.title} onChange={(e) => setPopupConfig({ ...popupConfig, title: e.target.value })} className="w-full p-3 border rounded-xl text-sm" placeholder="Title" />
              <textarea rows={3} value={popupConfig.description} onChange={(e) => setPopupConfig({ ...popupConfig, description: e.target.value })} className="w-full p-3 border rounded-xl text-sm" placeholder="Description" />
              <button type="submit" className="w-full py-4 bg-[#6B8E70] text-white text-xs uppercase tracking-widest rounded-full">Save Settings</button>
            </form>
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="max-w-3xl bg-white p-6 sm:p-8 rounded-2xl border space-y-6">
            <div>
              <h2 className="font-serif text-2xl text-[#2C332B]">Photo Gallery CMS</h2>
              <p className="text-xs text-[#6B7280] mt-0.5">Add or remove images displayed in the website photo gallery.</p>
            </div>

            <form onSubmit={handleAddGalleryImage} className="space-y-4 p-4 bg-[#FAF9F6] border rounded-2xl">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#2C332B]">Add New Gallery Image</h3>
              <input type="text" placeholder="Image Title" value={newImageTitle} onChange={(e) => setNewImageTitle(e.target.value)} className="w-full p-3 bg-white border rounded-xl text-sm" />
              <input type="url" required placeholder="Image URL" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} className="w-full p-3 bg-white border rounded-xl text-sm" />
              <button type="submit" disabled={savingGallery} className="w-full py-3 bg-[#6B8E70] text-white text-xs uppercase tracking-widest rounded-full">
                {savingGallery ? 'Adding...' : 'Add Image to Gallery'}
              </button>
            </form>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Current Gallery Images ({gallery.length})</h3>
              <div className="grid gap-3">
                {gallery.map((img) => (
                  <div key={img.id} className="flex items-center justify-between p-3 border rounded-xl bg-white">
                    <div className="flex items-center space-x-3">
                      <img src={img.image_url} alt={img.title} className="w-12 h-12 object-cover rounded-lg" />
                      <span className="text-sm font-medium text-[#2C332B]">{img.title}</span>
                    </div>
                    <button onClick={() => handleDeleteGalleryImage(img.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'social' && (
          <div className="max-w-3xl bg-white p-6 sm:p-8 rounded-2xl border space-y-6">
            <div>
              <h2 className="font-serif text-2xl text-[#2C332B]">Footer Social Icons & Links CMS</h2>
            </div>

            <form onSubmit={handleAddSocialLink} className="space-y-4 p-4 bg-[#FAF9F6] border rounded-2xl">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#2C332B]">Add Social Platform</h3>
              <input type="text" required placeholder="Platform Name" value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)} className="w-full p-3 bg-white border rounded-xl text-sm" />
              <input type="url" required placeholder="Profile URL" value={newSocialUrl} onChange={(e) => setNewSocialUrl(e.target.value)} className="w-full p-3 bg-white border rounded-xl text-sm" />
              <input type="url" placeholder="Custom Icon Image URL" value={newIconUrl} onChange={(e) => setNewIconUrl(e.target.value)} className="w-full p-3 bg-white border rounded-xl text-sm" />
              <button type="submit" disabled={savingSocial} className="w-full py-3 bg-[#6B8E70] text-white text-xs uppercase tracking-widest rounded-full">
                {savingSocial ? 'Adding...' : 'Add Social Link'}
              </button>
            </form>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Configured Social Links ({socialLinks.length})</h3>
              <div className="grid gap-3">
                {socialLinks.map((link) => (
                  <div key={link.id} className="flex items-center justify-between p-4 border rounded-xl bg-white">
                    <div className="flex items-center space-x-4">
                      <input type="checkbox" checked={link.is_active} onChange={() => handleToggleSocial(link)} className="h-4 w-4 text-[#6B8E70] rounded" />
                      <div className="flex items-center space-x-3">
                        {link.icon_url && <img src={link.icon_url} alt={link.platform} className="w-5 h-5 object-contain rounded-full" />}
                        <div>
                          <p className="text-sm font-medium text-[#2C332B]">{link.platform}</p>
                          <p className="text-xs text-[#6B7280] truncate max-w-xs">{link.url}</p>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteSocialLink(link.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'forms' && (
          <div className="max-w-3xl bg-white p-6 sm:p-8 rounded-2xl border space-y-8">
            <div>
              <h2 className="font-serif text-2xl text-[#2C332B]">Dynamic Form Builder & Field Manager</h2>
              <p className="text-xs text-[#6B7280]">Edit existing default fields, rearrange order, toggle required priorities, or add custom fields (Text, Dropdown, Checkbox) that map straight into your CRM/CMS.</p>
            </div>

            <div className="flex space-x-2 border-b pb-4">
              <button onClick={() => setFormTypeTab('booking')} className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${formTypeTab === 'booking' ? 'bg-[#6B8E70] text-white' : 'bg-[#FAF9F6] text-[#2C332B] border'}`}>Booking Form Fields</button>
              <button onClick={() => setFormTypeTab('consultation')} className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${formTypeTab === 'consultation' ? 'bg-[#6B8E70] text-white' : 'bg-[#FAF9F6] text-[#2C332B] border'}`}>Consultation Form Fields</button>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Standard Fields ({formTypeTab})</h3>
              <div className="grid gap-3">
                {filteredDefaultFields.map((fc, idx) => (
                  <div key={fc.id} className="flex items-center justify-between p-4 border rounded-xl bg-[#FAF9F6]">
                    <div>
                      <p className="text-sm font-medium text-[#2C332B]">{fc.field_label} <span className="text-xs text-[#6B8E70]">({fc.field_name})</span></p>
                      <p className="text-xs text-[#6B7280]">{fc.is_required ? 'Required (Priority)' : 'Optional'} • {fc.is_active ? 'Active' : 'Hidden'}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex flex-col">
                        <button onClick={() => handleMoveField(fc.id, 'default', 'up')} disabled={idx === 0} className="p-1 text-gray-500 hover:text-black disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleMoveField(fc.id, 'default', 'down')} disabled={idx === filteredDefaultFields.length - 1} className="p-1 text-gray-500 hover:text-black disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                      </div>
                      <button onClick={() => setEditingDefaultField(fc)} className="px-3 py-1.5 bg-white border text-xs uppercase rounded-lg hover:bg-gray-50 transition">Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {editingDefaultField && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-white max-w-md w-full rounded-2xl p-6 space-y-4">
                  <h3 className="font-serif text-xl">Edit Field: {editingDefaultField.field_name}</h3>
                  <form onSubmit={handleSaveDefaultFieldConfig} className="space-y-3">
                    <div>
                      <label className="block text-xs uppercase mb-1">Field Label</label>
                      <input type="text" required value={editingDefaultField.field_label} onChange={(e) => setEditingDefaultField({ ...editingDefaultField, field_label: e.target.value })} className="w-full p-3 border rounded-xl text-sm" />
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                      <input type="checkbox" id="editIsReq" checked={editingDefaultField.is_required} onChange={(e) => setEditingDefaultField({ ...editingDefaultField, is_required: e.target.checked })} className="h-4 w-4 text-[#6B8E70]" />
                      <label htmlFor="editIsReq" className="text-xs text-gray-700 cursor-pointer">Required / High Priority Field</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="editIsActive" checked={editingDefaultField.is_active} onChange={(e) => setEditingDefaultField({ ...editingDefaultField, is_active: e.target.checked })} className="h-4 w-4 text-[#6B8E70]" />
                      <label htmlFor="editIsActive" className="text-xs text-gray-700 cursor-pointer">Active (Visible on Form)</label>
                    </div>
                    <div className="flex space-x-3 pt-4">
                      <button type="button" onClick={() => setEditingDefaultField(null)} className="w-1/2 py-2.5 border rounded-full text-xs uppercase">Cancel</button>
                      <button type="submit" className="w-1/2 py-2.5 bg-[#6B8E70] text-white rounded-full text-xs uppercase">Save Changes</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <form onSubmit={handleAddCustomField} className="p-4 bg-[#FAF9F6] border rounded-2xl space-y-4 mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#2C332B]">Add New Custom Field</h3>
              <input type="text" required placeholder="Field Label (e.g. Preferred music style, Dietary notes)" value={fieldLabel} onChange={(e) => setFieldLabel(e.target.value)} className="w-full p-3 bg-white border rounded-xl text-sm" />
              <select value={fieldType} onChange={(e) => setFieldType(e.target.value)} className="w-full p-3 bg-white border rounded-xl text-sm">
                <option value="text">Text Input (Short)</option>
                <option value="textarea">Textarea (Long)</option>
                <option value="select">Dropdown Selection</option>
                <option value="checkbox">Checkbox (True/False)</option>
              </select>
              {fieldType === 'select' && (
                <input type="text" required placeholder="Comma separated options (e.g. Ambient, Classical, Nature Sounds)" value={fieldOptions} onChange={(e) => setFieldOptions(e.target.value)} className="w-full p-3 bg-white border rounded-xl text-sm" />
              )}
              <div className="flex items-center space-x-2 pt-1">
                <input type="checkbox" id="isReq" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} className="h-4 w-4 text-[#6B8E70]" />
                <label htmlFor="isReq" className="text-sm">Make this custom field required / priority</label>
              </div>
              <button type="submit" className="w-full py-3 bg-[#6B8E70] text-white text-xs uppercase tracking-widest rounded-full">Add Custom Field</button>
            </form>

            <div className="space-y-3 pt-6 border-t">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Custom Fields ({formTypeTab})</h3>
              <div className="grid gap-3">
                {filteredCustomFields.map((cf, idx) => (
                  <div key={cf.id} className="flex items-center justify-between p-4 border rounded-xl bg-white">
                    <div>
                      <p className="text-sm font-medium text-[#2C332B]">{cf.field_label} <span className="text-xs text-[#6B7280]">({cf.field_type})</span></p>
                      <p className="text-xs text-[#6B7280]">{cf.is_required ? 'Required (Priority)' : 'Optional'}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex flex-col">
                        <button onClick={() => handleMoveField(cf.id, 'custom', 'up')} disabled={idx === 0} className="p-1 text-gray-500 hover:text-black disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleMoveField(cf.id, 'custom', 'down')} disabled={idx === filteredCustomFields.length - 1} className="p-1 text-gray-500 hover:text-black disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                      </div>
                      <button onClick={() => handleDeleteCustomField(cf.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="max-w-2xl bg-white p-6 sm:p-8 rounded-2xl border space-y-6">
            <div>
              <h2 className="font-serif text-2xl text-[#2C332B]">Confirmation & Notification Emails</h2>
              <p className="text-xs text-[#6B7280]">Edit subject lines, email copy, and button configurations for client notifications.</p>
            </div>
            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Select Email Template</label>
                <select value={editingTemplateKey} onChange={(e) => handleTemplateChange(e.target.value)} className="w-full p-3 border rounded-xl text-sm bg-white">
                  <option value="confirmation_email">Booking Confirmation Email</option>
                  <option value="reschedule_email">Appointment Reschedule Notification Email</option>
                  <option value="cancellation_email">Appointment Cancellation Notification Email</option>
                  <option value="consultation_email">Consultation Form Intake Request Email</option>
                  <option value="review_email">Review Submission / Thank-You Email</option>
                  <option value="booking_thankyou">Booking Complete Thank-You Message</option>
                  <option value="consultation_thankyou">Consultation Form Thank-You Message</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Email Subject Line</label>
                <input type="text" value={templateSubject} onChange={(e) => setTemplateSubject(e.target.value)} className="w-full p-3 border rounded-xl text-sm" placeholder="e.g. Your Sanctuary Appointment Confirmed" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Email / Message Body Content</label>
                <textarea rows={5} value={templateContent} onChange={(e) => setTemplateContent(e.target.value)} className="w-full p-3.5 border rounded-xl text-sm" placeholder="Type your email body copy here..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Button Text (Optional)</label>
                  <input type="text" value={templateButtonText} onChange={(e) => setTemplateButtonText(e.target.value)} className="w-full p-3 border rounded-xl text-sm" placeholder="e.g. Complete Digital Consultation" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Button Custom Link URL (Optional)</label>
                  <input type="text" value={templateButtonUrl} onChange={(e) => setTemplateButtonUrl(e.target.value)} className="w-full p-3 border rounded-xl text-sm" placeholder="Leave blank for automatic booking/form link" />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-[#6B8E70] text-white text-xs uppercase tracking-widest rounded-full">Save Email Template</button>
            </form>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="max-w-2xl bg-white p-6 sm:p-8 rounded-2xl border space-y-6">
            <div>
              <h2 className="font-serif text-2xl text-[#2C332B]">Website Copy CMS</h2>
              <p className="text-xs text-[#6B7280] mt-0.5">Modify hero headings, section titles, and reviews copy live.</p>
            </div>
            <form onSubmit={handleSaveContent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C332B] mb-1">Main Hero Heading</label>
                <input type="text" value={heroHeading} onChange={(e) => setHeroHeading(e.target.value)} className="w-full p-3.5 bg-white border border-[#E5E7EB] rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C332B] mb-1">Main Hero Subtext</label>
                <textarea rows={2} value={heroSubtext} onChange={(e) => setHeroSubtext(e.target.value)} className="w-full p-3.5 bg-white border border-[#E5E7EB] rounded-xl text-sm" />
              </div>
              <div className="border-t pt-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C332B] mb-1">Booking Section Title</label>
                <input type="text" value={bookingTitle} onChange={(e) => setBookingTitle(e.target.value)} className="w-full p-3.5 bg-white border border-[#E5E7EB] rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C332B] mb-1">Booking Section Subtext</label>
                <textarea rows={2} value={bookingSubtext} onChange={(e) => setBookingSubtext(e.target.value)} className="w-full p-3.5 bg-white border border-[#E5E7EB] rounded-xl text-sm" />
              </div>
              <div className="border-t pt-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C332B] mb-1">Gallery Section Heading</label>
                <input type="text" value={galleryHeading} onChange={(e) => setGalleryHeading(e.target.value)} className="w-full p-3.5 bg-white border border-[#E5E7EB] rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C332B] mb-1">Gallery Section Subtext</label>
                <input type="text" value={gallerySubtext} onChange={(e) => setGallerySubtext(e.target.value)} className="w-full p-3.5 bg-white border border-[#E5E7EB] rounded-xl text-sm" />
              </div>
              <div className="border-t pt-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C332B] mb-1">Reviews Section Heading</label>
                <input type="text" value={reviewsHeading} onChange={(e) => setReviewsHeading(e.target.value)} className="w-full p-3.5 bg-white border border-[#E5E7EB] rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#2C332B] mb-1">Reviews Section Subtext</label>
                <input type="text" value={reviewsSubtext} onChange={(e) => setReviewsSubtext(e.target.value)} className="w-full p-3.5 bg-white border border-[#E5E7EB] rounded-xl text-sm" />
              </div>
              <button type="submit" disabled={savingContent} className="w-full py-4 bg-[#6B8E70] text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-[#5B7B60] transition shadow-sm">
                {savingContent ? 'Updating...' : 'Save Website Copy'}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}