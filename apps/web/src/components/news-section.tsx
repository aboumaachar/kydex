const news = [
  {
    date: "15 أبريل 2026",
    category: "إعلان",
    title: "افتتاح فرع جديد في المنطقة الشمالية",
    description: "يسر مجلس الكتاب العدل الإعلان عن افتتاح فرع جديد لتقديم خدمات التوثيق في المنطقة الشمالية",
  },
  {
    date: "10 أبريل 2026",
    category: "خدمات",
    title: "إطلاق خدمة الحجز الإلكتروني للمواعيد",
    description: "أصبح بإمكانكم الآن حجز مواعيدكم إلكترونياً عبر موقعنا الرسمي لتوفير وقتكم وجهدكم",
  },
  {
    date: "5 أبريل 2026",
    category: "تحديث",
    title: "تحديث إجراءات التوثيق العقاري",
    description: "تم تحديث إجراءات التوثيق العقاري لتسهيل عملية نقل الملكية وتسريع إنجاز المعاملات",
  },
];

export default function NewsSection() {
  return (
    <section id="news" className="bg-muted/20 py-12">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <span className="inline-block rounded bg-secondary px-3 py-1 text-sm font-medium">آخر الأخبار</span>
            <h2 className="mt-2 text-2xl font-bold">أخبار وتحديثات المجلس</h2>
          </div>
          <a href="#" className="text-sm text-primary">جميع الأخبار</a>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {news.map((item, idx) => (
            <article key={idx} className="rounded border p-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs rounded bg-gray-100 px-2 py-1">{item.category}</span>
                <time className="text-xs text-muted-foreground">{item.date}</time>
              </div>
              <h3 className="font-semibold text-lg">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
