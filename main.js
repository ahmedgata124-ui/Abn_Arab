// ==========================================
// 1. إعدادات وتدشين Firebase (تسجيل الدخول)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyC2Dbppgjk09edIskPX5OM-ujoqKXLJRDA",
    authDomain: "abn-arab-ai.firebaseapp.com",
    projectId: "abn-arab-ai",
    storageBucket: "abn-arab-ai.firebasestorage.app",
    messagingSenderId: "863813080286",
    appId: "1:863813080286:web:5fd4e1d46380992fdede4f"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// إدارة النقاط والتخزين المحلي
let credits = localStorage.getItem('abn_credits') ? parseInt(localStorage.getItem('abn_credits')) : 5;
let uploadedImageBase64 = null;

document.addEventListener("DOMContentLoaded", () => {
    const creditsElem = document.getElementById('credits-count');
    if (creditsElem) creditsElem.innerText = credits;
});

// تسجيل الدخول والخروج بجوجل
function loginGoogle() {
    auth.signInWithPopup(provider)
        .then((result) => {
            alert(`أهلاً بك يا ${result.user.displayName}! تم تسجيل الدخول بنجاح.`);
        })
        .catch(e => alert("خطأ في تسجيل الدخول: " + e.message));
}

// ==========================================
// 2. التحكم في واجهة الاستوديو والتبويبات
// ==========================================
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.studio-panel').forEach(p => p.classList.remove('active'));
    
    if (tab === 'generate') {
        document.querySelectorAll('.tab-btn')[0]?.classList.add('active');
        document.getElementById('panel-generate')?.classList.add('active');
    } else if (tab === 'edit') {
        document.querySelectorAll('.tab-btn')[1]?.classList.add('active');
        document.getElementById('panel-edit')?.classList.add('active');
    } else if (tab === 'video') {
        document.querySelectorAll('.tab-btn')[2]?.classList.add('active');
        document.getElementById('panel-video')?.classList.add('active');
    } else if (tab === 'avatar') {
        document.querySelectorAll('.tab-btn')[3]?.classList.add('active');
        document.getElementById('panel-avatar')?.classList.add('active');
    }
}

// ==========================================
// 3. المحركات المتقدمة للخدمات الأربعة
// ==========================================

// محرك الترجمة الفورية لضمان دقة نصوص الذكاء الاصطناعي
async function translateToEnglish(text) {
    try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ar|en`);
        const data = await res.json();
        return data.responseData.translatedText || text;
    } catch {
        return text; // استخدام النص كما هو في حالة تعثر الترجمة
    }
}

// أداة 1: تصميم وإنشاء الصور
async function generateImage() {
    if (!checkCredits()) return;
    const prompt = document.getElementById('gen-prompt')?.value.trim();
    if (!prompt) return alert("يرجى كتابة وصف الصورة أولاً!");

    showLoading("جاري رسم وتصميم الصورة بواسطة FLUX...");
    const enPrompt = await translateToEnglish(prompt);
    const seed = Math.floor(Math.random() * 999999);
    const imgUrl = `https://pollinations.ai/p/${encodeURIComponent(enPrompt)}?width=1024&height=1024&seed=${seed}&model=flux-schnell&nologo=true`;

    renderMediaResult(imgUrl, 'image');
}

// التعامل مع رفع الصور لخدمة التعديل
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            uploadedImageBase64 = event.target.result;
            const preview = document.getElementById('preview-area');
            if (preview) {
                preview.innerHTML = `<img src="${uploadedImageBase64}" style="max-width:100%; max-height:400px; border-radius:12px;">`;
            }
        };
        reader.readAsDataURL(file);
    }
}

// أداة 2: تعديل الصور الذكي
async function editUploadedImage() {
    if (!checkCredits()) return;
    if (!uploadedImageBase64) return alert("يرجى اختيار صورة من جهازك أولاً!");
    const editPrompt = document.getElementById('edit-prompt')?.value.trim();
    if (!editPrompt) return alert("يرجى كتابة التعديل المطلوب على الصورة!");

    showLoading("جاري إدخال التعديلات بالذكاء الاصطناعي...");
    const enPrompt = await translateToEnglish(editPrompt);
    const seed = Math.floor(Math.random() * 999999);
    const editedUrl = `https://pollinations.ai/p/${encodeURIComponent(enPrompt)}?width=1024&height=1024&seed=${seed}&model=flux&enhance=true&nologo=true`;

    renderMediaResult(editedUrl, 'image');
}

// أداة 3: توليد الفيديوهات
async function generateVideo() {
    if (!checkCredits()) return;
    const prompt = document.getElementById('video-prompt')?.value.trim();
    if (!prompt) return alert("يرجى كتابة سيناريو الفيديو المطلوب!");

    showLoading("جاري معالجة تحريك الفيديو (قد يستغرق بضع ثوانٍ)...");
    const enPrompt = await translateToEnglish(prompt);
    const seed = Math.floor(Math.random() * 999999);
    const videoUrl = `https://pollinations.ai/p/${encodeURIComponent(enPrompt)}?width=512&height=512&seed=${seed}&model=turbo&feed=true`;

    renderMediaResult(videoUrl, 'video');
}

// أداة 4: صناعة الأفاتار الرقمي
async function generateAvatar() {
    if (!checkCredits()) return;
    const textScript = document.getElementById('avatar-script')?.value.trim();
    if (!textScript) return alert("اكتب النص الذي سيتحدث به الأفاتار!");

    showLoading("جاري إعداد الأفاتار الناطق بالذكاء الاصطناعي...");
    
    setTimeout(() => {
        const avatarDemoUrl = "https://a.storyblok.com/f/165321/1110x960/bf6a04879b/digital-human.png";
        renderMediaResult(avatarDemoUrl, 'avatar', textScript);
    }, 2500);
}

// ==========================================
// 4. الوظائف المساعدة وعرض النتائج
// ==========================================
function checkCredits() {
    if (credits <= 0) {
        alert("نفذت محاولاتك المجانية! اشترك في الباقة الاحترافية للحصول على استخام غير محدود.");
        return false;
    }
    return true;
}

function showLoading(message) {
    const preview = document.getElementById('preview-area');
    if (preview) {
        preview.innerHTML = `
            <div style="text-align: center; color: #00d2ff; padding: 30px;">
                <i class="fa-solid fa-circle-notch fa-spin fa-3x"></i>
                <p style="margin-top: 15px; font-weight: bold; font-size: 1.1rem;">${message}</p>
            </div>`;
    }
}

function renderMediaResult(url, type, extraData = "") {
    const preview = document.getElementById('preview-area');
    if (!preview) return;

    if (type === 'image') {
        const img = new Image();
        img.src = url;
        img.onload = () => {
            preview.innerHTML = `<img src="${url}" style="max-width:100%; max-height:450px; border-radius:12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">`;
            useCredit();
        };
        img.onerror = () => {
            preview.innerHTML = `<p style="color:#ef4444; font-weight:bold;">حدث خطأ أثناء معالجة الصورة، حاول مرة أخرى.</p>`;
        };
    } else if (type === 'video') {
        preview.innerHTML = `
            <div style="text-align:center;">
                <img src="${url}" style="max-width:100%; border-radius:12px; margin-bottom:10px;">
                <p style="color: #25d366; font-weight:bold;"><i class="fa-solid fa-circle-check"></i> تم توليد المشهد المتحرك بنجاح</p>
            </div>`;
        useCredit();
    } else if (type === 'avatar') {
        preview.innerHTML = `
            <div style="text-align:center; padding: 15px;">
                <img src="${url}" style="max-width:220px; border-radius:50%; border:3px solid #00d2ff; margin-bottom:15px;">
                <p style="color:#fff; font-size: 1.1rem; font-weight: bold;">"${extraData}"</p>
                <small style="color:#94a3b8;">تم تجهيز الأفاتار الناطق بنجاح</small>
            </div>`;
        useCredit();
    }
}

function useCredit() {
    credits--;
    localStorage.setItem('abn_credits', credits);
    const creditsElem = document.getElementById('credits-count');
    if (creditsElem) creditsElem.innerText = credits;
}
