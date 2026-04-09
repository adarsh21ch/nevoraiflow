import { Lock, Star, Play } from "lucide-react";

interface Testimonial {
  id: string;
  type: string;
  student_name: string;
  student_location?: string | null;
  student_photo_url?: string | null;
  review_text?: string | null;
  video_url?: string | null;
  is_active: boolean;
}

interface LandingPagePreviewProps {
  form: {
    title: string;
    description: string;
    sections: any[];
    form_title: string;
    form_subtitle: string;
    form_button_text: string;
    theme_color: string;
    background_style: string;
    field_name_enabled: boolean;
    field_phone_enabled: boolean;
    field_email_enabled: boolean;
    field_age_enabled: boolean;
    field_city_enabled: boolean;
    field_state_enabled: boolean;
    field_occupation_enabled: boolean;
    field_custom_1_enabled: boolean;
    field_custom_1_label: string;
    field_custom_2_enabled: boolean;
    field_custom_2_label: string;
    speaker_name?: string;
    speaker_role?: string;
    speaker_bio?: string;
    speaker_photo_url?: string;
    [key: string]: any;
  };
}

export const LandingPagePreview = ({ form }: LandingPagePreviewProps) => {
  const bgClass = form.background_style === "light"
    ? "bg-white text-gray-900"
    : form.background_style === "gradient"
    ? "bg-gradient-to-br from-gray-900 to-gray-800 text-white"
    : "bg-gray-950 text-white";

  const cardBg = form.background_style === "light" ? "bg-gray-50 border-gray-200" : "bg-gray-900/50 border-gray-800";

  const sections = form.sections || [];
  const hasSpeaker = !!(form.speaker_name || form.speaker_photo_url);

  const formFields = [
    { key: "name", label: "Full Name", enabled: form.field_name_enabled },
    { key: "phone", label: "Phone Number", enabled: form.field_phone_enabled },
    { key: "email", label: "Email Address", enabled: form.field_email_enabled },
    { key: "age", label: "Age", enabled: form.field_age_enabled },
    { key: "city", label: "City", enabled: form.field_city_enabled },
    { key: "state", label: "State", enabled: form.field_state_enabled },
    { key: "occupation", label: "Occupation", enabled: form.field_occupation_enabled },
    ...(form.field_custom_1_enabled ? [{ key: "custom_1", label: form.field_custom_1_label || "Custom 1", enabled: true }] : []),
    ...(form.field_custom_2_enabled ? [{ key: "custom_2", label: form.field_custom_2_label || "Custom 2", enabled: true }] : []),
  ].filter(f => f.enabled);

  const renderSection = (section: any, i: number) => {
    switch (section.type) {
      case "hero":
        return (
          <div key={i} className="space-y-3">
            {section.headline && <h1 className="text-2xl md:text-3xl font-bold leading-tight">{section.headline}</h1>}
            {section.subheadline && <p className="text-sm opacity-70">{section.subheadline}</p>}
            {section.image_url && <img src={section.image_url} alt="" className="rounded-lg w-full max-h-48 object-cover" />}
            {section.cta_text && <p className="font-semibold text-sm" style={{ color: form.theme_color }}>{section.cta_text}</p>}
          </div>
        );
      case "text":
        return (
          <div key={i} className={`space-y-1 ${section.alignment === "center" ? "text-center" : ""}`}>
            {section.heading && <h2 className="text-lg font-bold">{section.heading}</h2>}
            {section.body && <p className="text-xs opacity-70 whitespace-pre-line">{section.body}</p>}
          </div>
        );
      case "features":
        return (
          <div key={i} className="space-y-2">
            {section.title && <h2 className="text-lg font-bold">{section.title}</h2>}
            <div className="space-y-1">
              {(section.items || []).map((item: any, j: number) => (
                <div key={j} className="flex items-start gap-2 text-xs">
                  <span>{item.emoji}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case "testimonials":
        return (
          <div key={i} className="space-y-2">
            {section.title && <h2 className="text-lg font-bold">{section.title}</h2>}
            <div className="grid gap-2">
              {(section.items || []).map((item: any, j: number) => (
                <div key={j} className={`rounded-lg p-3 text-xs ${cardBg} border`}>
                  <p className="italic opacity-70">"{item.quote}"</p>
                  <p className="font-semibold mt-1">{item.name}</p>
                  {item.role && <p className="opacity-50 text-[10px]">{item.role}</p>}
                </div>
              ))}
            </div>
          </div>
        );
      case "faq":
        return (
          <div key={i} className="space-y-2">
            {section.title && <h2 className="text-lg font-bold">{section.title}</h2>}
            <div className="space-y-1">
              {(section.items || []).map((item: any, j: number) => (
                <div key={j} className={`rounded-lg p-2 text-xs ${cardBg} border`}>
                  <p className="font-semibold">{item.question}</p>
                  <p className="opacity-70 mt-1">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case "image":
        return (
          <div key={i}>
            {section.url && <img src={section.url} alt={section.caption || ""} className="rounded-lg w-full" />}
            {section.caption && <p className="text-[10px] opacity-50 text-center mt-1">{section.caption}</p>}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-full rounded-xl overflow-hidden ${bgClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-current/10">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-primary/20" />
          <span className="text-xs font-bold">Nevorai Flow</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-5">
        {/* Page sections */}
        <div className="space-y-5">
          {sections.length > 0 ? (
            sections.map(renderSection)
          ) : (
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">{form.title || "Your Landing Page"}</h1>
              {form.description && <p className="text-sm opacity-70">{form.description}</p>}
            </div>
          )}
        </div>

        {/* Speaker section */}
        {hasSpeaker && (
          <div className={`rounded-lg p-4 flex items-center gap-3 ${cardBg} border`}>
            {form.speaker_photo_url && (
              <img src={form.speaker_photo_url} alt={form.speaker_name} className="w-16 h-16 rounded-full object-cover shrink-0" />
            )}
            <div>
              <h3 className="font-bold text-sm">{form.speaker_name}</h3>
              {form.speaker_role && <p className="text-[10px] opacity-50">{form.speaker_role}</p>}
              {form.speaker_bio && <p className="text-xs opacity-70 mt-1 line-clamp-2">{form.speaker_bio}</p>}
            </div>
          </div>
        )}

        {/* Registration form */}
        <div className={`rounded-xl p-4 ${cardBg} border`}>
          <h3 className="font-bold text-sm">{form.form_title}</h3>
          <p className="text-[10px] opacity-60 mb-3">{form.form_subtitle}</p>
          <div className="space-y-2">
            {formFields.map(f => (
              <div key={f.key} className="h-8 rounded-md bg-current/5 border border-current/10 px-2 flex items-center text-[10px] opacity-40">
                {f.label}
              </div>
            ))}
            <div
              className="h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: form.theme_color }}
            >
              {form.form_button_text} →
            </div>
          </div>
          <p className="text-[9px] opacity-30 text-center mt-2 flex items-center justify-center gap-1">
            <Lock size={8} /> Your information is safe
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-3 text-[9px] opacity-20 border-t border-current/5">
        © Nevorai Flow
      </div>
    </div>
  );
};
