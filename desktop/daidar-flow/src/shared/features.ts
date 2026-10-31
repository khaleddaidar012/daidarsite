export type FeatureId =
  | "inventory"
  | "sales"
  | "pos"
  | "analytics"
  | "suppliers"
  | "employees"
  | "encryption"
  | "cloud-backup";
export interface Feature {
  id: FeatureId;
  title: string;
  description: string;
  icon: string;
  tier: "free" | "paid";
}
export const features: readonly Feature[] = [
  {
    id: "inventory",
    title: "المخزون",
    description: "إدارة المنتجات والكميات وحركة المخزون.",
    icon: "Package",
    tier: "free",
  },
  {
    id: "sales",
    title: "المبيعات",
    description: "تسجيل المبيعات وإدارة الفواتير.",
    icon: "ShoppingCart",
    tier: "free",
  },
  {
    id: "pos",
    title: "الكاشير POS",
    description: "واجهة بيع سريعة للمحلات.",
    icon: "Monitor",
    tier: "free",
  },
  {
    id: "analytics",
    title: "تحليل المبيعات",
    description: "تقارير وإحصائيات وتحليل أداء المبيعات.",
    icon: "ChartColumn",
    tier: "paid",
  },
  {
    id: "suppliers",
    title: "حسابات الموردين",
    description: "إدارة الموردين والمستحقات والحسابات.",
    icon: "Truck",
    tier: "paid",
  },
  {
    id: "employees",
    title: "إدارة الموظفين",
    description: "إدارة الموظفين والصلاحيات.",
    icon: "Users",
    tier: "paid",
  },
  {
    id: "encryption",
    title: "تشفير البيانات المتقدم",
    description: "أدوات إضافية لحماية البيانات الحساسة.",
    icon: "ShieldCheck",
    tier: "paid",
  },
  {
    id: "cloud-backup",
    title: "النسخ الاحتياطي أونلاين",
    description: "حفظ نسخ احتياطية آمنة على السحابة.",
    icon: "CloudUpload",
    tier: "paid",
  },
];
export function featureAccess(input: unknown) {
  const feature = features.find((item) => item.id === input);
  if (!feature) return { status: "invalid" as const };
  return {
    status:
      feature.tier === "free" ? ("coming-soon" as const) : ("locked" as const),
    title: feature.title,
  };
}
