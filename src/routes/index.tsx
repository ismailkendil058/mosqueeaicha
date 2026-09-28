import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Ornament, Crescent } from "@/components/masjid/Ornament";
import { PhotoField } from "@/components/masjid/PhotoField";
import { CertificateField } from "@/components/masjid/CertificateField";
import logo from "@/assets/masjid-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "مسجد عائشة — تسجيل حلقات تحفيظ القرآن الكريم" },
      {
        name: "description",
        content:
          "استمارة تسجيل الطلبة في حلقات تحفيظ القرآن الكريم بمسجد عائشة: معلومات الطالب، المستوى الدراسي، الحالة الصحية ومعلومات ولي الأمر.",
      },
      { property: "og:title", content: "مسجد عائشة — تسجيل حلقات تحفيظ القرآن الكريم" },
      {
        property: "og:description",
        content: "سجّلوا أبناءكم في حلقات تحفيظ القرآن الكريم بمسجد عائشة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const LEVELS = ["تحضيري", "الابتدائي", "المتوسط", "الثانوي"] as const;

const YEARS: Record<string, string[]> = {
  تحضيري: ["القسم التحضيري"],
  الابتدائي: [
    "السنة الأولى",
    "السنة الثانية",
    "السنة الثالثة",
    "السنة الرابعة",
    "السنة الخامسة",
  ],
  المتوسط: ["السنة الأولى", "السنة الثانية", "السنة الثالثة", "السنة الرابعة"],
  الثانوي: ["السنة الأولى", "السنة الثانية", "السنة الثالثة"],
};

const ARRIVAL = [
  "مع ولي الأمر",
  "مشيا على الأقدام",
  "مع أحد الأقارب أو المعارف",
  "وسيلة أخرى",
] as const;

const HEALTH = [
  "الربو أو الحساسية",
  "السكري",
  "مشاكل في القلب",
  "ارتفاع ضغط الدم",
  "الصرع",
  "التشنجات",
  "الرعاف",
] as const;

const SCHOOL_RULES = [
  "المحافظة على نظافة المسجد والمدرسة وسلامة الهياكل وممتلكات المدرسة.",
  "ضرورة التحلي بالأخلاق السامية والآداب الإسلامية.",
  "كل غياب غير مبرر يستوجب حضور الولي للتوقيع على تعهد مكتوب.",
  "كل تغيب مستقبلي يستوجب إعلام الإدارة أو الأستاذ(ة) لأخذ ترخيص أو تقديم المبرر لاحقاً.",
  "وجوب احترام جميع الأساتذة والطاقم الإداري للمدرسة والعمل بتوجيهاتهم ونصائحهم.",
  "ضرورة اعتناء الطالب(ة) بهندامه والمحافظة على مظهره اللائق، وكذلك الالتزام باللباس الموحد – إذا قُرّر – لكلا الجنسين (الذكور والإناث)، والالتزام بالزي المحتشم (الملابس المناسبة، تصفيف الشعر)، وتجنب أي مظهر يتنافى مع الآداب الإسلامية والأعراف والهوية.",
  "يلتزم الطالب(ة) بتجنب إدخال المأكولات والمشروبات، ويمنع كذلك من استعمال الهاتف وأدوات الزينة وإحضار وسائل حادة كالسكين ومفك براغي والمقص والممنوعات التي من شأنها أن تضر بالآخرين.",
  "احترام مدرسة » الفلاح « واعتبارها مكاناً للتعليم والتكوين فقط.",
  "يجب أن يكون التعليم القرآني من أولويات الطالب(ة) قبل برامجه التعليمية والرياضية (دروس خصوصية، رياضة).",
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-8 text-center text-2xl text-primary sm:text-3xl">{children}</h3>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 text-center">
      <Label className="text-sm block text-center">
        {label} {required && <span className="text-primary">*</span>}
      </Label>
      {children}
    </div>
  );
}

function Landing() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [certificate, setCertificate] = useState<File | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    birth_date: "",
    birth_place: "",
    gender: "",
    address: "",
    notes: "",
    education_level: "",
    academic_year: "",
    arrival_method: "",
    guardian_name: "",
    guardian_relation: "",
    guardian_phone: "",
    guardian_email: "",
  });
  const [vision, setVision] = useState(false);
  const [hearing, setHearing] = useState(false);
  const [speech, setSpeech] = useState(false);
  const [conditions, setConditions] = useState<string[]>([]);
  const [otherDisease, setOtherDisease] = useState(false);
  const [otherDiseaseText, setOtherDiseaseText] = useState("");
  const [ruleConsents, setRuleConsents] = useState<boolean[]>(
    new Array(SCHOOL_RULES.length).fill(false)
  );
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const allRulesChecked =
    ruleConsents.length === SCHOOL_RULES.length && ruleConsents.every(Boolean);

  const isPhoneValid = Boolean(form.guardian_phone.trim());

  const isFormValid = Boolean(
    form.full_name.trim() &&
      form.birth_date.trim() &&
      form.birth_place.trim() &&
      form.gender &&
      form.address.trim() &&
      form.education_level &&
      form.academic_year &&
      form.arrival_method &&
      form.guardian_name.trim() &&
      form.guardian_relation &&
      isPhoneValid &&
      allRulesChecked
  );

  const upload = async (bucket: string, file: File) => {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type || "application/octet-stream",
    });
    if (error) throw error;
    return path;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const invalid = (msg: string) => {
      toast.error(msg);
    };
    if (!photo) return invalid("صورة الطالب مطلوبة");
    if (!certificate) return invalid("مستخرج شهادة الميلاد مطلوب");
    if (!form.gender) return invalid("يرجى تحديد الجنس");
    if (!form.education_level || !form.academic_year)
      return invalid("يرجى اختيار المستوى والسنة الدراسية");
    if (!form.arrival_method) return invalid("يرجى اختيار طريقة الوصول");
    if (!form.guardian_relation) return invalid("يرجى تحديد صلة القرابة");
    if (!isPhoneValid)
      return invalid("رقم الهاتف غير صحيح (مثال: 0777 77 77 77)");
    if (!allRulesChecked)
      return invalid(
        "يرجى الموافقة على جميع بنود نظام المدرسة القرآنية » الفلاح « (القانون الداخلي للمدرسة)"
      );

    setSubmitting(true);
    try {
      const [photo_url, birth_certificate_url] = await Promise.all([
        upload("student-photos", photo),
        upload("birth-certificates", certificate),
      ]);

      const { error } = await supabase.from("registrations").insert({
        full_name: form.full_name,
        birth_date: form.birth_date,
        birth_place: form.birth_place,
        gender: form.gender,
        address: form.address,
        notes: form.notes || null,
        education_level: form.education_level,
        academic_year: form.academic_year,
        arrival_method: form.arrival_method,
        vision_issue: vision,
        hearing_issue: hearing,
        speech_issue: speech,
        health_conditions: {
          list: conditions,
          other: otherDisease ? otherDiseaseText : null,
        },
        guardian_name: form.guardian_name,
        guardian_relation: form.guardian_relation,
        guardian_phone: form.guardian_phone,
        guardian_email: form.guardian_email || null,
        photo_url,
        birth_certificate_url,
        consent_given: true,
      });
      if (error) throw error;
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast.error("تعذّر إرسال الطلب، يرجى المحاولة مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-24">
        <div className="mihrab max-w-lg border border-primary/25 bg-card px-8 py-16 text-center shadow-sm">
          <Crescent className="mx-auto h-14 w-14 text-primary" />
          <Ornament className="my-8" />
          <p className="text-2xl leading-loose text-foreground">
            تم إرسال طلب التسجيل بنجاح، سيتم التواصل معكم قريباً إن شاء الله
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {/* HERO */}
      <section className="khatam-veil px-6 pb-24 pt-20 text-center sm:pt-28">
        <p className="font-display text-3xl leading-loose text-primary sm:text-5xl">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
        <Ornament className="mt-10" />
        <div className="relative mx-auto mt-14 w-fit">
          <img
            src={logo}
            alt="شعار مسجد عائشة"
            width={816}
            height={816}
            className="h-32 w-32 rounded-3xl border border-primary/20 bg-card object-contain p-3 sm:h-40 sm:w-40"
          />
          <Crescent className="absolute -left-5 top-0 h-7 w-7 text-primary" />
        </div>
        <h1 className="mt-12 text-4xl text-foreground sm:text-6xl">مسجد عائشة</h1>
        <p className="mt-6 text-xl text-primary sm:text-2xl">حلقات تحفيظ القرآن الكريم</p>
        <p className="mx-auto mt-8 max-w-xl text-base leading-loose text-muted-foreground">
          نفتح باب التسجيل لأبنائكم في حلقات تحفيظ كتاب الله، في جوٍّ تربوي هادئ
          وبإشراف أساتذة مؤهّلين. سجّلوا أبناءكم اليوم.
        </p>
        <div className="mt-12">
          <Button
            size="lg"
            onClick={() =>
              document.getElementById("form")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            سجّل الآن
          </Button>
        </div>
      </section>

      <Ornament />

      {/* FORM */}
      <form id="form" onSubmit={handleSubmit} className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="mb-20 text-center text-3xl text-foreground sm:text-4xl">
          استمارة تسجيل طالب
        </h2>

        <section className="space-y-10">
          <SectionTitle>بطاقة معلومات الطالب</SectionTitle>

          <Field label="صورة الطالب" required>
            <PhotoField value={photo} onChange={setPhoto} />
          </Field>

          <Field label="مستخرج شهادة الميلاد" required>
            <CertificateField value={certificate} onChange={setCertificate} />
          </Field>

          <Field label="الاسم الكامل" required>
            <Input
              required
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="تاريخ الميلاد" required>
              <Input
                type="date"
                required
                value={form.birth_date}
                onChange={(e) => set("birth_date", e.target.value)}
              />
            </Field>
            <Field label="مكان الميلاد" required>
              <Input
                required
                value={form.birth_place}
                onChange={(e) => set("birth_place", e.target.value)}
              />
            </Field>
          </div>

          <Field label="الجنس" required>
            <RadioGroup
              value={form.gender}
              onValueChange={(v) => set("gender", v)}
              className="flex justify-center gap-8"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="ذكر" id="male" />
                <Label htmlFor="male">ذكر</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="أنثى" id="female" />
                <Label htmlFor="female">أنثى</Label>
              </div>
            </RadioGroup>
          </Field>

          <Field label="العنوان" required>
            <Input
              required
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>

          <Field label="ملاحظات حول الطالب">
            <Textarea
              rows={4}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </section>

        <Ornament className="my-20" />

        <section className="space-y-10">
          <SectionTitle>المستوى الدراسي</SectionTitle>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="اختر المستوى الدراسي" required>
              <Select
                value={form.education_level}
                onValueChange={(v) => {
                  set("education_level", v);
                  set("academic_year", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المستوى" />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="اختر السنة الدراسية" required>
              <Select
                value={form.academic_year}
                onValueChange={(v) => set("academic_year", v)}
                disabled={!form.education_level}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر السنة" />
                </SelectTrigger>
                <SelectContent>
                  {(YEARS[form.education_level] ?? []).map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </section>

        <Ornament className="my-20" />

        <section className="space-y-10">
          <SectionTitle>طريقة الوصول الى المسجد</SectionTitle>
          <Field label="اختر طريقة الوصول" required>
            <Select
              value={form.arrival_method}
              onValueChange={(v) => set("arrival_method", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر طريقة الوصول" />
              </SelectTrigger>
              <SelectContent>
                {ARRIVAL.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </section>

        <Ornament className="my-20" />

        <section className="space-y-10">
          <SectionTitle>الحالة الصحية للطالب</SectionTitle>

          <div className="space-y-4">
            <p className="text-sm font-semibold text-center">المشاكل الحسية</p>
            {[
              { label: "العين / هل يعاني التلميذ من ضعف في البصر؟", value: vision, set: setVision },
              { label: "الأذن / هل يعاني التلميذ من ضعف في السمع؟", value: hearing, set: setHearing },
              { label: "النطق / هل يعاني التلميذ من صعوبة في النطق؟", value: speech, set: setSpeech },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 text-center"
              >
                <span className="text-sm flex-1 text-center">{item.label}</span>
                <Switch checked={item.value} onCheckedChange={item.set} />
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <p className="text-sm font-semibold text-center">الحالات الصحية الأخرى</p>
            <div className="grid gap-3 sm:grid-cols-2 text-center">
              {HEALTH.map((h) => (
                <label key={h} className="flex items-center justify-center gap-3 text-sm cursor-pointer">
                  <Checkbox
                    checked={conditions.includes(h)}
                    onCheckedChange={(c) =>
                      setConditions((prev) =>
                        c ? [...prev, h] : prev.filter((x) => x !== h),
                      )
                    }
                  />
                  {h}
                </label>
              ))}
              <label className="flex items-center justify-center gap-3 text-sm cursor-pointer">
                <Checkbox
                  checked={otherDisease}
                  onCheckedChange={(c) => setOtherDisease(Boolean(c))}
                />
                أمراض أخرى
              </label>
            </div>
            {otherDisease && (
              <Input
                placeholder="يرجى التوضيح"
                value={otherDiseaseText}
                onChange={(e) => setOtherDiseaseText(e.target.value)}
              />
            )}
          </div>
        </section>

        <Ornament className="my-20" />

        <section className="space-y-10">
          <SectionTitle>معلومات ولي الأمر</SectionTitle>
          <Field label="اسم ولي الأمر" required>
            <Input
              required
              value={form.guardian_name}
              onChange={(e) => set("guardian_name", e.target.value)}
            />
          </Field>
          <Field label="صلة القرابة" required>
            <RadioGroup
              value={form.guardian_relation}
              onValueChange={(v) => set("guardian_relation", v)}
              className="flex justify-center gap-8"
            >
              {["الأب", "الأم", "أخرى"].map((r) => (
                <div key={r} className="flex items-center gap-2">
                  <RadioGroupItem value={r} id={`rel-${r}`} />
                  <Label htmlFor={`rel-${r}`}>{r}</Label>
                </div>
              ))}
            </RadioGroup>
          </Field>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="رقم الهاتف" required>
              <Input
                required
                inputMode="tel"
                placeholder="0777 77 77 77"
                value={form.guardian_phone}
                onChange={(e) => set("guardian_phone", e.target.value)}
              />
            </Field>
            <Field label="البريد الإلكتروني">
              <Input
                type="email"
                value={form.guardian_email}
                onChange={(e) => set("guardian_email", e.target.value)}
              />
            </Field>
          </div>
        </section>

        <Ornament className="my-20" />

        {/* SCHOOL RULES SECTION */}
        <section className="space-y-6">
          <div className="space-y-2 text-center">
            <SectionTitle>نظام المدرسة القرآنية » الفلاح «</SectionTitle>
            <p className="text-sm text-muted-foreground -mt-6 font-medium">
              (وهو القانون الداخلي المعتمد للمدرسة الذي يُرجى الالتزام ببنوده)
            </p>
          </div>

          <div className="space-y-3">
            {SCHOOL_RULES.map((ruleText, idx) => (
              <label
                key={idx}
                htmlFor={`rule-${idx}`}
                className={cn(
                  "flex items-center justify-center gap-4 rounded-xl border p-4 transition-all duration-200 cursor-pointer text-sm leading-relaxed select-none text-center",
                  ruleConsents[idx]
                    ? "border-primary/40 bg-primary/5 text-foreground font-medium"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30"
                )}
              >
                <Checkbox
                  id={`rule-${idx}`}
                  checked={Boolean(ruleConsents[idx])}
                  onCheckedChange={(checked) => {
                    const updated = [...ruleConsents];
                    updated[idx] = Boolean(checked);
                    setRuleConsents(updated);
                  }}
                  className="shrink-0"
                />
                <span className="flex-1 text-center">{ruleText}</span>
              </label>
            ))}
          </div>
        </section>

        <div className="mt-16 space-y-3">
          {!isFormValid && (
            <p className="text-center text-xs text-muted-foreground">
              {!allRulesChecked
                ? "تنبيه: يجب إكمال كافة الحقول الإجبارية والموافقة على جميع بنود نظام المدرسة القرآنية » الفلاح « (القانون الداخلي للمدرسة) لتفعيل زر التسجيل."
                : "تنبيه: يرجى استكمال كافة الحقول الإجبارية وإرفاق الوثائق المطلوبة."}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            disabled={!isFormValid || submitting}
            className={cn(
              "w-full text-base font-bold py-6 transition-all duration-300",
              isFormValid && !submitting
                ? "bg-red-700 hover:bg-red-800 text-white shadow-lg cursor-pointer ring-2 ring-red-700/20"
                : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed border-none opacity-80"
            )}
          >
            {submitting ? "جارٍ الإرسال..." : "تسجيل الطالب"}
          </Button>
        </div>
      </form>

      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        مسجد عائشة — حلقات تحفيظ القرآن الكريم
      </footer>
    </main>
  );
}

