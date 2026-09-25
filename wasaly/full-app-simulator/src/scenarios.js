/* ==========================================================================
   scenarios.js — scenario engine (A–Z) and the problem injector.
   A scenario = a prepared order + scripted behaviour at given moments.
   The injector applies the same incidents to whatever order is live.
   Decision gates are NEVER resolved automatically (founder decisions).
   ========================================================================== */
const FLAG_LINES = [{ pid: 'p101', qty: 1, opts: { size: 'h', add: [] } }, { pid: 'p103', qty: 2, opts: { size: 'l', add: [] } }, { pid: 'p106', qty: 2, opts: {} }]; // 180 + 90 + 30 = 300

/* truth of each analytic case in the manual: executable today / blocked / fails */
const TRUTH = { ok: ['قابلة للتنفيذ اليوم', 'Executable today', 'current'], blocked: ['محجوبة — تحتاج قرار أو بناء', 'Blocked — needs a decision or build', 'decision'], fails: ['تفشل بالقواعد الحالية', 'Fails under current rules', 'problem'], notbuilt: ['غير مبنية حاليًا', 'Not built', 'notbuilt'] };

const SCENARIOS = {
  A: { title: 'طلب طبيعي ناجح', en: 'A normal successful order', icon: 'circle-check', truth: 'ok',
    desc: 'أحمد يطلب من مطعم تجريبي بـ300 + توصيل 25، كاش عند الاستلام. كل حاجة بتمشي في الطريق الطبيعي لحد التقييم.',
    today: 'الدورة دي مدعومة في النظام (OPS_001 — آلة الحالات موجودة في الكود SRC-0012). التسليم بتوقيت + كود تحقق.',
    policy: 'السعر يتعرض مفصول قبل التأكيد، والعمولة وحصة الكابتن بيتقيّدوا عند التسليم بس.',
    open: 'نسبة العمولة (ع%) مش محددة في الدليل — الرقم هنا مثال. وحصة الكابتن 70% قيمة في الكود مش معتمدة.',
    setup: { mid: 'm1', lines: FLAG_LINES, pay: 'cash', cashNote: 'exact', captain: 'k1' }, pol: ['OPS_001', 'CUSTOMER_001', 'FIN_001', 'CAPTAIN_005'], inc: [], scn: [] },
  B: { title: 'العميل رفض أوردر كاش', en: 'Customer refuses a cash order', icon: 'ban', flagship: true, truth: 'blocked',
    desc: 'WS-10428: أحمد، مطعم تجريبي، 300 ج أكل + 25 توصيل كاش. الكابتن محمد مشي 3 كم ووصل — وأحمد قال «مش عايزه خلاص».',
    today: 'الكابتن عنده زر «تعذّر التسليم» بيبعت تصعيد للعمليات بس (SRC-0016): مفيش حالة نهائية، ولا أثر مالي، ولا مصير بضاعة، ولا مؤقّت، ولا إشعار للعميل. الطلب يفضل «في الطريق».',
    policy: 'CUSTOMER_003 / OPS_002: محاولة حقيقية، اتصال مستقل من العمليات، فرضيات خمسة، ممنوع دين على العميل، ممنوع خصم من الكابتن، والإغلاق المؤقت = إلغاء عمليات موسوم «فشل تسليم».',
    open: 'مصير الأكل والفلوس (FDR-0001) وتعويض الكابتن عن المشوار (FDR-0002) — مفيش قرار. الدليل ما بيختارش.',
    setup: { mid: 'm1', lines: FLAG_LINES, pay: 'cash', cashNote: 'exact', captain: 'k1', atDoor: 'refuse', opsCall: 'confirms', words: 'مش عايزه خلاص، غيّرت رأيي' },
    pol: ['CUSTOMER_003', 'OPS_002', 'CAPTAIN_005', 'CAPTAIN_006', 'FIN_007', 'MERCHANT_007'], fdr: ['FDR-0001', 'FDR-0002'], inc: ['INC-0001'], scn: ['SCN-001'], cfl: ['CFL-0004', 'CFL-0008'] },
  C: { title: 'العميل لا يرد', en: 'Customer does not answer', icon: 'phone-missed', truth: 'blocked',
    desc: 'الكابتن وصل واتصل ومفيش رد. عدد المحاولات ومدة الانتظار مش متحددين.',
    today: 'نفس مسار التصعيد بس. سجل محاولات الاتصال موجود جزئيًا — ومدة الانتظار مش متسجلة.',
    policy: 'الهاتف المغلق مش دليل على تعمّد. العمليات تتصل من رقم تاني (إلزامي). الوصف المحايد «تعذّر التسليم» مش «رفض».',
    open: 'عدد المحاولات (PAR-0001) ومدة الانتظار (PAR-0002) ومصير الأكل (FDR-0001) وتعويض الكابتن (FDR-0002).',
    setup: { mid: 'm1', lines: FLAG_LINES, pay: 'cash', cashNote: 'exact', captain: 'k1', atDoor: 'no_answer', opsCall: 'no_answer' },
    pol: ['CUSTOMER_003', 'OPS_002'], fdr: ['FDR-0001', 'FDR-0002'], inc: ['INC-0002'], scn: ['SCN-002'], par: ['PAR-0001', 'PAR-0002'] },
  D: { title: 'عنوان خاطئ', en: 'Wrong address', icon: 'map-pin-off', truth: 'blocked',
    desc: 'الكابتن وصل للإحداثيات لقى أرض فاضية. العميل ما ردش أول مرة — بعدين العمليات وصلته ووصف معلم.',
    today: 'العنوان نص + نقطة على الخريطة. مفيش حقل معلم إلزامي، ومفيش إعادة توجيه مسجلة.',
    policy: 'ممنوع تحميل العميل قبل ما نثبت إن نظام العناوين نفسه صالح لسمالوط (الفصل 59). المسافة الزيادة على المنصّة.',
    open: 'جودة العناوين في سمالوط (LDG-0005) — والتوزيع المالي لو فشل (FDR-0001).',
    setup: { mid: 'm1', lines: FLAG_LINES, pay: 'cash', cashNote: 'exact', captain: 'k1', atDoor: 'wrong_address', opsCall: 'landmark' },
    pol: ['CUSTOMER_003', 'OPS_002'], fdr: ['FDR-0001'], inc: ['INC-0003'], scn: ['SCN-003'] },
  E: { title: 'المستلم مختلف عن المشتري', en: 'Recipient differs from buyer', icon: 'users', truth: 'blocked',
    desc: 'أحمد طلب أكل لوالدته سعاد. سعاد فتحت وقالت «أنا ماطلبتش حاجة».',
    today: 'النظام يعرف حساب واحد — المستلم مش كيان منفصل (CUSTOMER_007 غير محقَّقة).',
    policy: 'المشتري صاحب القرار، المستلم صاحب الحيازة. امتناع المستلم مش إلغاء من المشتري — نتصل بالمشتري الأول.',
    open: 'مين يدفع لو كاش والمستلم مش معاه فلوس؟ ممنوع إحراجه — القرار للمشتري.',
    setup: { mid: 'm1', lines: FLAG_LINES, pay: 'cash', cashNote: 'exact', captain: 'k1', atDoor: 'recipient_refuse', opsCall: 'buyer_approves', rcp: { mode: 'other', name: 'سعاد (والدة أحمد)', phone: '012•• ••• 3390', rel: 'أم', hidePrice: false, payer: 'recipient', notes: 'رنّي الجرس مرتين', addrId: 'a3' } },
    pol: ['CUSTOMER_007', 'CUSTOMER_003'], inc: ['INC-0004'], scn: ['SCN-008'] },
  F: { title: 'التاجر خلص منه صنف', en: 'Item out of stock', icon: 'package-x', truth: 'ok',
    desc: 'بعد القبول، المطعم لقى إن الكركديه خلص.',
    today: 'مفيش شاشة «طلب بديل» متأكدين منها في الدليل — العلاج بموافقة العميل (يدوي).',
    policy: 'البديل ما يتفرضش حتى لو أحسن وأغلى. العميل يختار: بديل، أو حذف ورد القيمة، أو إلغاء كامل.',
    open: 'مين بيكلّم العميل وإزاي وبأي سرعة؟ مش مبني كشاشة.',
    setup: { mid: 'm1', lines: FLAG_LINES, pay: 'cash', cashNote: 'exact', captain: 'k1', itemOut: 'p106' },
    pol: ['MERCHANT_003', 'MERCHANT_005'], inc: ['INC-0023'], scn: ['SCN-023'] },
  G: { title: 'التاجر متأخر', en: 'Merchant is late', icon: 'hourglass', truth: 'ok',
    desc: 'التحضير أخد أطول بكتير من المتوقع.',
    today: 'سجل الانتقالات موجود ويبيّن فين الوقت ضاع — ده أقوى دليل متاح.',
    policy: 'نبلّغ العميل بالوضع الحقيقي فور رصده، ونعرض: الانتظار أو التعديل أو الإلغاء برد كامل. ولا يتحمّل العميل أو الكابتن حاجة.',
    open: 'هل الوقت المعروض «موعد متفق عليه» قانونيًا؟ (VAL-0003)',
    setup: { mid: 'm1', lines: FLAG_LINES, pay: 'cash', cashNote: 'exact', captain: 'k1', merchantLate: true },
    pol: ['MERCHANT_005', 'CUSTOMER_002'], inc: ['INC-0011'], scn: ['SCN-009', 'SCN-022'], val: ['VAL-0003'] },
  H: { title: 'التاجر قفل فجأة', en: 'Merchant closes suddenly', icon: 'door-open', truth: 'ok',
    desc: 'المطعم قفل وعنده طلب قيد التحضير.',
    today: 'حالة المتجر موجودة جزئيًا. الطلبات القائمة مش بتتقفل تلقائي.',
    policy: 'الطلبات القائمة وقت الإغلاق تتكمّل أو تتلغي برد كامل — ولا تفضل معلّقة (20-3).',
    open: '—',
    setup: { mid: 'm1', lines: FLAG_LINES, pay: 'cash', cashNote: 'exact', captain: 'k1', merchantCloses: true },
    pol: ['MERCHANT_002'], inc: ['INC-0022'], scn: ['SCN-028'] },
  I: { title: 'الكابتن رفض العرض', en: 'Captain rejects the offer', icon: 'x', truth: 'ok',
    desc: 'محمد رفض العرض الأول — العرض راح لكابتن تاني.',
    today: 'الكود متسق مع نموذج المقاول: مفيش قياس معدل قبول (SRC-0015).',
    policy: 'الرفض حق ومالوش أثر مالي ولا جزاء. تقليل العروض على كابتن بسبب رفضه = جزاء بطريق غير مباشر.',
    open: 'شرط قبول 80% في الاتفاقية (FDR-0004) — لازم يتحسم قبل بناء أي قياس.',
    setup: { mid: 'm1', lines: FLAG_LINES, pay: 'cash', cashNote: 'exact', captain: 'k1', rejectFirst: true },
    pol: ['CAPTAIN_003', 'CAPTAIN_001'], fdr: ['FDR-0004'], inc: ['INC-0028'], scn: ['SCN-029'] },
  J: { title: 'الكابتن ألغى بعد القبول', en: 'Captain cancels after accepting', icon: 'undo-2', truth: 'notbuilt',
    desc: 'محمد قبل وبعدين اعتذر في الطريق للمطعم.',
    today: 'CAPTAIN_004 غير مبنية: إعادة الإسناد والإخطار يدوي.',
    policy: 'إعادة التوزيع فورًا، وإخطار العميل بالتأخير الحقيقي. ولا خصم من الكابتن.',
    open: 'الإلغاء المتكرر بلا سبب: مراجعة بشرية، مش جزاء تلقائي.',
    setup: { mid: 'm1', lines: FLAG_LINES, pay: 'cash', cashNote: 'exact', captain: 'k1', captainCancels: true },
    pol: ['CAPTAIN_004'], inc: ['INC-0029'], scn: ['SCN-037'] },
  K: { title: 'الموتوسيكل اتعطل', en: 'Motorbike breaks down', icon: 'wrench', truth: 'ok',
    desc: 'محمد استلم الأكل وفي نص الطريق الموتوسيكل عطل.',
    today: 'مفيش إجراء «تسليم بين كابتنين» ولا إثبات حالة للأكل.',
    policy: 'عطل المركبة سبب مشروع — تسجيل بس. ولا يتحمّل الكابتن قيمة الطلب.',
    open: 'الأكل الساخن بيبرد: هل يكمل ولا يتعمل من جديد؟ مين يقرر ومين يدفع؟',
    setup: { mid: 'm1', lines: FLAG_LINES, pay: 'cash', cashNote: 'exact', captain: 'k1', breakdown: true },
    pol: ['CAPTAIN_004', 'CAPTAIN_008'], inc: ['INC-0029'], scn: ['SCN-034'] },
  L: { title: 'العميل مش موجود', en: 'Customer not at home', icon: 'door-open', truth: 'ok',
    desc: 'الكابتن وصل، وأحمد رد: «أنا برّه، سيبه مع البواب».',
    today: 'مفيش تعليمة ترك مسجلة في النظام.',
    policy: 'طلب كاش ما يتسابش من غير دفع. والترك مع جار محتاج تعليمة صريحة مسجلة من المشتري وتنتقل بيها التبعة ليه (35-2).',
    open: 'مدة الانتظار (PAR-0002).',
    setup: { mid: 'm1', lines: FLAG_LINES, pay: 'cash', cashNote: 'exact', captain: 'k1', atDoor: 'not_home' },
    pol: ['CAPTAIN_005', 'CUSTOMER_003'], inc: ['INC-0002'], scn: ['SCN-012'] },
  M: { title: 'مشكلة فكة', en: 'No change', icon: 'coins', truth: 'ok',
    desc: 'أحمد معاه ورقة 500 والطلب 325. الكابتن معاه فكة 100 بس.',
    today: 'مفيش أداة فكة في النظام.',
    policy: 'الفكة مسؤولية المنصّة، مش العميل ولا الكابتن. ممنوع الكابتن يسيب الطلب من غير تحصيل بقراره لوحده.',
    open: 'أي «ائتمان فكة» على المنصّة = رصيد → محجوب لحد FDR-0010.',
    setup: { mid: 'm1', lines: FLAG_LINES, pay: 'cash', cashNote: '500', captain: 'k1', captainChange: 100 },
    pol: ['FIN_001', 'CUSTOMER_003'], fdr: ['FDR-0010'], inc: ['INC-0009'], scn: ['SCN-007'] },
  N: { title: 'اختلاف في قيمة الكاش', en: 'Cash amount mismatch', icon: 'scale', truth: 'blocked',
    desc: 'آخر اليوم محمد ورّد أقل من المتوقع بـ20 جنيه — وكمان عميل بيقول «اديتك 400» والكابتن بيقول «200».',
    today: 'مطابقة الكاش موجودة في الكود (SRC-0018). مفيش قاعدة للفرق.',
    policy: 'اسمه «فرق» مش «عجز». ولا خصم ولا حجز من الكابتن قبل رأي المحامي (VAL-0011).',
    open: 'فرق النقد (FDR-0005) وحد الإعدام (PAR-0021) — والإعدام محظور لحد ما يبقى فيه شخص تاني (AUT-0006).',
    setup: { mid: 'm1', lines: FLAG_LINES, pay: 'cash', cashNote: 'exact', captain: 'k1', cashDiff: 20 },
    pol: ['CAPTAIN_006', 'FIN_006', 'FIN_007'], fdr: ['FDR-0005'], inc: ['INC-0032', 'INC-0009'], scn: ['SCN-031'] },
  O: { title: 'الدفع الإلكتروني فشل', en: 'Electronic payment fails', icon: 'credit-card', truth: 'notbuilt',
    desc: 'أحمد جرّب يدفع بالكارت (محاكاة) والعملية فشلت.',
    today: 'مفيش مسار دفع إلكتروني شغال (الدليل: «لا يوجد مسار دفع إلكتروني يعمل»).',
    policy: 'ما يتعملش طلب مؤكد قبل تأكيد الدفع، وأي مبلغ محجوز يرجع بنفس الوسيلة.',
    open: 'بناء الدفع الإلكتروني نفسه + قواعد البنك المركزي.',
    setup: { mid: 'm1', lines: FLAG_LINES, pay: 'card', payFails: true, captain: 'k1', noAutoPlace: true },
    pol: ['FIN_002', 'LEGAL_004'], inc: ['INC-0036'], scn: [] },
  P: { title: 'اتخصم ومتأكدش الطلب', en: 'Charged but not confirmed', icon: 'receipt', truth: 'ok',
    desc: 'البنك بعت رسالة خصم 325 — والتطبيق قال الطلب ما اتأكدش.',
    today: 'الدفع الإلكتروني نفسه غير مبني — الحالة دي محاكاة لمخاطرة مستقبلية.',
    policy: 'نتحقق من سجل الدفع قبل أي وعد، ونرد كامل بنفس الوسيلة (INC-0016). ما نحيلش العميل لمزوّد الدفع.',
    open: '—',
    setup: { mid: 'm1', lines: FLAG_LINES, pay: 'card', chargedNoOrder: true, captain: 'k1', noAutoPlace: true },
    pol: ['FIN_002', 'CUSTOMER_004'], inc: ['INC-0016'], scn: ['SCN-018'] },
  Q: { title: 'منتج ناقص', en: 'Missing item', icon: 'package-x', truth: 'fails',
    desc: 'الطلب وصل من غير كركديه (15 ج).',
    today: 'الكود بيحوّل استرداد طلبات الكاش لقسيمة رصيد افتراضيًا (SRC-0014) — ده بيخالف القاعدة 12-2.',
    policy: 'نرجّع قيمة الصنف فورًا، من غير ما نطلب صورة لقيمة صغيرة، وبعدين ندوّر مين المسؤول.',
    open: 'حد صلاحية الاسترداد مش محدد (PAR-0004) → المؤسس يعتمد كل استرداد. ومسار صرف كاش للعميل مش موجود.',
    setup: { mid: 'm1', lines: FLAG_LINES, pay: 'cash', cashNote: 'exact', captain: 'k1', after: 'missing' },
    pol: ['CUSTOMER_004', 'FIN_002', 'FIN_008'], fdr: ['FDR-0010'], inc: ['INC-0013'], scn: ['SCN-013', 'SCN-016'], cfl: ['CFL-0002'] },
  R: { title: 'منتج غلط', en: 'Wrong item', icon: 'shuffle', truth: 'ok',
    desc: 'وصل كشري صغير بدل الكبير.',
    today: 'نفس مسار الاسترداد (والقسيمة في الكاش).',
    policy: 'استبدال أو رد كامل باختيار العميل — ومن غير أي تكلفة إضافية عليه.',
    open: 'هل ينفع نحصّل رسوم توصيل على البديل؟ سؤال للمحامي (VAL-0002).',
    setup: { mid: 'm1', lines: FLAG_LINES, pay: 'cash', cashNote: 'exact', captain: 'k1', after: 'wrong' },
    pol: ['CUSTOMER_004'], inc: ['INC-0014'], scn: [], val: ['VAL-0002'] },
  S: { title: 'منتج تالف', en: 'Damaged item', icon: 'package-x', truth: 'ok',
    desc: 'علبة الكشري اتقلبت في الشنطة.',
    today: 'مفيش إثبات استلام يوضح حالة التغليف (الفصل 22).',
    policy: 'رد كامل، ومش هنطلب نرجّع أكل تالف. الحق الأول، والمسؤولية بعدين.',
    open: 'مين المسؤول — التغليف ولا النقل؟ من غير قائمة موقّعة الحكم بالظن.',
    setup: { mid: 'm1', lines: FLAG_LINES, pay: 'cash', cashNote: 'exact', captain: 'k1', after: 'damaged' },
    pol: ['CUSTOMER_004', 'MERCHANT_004'], inc: ['INC-0014'], scn: ['SCN-019'] },
  T: { title: 'شكوى سلامة غذاء', en: 'Food safety complaint', icon: 'heart-pulse', truth: 'blocked',
    desc: 'أحمد بلّغ إنه تعب بعد الأكل.',
    today: 'MERCHANT_006 غير مبنية: مفيش إيقاف صنف تلقائي ولا حصر للي اشتروا نفس الصنف.',
    policy: 'الصحة الأول. نوقف الصنف فورًا (حماية مش إدانة)، نبلّغ المؤسس، نحصر اللي أخدوا نفس الصنف، ونرد الفلوس فورًا منفصل عن التحقيق.',
    open: 'هل وصّلي ملزمة تبلّغ جهاز حماية المستهلك؟ (VAL-0005)',
    setup: { mid: 'm1', lines: FLAG_LINES, pay: 'cash', cashNote: 'exact', captain: 'k1', after: 'food_safety' },
    pol: ['MERCHANT_006', 'OPS_007', 'LEGAL_003'], inc: ['INC-0015'], scn: ['SCN-017', 'SCN-073'], val: ['VAL-0005'] },
  U: { title: 'مشكلة GPS', en: 'GPS problem', icon: 'locate-off', truth: 'ok',
    desc: 'موقع الكابتن ضعيف وبعدين وقف يتحدّث.',
    today: 'الموقع والتوقيت متسجلين (الدليل: موقع الكابتن «نعم»).',
    policy: 'قفزة موقع غير منطقية = إشارة بس، ولا إجراء تلقائي (INC-0035).',
    open: 'إزاي نعرض للعميل وقت مش مؤكد من غير ما نكذب؟',
    setup: { mid: 'm1', lines: FLAG_LINES, pay: 'cash', cashNote: 'exact', captain: 'k1', gpsIssue: true },
    pol: ['OPS_006', 'RISK_004'], inc: ['INC-0035'], scn: ['SCN-036'] },
  V: { title: 'الإنترنت قطع', en: 'Internet drops', icon: 'wifi-off', truth: 'ok',
    desc: 'نت أحمد قطع والطلب شغال.',
    today: 'غير محقَّق إزاي التطبيق بيتصرف أوفلاين.',
    policy: 'ما يتسابش طلب معلّق من غير قرار ولا إخطار. أثناء الانقطاع القناة هي التليفون.',
    open: '—',
    setup: { mid: 'm1', lines: FLAG_LINES, pay: 'cash', cashNote: 'exact', captain: 'k1', offlineMid: true },
    pol: ['OPS_006', 'CUSTOMER_008'], inc: ['INC-0046'], scn: [] },
  W: { title: 'خدمة وصّلي تعطلت', en: 'Wasaly service outage', icon: 'server-crash', truth: 'ok',
    desc: 'السيستم وقع 40 دقيقة وفيه طلبات شغالة.',
    today: 'OPS_006 مدعومة جزئيًا. التشغيل بالتليفون يدوي.',
    policy: 'نوقف الطلبات الجديدة، ونكمّل القائمة بالتليفون، ونبلّغ الناس (MSG-C-014 / MSG-M-012). استرداد كامل لأي طلب ما اتنفّذش.',
    open: '—',
    setup: { mid: 'm1', lines: FLAG_LINES, pay: 'cash', cashNote: 'exact', captain: 'k1', outageMid: true },
    pol: ['OPS_006', 'OPS_007'], inc: ['INC-0046'], scn: ['SCN-068'] },
  X: { title: 'طلب لشخص آخر', en: 'Order for someone else', icon: 'gift', truth: 'blocked',
    desc: 'أحمد باعت بوكيه ورد لوالدته وعايز يخفي السعر.',
    today: 'النظام يعرف حساب واحد. والدفع المسبق مش مبني.',
    policy: 'ما يتكشفش سعر الهدية للمستلم لو المشتري طلب إخفاءه (9-4)، والفلوس ترجع للي دفعها.',
    open: 'إخفاء السعر مستحيل مع الكاش: المستلم هيدفع ويعرف السعر. الحل محتاج دفع مسبق (غير مبني).',
    setup: { mid: 'm6', lines: [{ pid: 'p601', qty: 1, opts: {} }, { pid: 'p604', qty: 1, opts: {} }], pay: 'cash', cashNote: 'exact', captain: 'k1', rcp: { mode: 'other', name: 'سعاد (والدة أحمد)', phone: '012•• ••• 3390', rel: 'أم', hidePrice: true, payer: 'recipient', notes: 'هدية — ما تقولش السعر', addrId: 'a3' } },
    pol: ['CUSTOMER_007', 'CUSTOMER_001'], inc: ['INC-0004', 'INC-0043'], scn: ['SCN-008', 'SCN-054'] },
  Y: { title: 'طلب متعدد المتاجر', en: 'Multi-store order', icon: 'split', truth: 'blocked', blocked: 'OPS_003',
    desc: 'أحمد عايز كشري من مطعم تجريبي وكنافة من حلويات القمر في طلب واحد.',
    today: 'الخدمة غير مفعّلة. بنية الطلبات الفرعية غير محقَّقة في النظام.',
    policy: 'كل متجر التزام مستقل: الإلغاء بحالة الطلب الفرعي، ومصير البضاعة لكل صنف.',
    open: 'فترة التنسيق بين المتاجر (PAR-0019) وتقسيم رسوم التوصيل — غير محسومين.',
    setup: { mid: 'm1', lines: [{ pid: 'p103', qty: 1, opts: { size: 'l', add: [] } }], pay: 'cash', cashNote: 'exact', captain: 'k1', multi: [{ mid: 'm4', lines: [{ pid: 'p401', qty: 2, opts: {} }] }], noAutoPlace: true },
    pol: ['OPS_003'], inc: ['INC-0041'], scn: ['SCN-046', 'SCN-047', 'SCN-048'] },
  Z: { title: 'طلب مجدول لمناسبة', en: 'Scheduled occasion order', icon: 'party-popper', truth: 'blocked', blocked: 'OPS_004',
    desc: 'تورتة عيد ميلاد مكتوب عليها «سلمى» بكرة الساعة 6.',
    today: 'الخدمة غير مفعّلة. مفيش مفهوم طاقة استيعابية تتحجز في النظام.',
    policy: 'طلب المناسبة ما يتقبلش بترتيب غير رسمي «على مسؤوليتي» — لأن الضرر على العميل.',
    open: 'أفق الحجز (PAR-0020)، ومصير منتج مخصص لو اترفض (FDR-0001 + FDR-0007).',
    setup: { mid: 'm4', lines: [{ pid: 'p403', qty: 1, opts: {} }], pay: 'cash', cashNote: 'exact', captain: 'k1', scheduled: true, noAutoPlace: true },
    pol: ['OPS_004'], fdr: ['FDR-0007'], inc: ['INC-0042', 'INC-0043'], scn: ['SCN-051', 'SCN-053', 'SCN-054', 'SCN-004'] },
};

/* ------------------------------------------------------------ incidents the injector can fire */
const INJECT = {
  merchant_silent: { ar: 'المتجر مش بيرد على الطلب', en: 'Store not responding', icon: 'bell-ring', when: (o) => o.st === 'placed', inc: 'INC-0022', apply: (o) => { o.script.merchantNoResponse = true; dropPending(o, 'm_accept'); tl(o, { ev: 'inject', actor: 'sim', note: L('محاكاة: المتجر مش بيرد', 'Sim: store not responding'), kind: 'warn' }); } },
  item_out: { ar: 'صنف خلص عند التاجر', en: 'Item runs out', icon: 'package-x', when: (o) => ['accepted', 'preparing'].includes(o.st), inc: 'INC-0023', apply: (o) => SCN_RUNTIME.itemOut(o, o.lines.find((l) => l.state === 'ok').pid) },
  merchant_late: { ar: 'التاجر اتأخر', en: 'Merchant late', icon: 'hourglass', when: (o) => ['accepted', 'preparing'].includes(o.st), inc: 'INC-0011', apply: (o) => SCN_RUNTIME.makeLate(o) },
  merchant_closes: { ar: 'التاجر قفل فجأة', en: 'Store closes', icon: 'door-open', when: (o) => ['accepted', 'preparing'].includes(o.st), inc: 'INC-0022', apply: (o) => SCN_RUNTIME.merchantCloses(o) },
  captain_reject: { ar: 'الكابتن رفض العرض', en: 'Captain rejects offer', icon: 'x', when: (o) => !!o.offer, inc: 'INC-0028', apply: (o) => captainDecide(o, false, L('بعيد عن مكاني', 'Too far')) },
  captain_cancel: { ar: 'الكابتن ألغى بعد القبول', en: 'Captain cancels', icon: 'undo-2', when: (o) => o.kid && o.cap && o.cap.phase === 'to_merchant', inc: 'INC-0029', apply: (o) => captainCancel(o, L('الموتوسيكل فيه مشكلة', 'Bike problem')) },
  breakdown: { ar: 'الموتوسيكل عطل', en: 'Bike breaks down', icon: 'wrench', when: (o) => o.cap && o.cap.phase === 'to_customer' && !o.cap.stopped, inc: 'INC-0029', apply: (o) => SCN_RUNTIME.breakdown(o) },
  accident: { ar: 'حادثة للكابتن', en: 'Captain accident', icon: 'ambulance', when: (o) => o.cap && ['to_merchant', 'to_customer'].includes(o.cap.phase), inc: 'INC-0030', apply: (o) => SCN_RUNTIME.accident(o) },
  refuse: { ar: 'العميل رفض الاستلام', en: 'Customer refuses', icon: 'ban', when: (o) => o.cap && o.cap.phase === 'at_customer', inc: 'INC-0001', apply: (o) => SCN_RUNTIME.doorEvent(o, 'refuse') },
  no_answer: { ar: 'العميل مش بيرد', en: 'No answer', icon: 'phone-missed', when: (o) => o.cap && ['to_customer', 'at_customer'].includes(o.cap.phase), inc: 'INC-0002', apply: (o) => { o.script.atDoor = 'no_answer'; o.script.opsCall = o.script.opsCall || 'no_answer'; if (o.cap.phase === 'at_customer') SCN_RUNTIME.doorEvent(o, 'no_answer'); } },
  wrong_address: { ar: 'العنوان غلط', en: 'Wrong address', icon: 'map-pin-off', when: (o) => o.cap && ['to_customer', 'at_customer'].includes(o.cap.phase), inc: 'INC-0003', apply: (o) => { o.script.atDoor = 'wrong_address'; o.script.opsCall = 'landmark'; if (o.cap.phase === 'at_customer') SCN_RUNTIME.doorEvent(o, 'wrong_address'); } },
  not_home: { ar: 'العميل مش موجود', en: 'Not at home', icon: 'door-open', when: (o) => o.cap && ['to_customer', 'at_customer'].includes(o.cap.phase), inc: 'INC-0002', apply: (o) => { o.script.atDoor = 'not_home'; if (o.cap.phase === 'at_customer') SCN_RUNTIME.doorEvent(o, 'not_home'); } },
  change: { ar: 'مشكلة فكة', en: 'No change', icon: 'coins', when: (o) => o.pay.method === 'cash' && o.cap && ['to_customer', 'at_customer'].includes(o.cap.phase), inc: 'INC-0009', apply: (o) => { o.pay.note = '500'; S.captains[o.kid].change = 100; tl(o, { ev: 'inject', actor: 'sim', note: L('محاكاة: العميل معاه 500 والكابتن معاه فكة 100', 'Sim: customer has 500, captain has 100 change'), kind: 'warn' }); } },
  unsafe: { ar: 'الكابتن حاسس بخطر', en: 'Captain feels unsafe', icon: 'siren', when: (o) => o.cap && ['to_customer', 'at_customer'].includes(o.cap.phase), inc: 'INC-0049', apply: (o) => safetyWithdraw(o) },
  gps_weak: { ar: 'GPS ضعيف', en: 'Weak GPS', icon: 'locate-off', when: () => true, inc: 'INC-0035', apply: () => { S.set.gps = 'weak'; } },
  gps_off: { ar: 'GPS مش متاح', en: 'GPS unavailable', icon: 'locate-off', when: () => true, inc: 'INC-0035', apply: () => { S.set.gps = 'unavailable'; } },
  offline: { ar: 'الإنترنت قطع', en: 'Internet drops', icon: 'wifi-off', when: () => true, inc: 'INC-0046', apply: () => { S.set.network = 'offline'; } },
  outage: { ar: 'خدمة وصّلي وقعت', en: 'Service outage', icon: 'server-crash', when: () => true, inc: 'INC-0046', apply: () => SCN_RUNTIME.outage(true) },
  missing: { ar: 'صنف ناقص بعد التسليم', en: 'Missing item', icon: 'package-x', when: (o) => ['delivered', 'completed'].includes(o.st), inc: 'INC-0013', apply: (o) => SCN_RUNTIME.complaint(o, 'missing') },
  wrong: { ar: 'صنف غلط', en: 'Wrong item', icon: 'shuffle', when: (o) => ['delivered', 'completed'].includes(o.st), inc: 'INC-0014', apply: (o) => SCN_RUNTIME.complaint(o, 'wrong') },
  damaged: { ar: 'صنف تالف', en: 'Damaged item', icon: 'package-x', when: (o) => ['delivered', 'completed'].includes(o.st), inc: 'INC-0014', apply: (o) => SCN_RUNTIME.complaint(o, 'damaged') },
  food_safety: { ar: 'شكوى سلامة غذاء', en: 'Food safety', icon: 'heart-pulse', when: (o) => ['delivered', 'completed'].includes(o.st), inc: 'INC-0015', apply: (o) => SCN_RUNTIME.complaint(o, 'food_safety') },
  cash_claim: { ar: 'خلاف على المبلغ المدفوع', en: 'Dispute over cash paid', icon: 'scale', when: (o) => ['delivered', 'completed'].includes(o.st) && o.pay.method === 'cash', inc: 'INC-0032', apply: (o) => SCN_RUNTIME.cashClaim(o) },
};

/* ------------------------------------------------------------ runtime */
const SCN_RUNTIME = (() => {
  function start(id) {
    const sc = SCENARIOS[id]; if (!sc) return;
    const keep = { theme: S.set.theme, lang: S.set.lang, device: S.set.device, review: S.set.review, speed: S.set.speed, role: S.set.role, autopilot: S.set.autopilot, panel: S.set.panel };
    S = freshState(keep);
    Object.assign(S.cust, { stage: 'app', loggedIn: true, auth: 'phone', perm: 'granted' });
    S.nav.merchant.loggedIn = true; S.nav.captain.loggedIn = true;
    S.scenario = { id, startedAt: now(), log: [] };
    S.seq = 10427;
    const st = sc.setup;
    if (st.captainChange != null) S.captains[st.captain].change = st.captainChange;
    if (st.rcp) S.cust.rcp = Object.assign({}, S.cust.rcp, st.rcp);
    if (st.noAutoPlace) {
      // the customer has to go through checkout themselves (payment / blocked services)
      S.cust.cart = { mid: st.mid, lines: deepClone(st.lines), note: '', promo: '', extra: deepClone(st.multi || []) };
      S.cust.pay = st.pay || 'cash';
      S.cust.payFail = !!st.payFails; S.cust.payGhost = !!st.chargedNoOrder;
      if (st.scheduled) S.cust.schedule = { day: 'tomorrow', time: '18:00', occasion: 'عيد ميلاد', name: 'سلمى' };
      go('customer', 'cart');
      S.nav.customer.tab = 'home';
      S.set.role = 'customer'; // this scenario starts at the customer's checkout
      toast(L(`سيناريو ${id}: ${sc.title} — كمّل من السلة`, `Scenario ${id}: continue from the cart`), 'info', 'flask-conical');
      return;
    }
    const o = makeOrder({ mid: st.mid, lines: st.lines, pay: st.pay, cashNote: st.cashNote, rcp: st.rcp ? Object.assign({}, st.rcp) : { mode: 'self' }, addrId: st.rcp && st.rcp.addrId ? st.rcp.addrId : 'a1', scn: id,
      script: { captain: st.captain, atDoor: st.atDoor, opsCall: st.opsCall, words: st.words, rejectFirst: st.rejectFirst, merchantLate: st.merchantLate, itemOut: st.itemOut, merchantCloses: st.merchantCloses, captainCancels: st.captainCancels, breakdown: st.breakdown, after: st.after, gpsIssue: st.gpsIssue, offlineMid: st.offlineMid, outageMid: st.outageMid, cashDiff: st.cashDiff } });
    S.active = o.id;
    S.nav.customer.tab = 'orders';
    S.nav.customer.stacks.orders = [{ s: 'orders' }, { s: 'track', id: o.id }];
    toast(L(`بدأ سيناريو ${id}: ${sc.title}`, `Scenario ${id} started`), 'info', 'flask-conical');
  }
  /* scripted beats are stored on the order (persisted), not in closures */
  function sched(o, delay, fn, arg) { (o.sched = o.sched || []).push({ at: now() + delay, fn, arg }); }
  const BEATS = {
    itemOut: (o, pid) => itemOut(o, pid),
    makeLate: (o) => makeLate(o),
    closes: (o) => merchantCloses(o),
    capCancel: (o) => { if (o.cap && o.cap.phase === 'to_merchant') captainCancel(o, L('الموتوسيكل فيه مشكلة', 'Bike problem')); },
    breakdown: (o) => breakdown(o),
    gps: (o, v) => { S.set.gps = v; if (v !== 'accurate') tl(o, { ev: 'gps', actor: 'sim', note: v === 'weak' ? L('إشارة GPS ضعيفة', 'Weak GPS signal') : L('GPS وقف — آخر موقع معروف بس', 'GPS lost — last known location only'), kind: 'warn' }); },
    net: (o, v) => { S.set.network = v; if (v === 'good') toast(L('النت رجع — الطلب اتحدّث', 'Back online — order refreshed'), 'success', 'wifi'); },
    outage: () => outage(true),
    complaint: (o, k) => complaint(o, k),
    cashDiff: (o, a) => cashDiff(o, a),
  };
  function on(o, ev) {
    const sc = o.script || {};
    if (ev === 'st:preparing') {
      if (sc.itemOut) sched(o, 3, 'itemOut', sc.itemOut);
      if (sc.merchantLate) sched(o, 4, 'makeLate');
      if (sc.merchantCloses) sched(o, 5, 'closes');
    }
    if (ev === 'assigned' && sc.captainCancels && !o.didCancel) { o.didCancel = true; sched(o, 1.2, 'capCancel'); }
    if (ev === 'st:in_transit') {
      if (sc.breakdown && !o.didBreak) { o.didBreak = true; sched(o, 2.5, 'breakdown'); }
      if (sc.gpsIssue && !o.didGps) { o.didGps = true; sched(o, 1.5, 'gps', 'weak'); sched(o, 4, 'gps', 'unavailable'); sched(o, 7, 'gps', 'accurate'); }
      if (sc.offlineMid && !o.didOff) { o.didOff = true; sched(o, 1.5, 'net', 'offline'); sched(o, 5, 'net', 'good'); }
      if (sc.outageMid && !o.didOut) { o.didOut = true; sched(o, 1.5, 'outage'); }
    }
    if (ev === 'delivered') {
      if (sc.after) sched(o, 1.2, 'complaint', sc.after);
      if (sc.cashDiff) sched(o, 1.5, 'cashDiff', sc.cashDiff);
    }
  }
  function tick() {
    for (const o of Object.values(S.orders)) {
      if (!o.sched || !o.sched.length) continue;
      const due = o.sched.filter((b) => now() >= b.at);
      if (!due.length) continue;
      o.sched = o.sched.filter((b) => now() < b.at);
      due.forEach((b) => { try { BEATS[b.fn](o, b.arg); } catch (e) { console.error(e); } });
    }
  }

  /* ---- at the door (customer autopilot) */
  function door(o) {
    const mode = o.script.atDoor;
    if (!mode) return customerHandover(o, { given: cashGiven(o) });
    doorEvent(o, mode);
  }
  function doorEvent(o, mode) {
    dropPending(o, 'c_handover');
    o.door = { mode, at: now() };
    if (mode === 'refuse') {
      const words = o.script.words || L('مش عايزه خلاص', 'I do not want it anymore');
      tl(o, { ev: 'refused', actor: 'customer', note: L(`العميل فتح وقال: «${words}»`, `Customer said: “${words}”`), kind: 'warn' });
      addPending(o, 'k_report', 'captain', 0.6, { reason: 'refused', words });
    } else if (mode === 'no_answer') {
      for (let i = 1; i <= 3; i++) callLog(o, 'captain', 'customer', L(`محاولة ${i} — مفيش رد`, `Attempt ${i} — no answer`));
      tl(o, { ev: 'waiting', actor: 'captain:' + o.kid, note: L('الكابتن مستني عند الباب — المدة المطلوبة مش متحددة (PAR-0002)', 'Captain waiting — required wait not defined (PAR-0002)'), kind: 'warn' });
      addPending(o, 'k_report', 'captain', 2.5, { reason: 'no_answer' });
    } else if (mode === 'wrong_address') {
      tl(o, { ev: 'wrong_address', actor: 'captain:' + o.kid, note: L('الكابتن عند الإحداثيات: أرض فاضية', 'Captain at the pin: empty lot'), kind: 'warn' });
      callLog(o, 'captain', 'customer', L('مفيش رد', 'no answer'));
      addPending(o, 'k_report', 'captain', 1.0, { reason: 'wrong_address' });
    } else if (mode === 'recipient_refuse') {
      tl(o, { ev: 'recipient_refused', actor: 'recipient', note: L('المستلمة قالت: «أنا ماطلبتش حاجة ومعرفش الكابتن»', 'Recipient: “I did not order anything”'), kind: 'warn' });
      addPending(o, 'k_report', 'captain', 0.6, { reason: 'recipient_refused' });
    } else if (mode === 'not_home') {
      callLog(o, 'captain', 'customer', L('رد: «أنا برّه، سيبه مع البواب»', 'Answered: “I am out, leave it with the doorman”'));
      tl(o, { ev: 'not_home', actor: 'customer', note: L('العميل برّه وطلب الترك مع البواب — الطلب كاش ولسه ما اتدفعش', 'Customer away, asked to leave it — COD unpaid'), kind: 'warn' });
      addPending(o, 'c_nothome', doorRole(o), 1.5);
    }
    if (typeof requestRender === 'function') requestRender();
  }
  AUTO.k_report = (o, a) => cannotDeliver(o, a.reason, a.words);
  AUTO.c_nothome = (o) => notHomeChoice(o, 'wait');
  function notHomeChoice(o, choice) {
    dropPending(o, 'c_nothome');
    if (choice === 'coming') { tl(o, { ev: 'coming', actor: 'customer', note: L('العميل: «جاي في 5 دقايق»', 'Customer: coming in 5 minutes') }); addPending(o, 'c_handover', doorRole(o), 5); o.script.atDoor = null; o.door = null; }
    else if (choice === 'leave') { tl(o, { ev: 'leave_rejected', actor: 'captain:' + o.kid, note: L('ما ينفعش نسيب طلب كاش من غير دفع (SCN-012). الترك محتاج دفع الأول + تعليمة مسجلة تنقل التبعة للمشتري.', 'COD cannot be left unpaid (SCN-012).') , kind: 'warn' }); addPending(o, 'c_nothome', doorRole(o), 1.2); }
    else { tl(o, { ev: 'wait', actor: 'captain:' + o.kid, note: L('الكابتن مستني — ومفيش مدة انتظار متحددة', 'Captain waiting — no defined wait time'), kind: 'warn' }); addPending(o, 'k_report', 'captain', 3, { reason: 'not_home' }); }
  }

  /* ---- merchant side */
  function itemOut(o, pid) {
    const line = o.lines.find((l) => l.pid === pid && l.state === 'ok'); if (!line || !['accepted', 'preparing'].includes(o.st)) return;
    line.state = 'out';
    tl(o, { ev: 'item_out', actor: 'merchant', note: L(`${pName(pid)} خلص عند المتجر`, `${pName(pid)} ran out`), kind: 'warn' });
    addPending(o, 'c_sub', 'customer', 2, { pid });
    notify('customer', { title: L(`${pName(pid)} خلص عند المتجر — اختار تحب نعمل إيه`, `${pName(pid)} is out — choose what to do`), body: L('بديل، أو نشيله ونرجّع قيمته، أو نلغي الطلب كله.', 'Substitute, remove it, or cancel.'), icon: 'package-x', tone: 'warning', orderId: o.id });
  }
  function subChoice(o, choice, subPid) {
    const a = o.pending.find((x) => x.kind === 'c_sub'); if (!a) return;
    dropPending(o, 'c_sub');
    const line = o.lines.find((l) => l.pid === a.pid && l.state === 'out');
    if (choice === 'cancel') { cancelOrder(o, 'customer', L('العميل اختار يلغي بعد نفاد صنف — رد كامل', 'Customer cancelled after an item ran out — full refund'), { code: 'item_out' }); return; }
    if (choice === 'sub' && subPid) { line.state = 'sub'; o.lines.push({ pid: subPid, qty: line.qty, opts: {}, unit: unitPrice(subPid, {}), state: 'ok', subFor: line.pid }); tl(o, { ev: 'sub', actor: 'customer', note: L(`العميل وافق صراحةً على ${pName(subPid)} بدل ${pName(line.pid)}`, `Customer explicitly approved a substitute`) }); }
    else { line.state = 'removed'; tl(o, { ev: 'removed', actor: 'customer', note: L(`اتشال ${pName(line.pid)} — ${money(line.unit * line.qty)} مش هتتحصّل`, `Removed — ${money(line.unit * line.qty)} not charged`) }); }
    recalc(o);
  }
  function recalc(o) {
    o.sub = o.lines.filter((l) => l.state === 'ok').reduce((s, l) => s + l.unit * l.qty, 0);
    o.total = o.sub + o.del + o.svc - o.disc;
  }
  function makeLate(o) {
    if (o.lateNotified) return;
    o.lateNotified = true; o.readyAt = (o.readyAt || now()) + 20;
    const a = o.pending.find((x) => x.kind === 'm_ready'); if (a) a.due = o.readyAt;
    tl(o, { ev: 'merchant_late', actor: 'merchant', note: L('المتجر بلّغ إن التحضير هيتأخر ~20 دقيقة', 'Store reports ~20 min delay'), kind: 'warn' });
    notify('customer', { title: L('طلبك لسه بيتجهز وفيه تأخير', 'Your order is delayed'), body: L('مش هنقولك ميعاد مش متأكدين منه. تقدر تستنى أو تلغي من غير أي رسوم.', 'You can wait or cancel at no cost.'), icon: 'hourglass', tone: 'warning', orderId: o.id });
    addPending(o, 'c_late', 'customer', 2);
  }
  function lateChoice(o, choice) {
    dropPending(o, 'c_late');
    if (choice === 'cancel') cancelOrder(o, 'customer', L('العميل ألغى بسبب تأخير المتجر — رد كامل وبدون رسوم', 'Cancelled due to store delay — no charge'), { code: 'merchant_late' });
    else tl(o, { ev: 'late_wait', actor: 'customer', note: L('العميل اختار يستنى', 'Customer chose to wait') });
  }
  function merchantCloses(o) {
    S.merchants[o.mid].status = 'closed';
    tl(o, { ev: 'merchant_closed', actor: 'merchant', note: L('المتجر قفل والطلب قيد التحضير', 'Store closed with this order in preparation'), kind: 'warn' });
    addPending(o, 'm_close_decide', 'merchant', 1.5);
    notify('ops', { title: L(`${mName(o.mid)} قفل وعنده طلب شغال`, `${mName(o.mid)} closed with an active order`), icon: 'store', tone: 'warning', orderId: o.id, silent: userRole() !== 'ops' });
  }
  AUTO.m_close_decide = (o) => { dropPending(o, 'm_close_decide'); cancelOrder(o, 'merchant', L('المتجر قفل — إلغاء برد كامل (20-3)', 'Store closed — cancelled, full refund (20-3)'), { code: 'store_closed' }); notify('customer', { title: L('اضطرينا نلغي طلبك بسبب ظرف عند المتجر', 'We had to cancel your order'), body: L('محصلش منك أي غلط، ومفيش أي مبلغ عليك.', 'Nothing was your fault; you owe nothing.'), icon: 'circle-x', tone: 'danger', orderId: o.id }); };

  /* ---- captain side */
  function breakdown(o) {
    if (!o.cap) return;
    o.cap.stopped = true;
    const p = capPos(o); o.breakPos = p;
    tl(o, { ev: 'breakdown', actor: 'captain:' + o.kid, note: L('الموتوسيكل عطل في الطريق — والأكل مع الكابتن', 'Bike broke down — food is with the captain'), kind: 'warn' });
    notify('ops', { title: L(`عطل موتوسيكل — ${o.id}`, `Bike breakdown — ${o.id}`), icon: 'wrench', tone: 'warning', orderId: o.id });
    notify('customer', { title: L('حصل ظرف للكابتن في الطريق', 'The captain had an issue on the way'), body: L('بنرتّب حل دلوقتي وهنبلّغك بالوقت الحقيقي. ولو حابب تلغي من غير رسوم، قولنا.', 'Arranging a fix now.'), icon: 'wrench', tone: 'warning', orderId: o.id, silent: userRole() !== 'customer' });
    addPending(o, 'o_transfer', 'ops', 1.5);
  }
  AUTO.o_transfer = (o) => transfer(o);
  function transfer(o) {
    dropPending(o, 'o_transfer');
    const old = o.kid; const pool = availableCaptains([old]); if (!pool.length) { addPending(o, 'o_transfer', 'ops', 2); return; }
    const k = pool[0]; S.captains[old].status = 'online'; const bp = o.breakPos || capPos(o); S.captains[old].x = bp.x; S.captains[old].y = bp.y;
    o.kid = k; S.captains[k].status = 'on_trip';
    const pts = MAP.route(nearestNode(bp.x, bp.y), addrOf(o).node);
    o.cap = { phase: 'to_customer', pts, dist: 0, len: MAP.lengthOf(pts), leg: 2, handoff: true };
    tl(o, { ev: 'handoff', actor: 'ops', note: L(`الأكل اتنقل للكابتن ${kName(k)} — مفيش إثبات حالة للأكل وقت التسليم بين الكابتنين (فجوة)`, `Food handed to ${kName(k)} — no condition proof at handoff (gap)`), kind: 'warn' });
  }
  function accident(o) {
    if (!o.cap) return;
    o.cap.stopped = true;
    tl(o, { ev: 'accident', actor: 'captain:' + o.kid, note: L('حادثة طريق للكابتن — السلامة أولًا، والطلب آخر حاجة', 'Road accident — safety first'), kind: 'danger' });
    ticketCreate({ orderId: o.id, kind: 'safety', prio: 'now', by: 'captain', text: L('حادثة طريق', 'Road accident'), queue: 'ops' });
    notify('ops', { title: L(`حادثة للكابتن ${kName(o.kid)}`, `Accident: ${kName(o.kid)}`), body: L('اطمّن عليه الأول — MSG-K-004', 'Check on him first — MSG-K-004'), icon: 'ambulance', tone: 'danger', orderId: o.id });
    notify('customer', { title: L('حصل ظرف في الطريق', 'Something happened on the way'), body: L('بنرتّب إعادة إرسال أو رد كامل — ومش هتدفع حاجة.', 'We will resend or refund in full.'), icon: 'info', tone: 'warning', orderId: o.id, silent: userRole() !== 'customer' });
    addPending(o, 'o_transfer', 'ops', 4);
  }

  /* ---- cash */
  function deliverFailed(o, r) {
    if (r.code === 'change') {
      if (o.changeIssue) return; o.changeIssue = true;
      tl(o, { ev: 'change', actor: 'captain:' + o.kid, note: L(`مشكلة فكة: محتاج ${money(cashGiven(o) - dueCash(o))} ومعاه ${money(S.captains[o.kid].change)} — الكابتن كلّم العمليات (MSG-K-002)`, 'Change problem — captain called ops'), kind: 'warn' });
      dropPending(o, 'k_deliver');
      addPending(o, 'o_change', 'ops', 1);
      notify('ops', { title: L(`مشكلة فكة — ${o.id}`, `Change problem — ${o.id}`), icon: 'coins', tone: 'warning', orderId: o.id, silent: userRole() !== 'ops' });
    }
  }
  AUTO.o_change = (o) => changeFix(o, 'captain2');
  function changeFix(o, how) {
    dropPending(o, 'o_change');
    if (how === 'credit') { tl(o, { ev: 'blocked', actor: 'ops', note: L('«ائتمان فكة» على المنصّة = رصيد للعميل — محجوب لحد FDR-0010', '“Change credit” is a stored balance — blocked until FDR-0010'), kind: 'warn' }); addPending(o, 'o_change', 'ops', 1); return; }
    if (how === 'shop') { o.pay.note = 'exact'; tl(o, { ev: 'change_fixed', actor: 'customer', note: L('العميل فك من محل جنبه (اختياري — مش إلزام عليه)', 'Customer broke the note at a nearby shop (optional)') }); }
    else { S.captains[o.kid].change += 200; tl(o, { ev: 'change_fixed', actor: 'ops', note: L('العمليات بعتت فكة مع كابتن قريب — التكلفة على المنصّة', 'Ops sent change via a nearby captain — cost on the platform') }); }
    o.handover = { at: now(), given: cashGiven(o) };
    addPending(o, 'k_deliver', 'captain', how === 'shop' ? 1 : 6);
  }
  function cashDiff(o, amount) {
    const c = S.captains[o.kid];
    c.deposits.push({ t: now(), expected: c.custody, actual: c.custody - amount, diff: amount, orderIds: [o.id], status: 'open' });
    tl(o, { ev: 'cash_diff', actor: 'finance', note: L(`التوريد أقل بـ${money(amount)} — «فرق» مش «عجز»`, `Deposit short by ${money(amount)} — a “difference”, not a “shortage”`), kind: 'warn' });
    ticketCreate({ orderId: o.id, kind: 'cash_diff', prio: 'next', by: 'finance', text: L(`فرق ${money(amount)} في توريد الكابتن ${kName(o.kid)}`, `Difference of ${money(amount)}`), queue: 'support' });
    notify('finance', { title: L(`فرق نقدي ${money(amount)} — ${kName(o.kid)}`, `Cash difference ${money(amount)}`), icon: 'scale', tone: 'warning', orderId: o.id });
    notify('captain', { title: L(`فيه فرق ${money(amount)} في تسوية النهارده — مش هيتخصم منك حاجة دلوقتي`, `A ${money(amount)} difference today — nothing is deducted`), icon: 'scale', orderId: o.id, silent: userRole() !== 'captain' });
  }
  function cashClaim(o) {
    tl(o, { ev: 'cash_claim', actor: 'customer', note: L('العميل: «اديتك 400» — الكابتن: «اديتني 325 بالظبط»', 'Customer: “I gave 400” — Captain: “exactly 325”'), kind: 'warn' });
    const t = ticketCreate({ orderId: o.id, kind: 'cash_diff', prio: 'today', by: 'customer', text: L('بيقول دفع 400 ورجعله فكة ناقصة', 'Says he paid 400'), queue: 'support' });
    ticketLog(t, 'system', L('الدليل المتاح: المبلغ المسجل في التطبيق + رواية الطرفين. مفيش صورة للفلوس ولا إيصال.', 'Evidence: recorded amount + both accounts. No photo or receipt.'), 'evidence');
  }

  /* ---- after delivery */
  function complaint(o, kind) {
    const map = { missing: { pid: 'p106', ar: 'الكركديه ما وصلش', prio: 'today' }, wrong: { pid: 'p103', ar: 'وصل كشري صغير بدل الكبير', prio: 'today' }, damaged: { pid: 'p103', ar: 'علبة الكشري اتقلبت في الشنطة', prio: 'today' }, food_safety: { pid: 'p101', ar: 'تعبت أنا واللي معايا بعد الكفتة', prio: 'now' } };
    const d = map[kind]; const line = o.lines.find((l) => l.pid === d.pid) || o.lines[0];
    const t = ticketCreate({ orderId: o.id, kind, prio: d.prio, by: 'customer', text: d.ar, item: line.pid });
    o.complaint = { kind, ticket: t.id, pid: line.pid, at: now() };
    tl(o, { ev: 'complaint', actor: 'customer', note: L(`شكوى: ${d.ar}`, `Complaint: ${ticketKindLabel(kind)}`), kind: 'warn' });
    if (kind === 'food_safety') {
      S.merchants[o.mid].stock[line.pid] = 'out'; S.merchants[o.mid].suspended = Object.assign({}, S.merchants[o.mid].suspended, { [line.pid]: true });
      tl(o, { ev: 'item_suspended', actor: 'ops', note: L(`${pName(line.pid)} اتوقف عرضه فورًا — إجراء حماية مش إدانة (MSG-M-004)`, 'Item suspended immediately — protection, not a verdict'), kind: 'danger' });
      notify('admin', { title: L('بلاغ سلامة غذاء — إخطار المؤسس فورًا', 'Food safety report — founder notified'), icon: 'heart-pulse', tone: 'danger', orderId: o.id, silent: userRole() !== 'admin' });
      notify('merchant', { title: L(`وقفنا ${pName(line.pid)} مؤقتًا لحد ما نراجع بلاغ`, `${pName(line.pid)} paused pending review`), body: L('ده إجراء احترازي مش حكم عليكم.', 'A precaution, not a judgement.'), icon: 'shield-alert', tone: 'warning', orderId: o.id, silent: userRole() !== 'merchant' });
    }
    if (userRole() !== 'support') notify('support', { title: L(`شكوى جديدة ${t.id}`, `New complaint ${t.id}`), icon: 'ticket', tone: d.prio === 'now' ? 'danger' : 'info', orderId: o.id, silent: true });
  }

  /* ---- system */
  function outage(on) {
    if (on && !S.sys.outage) S.sys.outageAt = now();
    if (!on && S.sys.outage) { shiftDeadlines(now() - (S.sys.outageAt || now())); S.sys.outageAt = null; }
    S.sys.outage = on;
    if (on) {
      notify('ops', { title: L('المنظومة وقعت — تشغيل بالتليفون', 'System down — run by phone'), body: L('وقّف الطلبات الجديدة، واتصل بالتجار والكباتن', 'Stop new orders, call merchants and captains'), icon: 'server-crash', tone: 'danger' });
      Object.values(S.orders).filter(isActive).forEach((o) => tl(o, { ev: 'outage', actor: 'system', note: L('انقطاع الخدمة — الطلب ده بيتابع بالتليفون', 'Service outage — followed by phone'), kind: 'danger' }));
    } else {
      notify('ops', { title: L('الخدمة رجعت', 'Service restored'), icon: 'circle-check', tone: 'success' });
    }
  }

  function injectable(o) { return Object.entries(INJECT).filter(([k, d]) => { try { return o ? d.when(o) : ['gps_weak', 'gps_off', 'offline', 'outage'].includes(k); } catch (e) { return false; } }).map(([k, d]) => Object.assign({ key: k }, d)); }
  function inject(key, o) {
    const d = INJECT[key]; if (!d) return;
    d.apply(o);
    if (o) { o.injected = (o.injected || []).concat([{ key, at: now() }]); tl(o, { ev: 'inject', actor: 'sim', note: L(`اختبار مشكلة: ${d.ar} (${d.inc})`, `Injected: ${d.en} (${d.inc})`), kind: 'sim' }); }
    toast(L(`اتحقنت مشكلة: ${d.ar}`, `Injected: ${d.en}`), 'warning', d.icon);
  }
  return { start, on, tick, door, doorEvent, notHomeChoice, itemOut, subChoice, makeLate, lateChoice, merchantCloses, breakdown, transfer, accident, deliverFailed, changeFix, cashDiff, cashClaim, complaint, outage, injectable, inject, recalc };
})();
