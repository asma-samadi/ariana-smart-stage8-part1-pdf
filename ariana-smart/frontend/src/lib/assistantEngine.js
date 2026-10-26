const MAX_QUESTION_LENGTH = 300;

function normalize(value = '') {
  return String(value)
    .toLocaleLowerCase()
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200c\u200d\u0640\u064b-\u065f\u0670]/g, '')
    .replace(/[؟?!.,،؛:()[\]{}"'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const RULES = [
  ['official', ['official website', 'official airline', 'آریانا رسمی', 'ویب‌سایت رسمی', 'رسمي وېبپاڼه', 'رسمي ویب پاڼه']],
  ['booking', ['book a flight', 'book a real flight', 'book ticket', 'real ticket', 'رزرو پرواز', 'رزرو تکت', 'تکت واقعی', 'ریښتینی ټکټ', 'ټکټ بک']],
  ['apply', ['apply', 'application', 'ticket request', 'درخواست تکت', 'درخواست بلیت', 'درخواست ټکټ', 'غوښتنلیک']],
  ['documents', ['document', 'passport', 'tazkira', 'اسناد', 'پاسپورت', 'تذکره', 'سندونه', 'پاسپورټ']],
  ['status', ['application status', 'track application', 'status', 'وضعیت درخواست', 'پیگیری درخواست', 'حالت غوښتنلیک', 'تعقیب']],
  ['routes', ['route', 'destination', 'airport', 'flight schedule', 'مسیر', 'مقصد', 'میدان هوایی', 'پرواز', 'مسیرونه', 'هوايي ډګر']],
  ['price', ['price', 'fare', 'cost', 'قیمت', 'کرایه', 'نرخ', 'بیه']],
  ['privacy', ['privacy', 'secure', 'safe', 'password', 'حریم خصوصی', 'امنیت', 'محفوظ', 'محرمیت', 'پټنوم']],
  ['language', ['language', 'dari', 'pashto', 'زبان', 'دری', 'پشتو', 'ژبه', 'پښتو']],
  ['ai', ['ai assistant', 'artificial intelligence', 'هوش مصنوعی', 'دستیار هوشمند', 'مصنوعي ځیرکتیا', 'مرستیال']],
  ['contact', ['contact', 'email', 'support', 'تماس', 'ارتباط', 'پشتیبانی', 'اړیکه', 'ملاتړ']],
  ['help', ['help', 'what can you do', 'راهنمایی', 'کمک', 'څنګه مرسته', 'مرسته']],
  ['greeting', ['hello', 'hi', 'salam', 'سلام', 'درود', 'وعلیکم سلام', 'سلامونه']]
];

function matchIntent(question) {
  const text = normalize(question).slice(0, MAX_QUESTION_LENGTH);
  if (!text) return 'help';
  for (const [intent, phrases] of RULES) {
    if (phrases.some((phrase) => text.includes(normalize(phrase)))) return intent;
  }
  return 'fallback';
}

export { MAX_QUESTION_LENGTH, normalize, matchIntent };
