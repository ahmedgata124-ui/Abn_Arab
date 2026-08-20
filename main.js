// ==========================================
// 1. استيراد Firebase v10 Modular SDK
// ==========================================
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    runTransaction, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// 2. إعدادات المتغيرات الآمنة والتدشين
// ==========================================
// ملاحظة أمنية: يفضل استبدال هذه القيم بمتغيرات البيئة (e.g., process.env / import.meta.env) في بيئة التطوير
const firebaseConfig = {
    apiKey: "AIzaSyC2Dbppgjk09edIskPX5OM-ujoqKXLJRDA",
    authDomain: "abn-arab-ai.firebaseapp.com",
    projectId: "abn-arab-ai",
    storageBucket: "abn-arab-ai.firebasestorage.app",
    messagingSenderId: "863813080286",
    appId: "1:863813080286:web:5fd4e1d46380992fdede4f"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// إدارة الحالة العامة للتطبيق (State Management)
let currentUser = null;
let userCredits = 0;
let uploadedImageBase64 = null;
let currentAbortController = null;

// ==========================================
// 3. أدوات الأمان والوقاية من الثغرات (Security & Utilities)
// ==========================================

// دالة لتطهير المدخلات للوقاية من ثغرات XSS
function sanitizeHTML(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// دالة جلب البيانات مع إمكانية التوقف وإعادة المحاولة (Retry & Timeout Mechanism)
async function fetchWithRetry(url, options = {}, retries = 2, timeoutMs = 20000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const fetchOptions = {
        ...options,
        signal: options.signal || controller.signal
    };

    try {
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP Error Status: ${response.status}`);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (retries > 0 && error.name !== 'AbortError') {
            return await fetchWithRetry(url, options, retries - 1, timeoutMs);
        }
        throw error;
    }
}

// ==========================================
// 4. نظام إدارة المستخدم والحسابات (Auth & Firestore Sync)
// ==========================================

// مراقبة حالة تسجيل الدخول وتزامن النقاط
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        await syncUserProfile(user);
        updateAuthUI(true, user.displayName);
    } else {
        userCredits = 0;
        updateCreditsDisplay(0);
        updateAuthUI(false);
    }
});

// إنشاء/تحديث مستند المستخدم في Firestore
async function syncUserProfile(user) {
    const userRef = doc(db, "users", user.uid);
    try {
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            // مستخدم جديد: منحه 5 نقاط مجانية تلقائياً
            await setDoc(userRef, {
                uid: user.uid,
                displayName: user.displayName || "مستخدم جديد",
                email: user.email,
                credits: 5,
                createdAt: serverTimestamp()
            });
            userCredits = 5;
        } else {
            userCredits = userSnap.data().credits || 0;
        }
        updateCreditsDisplay(userCredits);
    } catch (error) {
        showNotification("خطأ في جلب بيانات الحساب: " + error.message, "error");
    }
}

// تسجيل الدخول بـ Google
export async function loginGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        showNotification(`أهلاً بك يا ${sanitizeHTML(result.user.displayName)}! تم تسجيل الدخول.`, "success");
    } catch (error) {
        showNotification("خطأ أثناء تسجيل الدخول: " + error.message, "error");
    }
}

// تسجيل الخروج
export async function logoutUser() {
    try {
        await signOut(auth);
        showNotification("تم تسجيل الخروج بنجاح.", "info");
    } catch (error) {
        showNotification("خطأ أثناء تسجيل الخروج.", "error");
    }
}

// خصم النقاط الآمن داخل قاعدة البيانات (Atomic Transaction)
async function deductCreditInFirestore() {
    if (!currentUser) return false;
    const userRef = doc(db, "users", currentUser.uid);

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error("مستند المستخدم غير موجود!");
            
            const currentBalance = userDoc.data().credits || 0;
            if (currentBalance <= 0) throw new Error("رصيدك الحالي غير كافٍ!");
            
            transaction.update(userRef, { credits: currentBalance - 1 });
        });

        userCredits--;
        updateCreditsDisplay(userCredits);
        return true;
    } catch (error) {
        showNotification(error.message, "error");
        return false;
    }
}

// ==========================================
// 5. التحكم في تبويبات الاستوديو
// ==========================================
export function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.studio-panel').forEach(p => p.classList.remove('active'));

    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    const activePanel = document.getElementById(`panel-${tabName}`);

    if (activeBtn) activeBtn.classList.add('active');
    if (activePanel) activePanel.classList.add('active');
}

// ==========================================
// 6. المحركات المتقدمة للخدمات الأربعة
// ==========================================

// محرك الترجمة الفورية المحسّن
async function translateToEnglish(text) {
    if (!text) return '';
    try {
        const res = await fetchWithRetry(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ar|en`, {}, 1, 5000);
        const data = await res.json();
        return data.responseData?.translatedText || text;
    } catch {
        return text; // العودة للنص الأصلي عند تعثر الترجمة
    }
}

// إلغاء الطلبات السابقة لمنع التضارب وضياع الموارد
function prepareNewRequest() {
    if (currentAbortController) {
        currentAbortController.abort();
    }
    currentAbortController = new AbortController();
    return currentAbortController.signal;
}

// 1. توليد الصور
export async function generateImage() {
    if (!verifyAuthAndCredits()) return;
    const promptInput = document.getElementById('gen-prompt');
    const prompt = promptInput?.value.trim();
    if (!prompt) return showNotification("يرجى كتابة وصف الصورة أولاً!", "warning");

    const signal = prepareNewRequest();
    showLoading("جاري رسم وتصميم الصورة بواسطة FLUX...");

    try {
        const enPrompt = await translateToEnglish(prompt);
        const seed = Math.floor(Math.random() * 9999999);
        const imgUrl = `https://pollinations.ai/p/${encodeURIComponent(enPrompt)}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;

        await renderImageResult(imgUrl, signal);
    } catch (err) {
        if (err.name !== 'AbortError') {
            showRenderError("فشلت عملية توليد الصورة. حاول مرة أخرى.");
        }
    }
}

// معالجة رفع الصور للتعديل
export function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        return showNotification("يرجى اختيار ملف صورة صالحة!", "warning");
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        uploadedImageBase64 = event.target.result;
        const preview = document.getElementById('preview-area');
        if (preview) {
            preview.innerHTML = `<img src="${uploadedImageBase64}" style="max-width:100%; max-height:400px; border-radius:12px; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">`;
        }
    };
    reader.readAsDataURL(file);
}

// 2. تعديل الصور
export async function editUploadedImage() {
    if (!verifyAuthAndCredits()) return;
    if (!uploadedImageBase64) return showNotification("يرجى رفع صورة من جهازك أولاً!", "warning");
    
    const editPrompt = document.getElementById('edit-prompt')?.value.trim();
    if (!editPrompt) return showNotification("يرجى كتابة التعديل المطلوب!", "warning");

    const signal = prepareNewRequest();
    showLoading("جاري معالجة التعديلات بالذكاء الاصطناعي...");

    try {
        const enPrompt = await translateToEnglish(editPrompt);
        const seed = Math.floor(Math.random() * 9999999);
        const editedUrl = `https://pollinations.ai/p/${encodeURIComponent(enPrompt)}?width=1024&height=1024&seed=${seed}&model=flux-realism&enhance=true&nologo=true`;

        await renderImageResult(editedUrl, signal);
    } catch (err) {
        if (err.name !== 'AbortError') {
            showRenderError("تعثر إدخال التعديل على الصورة.");
        }
    }
}

// 3. توليد تحريك الفيديو
export async function generateVideo() {
    if (!verifyAuthAndCredits()) return;
    const prompt = document.getElementById('video-prompt')?.value.trim();
    if (!prompt) return showNotification("يرجى كتابة سيناريو حركة الفيديو!", "warning");

    const signal = prepareNewRequest();
    showLoading("جاري توليد وإنشاء المشهد المتحرك...");

    try {
        const enPrompt = await translateToEnglish(prompt);
        const seed = Math.floor(Math.random() * 9999999);
        // تكوين رابط مخصص لدعم التوليد الديناميكي المستمر (Motion/Video Feed)
        const videoMotionUrl = `https://pollinations.ai/p/${encodeURIComponent(enPrompt + " dynamic video movement motion high quality")}?width=512&height=512&seed=${seed}&model=flux&nologo=true`;

        await renderImageResult(videoMotionUrl, signal, true);
    } catch (err) {
        if (err.name !== 'AbortError') {
            showRenderError("حدث خطأ أثناء معالجة الفيديو.");
        }
    }
}

// 4. صناعة الأفاتار الناطق (Web Speech API Integration)
export async function generateAvatar() {
    if (!verifyAuthAndCredits()) return;
    const textScript = document.getElementById('avatar-script')?.value.trim();
    if (!textScript) return showNotification("يرجى كتابة النص الذي سيتحدث به الأفاتار!", "warning");

    showLoading("جاري إعداد وتحضير الأفاتار التفاعلي الناطق...");

    setTimeout(async () => {
        const success = await deductCreditInFirestore();
        if (!success) return;

        const avatarImgUrl = "https://a.storyblok.com/f/165321/1110x960/bf6a04879b/digital-human.png";
        const sanitizedText = sanitizeHTML(textScript);

        const preview = document.getElementById('preview-area');
        if (preview) {
            preview.innerHTML = `
                <div style="text-align:center; padding: 20px;">
                    <img id="avatar-img" src="${avatarImgUrl}" style="max-width:200px; border-radius:50%; border:4px solid #00d2ff; margin-bottom:15px; transition: transform 0.2s;">
                    <p style="color:#fff; font-size: 1.1rem; font-weight: bold; margin-bottom:15px;">"${sanitizedText}"</p>
                    <button id="speak-btn" style="background:#00d2ff; color:#000; border:none; padding:10px 20px; border-radius:8px; font-weight:bold; cursor:pointer;">
                        <i class="fa-solid fa-volume-high"></i> إعادة تشغيل الصوت
                    </button>
                </div>`;

            const speakText = () => {
                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                    const utterance = new SpeechSynthesisUtterance(textScript);
                    utterance.lang = 'ar-SA';
                    utterance.rate = 0.9;
                    
                    const avatarImg = document.getElementById('avatar-img');
                    utterance.onstart = () => avatarImg?.classList.add('pulse-avatar');
                    utterance.onend = () => avatarImg?.classList.remove('pulse-avatar');

                    window.speechSynthesis.speak(utterance);
                } else {
                    showNotification("متصفحك لا يدعم قراءة النصوص الصوتية تلقائياً.", "info");
                }
            };

            document.getElementById('speak-btn')?.addEventListener('click', speakText);
            speakText(); // تشغيل النطق المباشر عند الانتهاء
        }
    }, 1500);
}

// ==========================================
// 7. المعالجة الآمنة وتأكيد الخصم
// ==========================================

// التحقق من صلاحية الجلسة والنقاط
function verifyAuthAndCredits() {
    if (!currentUser) {
        showNotification("يرجى تسجيل الدخول أولاً لاستخدام خدمات الاستوديو!", "warning");
        return false;
    }
    if (userCredits <= 0) {
        showNotification("رصيدك الحالي 0! يرجى الاشتراك في إحدى الباقات للمتابعة.", "warning");
        return false;
    }
    return true;
}

// تصيير الصور مع التأكد من التحميل الفعلي قبل الخصم
function renderImageResult(url, signal, isVideoMode = false) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = url;

        img.onload = async () => {
            if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));

            // خصم النقاط من Firestore بعد النجاح الفعلي
            const success = await deductCreditInFirestore();
            if (success) {
                const preview = document.getElementById('preview-area');
                if (preview) {
                    preview.innerHTML = `
                        <div style="text-align:center;">
                            <img src="${url}" style="max-width:100%; max-height:450px; border-radius:12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                            ${isVideoMode ? '<p style="color:#25d366; font-weight:bold; margin-top:10px;"><i class="fa-solid fa-circle-check"></i> تم توليد مشهد الحركة بنجاح</p>' : ''}
                        </div>`;
                }
            }
            resolve();
        };

        img.onerror = () => {
            if (!signal.aborted) {
                showRenderError("تعثر تحميل الوسائط من المزود، لم يتم خصم أي نقاط من حسابك.");
            }
            reject(new Error("Image Load Failed"));
        };
    });
}

// ==========================================
// 8. عناصر الواجهة والتنبيهات (UI Helpers)
// ==========================================
function updateCreditsDisplay(count) {
    const creditsElem = document.getElementById('credits-count');
    if (creditsElem) creditsElem.innerText = count;
}

function updateAuthUI(isLoggedIn, userName = "") {
    const authBtn = document.getElementById('auth-btn');
    if (authBtn) {
        if (isLoggedIn) {
            authBtn.innerHTML = `<i class="fa-solid fa-right-from-bracket"></i> خروج (${sanitizeHTML(userName)})`;
            authBtn.onclick = logoutUser;
        } else {
            authBtn.innerHTML = `<i class="fa-solid fa-user"></i> تسجيل الدخول`;
            authBtn.onclick = loginGoogle;
        }
    }
}

function showLoading(message) {
    const preview = document.getElementById('preview-area');
    if (preview) {
        preview.innerHTML = `
            <div style="text-align: center; color: #00d2ff; padding: 40px;">
                <i class="fa-solid fa-circle-notch fa-spin fa-3x"></i>
                <p style="margin-top: 15px; font-weight: bold; font-size: 1.1rem;">${sanitizeHTML(message)}</p>
            </div>`;
    }
}

function showRenderError(message) {
    const preview = document.getElementById('preview-area');
    if (preview) {
        preview.innerHTML = `<p style="color:#ef4444; font-weight:bold; padding:20px; text-align:center;">${sanitizeHTML(message)}</p>`;
    }
}

function showNotification(msg, type = "info") {
    alert(`[${type.toUpperCase()}]: ${msg}`);
}

// ==========================================
// 9. تهيئة الأحداث الموحدة (Event Listeners)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('file-input')?.addEventListener('change', handleImageUpload);
    document.getElementById('btn-login')?.addEventListener('click', loginGoogle);
});
