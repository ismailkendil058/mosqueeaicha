import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, LogOut, Search } from "lucide-react";

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
const LEVELS = ["تحضيري", "الابتدائي", "المتوسط", "الثانوي"];

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
      { title: "لوحة التسجيلات — مسجد عائشة" },
      { name: "description", content: "متابعة طلبات التسجيل في حلقات تحفيظ القرآن الكريم." },
      { property: "og:title", content: "لوحة التسجيلات — مسجد عائشة" },
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
    supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (active) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [bucket, path]);
  return url;
}

function Thumb({ path }: { path: string }) {
  const url = useSignedUrl("student-photos", path);
  return (
    <div className="h-12 w-12 overflow-hidden rounded-xl border border-border bg-secondary">
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
    </div>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Registration | null>(null);

  const { data: remoteData, isLoading } = useQuery({
    queryKey: ["registrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("Supabase fetch warning:", error);
        return [];
      }
      return (data ?? []) as unknown as Registration[];
    },
  });

  const photoUrl = useSignedUrl("student-photos", selected?.photo_url);
  const certUrl = useSignedUrl("birth-certificates", selected?.birth_certificate_url);

  const mergedData = useMemo(() => {
    let local: Registration[] = [];
    try {
      local = JSON.parse(localStorage.getItem("local_registrations") || "[]");
    } catch {
      local = [];
    }
    const map = new Map<string, Registration>();
    local.forEach((r) => map.set(r.id, r));
    (remoteData ?? []).forEach((r) => map.set(r.id, r));

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [remoteData]);

  const rows = useMemo(() => {
    const q = search.trim();
    return mergedData.filter((r) => {
      const matchQ =
        !q || r.full_name.includes(q) || r.guardian_phone.includes(q) || r.guardian_name.includes(q);
      const matchLevel = levelFilter === "all" || r.education_level === levelFilter;
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      return matchQ && matchLevel && matchStatus;
    });
  }, [mergedData, search, levelFilter, statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const local: Registration[] = JSON.parse(localStorage.getItem("local_registrations") || "[]");
      const updated = local.map((r) => (r.id === id ? { ...r, status } : r));
      localStorage.setItem("local_registrations", JSON.stringify(updated));
    } catch {
      // ignore
    }
    await supabase.from("registrations").update({ status }).eq("id", id);
    toast.success("تم تحديث الحالة");
    setSelected((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
    queryClient.invalidateQueries({ queryKey: ["registrations"] });
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
          <p className="mt-1 text-sm text-muted-foreground">مسجد عائشة — حلقات تحفيظ القرآن الكريم</p>
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
              <TableHead className="text-right">الصورة</TableHead>
              <TableHead className="text-right">الطالب</TableHead>
              <TableHead className="text-right">ولي الأمر</TableHead>
              <TableHead className="text-right">الهاتف</TableHead>
              <TableHead className="text-right">المستوى</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">تاريخ الإرسال</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  جارٍ التحميل...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
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
                <TableCell>
                  <Thumb path={r.photo_url} />
                </TableCell>
                <TableCell className="font-semibold">{r.full_name}</TableCell>
                <TableCell>{r.guardian_name}</TableCell>
                <TableCell dir="ltr" className="text-right">
                  {r.guardian_phone}
                </TableCell>
                <TableCell>
                  {r.education_level} — {r.academic_year}
                </TableCell>
                <TableCell className="text-primary">{STATUS_LABEL[r.status] ?? r.status}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("ar")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-primary">{selected?.full_name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-6 text-sm">
              {photoUrl && (
                <img
                  src={photoUrl}
                  alt={selected.full_name}
                  className="mx-auto max-h-72 rounded-2xl border border-border"
                />
              )}

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
                <a
                  href={certUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-primary underline"
                >
                  عرض / تحميل مستخرج شهادة الميلاد
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
