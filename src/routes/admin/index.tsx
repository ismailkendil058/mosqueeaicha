import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileText, LogOut, Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Registration = {
  id: string;
  full_name: string;
  birth_date: string;
  birth_place: string;
  gender: string;
  address: string;
  notes: string | null;
  education_level: string;
  academic_year: string;
  arrival_method: string;
  social_status: string | null;
  family_status: string[] | null;
  siblings_count: number | null;
  vision_issue: boolean;
  hearing_issue: boolean;
  speech_issue: boolean;
  health_conditions: { list?: string[]; other?: string | null } | null;
  guardian_name: string;
  guardian_relation: string;
  guardian_phone: string;
  guardian_email: string | null;
  photo_url: string;
  birth_certificate_url: string;
  status: string;
  created_at: string;
};

const STATUSES = ["pending", "reviewed", "accepted", "rejected"] as const;
const STATUS_LABEL: Record<string, string> = {
  pending: "قيد الانتظار",
  reviewed: "تمت المراجعة",
  accepted: "مقبول",
  rejected: "مرفوض",
};
const LEVELS = ["تحضيري", "الابتدائي", "المتوسط", "الثانوي", "جامعي"];

export const Route = createFileRoute("/admin/")({
  ssr: false,
  beforeLoad: async () => {
    const isDirect = typeof window !== "undefined" && localStorage.getItem("direct_admin_access") === "true";
    if (isDirect) return;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/admin/login" });
  },
  head: () => ({
    meta: [
      { title: "لوحة التسجيلات — مسجد عائشة أم المؤمنين أولاد هداج" },
      { name: "description", content: "متابعة طلبات التسجيل في المدرسة القرآنية." },
      { property: "og:title", content: "لوحة التسجيلات — مسجد عائشة أم المؤمنين أولاد هداج" },
      { property: "og:description", content: "فضاء إداري لمتابعة طلبات التسجيل." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

function useSignedUrl(bucket: string, path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!path) {
      setUrl(null);
      return;
    }
    setUrl(null);
    if (/^https?:\/\//i.test(path)) {
      setUrl(path);
      return;
    }
    const storage = supabase.storage.from(bucket);
    storage.createSignedUrl(path, 3600).then(({ data, error }) => {
      if (!active) return;
      if (data?.signedUrl) {
        setUrl(data.signedUrl);
      } else if (error) {
        setUrl(storage.getPublicUrl(path).data.publicUrl);
      }
    });
    return () => {
      active = false;
    };
  }, [bucket, path]);
  return url;
}

function StorageImage({
  url,
  alt,
  className,
}: {
  url: string | null;
  alt: string;
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);

  if (!url || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center text-center text-xs text-muted-foreground">
        الصورة غير متاحة
      </div>
    );
  }
  return <img src={url} alt={alt} className={className} onError={() => setFailed(true)} />;
}

function PhotoPlaceholder({ gender }: { gender: string }) {
  const isGirl = gender === "أنثى";

  return (
    <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl border ${isGirl ? "border-pink-200 bg-pink-50" : "border-blue-200 bg-blue-50"}`}>
      <span role="img" aria-label={isGirl ? "فتاة" : "فتى"} className="text-[27px] leading-none">
        {isGirl ? "👧" : "👦"}
      </span>
    </div>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [selected, setSelected] = useState<Registration | null>(null);
  const [certificateOpen, setCertificateOpen] = useState(false);
  const [downloadingCertificate, setDownloadingCertificate] = useState(false);

  useEffect(() => {
    // Remove registration copies left by older versions that used localStorage.
    localStorage.removeItem("local_registrations");
  }, []);

  const { data: remoteData, isLoading, isError } = useQuery({
    queryKey: ["registrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("Supabase fetch warning:", error);
        throw error;
      }
      return (data ?? []) as unknown as Registration[];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const photoUrl = useSignedUrl("student-photos", selected?.photo_url);
  const certUrl = useSignedUrl("birth-certificates", selected?.birth_certificate_url);
  const certificateIsPdf = selected?.birth_certificate_url.toLowerCase().split("?")[0].endsWith(".pdf") ?? false;

  const registrations = remoteData ?? [];

  const rows = useMemo(() => {
    const q = search.trim();
    return registrations.filter((r) => {
      const matchQ =
        !q || r.full_name.includes(q) || r.guardian_phone.includes(q) || r.guardian_name.includes(q);
      const matchLevel = levelFilter === "all" || r.education_level === levelFilter;
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      const matchGender = genderFilter === "all" || r.gender === genderFilter;
      return matchQ && matchLevel && matchStatus && matchGender;
    });
  }, [registrations, search, levelFilter, statusFilter, genderFilter]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("registrations").update({ status }).eq("id", id);
    if (error) {
      console.warn("Supabase update warning:", error);
      toast.error("Could not update registration. Please try again.");
      return;
    }
    toast.success("تم تحديث الحالة");
    setSelected((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
    queryClient.setQueryData<Registration[]>(["registrations"], (current) =>
      current?.map((registration) =>
        registration.id === id ? { ...registration, status } : registration,
      ),
    );
  };

  const downloadCertificate = async () => {
    if (!selected?.birth_certificate_url) return;
    setDownloadingCertificate(true);
    try {
      const { data, error } = await supabase.storage
        .from("birth-certificates")
        .createSignedUrl(selected.birth_certificate_url, 60, { download: true });
      if (error || !data?.signedUrl) throw error ?? new Error("Download URL unavailable");
      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = "birth-certificate";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error("تعذر تحميل مستخرج شهادة الميلاد");
    } finally {
      setDownloadingCertificate(false);
    }
  };

  const exportCsv = () => {
    const list = rows;
    const headers = [
      "الاسم الكامل",
      "تاريخ الميلاد",
      "مكان الميلاد",
      "الجنس",
      "العنوان",
      "المستوى",
      "السنة",
      "طريقة الوصول",
      "الوضعية الاجتماعية",
      "الحالة العائلية",
      "عدد الإخوة",
      "ضعف البصر",
      "ضعف السمع",
      "صعوبة النطق",
      "حالات صحية",
      "أمراض أخرى",
      "ولي الأمر",
      "صلة القرابة",
      "الهاتف",
      "البريد",
      "الحالة",
      "تاريخ الإرسال",
      "ملاحظات",
    ];
    const lines = list.map((r) =>
      [
        r.full_name,
        r.birth_date,
        r.birth_place,
        r.gender,
        r.address,
        r.education_level,
        r.academic_year,
        r.arrival_method,
        r.social_status ?? "",
        (r.family_status ?? []).join(" / "),
        r.siblings_count ?? "",
        r.vision_issue ? "نعم" : "لا",
        r.hearing_issue ? "نعم" : "لا",
        r.speech_issue ? "نعم" : "لا",
        (r.health_conditions?.list ?? []).join(" / "),
        r.health_conditions?.other ?? "",
        r.guardian_name,
        r.guardian_relation,
        r.guardian_phone,
        r.guardian_email ?? "",
        STATUS_LABEL[r.status] ?? r.status,
        new Date(r.created_at).toLocaleString("ar"),
        r.notes ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = "\uFEFF" + [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const signOut = async () => {
    localStorage.removeItem("direct_admin_access");
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl text-foreground">طلبات التسجيل</h1>
          <p className="mt-1 text-sm text-muted-foreground">مسجد عائشة أم المؤمنين أولاد هداج — المدرسة القرآنية</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            تصدير CSV
          </Button>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            خروج
          </Button>
        </div>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="relative">
          <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الهاتف"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pe-9"
          />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger>
            <SelectValue placeholder="المستوى" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المستويات</SelectItem>
            {LEVELS.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={genderFilter} onValueChange={setGenderFilter}>
          <SelectTrigger>
            <SelectValue placeholder="الجنس" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كلا الجنسين</SelectItem>
            <SelectItem value="ذكر">ذكر</SelectItem>
            <SelectItem value="أنثى">أنثى</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">الصورة</TableHead>
              <TableHead className="text-center">الطالب</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
              <TableHead className="text-center">تاريخ الإرسال</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  جارٍ التحميل...
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-destructive">
                  Could not load registrations from Supabase. Please try again.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  لا توجد طلبات تسجيل.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow
                key={r.id}
                onClick={() => setSelected(r)}
                className="cursor-pointer"
              >
                <TableCell className="text-center">
                  <PhotoPlaceholder gender={r.gender} />
                </TableCell>
                <TableCell className="text-center font-semibold">{r.full_name}</TableCell>
                <TableCell className="text-center">
                  {r.status === "accepted" ? (
                    <a
                      href={`sms:${r.guardian_phone.trim().replace(/[\s().-]/g, "")}?body=${encodeURIComponent(`تم بحمد الله قبول التسجيل في المدرسة القرآنية للطالب(ة) ${r.full_name} — إعطي وقتك للقرآن يعطيك البركة في وقتك`)}`}
                      onClick={(event) => event.stopPropagation()}
                      className="font-semibold text-green-700 underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
                    >
                      {STATUS_LABEL[r.status]}
                    </a>
                  ) : (
                    <span className="text-primary">{STATUS_LABEL[r.status] ?? r.status}</span>
                  )}
                </TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("ar")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!selected}
        onOpenChange={(o) => {
          if (!o) {
            setSelected(null);
            setCertificateOpen(false);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-primary">{selected?.full_name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-6 text-sm">
              <div className="space-y-2">
                <Label>صورة الطالب</Label>
                <div className="mx-auto flex min-h-44 max-w-sm justify-center overflow-hidden rounded-2xl border border-border bg-secondary">
                  <StorageImage
                    url={photoUrl}
                    alt={selected.full_name}
                    className="max-h-72 w-full object-contain"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>حالة الملف</Label>
                <Select
                  value={selected.status}
                  onValueChange={(v) => updateStatus(selected.id, v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ["تاريخ الميلاد", selected.birth_date],
                  ["مكان الميلاد", selected.birth_place],
                  ["الجنس", selected.gender],
                  ["العنوان", selected.address],
                  ["المستوى الدراسي", selected.education_level],
                  ["السنة الدراسية", selected.academic_year],
                  ["طريقة الوصول", selected.arrival_method],
                  ["الوضعية الاجتماعية", selected.social_status ?? "—"],
                  ["الحالة العائلية", selected.family_status?.join("، ") || "—"],
                  ["عدد الإخوة", selected.siblings_count ?? "—"],
                  ["ضعف في البصر", selected.vision_issue ? "نعم" : "لا"],
                  ["ضعف في السمع", selected.hearing_issue ? "نعم" : "لا"],
                  ["صعوبة في النطق", selected.speech_issue ? "نعم" : "لا"],
                  ["اسم ولي الأمر", selected.guardian_name],
                  ["صلة القرابة", selected.guardian_relation],
                  ["رقم الهاتف", selected.guardian_phone],
                  ["البريد الإلكتروني", selected.guardian_email ?? "—"],
                  [
                    "حالات صحية",
                    (selected.health_conditions?.list ?? []).join(" / ") || "—",
                  ],
                  ["أمراض أخرى", selected.health_conditions?.other ?? "—"],
                  ["ملاحظات", selected.notes ?? "—"],
                  ["تاريخ الإرسال", new Date(selected.created_at).toLocaleString("ar")],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-border bg-background p-3">
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="mt-1">{v}</dd>
                  </div>
                ))}
              </dl>

              {certUrl && (
                <Button type="button" variant="outline" onClick={() => setCertificateOpen(true)}>
                  <FileText className="h-4 w-4" />
                  مستخرج شهادة الميلاد
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={certificateOpen} onOpenChange={setCertificateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-primary">مستخرج شهادة الميلاد</DialogTitle>
          </DialogHeader>
          {certUrl && certificateIsPdf ? (
            <iframe
              src={certUrl}
              title="مستخرج شهادة الميلاد"
              className="h-[65vh] w-full rounded-xl border border-border"
            />
          ) : certUrl ? (
            <div className="mx-auto flex min-h-44 max-w-2xl justify-center overflow-hidden rounded-xl border border-border bg-secondary">
              <StorageImage
                url={certUrl}
                alt="مستخرج شهادة الميلاد"
                className="max-h-[65vh] max-w-full object-contain"
              />
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button type="button" onClick={downloadCertificate} disabled={downloadingCertificate}>
              <Download className="h-4 w-4" />
              {downloadingCertificate ? "جارٍ التحميل..." : "تحميل مستخرج شهادة الميلاد"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
