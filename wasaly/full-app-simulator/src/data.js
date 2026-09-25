/* ==========================================================================
   data.js — fictional demo data. Every merchant, person, price and address
   here is invented for the simulation and labelled as such in the UI.
   ========================================================================== */
const DEMO_NOTE = () => L('كل المتاجر والأسعار والأشخاص هنا تجريبية — مش بيانات حقيقية.', 'All merchants, prices and people here are fictional demo data.');

const CATEGORIES = [
  { id: 'food', ar: 'مطاعم', en: 'Restaurants', icon: 'utensils-crossed', illo: 'kofta' },
  { id: 'grocery', ar: 'سوبر ماركت', en: 'Grocery', icon: 'shopping-basket', illo: 'basket' },
  { id: 'bakery', ar: 'مخبوزات', en: 'Bakery', icon: 'croissant', illo: 'baladi' },
  { id: 'sweets', ar: 'حلويات', en: 'Desserts', icon: 'cake-slice', illo: 'konafa' },
  { id: 'pharmacy', ar: 'صيدليات', en: 'Pharmacies', icon: 'pill', illo: 'pills', blocked: true },
  { id: 'flowers', ar: 'ورد وهدايا', en: 'Flowers & gifts', icon: 'flower-2', illo: 'bouquet' },
];

/* option groups: req = required single choice; opt = optional multi */
const MERCHANTS = {
  m1: { id: 'm1', name: 'مطعم تجريبي', nameEn: 'Demo Restaurant', cat: 'food', tagline: 'مشويات وكشري', taglineEn: 'Grills & koshary',
    accent: '#B4462B', accentSoft: '#FBEDE7', sign: '#3D2B22', wall: '#EFE7DB', window: ['kofta', 'koshary', 'karkadeh'], seed: 3,
    rating: 4.6, ratings: 312, eta: [30, 45], fee: 25, node: 'n2-2', prep: 14, logoIcon: 'flame', flagship: true,
    menu: [
      { id: 'grill', ar: 'مشويات', en: 'Grills', items: ['p101', 'p102', 'p104'] },
      { id: 'koshary', ar: 'كشري', en: 'Koshary', items: ['p103'] },
      { id: 'sides', ar: 'سلطات وجانبي', en: 'Sides', items: ['p107', 'p108'] },
      { id: 'sweet', ar: 'حلو ومشروبات', en: 'Dessert & drinks', items: ['p105', 'p106'] },
    ] },
  m2: { id: 'm2', name: 'فرن البيتزا', nameEn: 'Pizza Oven', cat: 'food', tagline: 'بيتزا وفطير', taglineEn: 'Pizza & feteer',
    accent: '#C8452F', accentSoft: '#FCEBE6', sign: '#1E2C62', wall: '#F3ECE2', window: ['pizza', 'pizza_pep', 'feteer'], seed: 5,
    rating: 4.4, ratings: 188, eta: [35, 50], fee: 20, node: 'n4-1', prep: 18, logoIcon: 'pizza',
    menu: [{ id: 'pizza', ar: 'بيتزا', en: 'Pizza', items: ['p201', 'p202', 'p203'] }, { id: 'feteer', ar: 'فطير', en: 'Feteer', items: ['p204'] }, { id: 'drinks', ar: 'مشروبات', en: 'Drinks', items: ['p205'] }] },
  m3: { id: 'm3', name: 'مخبز النخلة', nameEn: 'Palm Bakery', cat: 'bakery', tagline: 'عيش بلدي وفينو ومخبوزات', taglineEn: 'Baladi bread & pastries',
    accent: '#A7792B', accentSoft: '#F8F0E1', sign: '#5A3F16', wall: '#F4EEDF', window: ['baladi', 'croissant', 'fino'], seed: 7,
    rating: 4.7, ratings: 421, eta: [20, 30], fee: 15, node: 'n1-3', prep: 6, logoIcon: 'wheat',
    menu: [{ id: 'bread', ar: 'عيش', en: 'Bread', items: ['p301', 'p302'] }, { id: 'pastry', ar: 'مخبوزات', en: 'Pastry', items: ['p303', 'p305', 'p304'] }] },
  m4: { id: 'm4', name: 'حلويات القمر', nameEn: 'Moon Sweets', cat: 'sweets', tagline: 'كنافة وبسبوسة وتورت', taglineEn: 'Konafa, basbousa & cakes',
    accent: '#B35C73', accentSoft: '#FAEDF1', sign: '#4B2233', wall: '#F6ECEE', window: ['konafa', 'basbousa', 'cake'], seed: 11,
    rating: 4.8, ratings: 256, eta: [25, 40], fee: 20, node: 'n4-4', prep: 10, logoIcon: 'cake-slice',
    menu: [{ id: 'eastern', ar: 'حلو شرقي', en: 'Eastern sweets', items: ['p401', 'p402', 'p404'] }, { id: 'cakes', ar: 'تورت بالطلب', en: 'Custom cakes', items: ['p403'] }] },
  m5: { id: 'm5', name: 'ماركت البركة', nameEn: 'Baraka Market', cat: 'grocery', tagline: 'بقالة وألبان ومجمدات', taglineEn: 'Groceries, dairy & frozen',
    accent: '#2F7D4F', accentSoft: '#E9F4EC', sign: '#173D27', wall: '#EDF1EA', window: ['milk', 'eggs', 'riceBag'], seed: 13,
    rating: 4.3, ratings: 97, eta: [30, 45], fee: 20, node: 'n3-5', prep: 12, logoIcon: 'shopping-basket',
    menu: [{ id: 'dairy', ar: 'ألبان وبيض', en: 'Dairy & eggs', items: ['p501', 'p502'] }, { id: 'pantry', ar: 'بقالة جافة', en: 'Pantry', items: ['p503', 'p504', 'p505'] }, { id: 'frozen', ar: 'مجمدات', en: 'Frozen', items: ['p506'] }] },
  m6: { id: 'm6', name: 'ورد الياسمين', nameEn: 'Jasmine Flowers', cat: 'flowers', tagline: 'بوكيهات وهدايا', taglineEn: 'Bouquets & gifts',
    accent: '#8067B7', accentSoft: '#F1EDF9', sign: '#2F2350', wall: '#F2EFF7', window: ['bouquet', 'bouquet_mix', 'giftBox'], seed: 17,
    rating: 4.9, ratings: 64, eta: [40, 60], fee: 25, node: 'n5-3', prep: 20, logoIcon: 'flower-2',
    menu: [{ id: 'bouquets', ar: 'بوكيهات', en: 'Bouquets', items: ['p601', 'p602'] }, { id: 'gifts', ar: 'هدايا', en: 'Gifts', items: ['p603', 'p604'] }] },
  m7: { id: 'm7', name: 'صيدلية (مفهوم فقط)', nameEn: 'Pharmacy (concept only)', cat: 'pharmacy', tagline: 'غير مفعّلة — محجوبة', taglineEn: 'Not enabled — blocked',
    accent: '#1F8A84', accentSoft: '#E5F4F3', sign: '#12514E', wall: '#EEF3F3', window: ['pills'], seed: 19,
    rating: null, ratings: 0, eta: [0, 0], fee: 0, node: 'n2-4', prep: 0, logoIcon: 'pill', blocked: true, menu: [] },
};

const PRODUCTS = {
  p101: { m: 'm1', ar: 'كفتة مشوية', en: 'Grilled kofta', illo: 'kofta', price: 95, desc: 'كفتة بلدي على الفحم، معاها عيش بلدي وطحينة.', descEn: 'Charcoal kofta with baladi bread and tahini.', allergens: ['sesame', 'gluten'],
    groups: [{ id: 'size', req: true, ar: 'الحجم', en: 'Size', opts: [{ id: 'q', ar: 'ربع كيلو', en: 'Quarter kilo', d: 0 }, { id: 'h', ar: 'نص كيلو', en: 'Half kilo', d: 85 }] },
             { id: 'add', ar: 'إضافات', en: 'Add-ons', max: 3, opts: [{ id: 'th', ar: 'طحينة زيادة', en: 'Extra tahini', d: 10 }, { id: 'sl', ar: 'سلطة', en: 'Salad', d: 10 }, { id: 'fr', ar: 'بطاطس', en: 'Fries', d: 15 }] }], popular: true },
  p102: { m: 'm1', ar: 'فرخة مشوية', en: 'Grilled chicken', illo: 'chicken', price: 140, desc: 'نص فرخة متبلة على الفحم مع رز.', descEn: 'Half charcoal chicken with rice.', allergens: [],
    groups: [{ id: 'side', req: true, ar: 'الجانبي', en: 'Side', opts: [{ id: 'rice', ar: 'رز', en: 'Rice', d: 0 }, { id: 'fr', ar: 'بطاطس', en: 'Fries', d: 5 }] }] },
  p103: { m: 'm1', ar: 'كشري', en: 'Koshary', illo: 'koshary', price: 35, desc: 'رز وعدس ومكرونة وحمص وصلصة ودقة وبصل محمر.', descEn: 'Rice, lentils, pasta, chickpeas, sauce and crispy onions.', allergens: ['gluten'],
    groups: [{ id: 'size', req: true, ar: 'الحجم', en: 'Size', opts: [{ id: 's', ar: 'صغير', en: 'Small', d: -10 }, { id: 'm', ar: 'وسط', en: 'Medium', d: 0 }, { id: 'l', ar: 'كبير', en: 'Large', d: 10 }] },
             { id: 'add', ar: 'إضافات', en: 'Add-ons', max: 3, opts: [{ id: 'dq', ar: 'دقة زيادة', en: 'Extra dakka', d: 3 }, { id: 'sh', ar: 'شطة', en: 'Chili', d: 2 }, { id: 'bs', ar: 'بصل زيادة', en: 'Extra onions', d: 5 }] }], popular: true },
  p104: { m: 'm1', ar: 'حواوشي', en: 'Hawawshi', illo: 'hawawshi', price: 45, desc: 'عيش بلدي محشي لحمة متبلة في الفرن.', descEn: 'Baladi bread stuffed with spiced meat.', allergens: ['gluten'],
    groups: [{ id: 'spice', req: true, ar: 'الطعم', en: 'Taste', opts: [{ id: 'n', ar: 'عادي', en: 'Regular', d: 0 }, { id: 'h', ar: 'حرّاق', en: 'Spicy', d: 0 }] }] },
  p105: { m: 'm1', ar: 'أرز بلبن', en: 'Rice pudding', illo: 'rozBelLaban', price: 20, desc: 'بالقرفة والمكسرات.', descEn: 'With cinnamon and nuts.', allergens: ['milk', 'nuts'], stock: 3 },
  p106: { m: 'm1', ar: 'كركديه ساقع', en: 'Iced hibiscus', illo: 'karkadeh', price: 15, desc: 'كركديه أسواني بالتلج.', descEn: 'Aswan hibiscus over ice.', allergens: [] },
  p107: { m: 'm1', ar: 'سلطة خضرا', en: 'Green salad', illo: 'salad', price: 15, desc: 'طماطم وخيار وخس.', descEn: 'Tomato, cucumber and lettuce.', allergens: [] },
  p108: { m: 'm1', ar: 'بطاطس محمرة', en: 'Fries', illo: 'fries', price: 25, desc: 'بطاطس مقرمشة.', descEn: 'Crispy fries.', allergens: [] },
  p201: { m: 'm2', ar: 'بيتزا مارجريتا', en: 'Margherita pizza', illo: 'pizza', price: 90, desc: 'صلصة طماطم وموتزاريلا وريحان.', descEn: 'Tomato, mozzarella and basil.', allergens: ['gluten', 'milk'], popular: true,
    groups: [{ id: 'size', req: true, ar: 'الحجم', en: 'Size', opts: [{ id: 's', ar: 'صغيرة', en: 'Small', d: -20 }, { id: 'm', ar: 'وسط', en: 'Medium', d: 0 }, { id: 'l', ar: 'كبيرة', en: 'Large', d: 30 }] },
             { id: 'add', ar: 'إضافات', en: 'Add-ons', max: 2, opts: [{ id: 'ch', ar: 'جبنة زيادة', en: 'Extra cheese', d: 20 }, { id: 'ol', ar: 'زيتون', en: 'Olives', d: 10 }] }] },
  p202: { m: 'm2', ar: 'بيتزا سجق', en: 'Sausage pizza', illo: 'pizza_pep', price: 110, desc: 'سجق شرقي وفلفل.', descEn: 'Eastern sausage and peppers.', allergens: ['gluten', 'milk'] },
  p203: { m: 'm2', ar: 'بيتزا خضار', en: 'Veggie pizza', illo: 'pizza_veg', price: 95, desc: 'فلفل وزيتون ومشروم.', descEn: 'Peppers, olives and mushrooms.', allergens: ['gluten', 'milk'] },
  p204: { m: 'm2', ar: 'فطير مشلتت', en: 'Feteer meshaltet', illo: 'feteer', price: 60, desc: 'بالسمن البلدي، مع عسل أو جبنة.', descEn: 'Ghee pastry with honey or cheese.', allergens: ['gluten', 'milk'],
    groups: [{ id: 'with', req: true, ar: 'معاه', en: 'Served with', opts: [{ id: 'h', ar: 'عسل', en: 'Honey', d: 0 }, { id: 'c', ar: 'جبنة قديمة', en: 'Aged cheese', d: 5 }] }] },
  p205: { m: 'm2', ar: 'مشروب غازي', en: 'Soft drink', illo: 'soda', price: 15, desc: 'كانز ساقع.', descEn: 'Cold can.', allergens: [] },
  p301: { m: 'm3', ar: 'عيش بلدي (10 أرغفة)', en: 'Baladi bread (10)', illo: 'baladi', price: 15, desc: 'طازة من الفرن.', descEn: 'Fresh from the oven.', allergens: ['gluten'], popular: true },
  p302: { m: 'm3', ar: 'عيش فينو (5)', en: 'Fino rolls (5)', illo: 'fino', price: 12, desc: 'فينو طري.', descEn: 'Soft rolls.', allergens: ['gluten'] },
  p303: { m: 'm3', ar: 'كرواسون', en: 'Croissant', illo: 'croissant', price: 20, desc: 'بالزبدة.', descEn: 'Butter croissant.', allergens: ['gluten', 'milk'] },
  p304: { m: 'm3', ar: 'بقسماط', en: 'Rusks', illo: 'fino', price: 30, desc: 'ربع كيلو.', descEn: 'Quarter kilo.', allergens: ['gluten'] },
  p305: { m: 'm3', ar: 'فطير بالسمن', en: 'Ghee pastry', illo: 'feteer', price: 50, desc: 'فطير ريفي.', descEn: 'Country pastry.', allergens: ['gluten', 'milk'] },
  p401: { m: 'm4', ar: 'كنافة بالقشطة', en: 'Konafa with cream', illo: 'konafa', price: 35, desc: 'قطعة كبيرة.', descEn: 'Large piece.', allergens: ['gluten', 'milk', 'nuts'], popular: true },
  p402: { m: 'm4', ar: 'بسبوسة (نص كيلو)', en: 'Basbousa (half kilo)', illo: 'basbousa', price: 90, desc: 'باللوز.', descEn: 'With almonds.', allergens: ['gluten', 'milk', 'nuts'] },
  p403: { m: 'm4', ar: 'تورتة عيد ميلاد باسم', en: 'Named birthday cake', illo: 'cake', price: 450, desc: 'تورتة بالطلب مكتوب عليها اسم — منتج مخصص.', descEn: 'Made to order with a name — custom product.', allergens: ['gluten', 'milk', 'egg'], custom: true },
  p404: { m: 'm4', ar: 'أم علي', en: 'Om Ali', illo: 'umAli', price: 40, desc: 'بالمكسرات.', descEn: 'With nuts.', allergens: ['gluten', 'milk', 'nuts'] },
  p501: { m: 'm5', ar: 'لبن كامل الدسم 1 لتر', en: 'Full-fat milk 1L', illo: 'milk', price: 42, desc: 'مبرّد.', descEn: 'Chilled.', allergens: ['milk'], chilled: true },
  p502: { m: 'm5', ar: 'بيض (طبق 30)', en: 'Eggs (tray of 30)', illo: 'eggs', price: 165, desc: 'بيض أبيض.', descEn: 'White eggs.', allergens: ['egg'] },
  p503: { m: 'm5', ar: 'رز مصري 1 كيلو', en: 'Egyptian rice 1kg', illo: 'riceBag', price: 38, desc: 'حبة قصيرة.', descEn: 'Short grain.', allergens: [] },
  p504: { m: 'm5', ar: 'زيت 1 لتر', en: 'Oil 1L', illo: 'oil', price: 85, desc: 'زيت عباد.', descEn: 'Sunflower oil.', allergens: [] },
  p505: { m: 'm5', ar: 'مكرونة 400 جم', en: 'Pasta 400g', illo: 'pasta', price: 18, desc: 'قلم.', descEn: 'Penne.', allergens: ['gluten'] },
  p506: { m: 'm5', ar: 'آيس كريم عائلي', en: 'Family ice cream', illo: 'icecream', price: 30, desc: 'مجمد — لازم يوصل بسرعة.', descEn: 'Frozen — must arrive fast.', allergens: ['milk'], chilled: true },
  p601: { m: 'm6', ar: 'بوكيه ورد أحمر', en: 'Red rose bouquet', illo: 'bouquet', price: 250, desc: '12 وردة.', descEn: '12 roses.', allergens: [], popular: true },
  p602: { m: 'm6', ar: 'بوكيه ورد مشكّل', en: 'Mixed bouquet', illo: 'bouquet_mix', price: 200, desc: 'ألوان مختلفة.', descEn: 'Mixed colours.', allergens: [] },
  p603: { m: 'm6', ar: 'علبة شوكولاتة هدية', en: 'Chocolate gift box', illo: 'giftBox', price: 180, desc: 'تغليف هدية.', descEn: 'Gift-wrapped.', allergens: ['milk', 'nuts'] },
  p604: { m: 'm6', ar: 'كارت إهداء مكتوب', en: 'Written gift card', illo: 'card', price: 15, desc: 'بنكتب الرسالة اللي تختارها — منتج مخصص.', descEn: 'We write your message — custom item.', allergens: [], custom: true },
};

const ALLERGENS = { gluten: ['جلوتين', 'Gluten', 'wheat'], milk: ['ألبان', 'Dairy', 'milk'], nuts: ['مكسرات', 'Nuts', 'nut'], sesame: ['سمسم', 'Sesame', 'circle-dot'], egg: ['بيض', 'Egg', 'egg'] };

const PEOPLE = {
  customer: { name: 'أحمد', nameEn: 'Ahmed', phone: '010•• ••• 4821' },
  mother: { name: 'سعاد (والدة أحمد)', nameEn: 'Soad (Ahmed’s mother)', phone: '012•• ••• 3390' },
  support: { name: 'سارة', role: 'خدمة العملاء' },
  ops: { name: 'كريم', role: 'العمليات' },
  finance: { name: 'هالة', role: 'المالية' },
  admin: { name: 'المؤسس', role: 'الإدارة' },
};

const CAPTAINS = {
  k1: { id: 'k1', name: 'محمد', nameEn: 'Mohamed', vehicle: 'موتوسيكل', plate: 'م ن ص 1234 (تجريبي)', rating: 4.8, start: 'n3-3', color: '#33499F' },
  k2: { id: 'k2', name: 'مينا', nameEn: 'Mina', vehicle: 'موتوسيكل', plate: 'ب ط ل 5521 (تجريبي)', rating: 4.7, start: 'n5-1', color: '#2F8C52' },
  k3: { id: 'k3', name: 'عبدالله', nameEn: 'Abdallah', vehicle: 'موتوسيكل', plate: 'ع ر ق 7702 (تجريبي)', rating: 4.9, start: 'n1-5', color: '#8067B7' },
};

const ADDRESSES = [
  { id: 'a1', label: 'البيت', labelEn: 'Home', icon: 'house', line: 'شارع 7 (اسم تجريبي) — عمارة 12، الدور التاني', landmark: 'جنب الجامع الصغير، قدام محل الموبايلات', node: 'n5-6', zone: 'وسط البلد' },
  { id: 'a2', label: 'الشغل', labelEn: 'Work', icon: 'briefcase', line: 'شارع المدرسة (اسم تجريبي) — مكتب 3', landmark: 'في ضهر المدرسة', node: 'n1-1', zone: 'شمال البلد' },
  { id: 'a3', label: 'بيت الوالدة', labelEn: 'Mother’s house', icon: 'heart', line: 'حارة 3 (اسم تجريبي) — بيت أبيض بباب أزرق', landmark: 'آخر الحارة جنب الكوبري', node: 'n6-2', zone: 'على المية', forOther: true },
];
const OUTSIDE_ADDRESS = { id: 'a4', label: 'عزبة خارج التغطية', labelEn: 'Village outside coverage', icon: 'map-pin-off', line: 'عزبة تجريبية شمال غرب البلد', landmark: '—', node: 'n0-0', zone: 'خارج التغطية', outside: true };

/* illustrative economics — all labelled in the UI */
const ECON = {
  commissionPct: 15,   // ILLUSTRATIVE ONLY: manual leaves the commission rate as an unknown (ع%)
  captainSharePct: 70, // value in code (SRC-0015), NOT approved (PAR-0010)
  custodyLimit: 1500,  // value in code, NOT approved (PAR-0013)
  serviceFee: 0,       // value in code, NOT approved (PAR-0023)
  disputeHours: 24,    // value in code, NOT approved (PAR-0025)
  settlementHours: 48, penaltyPct: 0.5, graceDays: 3, penaltyMaxPct: 5, // code values, NOT approved (PAR-0006..0009)
  fuelPerKm: 0.52,     // external research, low-medium confidence (appendix A #2)
  failedTripComp: 0,   // code value 0.00; undecided (PAR-0003 / FDR-0002)
};
