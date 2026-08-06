import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data: treatments } = await supabase.from('treatments').select('*').order('title', { ascending: true });
    const { data: popup } = await supabase.from('site_popups').select('*').eq('is_active', true).limit(1).maybeSingle();
    const { data: gallery } = await supabase.from('gallery_images').select('*').order('display_order', { ascending: true });
    const { data: customFields } = await supabase.from('custom_form_fields').select('*').order('display_order', { ascending: true });
    const { data: fieldConfigs } = await supabase.from('form_field_configs').select('*');
    const { data: templates } = await supabase.from('site_templates').select('*');

    const templatesMap = (templates || []).reduce((acc: any, item: any) => {
      acc[item.key] = item.content;
      return acc;
    }, {});

    const configsMap = (fieldConfigs || []).reduce((acc: any, item: any) => {
      if (!acc[item.form_type]) acc[item.form_type] = {};
      acc[item.form_type][item.field_name] = item;
      return acc;
    }, {});

    return NextResponse.json({ 
      treatments: treatments || [], 
      popup: popup || null,
      gallery: gallery || [],
      customFields: customFields || [],
      fieldConfigs: configsMap,
      templates: templatesMap
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}